import { Types } from 'mongoose';
import { queryService } from '../../common/services/query.service';
import { ProjectMemberRole } from '../../common/types/enums';

class MembersQueryService {

    private static getMembersGenericAggregateQuery() {
        return [
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
                                from: 'filemetas',
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
                                from: 'filemetas',
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
            },
            {
                $addFields: { // roleTitle field is added to be able to sort the members based on the role's title
                    roleTitle: {
                        $switch: {
                            branches: [
                                { case: { $eq: [ '$role', ProjectMemberRole.Contributor ] }, then: "Contributor" },
                                { case: { $eq: [ '$role', ProjectMemberRole.Developer ] }, then: "Developer" },
                                { case: { $eq: [ '$role', ProjectMemberRole.Admin ] }, then: "Admin" },
                                { case: { $eq: [ '$role', ProjectMemberRole.Creator ] }, then: "Creator" }
                            ]
                        }
                    }
                }
            }
        ];
    }

    getMembersAggregateQuery(queryMeta: any) {
        let aggregateQuery: any[] = [
            ...MembersQueryService.getMembersGenericAggregateQuery()
        ];

        let filter;
        const matchOR = [];
        const matchAND = [];

        if (queryMeta.projectId) {
            matchAND.push({
                'project._id': new Types.ObjectId(queryMeta.projectId)
            });

            filter = queryService.queryFilterBuilder(filter, {$and: matchAND});
        }

        if (queryMeta.userId) {
            matchAND.push({
                userId: queryMeta.userId
            });

            filter = queryService.queryFilterBuilder(filter, {$and: matchAND});
        }

        if (queryMeta.role) {
            const queriedRoles = queryMeta.role.map((role: string) => + role);

            matchAND.push({
                role: {
                    $in: queriedRoles
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

    getMemberAggregateQuery(memberId: string) {
        return [
            {
                $match: {
                    _id: new Types.ObjectId(memberId)
                },
            },
            ...MembersQueryService.getMembersGenericAggregateQuery()
        ];
    }
}

export const membersQueryService = new MembersQueryService();
