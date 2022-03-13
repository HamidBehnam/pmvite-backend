import {NextFunction, Response} from "express";
import {Profile, profilesProjection} from "../models/profiles.model";
import {authService} from "../../common/services/auth.service";
import {Email} from "../../emails/models/emails.model";
import {configService} from "../../common/services/config.service";
import {profilesQueryService} from "../services/profiles-query.service";
import {multerMiddleware} from "../../common/middlewares/multer.middleware";
import {dbService} from "../../common/services/db.service";
import {Types} from "mongoose";
import {
    Auth0MetaData,
    Auth0Request,
    FileStreamData,
} from "../../common/types/interfaces";
import {FileCategory} from "../../common/types/enums";
import {errorHandlerService} from "../../common/services/error-handler.service";
import {BadRequestError, NotFoundError} from "../../common/types/errors";
import { Member } from '../../members/models/members.model';
import { queryService } from '../../common/services/query.service';
import { Project } from '../../projects/models/projects.model';
import { Task } from '../../tasks/models/tasks.model';
import { profilesJoiService } from '../services/profiles-joi.service';
import { StorageMeta } from '../../storage-meta/models/storage-meta.model';
import { storageService } from '../../common/services/storage.service';

class ProfilesController {
     async createProfile(request: Auth0Request, response: Response, next: NextFunction) {
        try {

            const existingProfile = await Profile.findOne({userId: request.user.sub});

            if (existingProfile) {
                const error = new BadRequestError('user already has a profile');
                response.status(errorHandlerService.getStatusCode(error)).send(error);
                return next();
            }

            const profileData = {
                ...request.body,
                userId: request.user.sub,
                originalImageLink: request.user[`${configService.auth0_custom_rule_namespace}original_image`]
            };

            const emailData = {
                userId: request.user.sub,
                email: request.user[`${configService.auth0_custom_rule_namespace}email`]
            };

            const storageData = {
                userId: request.user.sub,
                capacity: + configService.storage_default_capacity
            };

            const userProfile = await Profile.create(profileData);
            const userEmail = await Email.create(emailData);
            const userStorage = await StorageMeta.create(storageData);

            // todo: the following approach in terms of adding the profile status to the token might be useful for
            //  insensitive scenarios like f/e scenarios but might not work for all the b/e scenarios because we can't
            //  revoke the access token in Auth0, as a result the next request still comes with the wrong value in the
            //  token, this approach (adding the information to the token) might work for insensitive data where we won't
            //  lose much even if user sends the current token before it gets expired

            const metadata: Auth0MetaData = {
                app_metadata: {
                    has_profile: true
                }
            };

            await authService.updateMetaData(request.user.sub, metadata);

            response.status(201).send(userProfile);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProfiles(request: Auth0Request, response: Response) {
        try {

            const validatedQueryParams = queryService.silentValidator(profilesJoiService.getProfilesSchema,
                profilesJoiService.getProfilesSchemaKeys, request.query);

            const processedQueryParams = queryService.queryParamsProcessor(validatedQueryParams);

            const profiles = await Profile
                .aggregate(profilesQueryService.getProfilesAggregateQuery(request.user.sub, processedQueryParams));

            response.status(200).send(profiles.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProfilesAutocomplete(request: Auth0Request, response: Response) {
        try {

            const queryParams = queryService.queryParamsProcessor(request.query,
                profilesQueryService.profilesAutocompleteDefaultQueryParams);

            const projectId = request.get('projectId');
            let excludedMemberProfileIds: Types.ObjectId[] = [];

            if (projectId) {
                const currentMembers = await Member.find({project: projectId});

                if (currentMembers) {

                    excludedMemberProfileIds = currentMembers.map(member => member.profile);
                }
            }

            const aggregateQuery = profilesQueryService
                .getProfilesAggregateQueryAutocomplete(request.user.sub, queryParams.term, excludedMemberProfileIds);

            const profiles = await Profile
                .aggregate(aggregateQuery)
                .skip(--queryParams.page * queryParams.limit)
                .limit(queryParams.limit)
                .sort(queryParams.sort);

            response.status(200).send(profiles);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async getProfile(request: Auth0Request, response: Response) {
        try {

            const profile = await Profile
                .aggregate(profilesQueryService.getProfileAggregateQuery(request.user.sub, request.params.id));

            response.status(200).send(profile.pop());
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async updateProfile(request: Auth0Request, response: Response) {
         try {
             const updatedProfile = await Profile.findOneAndUpdate({
                 _id: request.params.id,
                 userId: request.user.sub
             }, request.body, {
                 new: true,
                 runValidators: true
             });

             if (!updatedProfile) {
                 const error = new NotFoundError('the profile does not exist or does not belong to the user');
                 return response.status(errorHandlerService.getStatusCode(error)).send(error);
             }

             response.status(200).send(updatedProfile);
         } catch (error) {

             response.status(errorHandlerService.getStatusCode(error)).send(error);
         }
    }

    async deleteProfile(request: Auth0Request, response: Response) {
         try {
             const foundProfile = await Profile.findOne({
                 _id: request.params.id,
                 userId: request.user.sub
             });

             if (!foundProfile) {
                 const error = new NotFoundError('the profile does not exist or does not belong to the user');
                 return response.status(errorHandlerService.getStatusCode(error)).send(error);
             }

             const attachedMembers = await Member.find({
                 profile: foundProfile._id
             });

             await global.Promise.all(attachedMembers.map(member => Project.findByIdAndUpdate(member.project, {
                 $pull: {
                     members: member._id
                 }
             })));

             await global.Promise.all(attachedMembers.map(member => Task.updateMany({
                 assignee: member._id
             }, {
                 $unset: {
                     assignee: 1,
                     assigneeUserId: 1
                 }
             })));

             await Member.deleteMany({
                 profile: foundProfile._id
             });

             if (foundProfile.image) {
                 await dbService.deleteFile(FileCategory.Images, foundProfile.image.toString());
             }

             await foundProfile.deleteOne();

             response.status(200).send({
                 message: 'profile was successfully deleted'
             });
         } catch (error) {

             response.status(errorHandlerService.getStatusCode(error)).send(error);
         }
    }

    async getUserProfile(request: Auth0Request, response: Response) {
        try {
            const foundProfiles = await Profile
                .find({userId: request.params.id === 'me' ? request.user.sub : request.params.id})
                .populate('image');

            // used pop() because the user won't have more than 1 profile.
            const userProfile = foundProfiles.pop();

            response.status(200).send(userProfile);
        } catch (error) {

            response.status(errorHandlerService.getStatusCode(error)).send(error);
        }
    }

    async uploadProfileImage(request: Auth0Request, response: Response) {

        multerMiddleware.imageMulter('image')(request, response, async (error: any) => {
            try {

                if (error) {
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                if (!request.file) {
                    const error = new BadRequestError('file is not sent');
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                const profile = await Profile.findOne({
                    _id: request.params.id,
                    userId: request.user.sub
                });

                if (!profile) {
                    const error = new NotFoundError("profile does not exist or does not belong to the user");
                    return response.status(errorHandlerService.getStatusCode(error)).send(error);
                }

                const oldImageId = profile.image;

                const createdFileMeta = await storageService.uploadFile(request.user.sub, request.user.sub, request.file);

                await profile.updateOne({
                    image: createdFileMeta._id
                });

                if (oldImageId) {

                    await storageService.deleteFile(oldImageId.toString());
                }

                response.status(201).send(createdFileMeta);
            } catch (error) {

                response.status(errorHandlerService.getStatusCode(error)).send(error);
            }
        });
    }

    async deleteProfileImage(request: Auth0Request, response: Response) {
         try {

             const profile = await Profile.findOne({
                 _id: request.params.id,
                 userId: request.user.sub
             });

             if (!profile) {
                 const error = new NotFoundError('the profile does not exist or does not belong to the user');
                 return response.status(errorHandlerService.getStatusCode(error)).send(error);
             }

             await dbService.deleteFile(FileCategory.Images, request.params.fileId);

             await profile.updateOne({
                 $unset: {
                     image: 1
                 }
             });

             response.status(201).send({
                 message: 'profile image was successfully removed'
             });
         } catch (error) {

             response.status(errorHandlerService.getStatusCode(error)).send(error);
         }
    }

    async getProfileImage(request: Auth0Request, response: Response) {
         try {

             // loading the profile data before loading its file is not needed atm but the profile id
             // will be in request.params.id
             const fileStreamData: FileStreamData = await storageService.getFileStreamData(request.params.fileId);

             response.header('Content-Disposition', `filename="${fileStreamData.fileMeta.filename}"`);

             fileStreamData.readStream.pipe(response);
         } catch (error) {

             response.status(errorHandlerService.getStatusCode(error)).send(error);
         }
    }
}

export const profilesController = new ProfilesController();
