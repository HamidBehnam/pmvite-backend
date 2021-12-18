import {Response} from "express";
import {authService} from "../../common/services/auth.service";
import {AxiosResponse} from "axios";
import {Auth0Request} from "../../common/types/interfaces";
import {errorHandlerService} from "../../common/services/error-handler.service";

class UsersController {

    async getUsers(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.getUsers() as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getUser(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.getUser(request.params.id) as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getUserRoles(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.getUserRoles(request.params.id) as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async setUserRoles(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.setUserRoles(request.params.id, request.body) as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async deleteUserRoles(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.deleteUserRoles(request.params.id, request.body) as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getUserPermissions(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.getUserPermissions(request.params.id) as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getRoles(request: Auth0Request, response: Response) {
        try {
            const {data} = await authService.getRoles() as AxiosResponse;
            response.status(200).send(data);
        } catch (error) {
            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }
}

export const usersController = new UsersController();
