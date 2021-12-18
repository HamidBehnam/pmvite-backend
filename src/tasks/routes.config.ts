import {Router} from "express";
import {authMiddleware} from "../common/middlewares/auth.middleware";
import {tasksController} from "./controllers/tasks.controller";
import {fieldsMiddleware} from "../common/middlewares/fields.middleware";
import { tasksJoiService } from './services/tasks-joi.service';
import { ValidationDataSource } from '../common/types/enums';

export const tasksRoutesConfig = (): Router => {
    const tasksRouter = Router();

    tasksRouter.post('/tasks', [
        authMiddleware.checkJwt,
        // the reason for disallowing the assigneeUserId is because it should be changed in the controller
        // once the assignee field is being set to make sure assigneeUserId is the userId of the assignee
        fieldsMiddleware.disallow(['assigneeUserId']),
        tasksController.createTask
    ]);

    tasksRouter.get('/tasks', [
        authMiddleware.checkJwt,
        fieldsMiddleware.validate(tasksJoiService.getTasksSchema, ValidationDataSource.Query),
        tasksController.getTasks
    ]);

    tasksRouter.get('/tasks/:id', [
        authMiddleware.checkJwt,
        tasksController.getTask
    ]);

    tasksRouter.patch('/tasks/:id', [
        authMiddleware.checkJwt,
        // the reason for disallowing the project field is because changing the project field will change
        // the context of the task, if it needs to be changed it makes sense to delete the task and add it again.
        // the reason for disallowing the assigneeUserId is because it should be changed in the controller
        // once the assignee field is being set to make sure assigneeUserId is the userId of the assignee
        fieldsMiddleware.disallow(['project', 'assigneeUserId']),
        tasksController.updateTask
    ]);

    tasksRouter.delete('/tasks/:id', [
        authMiddleware.checkJwt,
        tasksController.deleteTask
    ]);

    return tasksRouter;
};
