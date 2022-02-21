import {PipelineStage, Types } from 'mongoose';
import { ProjectMemberRole, ProjectStatistic, WorkStatus } from '../../common/types/enums';

class ProjectsQueryService {

    private static getGenericQuery(userId: string) {
        return [
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'createdBy',
                    foreignField: 'userId',
                    as: 'creatorProfile'
                }
            },
            {
                $unwind: {
                    path: '$creatorProfile',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'images.files',
                    localField: 'image',
                    foreignField: '_id',
                    as: 'image'
                }
            },
            {
                $unwind: {
                    path: '$image',
                    preserveNullAndEmptyArrays: true
                }
            },
            ...ProjectsQueryService.getProjectsViewerAssociationQuery(userId),
            ...ProjectsQueryService.getProjectsReferenceQuery()
        ];
    }

    private static getProjectsViewerAssociationQuery(userId: string): PipelineStage[] {
        return [
            {
                $lookup: {
                    from: 'members',
                    let: { members: '$members' },
                    pipeline: [
                        { $match: { $expr: { $and: [ { $in: ['$_id', '$$members'] }, { $eq: ['$userId', userId] } ] } } },
                        { $project: { _id: 0, viewerAssociatedRole: '$role' } } // in case there's no need for renaming the field you can use role: 1 instead
                    ],
                    as: 'viewerAssociation'
                }
            },
            {
                $replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$viewerAssociation", 0 ] }, "$$ROOT" ] } }
            },
            {
                $project: { viewerAssociation: 0 }
            },
            {
                $addFields: {
                    viewerIsCreator: {
                        $eq: ['$createdBy', userId]
                    }
                }
            }
        ];
    }

    private static getProjectsReferenceQuery(): PipelineStage[] {
        return [
            {
                $lookup: {
                    from: 'members',
                    let: { id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$project', '$$id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'profiles',
                                let: { profile: '$profile' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$_id', '$$profile']
                                            }
                                        }
                                    },
                                    { $project: { firstName: 1, lastName: 1 } }
                                ],
                                as: 'profile'
                            }
                        },
                        {
                            $unwind: {
                                path: '$profile',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        { $project: { _id: 0, profile: 1, role: 1 } },
                    ],
                    as: 'membersQueried' // the reason for adding 'Queried' in the name is to avoid overriding the current document field with the same name.
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$project', '$$id']
                                        },
                                        {
                                            $eq: ['$status', WorkStatus.Accepted]
                                        }
                                    ]
                                }
                            }
                        },
                        { $project: { title: 1 } }
                    ],
                    as: 'acceptedTasks'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$project', '$$id']
                                        },
                                        {
                                            $ne: ['$status', WorkStatus.Accepted]
                                        },
                                        {
                                            $gt: ['$assignee', null]
                                        }
                                    ]
                                }
                            }
                        },
                        { $project: { title: 1 } }
                    ],
                    as: 'activeTasks'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$project', '$$id']
                                        },
                                        {
                                            $ne: ['$status', WorkStatus.Accepted]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                /*
                                 the reason for not putting this in the preceding $match > $expr > $and clause
                                 is because "assignee" is not an expression so if be placed in the $expr
                                 it won't be effective.
                                */
                                assignee: null
                            }
                        },
                        { $project: { title: 1 } }
                    ],
                    as: 'availableTasks'
                }
            },
            {
                $lookup: {
                    from: 'attachments.files',
                    let: { id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$metadata.project', '$$id']
                                }
                            }
                        },
                        { $project: { filename: 1 } }
                    ],
                    as: 'attachmentsQueried' // the reason for adding 'Queried' in the name is to avoid overriding the current document with the same name.
                }
            },
            {
                $addFields: {
                    [ProjectStatistic.MembersStat]: {
                        $size: '$membersQueried'
                    },
                    [ProjectStatistic.AttachmentsStat]: {
                        $size: '$attachmentsQueried'
                    },
                    [ProjectStatistic.ActiveTasksStat]: {
                        $size: '$activeTasks'
                    },
                    [ProjectStatistic.AcceptedTasksStat]: {
                        $size: '$acceptedTasks'
                    },
                    [ProjectStatistic.AvailableTasksStat]: {
                        $size: '$availableTasks'
                    },
                }
            }
        ];
    }

    private static getProjectsInactiveProjectsExclusion() {
        return [
            {
                $match: {
                    $or: [
                        { [ProjectStatistic.MembersStat]: { $gt: 0 } },
                        { [ProjectStatistic.AttachmentsStat]: { $gt: 0 } },
                        { [ProjectStatistic.ActiveTasksStat]: { $gt: 0 } },
                        { [ProjectStatistic.AcceptedTasksStat]: { $gt: 0 } },
                        { [ProjectStatistic.AvailableTasksStat]: { $gt: 0 } },
                    ]
                }
            }
        ];
    }

    private static getProjectsFilteredByStatus(statusItems: WorkStatus[]) {
        return [
            {
                $match: {
                    status: {
                        $in: statusItems
                    }
                }
            }
        ];
    }

    private static getProjectsFilteredByRole(roleItems: number[]) {
        const matchOR = [];

        if (roleItems.includes(ProjectMemberRole.Creator)) {
            matchOR.push({
                viewerIsCreator: true
            });

            roleItems = roleItems.filter((role: number) => role !== ProjectMemberRole.Creator);
        }

        if (roleItems.length) {
            matchOR.push({
                viewerAssociatedRole: {
                    $in: roleItems
                }
            });
        }

        return [
            {
                $match: {
                    $or: matchOR
                }
            }
        ];
    }

    private static getProjectsFilteredByStat(statItems: string[]) {
        return [
            {
                $match: {
                    $and: statItems.map((statItem: string) => ({ [statItem]: { $gt: 0 } }))
                }
            }
        ];
    }

    private static getDetailQuery() {
        return [
            {
                $lookup: {
                    from: 'members',
                    let: { members: '$members' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$_id', '$$members'] } } },
                        {
                            $lookup: {
                                from: 'profiles',
                                let: { profile: '$profile' },
                                pipeline: [
                                    { $match: { $expr: { $eq: ['$_id', '$$profile'] } } }
                                ],
                                as: 'profile'
                            }
                        },
                        {
                            $unwind: {
                                path: '$profile',
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    as: 'members'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    localField: 'tasks',
                    foreignField: '_id',
                    as: 'tasks'
                }
            },
            {
                $lookup: {
                    from: 'attachments.files',
                    localField: 'attachments',
                    foreignField: '_id',
                    as: 'attachments'
                }
            }
        ];
    }

    getProjectsAggregateQuery(queryMeta: any) {
        let dataAggregateQuery: any[] = [
            ...ProjectsQueryService.getGenericQuery(queryMeta.userId)
        ];
        let countAggregateQuery: any[] = [];

        let countAggregateQueryAssociationQueryAttached = false;
        let countAggregateQueryReferenceQueryAttached = false;

        if (queryMeta.role) {
            /* query requisition */
            if (!countAggregateQueryAssociationQueryAttached) {
                countAggregateQuery = [
                    ...countAggregateQuery,
                    ...ProjectsQueryService.getProjectsViewerAssociationQuery(queryMeta.userId)
                ];

                countAggregateQueryAssociationQueryAttached = true;
            }

            const queriedRoles = queryMeta.role.map((role: string) => + role);

            dataAggregateQuery = [...dataAggregateQuery, ...ProjectsQueryService.getProjectsFilteredByRole(queriedRoles)];
            countAggregateQuery = [...countAggregateQuery, ...ProjectsQueryService.getProjectsFilteredByRole(queriedRoles)];
        }

        if (queryMeta.status) {
            dataAggregateQuery = [...dataAggregateQuery, ...ProjectsQueryService.getProjectsFilteredByStatus(queryMeta.status)];
            countAggregateQuery = [...countAggregateQuery, ...ProjectsQueryService.getProjectsFilteredByStatus(queryMeta.status)];
        }

        if (queryMeta.stat) {
            /* query requisition */
            if (!countAggregateQueryReferenceQueryAttached) {
                countAggregateQuery = [
                    ...countAggregateQuery,
                    ...ProjectsQueryService.getProjectsReferenceQuery()
                ];

                countAggregateQueryReferenceQueryAttached = true;
            }

            dataAggregateQuery = [...dataAggregateQuery, ...ProjectsQueryService.getProjectsFilteredByStat(queryMeta.stat)];
            countAggregateQuery = [...countAggregateQuery, ...ProjectsQueryService.getProjectsFilteredByStat(queryMeta.stat)];
        }

        if (queryMeta.excludeInactive) {
            /* query requisition */
            if (!countAggregateQueryReferenceQueryAttached) {
                countAggregateQuery = [
                    ...countAggregateQuery,
                    ...ProjectsQueryService.getProjectsReferenceQuery()
                ];

                countAggregateQueryReferenceQueryAttached = true;
            }

            dataAggregateQuery = [...dataAggregateQuery, ...ProjectsQueryService.getProjectsInactiveProjectsExclusion()];
            countAggregateQuery = [...countAggregateQuery, ...ProjectsQueryService.getProjectsInactiveProjectsExclusion()];
        }

        return [
            {
                $facet: {
                    data: [
                        ...dataAggregateQuery,
                        { $sort: queryMeta.sort },
                        { $skip: --queryMeta.page * queryMeta.limit },
                        { $limit: queryMeta.limit }
                    ],
                    count: [
                        ...countAggregateQuery,
                        { $count: 'total' }
                    ]
                }
            },
            { $unwind: '$count' },
            { $project: { data: 1, total: '$count.total' } }
        ];
    }

    getProjectAggregateQuery(userId: string, projectId: string) {
        return [
            {
                $match: {
                    _id: new Types.ObjectId(projectId)
                }
            },
            ...ProjectsQueryService.getGenericQuery(userId)
        ];
    }

    getProjectVerboseAggregateQuery(userId: string, projectId: string) {
        return [
            {
                $match: {
                    _id: new Types.ObjectId(projectId)
                }
            },
            ...ProjectsQueryService.getGenericQuery(userId),
            ...ProjectsQueryService.getDetailQuery()
        ];
    }

    getProjectAttachmentsAggregateQuery(projectId: string): PipelineStage[] {
        return [
            {
                $match: {
                    _id: new Types.ObjectId(projectId)
                }
            },
            {
                $lookup: {
                    from: 'filemetas',
                    localField: 'attachments',
                    foreignField: '_id',
                    as: 'attachments'
                }
            },
            {
                $project: {
                    _id: 0,
                    attachments: 1
                }
            }
        ];
    }
}

export const projectsQueryService = new ProjectsQueryService();
