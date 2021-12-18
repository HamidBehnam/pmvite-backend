import {Project} from "../models/projects.model";
import {IMember, Member} from "../../members/models/members.model";
import {Task} from "../../tasks/models/tasks.model";
import {NotAuthorizedError, NotFoundError} from "../../common/types/errors";
import {ProjectMemberRole} from "../../common/types/enums";
import {
    ProjectAuthorization,
    ProjectAuthorizationByMember,
    ProjectAuthorizationByTask
} from "../../common/types/interfaces";
import { membersQueryService } from '../../members/services/members-query.service';

class ProjectAuthorizationService {
    async authorize(userId: string, projectId: string, expectedRole: ProjectMemberRole): Promise<ProjectAuthorization> {

        const project = await Project.findById(projectId);

        if (!project) {
            throw new NotFoundError('project does not exist');
        }

        if (project.createdBy === userId) {
            return {
                project
            };
        }

        const projectMembersWithDetails = await Member
            .aggregate(membersQueryService.getMembersAggregateQuery({ projectId }));

        const authorizationResult = projectMembersWithDetails.some(member => member.userId === userId && member.role >= expectedRole);

        if (authorizationResult) {
            return {
                project
            };
        } else {
            throw new NotAuthorizedError('permission denied, please contact the project admin');
        }
    }

    async authorizeByMember(userId: string, memberId: string, expectedRole: ProjectMemberRole): Promise<ProjectAuthorizationByMember> {

        const member = await Member.findById(memberId);

        if (!member) {
            throw new NotFoundError('member does not exist');
        }

        const projectAuthorization = await this.authorize(userId, member.project.toString(), expectedRole);

        return {
            ...projectAuthorization,
            member
        };
    }

    async authorizeByTask(userId: string, taskId: string, expectedRole: ProjectMemberRole): Promise<ProjectAuthorizationByTask> {

        const task = await Task.findById(taskId);

        if (!task) {
            throw new NotFoundError('task does not exist');
        }

        const projectAuthorization = await this.authorize(userId, task.project.toString(), expectedRole);

        return {
            ...projectAuthorization,
            task
        };
    }
}

export const projectAuthorizationService = new ProjectAuthorizationService();
