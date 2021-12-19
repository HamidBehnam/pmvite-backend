import { PipelineStage, Types } from 'mongoose';
import { queryService } from '../../common/services/query.service';
import { ProjectMemberRole, UserStatistic, WorkStatus } from '../../common/types/enums';

class ProfilesQueryService {

    private readonly _profilesAutocompleteDefaultQueryParams = {
        ...queryService.defaultQueryParams,
        term: ''
    };

    get profilesAutocompleteDefaultQueryParams(): any {
        return this._profilesAutocompleteDefaultQueryParams;
    }

    private static getGenericQuery(userId: string) {
        return [
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
            {
                $addFields: {
                    fullName: {
                        $concat: ['$firstName', ' ', '$lastName']
                    },
                    viewerIsCreator: {
                        $eq: ['$userId', userId]
                    }
                }
            },
            ...ProfilesQueryService.getProfilesReferenceQuery()
        ];
    }

    private static getProfilesReferenceQuery(): PipelineStage[] {
        return [
            {
                $lookup: {
                    from: 'tasks',
                    let: { userId: '$userId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$assigneeUserId', '$$userId']
                                        },
                                        {
                                            $eq: ['$status', WorkStatus.Accepted]
                                        }
                                    ]
                                }
                            }
                        },
                        ...ProfilesQueryService.getProjectsAggregateQuery(),
                        { $project: { title: 1, project: 1 } }
                    ],
                    as: 'acceptedTasks'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { userId: '$userId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$assigneeUserId', '$$userId']
                                        },
                                        {
                                            $ne: ['$status', WorkStatus.Accepted]
                                        }
                                    ]
                                }
                            }
                        },
                        ...ProfilesQueryService.getProjectsAggregateQuery(),
                        { $project: { title: 1, project: 1 } }
                    ],
                    as: 'activeTasks'
                }
            },
            {
                $lookup: {
                    from: 'projects',
                    let: { userId: '$userId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$createdBy', '$$userId']
                                }
                            }
                        },
                        { $project: { title: 1 } }
                    ],
                    as: 'createdProjects'
                }
            },
            {
                $lookup: {
                    from: 'members',
                    let: { userId: '$userId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$userId', '$$userId']
                                        },
                                        {
                                            $ne: ['$role', ProjectMemberRole.Creator]
                                        }
                                    ]
                                }
                            }
                        },
                        ...ProfilesQueryService.getProjectsAggregateQuery(),
                        { $project: { _id: 0, project: 1, role: 1 } }
                    ],
                    as: 'externalCollaborations'
                }
            },
            {
                $addFields: {
                    [UserStatistic.ActiveTasksStat]: {
                        $size: '$activeTasks'
                    },
                    [UserStatistic.AcceptedTasksStat]: {
                        $size: '$acceptedTasks'
                    },
                    [UserStatistic.CreatedProjectsStat]: {
                        $size: '$createdProjects'
                    },
                    [UserStatistic.ExternalCollaborationsStat]: {
                        $size: '$externalCollaborations'
                    }
                }
            }
        ];
    }

    private static getProjectsAggregateQuery(): Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out | PipelineStage.Search>[] {
        return [
            {
                $lookup: {
                    from: 'projects',
                    let: { project: '$project' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$project']
                                }
                            }
                        },
                        {
                            $project: { title: 1 }
                        }
                    ],
                    as: 'project'
                }
            },
            {
                $unwind: {
                    path: '$project',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];
    }

    getProfilesAggregateQuery(userId: string, queryParams: any) {
        let dataAggregateQuery: any[] = [
            ...ProfilesQueryService.getGenericQuery(userId)
        ];
        let countAggregateQuery: any[] = [];


        let filter;
        const matchOR: any[] = [];
        const matchAND: any[] = [];

        if (queryParams.stat) {
            queryParams.stat.forEach((statItem: string) => matchAND.push({ [statItem]: { $gt: 0 } }))
            filter = queryService.queryFilterBuilder(filter, {$and: matchAND});
            countAggregateQuery = [
                ...ProfilesQueryService.getProfilesReferenceQuery()
            ];
        }

        if (filter) {
            dataAggregateQuery = [
                ...dataAggregateQuery,
                filter
            ];

            countAggregateQuery = [
                ...countAggregateQuery,
                filter
            ];
        }

        return [
            {
                $facet: {
                    data: [
                        ...dataAggregateQuery,
                        { $sort: queryParams.sort },
                        { $skip: --queryParams.page * queryParams.limit },
                        { $limit: queryParams.limit }
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

    getProfileAggregateQuery(userId: string, profileId: string) {
        return [
            {
                $match: {
                    _id: new Types.ObjectId(profileId)
                }
            },
            ...ProfilesQueryService.getGenericQuery(userId)
        ];
    }

    getProfilesAggregateQueryAutocomplete(userId: string, searchTerm: string, excludedMemberProfileIds: Types.ObjectId[]) {

        return [
            ...ProfilesQueryService.getGenericQuery(userId),
            {
                $match: {
                    $and: [
                        {
                            fullName: {
                                $regex: searchTerm,
                                $options: 'i'
                            }
                        },
                        {
                            _id: {
                                $nin: excludedMemberProfileIds
                            }
                        }
                    ]
                }
            }
        ];
    }
}

export const profilesQueryService = new ProfilesQueryService();
