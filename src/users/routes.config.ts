import {Router} from "express";
import {authMiddleware} from "../common/middlewares/auth.middleware";
import {usersController} from "./controllers/users.controller";
import {Auth0Permissions} from "../common/types/enums";

export const usersRoutesConfig = (): Router => {
    const usersRouter = Router();

    usersRouter.get('/users', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.ReadAuth0Users]),
        usersController.getUsers
    ]);

    usersRouter.get('/users/:id', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.ReadAuth0Users]),
        usersController.getUser
    ]);

    usersRouter.get('/users/:id/roles', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.ReadAuth0UserRoles]),
        usersController.getUserRoles
    ]);

    usersRouter.post('/users/:id/roles', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.CreateAuth0UserRoles]),
        usersController.setUserRoles
    ]);

    usersRouter.delete('/users/:id/roles', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.DeleteAuth0UserRoles]),
        usersController.deleteUserRoles
    ]);

    usersRouter.get('/users/:id/permissions', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.ReadAuth0UserPermissions]),
        usersController.getUserPermissions
    ]);

    usersRouter.get('/roles', [
        authMiddleware.checkAuth0Permissions([Auth0Permissions.ReadAuth0Roles]),
        usersController.getRoles
    ]);

    return usersRouter;
};
