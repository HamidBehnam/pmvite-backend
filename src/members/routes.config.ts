import {Router} from "express";
import {authMiddleware} from "../common/middlewares/auth.middleware";
import {membersController} from "./controllers/members.controller";
import {fieldsMiddleware} from "../common/middlewares/fields.middleware";
import { ValidationDataSource } from '../common/types/enums';
import { membersJoiService } from './services/members-joi.service';

export const membersRoutesConfig = (): Router => {
    const membersRouter = Router();

    membersRouter.post('/members', [
        fieldsMiddleware.disallow(['userId']),
        membersController.createMember
    ]);

    membersRouter.get('/members', [
        fieldsMiddleware.validate(membersJoiService.getMembersSchema, ValidationDataSource.Query),
        membersController.getMembers
    ]);

    membersRouter.get('/members/:id', [
        membersController.getMember
    ]);

    membersRouter.patch('/members/:id', [
        // the reason for disallowing these fields is because changing these fields will change the context of the
        // member, if these fields need to be changed it makes sense to delete the member and add it again.
        fieldsMiddleware.disallow(['project', 'profile', 'userId']),
        membersController.updateMember
    ]);

    membersRouter.delete('/members/:id', [
        membersController.deleteMember
    ]);

    return membersRouter;
};
