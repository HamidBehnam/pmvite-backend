import {Request} from "express";
import {IProject} from "../../projects/models/projects.model";
import {IMember} from "../../members/models/members.model";
import {ITask} from "../../tasks/models/tasks.model";
import { Readable } from 'stream';
import { IFileMeta } from '../../file-meta/models/file-meta.model';

export interface Auth0Request extends Request {
    user?: any;
}

export interface Auth0MetaData {
    user_metadata?: object;
    app_metadata?: object;
}

export interface ProjectAuthorization {
    project: IProject;
}

export interface ProjectAuthorizationByMember extends ProjectAuthorization {
    member: IMember
}

export interface ProjectAuthorizationByTask extends ProjectAuthorization {
    task: ITask
}

export interface FileStreamData {
    fileMeta: IFileMeta;
    readStream: Readable;
}
