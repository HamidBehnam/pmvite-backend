import {Response} from "express";
import { ITask, Task } from "../models/tasks.model";
import {projectAuthorizationService} from "../../projects/services/project-authorization.service";
import { Member } from "../../members/models/members.model";
import {Auth0Request, ProjectAuthorization, ProjectAuthorizationByTask} from "../../common/types/interfaces";
import {ProjectMemberRole} from "../../common/types/enums";
import {errorHandlerService} from "../../common/services/error-handler.service";
import {BadRequestError, NotFoundError} from "../../common/types/errors";
import { tasksQueryService } from '../services/tasks-query.service';
import { queryService } from '../../common/services/query.service';

class TasksController {
    async createTask(request: Auth0Request, response: Response) {
        try {
            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.body.project,
                ProjectMemberRole.Developer
            );

            let taskData = {
                ...request.body
            };

            if (request.body.assignee) {

                if (!projectAuthorization.project.members.includes(request.body.assignee)) {
                    const error = new BadRequestError('assignee should be one of the members of the project');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                const assignee = await Member.findById(request.body.assignee);

                if (!assignee) {
                    const error = new NotFoundError('assignee does not exist');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                taskData = {
                    ...taskData,
                    assigneeUserId: assignee.userId
                };
            }

            const task = await Task.create(taskData);

            await projectAuthorization.project.updateOne({
                $push: {
                    tasks: task._id
                }
            });

            const taskWithDetails = await Task.aggregate(tasksQueryService.getTaskAggregateQuery(task._id));

            response.status(201).send(taskWithDetails.pop());
        }
        catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getTasksDeprecated(request: Auth0Request, response: Response) {
        try {
            const tasks = await Task.find({});

            response.status(200).send(tasks);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getTasks(request: Auth0Request, response: Response) {
        try {

            const queryParams = queryService.queryParamsProcessor(request.query);

            // getting projectId, userId from request headers
            const projectId = request.get('projectId');
            const assigneeUserId = request.get('assigneeUserId');

            const queryMeta = {
                ...queryParams,
                projectId,
                assigneeUserId
            };

            const tasks: ITask[] = await Task
                .aggregate(tasksQueryService.getTasksAggregateQuery(queryMeta))
                .sort(queryParams.sort)
                .skip(--queryParams.page * queryParams.limit)
                .limit(queryParams.limit);

            response.status(200).send(tasks);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getTask(request: Auth0Request, response: Response) {
        try {

            const task = await Task.aggregate(tasksQueryService.getTaskAggregateQuery(request.params.id));

            response.status(200).send(task.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    // Deprecated due to (nested) populate usage.
    async getTaskDeprecated(request: Auth0Request, response: Response) {
        try {
            const task = await Task.findById(request.params.id).populate([{
                path: 'project',
                model: 'Project'
            }, {
                path: 'assignee',
                model: 'Member',
                select: 'profile',
                populate: [{
                    path: 'profile',
                    model: 'Profile'
                }]
            }]);

            response.status(200).send(task);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async updateTask(request: Auth0Request, response: Response) {
        try {

            const projectAuthorizationByTask: ProjectAuthorizationByTask = await projectAuthorizationService.authorizeByTask(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Contributor
            );

            let taskData = {
                ...request.body
            };

            // the reason for excluding the assignee is because if assignee property in the sent body is null we need to
            // remove the assignee field in db using $unset. It's not possible to reset a field using $unset while the
            // field is already in the payload even if it's null. If there was no need to reset a field which is
            // already in the payload, this line for assignee exclusion could be simply ignored.
            const {assignee, ...taskDataExcludingAssignee} = taskData;

            if (assignee) {

                if (!projectAuthorizationByTask.project.members.includes(request.body.assignee)) {
                    const error = new BadRequestError('assignee should be one of the members of the project');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                const assignee = await Member.findById(request.body.assignee);

                if (!assignee) {
                    const error = new NotFoundError('assignee does not exist');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                taskData = {
                    ...taskData,
                    assigneeUserId: assignee.userId
                };
            }

            if (assignee === null) {
                taskData = {
                    ...taskDataExcludingAssignee,
                    $unset: {
                        assignee: 1,
                        assigneeUserId: 1
                    }
                }
            }

            await projectAuthorizationByTask.task.updateOne(
                taskData,
                {
                    runValidators: true
                }
            );

            response.status(200).send({
                message: 'task was successfully updated'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async deleteTask(request: Auth0Request, response: Response) {
        try {
            const projectAuthorizationByTask: ProjectAuthorizationByTask = await projectAuthorizationService.authorizeByTask(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Developer
            );

            await projectAuthorizationByTask.task.deleteOne();

            await projectAuthorizationByTask.project.updateOne({
                $pull: {
                    tasks: projectAuthorizationByTask.task._id
                }
            });

            response.status(200).send({
                message: 'task was successfully deleted'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }
}

export const tasksController = new TasksController();
