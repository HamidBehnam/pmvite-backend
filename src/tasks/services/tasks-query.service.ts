import { Types } from 'mongoose';
import { queryService } from '../../common/services/query.service';

class TasksQueryService {

    private static getTasksGenericAggregateQuery() {
        return [
            {
                $lookup: {
                    from: 'members',
                    let: {
                        assignee: '$assignee'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$assignee']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'profiles',
                                let: {
                                    profile: '$profile'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$_id', '$$profile']
                                            }
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
                                    {
                                        $addFields: {
                                            fullName: {
                                                $concat: ['$firstName', ' ', '$lastName']
                                            }
                                        }
                                    }
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
                    as: 'assignee'
                }
            },
            {
                $unwind: {
                    path: '$assignee',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'projects',
                    let: {
                        project: '$project'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$project']
                                }
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
                        {
                            $project: {
                                title: 1,
                                status: 1,
                                image: 1
                            }
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

    getTasksAggregateQuery(queryMeta: any) {
        let aggregateQuery: any[] = [
            ...TasksQueryService.getTasksGenericAggregateQuery()
        ];

        let filter;
        const matchOR = [];
        const matchAND = [];

        if (queryMeta.projectId) {
            matchAND.push({
                'project._id': Types.ObjectId(queryMeta.projectId)
            });

            filter = queryService.queryFilterBuilder(filter, {$and: matchAND});
        }

        if (queryMeta.assigneeUserId) {
            matchAND.push({
                assigneeUserId: queryMeta.assigneeUserId
            });

            filter = queryService.queryFilterBuilder(filter, {$and: matchAND});
        }

        if (queryMeta.status) {
            matchAND.push({
                status: {
                    $in: queryMeta.status
                }
            });

            filter = queryService.queryFilterBuilder(filter, {$and: matchAND});
        }

        if (filter) {
            aggregateQuery = [
                ...aggregateQuery,
                filter
            ];
        }

        return aggregateQuery;
    }

    getTaskAggregateQuery(taskId: string) {
        return [
            {
                $match: {
                    _id: Types.ObjectId(taskId)
                }
            },
            ...TasksQueryService.getTasksGenericAggregateQuery()
        ];
    }
}

export const tasksQueryService = new TasksQueryService();
