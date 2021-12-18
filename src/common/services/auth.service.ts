import jwt_decode from "jwt-decode";
import {AxiosError, AxiosRequestConfig, AxiosResponse} from "axios";
import {configService} from "./config.service";
import axios = require("axios");
import {promises as fsPromises, constants as fsConstants} from "fs";
import {winstonService} from "./winston.service";
import * as path from "path";
import {Auth0MetaData} from "../types/interfaces";

class AuthService {
    private machineToMachineAccessToken = '';

    private static checkTokenExpiration(decodedToken: any): boolean {
        return decodedToken.exp * 1000 > Date.now();
    }

    private async getMachineToMachineAccessToken(): Promise<string | AxiosError> {

        if (this.machineToMachineAccessToken) {

            winstonService.Logger.info('reading the m2m access token from the memory');
            return this.tokenProvider(this.machineToMachineAccessToken);
        } else {

            try {
                await fsPromises.access(path.resolve(__dirname, '../.m2m.cache'), fsConstants.F_OK);
                try {
                    winstonService.Logger.info('reading the m2m access token from the file');
                    const m2mAccessTokenFile = await fsPromises.readFile(path.resolve(__dirname, '../.m2m.cache'));
                    this.machineToMachineAccessToken = m2mAccessTokenFile.toString();
                    return this.tokenProvider(this.machineToMachineAccessToken);
                } catch (error) {

                    return new Promise<string | AxiosError>((resolve, reject) => reject('was unable to ready the cache file'));
                }
            } catch {
                return this.tokenProvider();
            }
        }

    }

    private tokenProvider(machineToMachineAccessToken?: string): Promise<string | AxiosError> {
        return new Promise<string | AxiosError>((resolve, reject) => {
            if (machineToMachineAccessToken && AuthService.checkTokenExpiration(jwt_decode(machineToMachineAccessToken))) {

                // re using the cached token
                resolve(machineToMachineAccessToken);
            } else {

                winstonService.Logger.info('loading the m2m access token from the management api');
                const options: AxiosRequestConfig = {
                    method: 'POST',
                    url: `https://${configService.auth0_domain}/oauth/token`,
                    headers: {'content-type': 'application/json'},
                    data: {
                        grant_type: 'client_credentials',
                        client_id: configService.machine_to_machine_client_id,
                        client_secret: configService.machine_to_machine_client_secret,
                        audience: `https://${configService.auth0_domain}/api/v2/`
                    }
                };

                axios.default.request(options).then(async (response: AxiosResponse) => {

                    this.machineToMachineAccessToken = response.data.access_token;

                    try {
                        winstonService.Logger.info('writing the m2m access token to the cache file');
                        await fsPromises.writeFile(path.resolve(__dirname, '../.m2m.cache'), this.machineToMachineAccessToken);
                        resolve(this.machineToMachineAccessToken);
                    } catch (error) {
                        reject('was unable to write into the cache file');
                    }
                }).catch((error: AxiosError) => {

                    reject(error);
                });
            }
        });
    }

    async updateMetaData(userId: string, metadata: Auth0MetaData): Promise<AxiosResponse | AxiosError> {
        const token = await this.getMachineToMachineAccessToken();

        const userPatchOptions: AxiosRequestConfig = {
            method: 'PATCH',
            url: `https://${configService.auth0_domain}/api/v2/users/` + userId,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token},
            data: metadata
        };

        return axios.default.request(userPatchOptions);
    }

    async getUsers(): Promise<AxiosResponse | AxiosError> {

        const token = await this.getMachineToMachineAccessToken();

        const usersGetOptions: AxiosRequestConfig = {
            method: 'GET',
            url: `https://${configService.auth0_domain}/api/v2/users`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token}
        };

        return axios.default.request(usersGetOptions);
    }

    async getUser(userId: string): Promise<AxiosResponse | AxiosError> {

        const token = await this.getMachineToMachineAccessToken();

        const usersGetOptions: AxiosRequestConfig = {
            method: 'GET',
            url: `https://${configService.auth0_domain}/api/v2/users/${userId}`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token}
        };

        return axios.default.request(usersGetOptions);
    }

    async getUserRoles(userId: string): Promise<AxiosResponse | AxiosError> {
        const token = await this.getMachineToMachineAccessToken();

        const userRolesGetOptions: AxiosRequestConfig = {
            method: 'GET',
            url: `https://${configService.auth0_domain}/api/v2/users/${userId}/roles`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token}
        };

        return axios.default.request(userRolesGetOptions);
    }

    async setUserRoles(userId: string, data: {roles: string[]}): Promise<AxiosResponse | AxiosError> {
        const token = await this.getMachineToMachineAccessToken();

        const userRolesGetOptions: AxiosRequestConfig = {
            method: 'POST',
            url: `https://${configService.auth0_domain}/api/v2/users/${userId}/roles`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token},
            data
        };

        return axios.default.request(userRolesGetOptions);
    }

    async deleteUserRoles(userId: string, data: {roles: string[]}): Promise<AxiosResponse | AxiosError> {
        const token = await this.getMachineToMachineAccessToken();

        const userRolesGetOptions: AxiosRequestConfig = {
            method: 'DELETE',
            url: `https://${configService.auth0_domain}/api/v2/users/${userId}/roles`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token},
            data
        };

        return axios.default.request(userRolesGetOptions);
    }

    async getUserPermissions(userId: string): Promise<AxiosResponse | AxiosError> {
        const token = await this.getMachineToMachineAccessToken();

        const userPermissionsGetOptions: AxiosRequestConfig = {
            method: 'GET',
            url: `https://${configService.auth0_domain}/api/v2/users/${userId}/permissions`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token}
        };

        return axios.default.request(userPermissionsGetOptions);
    }

    async getRoles(): Promise<AxiosResponse | AxiosError> {
        const token = await this.getMachineToMachineAccessToken();

        const rolesGetOptions: AxiosRequestConfig = {
            method: 'GET',
            url: `https://${configService.auth0_domain}/api/v2/roles`,
            headers: {'content-type': 'application/json', 'authorization': 'Bearer ' + token}
        };

        return axios.default.request(rolesGetOptions);
    }
}

export const authService = new AuthService();

