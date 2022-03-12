import {Response} from "express";
import {Project} from "../models/projects.model";
import {Profile} from "../../profiles/models/profiles.model";
import {sendgridService} from "../../common/services/sendgrid.service";
import {projectAuthorizationService} from "../services/project-authorization.service";
import {Member} from "../../members/models/members.model";
import {winstonService} from "../../common/services/winston.service";
import {projectsQueryService} from "../services/projects-query.service";
import {dbService} from "../../common/services/db.service";
import {multerMiddleware} from "../../common/middlewares/multer.middleware";
import {Types} from "mongoose";
import {
    Auth0Request,
    FileOptions,
    FileStream,
    FileUploadResult,
    ProjectAuthorization
} from "../../common/types/interfaces";
import {FileCategory, ProjectMemberRole} from "../../common/types/enums";
import {errorHandlerService} from "../../common/services/error-handler.service";
import { BadRequestError, NotFoundError } from "../../common/types/errors";
import {Task} from "../../tasks/models/tasks.model";
import { queryService } from '../../common/services/query.service';
import { projectsJoiService } from '../services/projects-joi.service';
import { storageService } from '../../common/services/storage.service';
import { FileMeta } from '../../file-meta/models/file-meta.model';
import { StorageMeta } from '../../storage-meta/models/storage-meta.model';
import { configService } from '../../common/services/config.service';
import { fileMetaQueryService } from '../../file-meta/services/file-meta-query.service';

class ProjectsController {
    async createProject(request: Auth0Request, response: Response) {
        try {

            const foundProfiles = await Profile.find({userId: request.user.sub});

            // used pop() because the user won't have more than 1 profile.
            const creatorProfile = foundProfiles.pop();

            if (!creatorProfile) {
                const error = new BadRequestError('user must have a profile to be able to create projects');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            const projectData = {
                ...request.body,
                createdBy: request.user.sub
            };

            const project = await Project.create(projectData);

            response.status(201).send(project);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProjects(request: Auth0Request, response: Response) {
        try {

            const validatedQueryParams = queryService.silentValidator(projectsJoiService.getProjectsSchema,
                projectsJoiService.getProjectsSchemaKeys, request.query);

            const processedQueryParams = queryService.queryParamsProcessor(validatedQueryParams);

            const userId = request.get('userId') || request.user.sub;
            const excludeInactive = request.get('excludeInactive') === 'true';

            const queryMeta = {
                ...processedQueryParams,
                userId,
                excludeInactive
            };

            const projects = await Project
                .aggregate(projectsQueryService.getProjectsAggregateQuery(queryMeta));

            // sendgridService
            //     .sendEmail(
            //         {email: "xxxxxx@gmail.com", name: "Hamid"},
            //         {email: "info@hamidbehnam.com", name: "Project Management App"},
            //         "d-bb86afa964f741f88da1c473b3382fe2"
            //     )
            //     .then(() => winstonService.Logger.info('Email sent'))
            //     .catch(error => winstonService.Logger.error(error));

            response.status(200).send(projects.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProject(request: Auth0Request, response: Response) {
        try {

            const project = await Project
                .aggregate(projectsQueryService.getProjectAggregateQuery(request.user.sub, request.params.id));

            response.status(200).send(project.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProjectVerbose(request: Auth0Request, response: Response) {
        try {

            const project = await Project
                .aggregate(projectsQueryService.getProjectVerboseAggregateQuery(request.user.sub, request.params.id));

            response.status(200).send(project.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async updateProject(request: Auth0Request, response: Response) {
        try {

            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Admin
            );

            await projectAuthorization.project.updateOne(
                request.body,
                {
                    runValidators: true
                });

            response.status(200).send({
                message: 'project was successfully updated'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async deleteProject(request: Auth0Request, response: Response) {
        try {
            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Creator
            );

            await Member.deleteMany({
                project: request.params.id
            });

            await Task.deleteMany({
                project: request.params.id
            });

            if (projectAuthorization.project.image) {
                await dbService.deleteFile(FileCategory.Images, projectAuthorization.project.image.toString());
            }

            // using global.Promise to avoid getting the typescript warning suggesting that it needs to be imported.
            await global.Promise.all((projectAuthorization.project.attachments as Types.ObjectId[])
                .map((attachment) => dbService.deleteFile(FileCategory.Attachments, attachment.toString())));

            await projectAuthorization.project.deleteOne();

            response.status(200).send({
                message: 'project was successfully deleted'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async uploadProjectImage(request: Auth0Request, response: Response) {

        multerMiddleware.imageMulter('image')(request, response, async (error: any) => {
            try {

                if (error) {
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                if (!request.file) {
                    const error = new BadRequestError('file is not sent');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                    request.user.sub,
                    request.params.id,
                    ProjectMemberRole.Admin
                );

                const fileOptions: FileOptions = {
                    gridFSBucketWriteStreamOptions: {
                        metadata: {
                            project: projectAuthorization.project._id
                        }
                    }
                };

                const fileUploadResult: FileUploadResult =
                    await dbService.saveFile(FileCategory.Images, request.file, fileOptions);

                const oldImageId = projectAuthorization.project.image;

                await projectAuthorization.project.updateOne({
                    image: fileUploadResult.id
                });

                if (oldImageId) {

                    await dbService.deleteFile(FileCategory.Images, (oldImageId as Types.ObjectId).toString());
                }

                const file = await dbService.getFile(FileCategory.Images, fileUploadResult.id);

                response.status(201).send(file);
            } catch (error) {

                response.status(errorHandlerService.getStatusCode(error)).send(error);
            }
        });
    }

    async deleteProjectImage(request: Auth0Request, response: Response) {

        try {

            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Admin
            );

            await dbService.deleteFile(FileCategory.Images, request.params.fileId);

            await projectAuthorization.project.updateOne({
                $unset: {
                    image: 1
                }
            });

            response.status(201).send({
                message: 'project image was successfully removed'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProjectImage(request: Auth0Request, response: Response) {
        try {

            // loading the project data before loading its file is not needed atm but the project id
            // will be in request.params.id
            const fileStream: FileStream = await dbService.getFileStream(FileCategory.Images, request.params.fileId);
            response.header('Content-Disposition', `filename="${fileStream.file.filename}"`);
            fileStream.stream.pipe(response);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async uploadProjectAttachment(request: Auth0Request, response: Response) {

        multerMiddleware.attachmentMulter('attachment')(request, response, async (error: any) => {
            try {

                if (error) {
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                if (!request.file) {
                    const error = new BadRequestError('file is not sent');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                    request.user.sub,
                    request.params.id,
                    ProjectMemberRole.Developer
                );

                const [capacityData] = await FileMeta
                    .aggregate(fileMetaQueryService.usedCapacityAggregateQuery(projectAuthorization.project.createdBy));

                const usedCapacity = capacityData ? capacityData.usedCapacity : 0;

                const storageMeta = await StorageMeta.findOne({userId: projectAuthorization.project.createdBy});

                const totalCapacity = storageMeta ? storageMeta.capacity : + configService.storage_default_capacity;

                if (usedCapacity + request.file.size > totalCapacity) {
                    const error = new BadRequestError('Not enough storage');
                    response.status(errorHandlerService.getStatusCode(error)).send(error);
                    return;
                }

                const filePrefix = storageService.getUniqueFilePrefix();

                const uniqueFilename = `${filePrefix}/${request.file.originalname}`;

                const fileReference = storageService.getFileReference(uniqueFilename);

                await fileReference.save(request.file.buffer);

                const [fileData] = await fileReference.get();

                let createdFileMeta;

                if (fileData && fileData.metadata) {
                    const fileMeta = {
                        filename: request.file.originalname,
                        size: fileData.metadata.size,
                        prefix: filePrefix,
                        uploadedBy: request.user.sub,
                        storageOwner: projectAuthorization.project.createdBy,
                        available: true
                    };

                    createdFileMeta = await FileMeta.create(fileMeta);

                    await projectAuthorization.project.updateOne({
                        $push: {
                            attachments: createdFileMeta._id
                        }
                    });
                }

                response.status(201).send(createdFileMeta);
            } catch (error) {

                response.status(errorHandlerService.getStatusCode(error)).send(error);
            }
        });
    }

    async deleteProjectAttachment(request: Auth0Request, response: Response) {

        try {

            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Developer
            );

            await dbService.deleteFile(FileCategory.Attachments, request.params.fileId);

            await projectAuthorization.project.updateOne({
                $pull: {
                    attachments: request.params.fileId
                }
            });

            response.status(201).send({
                message: 'project attachment was successfully removed'
            });
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProjectAttachment(request: Auth0Request, response: Response) {
        try {

            const fileMeta = await FileMeta.findById(request.params.fileId);

            if (!fileMeta) {
                const error = new NotFoundError('file not found');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            const uniqueFilename = `${fileMeta.prefix}/${fileMeta.filename}`;

            const fileReference = storageService.getFileReference(uniqueFilename);

            response.header('Content-Disposition', `filename="${request.params.filename}"`);

            fileReference.createReadStream().pipe(response);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProjectAttachmentMeta(request: Auth0Request, response: Response) {
        try {

            // loading the project data before loading its file is not needed atm but the project id
            // will be in request.params.id
            const file = await FileMeta.findById(request.params.fileId);

            response.status(200).send(file);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async updateProjectAttachment(request: Auth0Request, response: Response) {
        try {

            const operations = [];

            const fileMeta = await FileMeta.findById(request.params.fileId);

            if (!fileMeta) {
                const error = new NotFoundError('file not found');
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
                request.user.sub,
                request.params.id,
                ProjectMemberRole.Developer
            );

            if (request.body.filename) {

                const uniqueFilename = `${fileMeta.prefix}/${fileMeta.filename}`;
                const fileReference = storageService.getFileReference(uniqueFilename);
                const extensionIndex = fileMeta.filename.lastIndexOf('.');
                const currentFileExtension = extensionIndex !== -1 ? fileMeta.filename.slice(extensionIndex) : '';

                const newUniqueFilename = `${fileMeta.prefix}/${request.body.filename + currentFileExtension}`;

                operations.push(fileReference.rename(newUniqueFilename));
                operations.push(fileMeta.updateOne({
                    filename: request.body.filename + currentFileExtension
                }));
            }

            if (request.body.description) {
                operations.push(fileMeta.updateOne({
                    description: request.body.description
                }));
            }

            if (request.body.description === '') {
                operations.push(fileMeta.updateOne({
                    $unset: {
                        description: 1
                    }
                }));
            }

            await global.Promise.all(operations);

            // returning the updated file to avoid doing the data processing in f/e to update the f/e store
            const updatedFile = await FileMeta.findById(request.params.fileId);

            response.status(200).send(updatedFile);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProjectAttachments(request: Auth0Request, response: Response) {
        try {

            const projects = await Project
                .aggregate(projectsQueryService.getProjectAttachmentsAggregateQuery(request.params.id));

            response.status(200).send(projects.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }
}

export const projectsController = new ProjectsController();
