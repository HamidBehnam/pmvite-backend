import {Router} from "express";
import {authMiddleware} from "../common/middlewares/auth.middleware";
import {projectsController} from "./controllers/projects.controller";
import {fieldsMiddleware} from "../common/middlewares/fields.middleware";
import {projectsJoiService} from "./services/projects-joi.service";
import {ValidationDataSource} from "../common/types/enums";

export const projectsRoutesConfig = (): Router => {
    const projectsRouter = Router();

    projectsRouter.post('/projects', [
        authMiddleware.checkJwt,
        // the reason for disallowing 'members' and 'tasks' fields is to make sure members and tasks are gonna be
        // created through their own endpoints so data will be in sync with the members and tasks collections
        fieldsMiddleware.disallow(['members', 'tasks', 'createdBy', 'image']),
        projectsController.createProject
    ]);

    projectsRouter.get('/projects', [
        authMiddleware.checkJwt,
        /*
        the reason for commenting the validation out is because a deferred validation (in controller) is needed
        for this endpoint due to the possibility of sending wrong query params by users in the app's url.
        So the proper approach could be not sending the error messages instead proceeding
        with the request and ignoring the wrong query params.
        */
        // fieldsMiddleware.validate(projectsJoiService.getProjectsSchema, ValidationDataSource.Query),
        projectsController.getProjects
    ]);

    projectsRouter.get('/projects/:id', [
        authMiddleware.checkJwt,
        projectsController.getProject
    ]);

    projectsRouter.get('/projects/:id/verbose', [
        authMiddleware.checkJwt,
        projectsController.getProjectVerbose
    ]);

    projectsRouter.patch('/projects/:id', [
        authMiddleware.checkJwt,
        // the reason for disallowing 'members' and 'tasks' fields is to make sure members and tasks are gonna be
        // created through their own endpoints so data will be in sync with the members and tasks collections
        fieldsMiddleware.disallow(['members', 'tasks', 'createdBy', 'image']),
        projectsController.updateProject
    ]);

    projectsRouter.delete('/projects/:id', [
        authMiddleware.checkJwt,
        projectsController.deleteProject
    ]);

    projectsRouter.post('/projects/:id/images', [
        authMiddleware.checkJwt,
        projectsController.uploadProjectImage
    ]);

    projectsRouter.get('/projects/:id/images/:fileId', [
        projectsController.getProjectImage
    ]);

    projectsRouter.delete('/projects/:id/images/:fileId', [
        authMiddleware.checkJwt,
        projectsController.deleteProjectImage
    ]);

    projectsRouter.post('/projects/:id/attachments', [
        authMiddleware.checkJwt,
        projectsController.uploadProjectAttachment
    ]);

    projectsRouter.get('/projects/:id/attachments/:fileId', [
        projectsController.getProjectAttachment
    ]);

    projectsRouter.get('/projects/:id/attachments/:fileId/meta', [
        projectsController.getProjectAttachmentMeta
    ]);

    projectsRouter.patch('/projects/:id/attachments/:fileId', [
        authMiddleware.checkJwt,
        projectsController.updateProjectAttachment
    ]);

    projectsRouter.get('/projects/:id/attachments', [
        projectsController.getProjectAttachments
    ]);

    projectsRouter.delete('/projects/:id/attachments/:fileId', [
        authMiddleware.checkJwt,
        projectsController.deleteProjectAttachment
    ]);

    return projectsRouter;
};
