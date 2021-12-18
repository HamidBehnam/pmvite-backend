import {Response} from "express";
import { IMember, Member } from "../models/members.model";
import {projectAuthorizationService} from "../../projects/services/project-authorization.service";
import {Profile} from "../../profiles/models/profiles.model";
import {Auth0Request, ProjectAuthorization, ProjectAuthorizationByMember} from "../../common/types/interfaces";
import {ProjectMemberRole} from "../../common/types/enums";
import {errorHandlerService} from "../../common/services/error-handler.service";
import {BadRequestError} from "../../common/types/errors";
import { membersQueryService } from '../services/members-query.service';
import { Task } from '../../tasks/models/tasks.model';
import { queryService } from '../../common/services/query.service';

class MembersController {

    async createMember(request: Auth0Request, response: Response) {
        try {

            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.body.project,
                ProjectMemberRole.Admin
            );

            const existingMember = await Member.findOne({
                project: request.body.project,
                profile: request.body.profile
            })

            if (existingMember) {
                const error = new BadRequestError('project already has this member');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            const profile = await Profile.findById(request.body.profile);

            if (!profile) {
                const error = new BadRequestError('profile does not exist');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            if (request.body.role === ProjectMemberRole.Creator) {
                if (profile.userId !== projectAuthorization.project.createdBy) {
                    const error = new BadRequestError('creator role can be assigned only to the project creator');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }
            }

            if (profile.userId === projectAuthorization.project.createdBy) {
                if ( request.body.role !== ProjectMemberRole.Creator) {
                    const error = new BadRequestError('if the project creator is going to be added as a member, they should have a creator role');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }
            }

            const memberData = {
                ...request.body,
                userId: profile.userId
            };

            const member = await Member.create(memberData);

            await projectAuthorization.project.updateOne({
                $push: {
                    members: member._id
                }
            });

            const memberWithDetails = await Member.aggregate(membersQueryService.getMemberAggregateQuery(member._id));

            response.status(201).send(memberWithDetails.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getMembersDeprecated(request: Auth0Request, response: Response) {
        try {
            const members = await Member.find({}).populate('project profile', '-members -__v');

            response.status(200).send(members);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getMembers(request: Auth0Request, response: Response) {
        try {

            const queryParams = queryService.queryParamsProcessor(request.query);

            // getting projectId, userId from request headers
            const projectId = request.get('projectId');
            const userId = request.get('userId');

            const queryMeta = {
                ...queryParams,
                projectId,
                userId
            };

            const members: IMember[] = await Member
                .aggregate(membersQueryService.getMembersAggregateQuery(queryMeta))
                .sort(queryParams.sort)
                .skip(--queryParams.page * queryParams.limit)
                .limit(queryParams.limit);

            response.status(200).send(members);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getMember(request: Auth0Request, response: Response) {
        try {

            const member = await Member.aggregate(membersQueryService.getMemberAggregateQuery(request.params.id));

            response.status(200).send(member.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    // Deprecated due to avoid population.
    async getMemberDeprecated(request: Auth0Request, response: Response) {
        try {
            const member = await Member.findById(request.params.id).populate('project profile', '-members -__v');

            response.status(200).send(member);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async updateMember(request: Auth0Request, response: Response) {
        try {

            const projectAuthorizationByMember: ProjectAuthorizationByMember = await projectAuthorizationService.authorizeByMember(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Admin
            );

            if (projectAuthorizationByMember.member.userId === request.user.sub) {
                const error = new BadRequestError('you can not update your own role');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            if (request.body.role === ProjectMemberRole.Creator) {
                if (projectAuthorizationByMember.member.userId !== projectAuthorizationByMember.project.createdBy) {
                    const error = new BadRequestError('creator role can be assigned only to the project creator');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }
            }

            if (projectAuthorizationByMember.member.userId === projectAuthorizationByMember.project.createdBy) {
                if ( request.body.role !== ProjectMemberRole.Creator) {
                    const error = new BadRequestError("'creator' is the only role the a project creator can be assigned to");
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }
            }

            await projectAuthorizationByMember.member.updateOne(
                request.body,
                {
                    runValidators: true
                }
            );

            response.status(200).send({
                message: 'member was successfully updated'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async deleteMember(request: Auth0Request, response: Response) {
        try {

            const projectAuthorizationByMember: ProjectAuthorizationByMember = await projectAuthorizationService.authorizeByMember(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Admin
            );

            if (
                projectAuthorizationByMember.project.createdBy !== request.user.sub &&
                projectAuthorizationByMember.member.userId === request.user.sub
            ) {
                const error = new BadRequestError('you can not delete your own role in external projects');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            await projectAuthorizationByMember.member.deleteOne();

            await projectAuthorizationByMember.project.updateOne({
                $pull: {
                    members: projectAuthorizationByMember.member._id
                }
            });

            await Task.updateMany({
                assignee: projectAuthorizationByMember.member._id
            }, {
                $unset: {
                    assignee: 1,
                    assigneeUserId: 1
                }
            });

            response.status(200).send({
                message: 'the member was successfully deleted'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }
}

export const membersController = new MembersController();
