import {Router} from "express";
import {authMiddleware} from "../common/middlewares/auth.middleware";
import {profilesController} from "./controllers/profiles.controller";
import {fieldsMiddleware} from "../common/middlewares/fields.middleware";
import {profilesJoiService} from "./services/profiles-joi.service";
import {ValidationDataSource} from "../common/types/enums";

export const profilesRoutesConfig = (): Router => {

    const profileRouter = Router();

    profileRouter.post('/profiles', [
        authMiddleware.checkJwt,
        fieldsMiddleware.disallow(['userId', 'originalImageLink']),
        profilesController.createProfile
    ]);

    profileRouter.get('/profiles', [
        authMiddleware.checkJwt,
        /*
        the reason for commenting the validation out is because a deferred validation (in controller) is needed
        for this endpoint due to the possibility of sending wrong query params by users in the app's url.
        So the proper approach could be not sending the error messages instead proceeding
        with the request and ignoring the wrong query params.
        */
        // fieldsMiddleware.validate(profilesJoiService.getProfilesSchema, ValidationDataSource.Query),
        profilesController.getProfiles
    ]);

    profileRouter.get('/profiles-autocomplete', [
        authMiddleware.checkJwt,
        fieldsMiddleware.validate(profilesJoiService.getProfilesAutocompleteSchema, ValidationDataSource.Query),
        profilesController.getProfilesAutocomplete
    ]);

    profileRouter.get('/profiles/:id', [
        authMiddleware.checkJwt,
        profilesController.getProfile
    ]);

    profileRouter.patch('/profiles/:id', [
        authMiddleware.checkJwt,
        fieldsMiddleware.disallow(['userId', 'originalImageLink']),
        profilesController.updateProfile
    ]);

    profileRouter.delete('/profiles/:id', [
        authMiddleware.checkJwt,
        profilesController.deleteProfile
    ]);

    profileRouter.get('/user-profiles/:id', [
        authMiddleware.checkJwt,
        profilesController.getUserProfile
    ]);

    profileRouter.post('/profiles/:id/images', [
        authMiddleware.checkJwt,
        profilesController.uploadProfileImage
    ]);

    profileRouter.get('/profiles/:id/images/:fileId', [
        profilesController.getProfileImage
    ]);

    profileRouter.delete('/profiles/:id/images/:fileId', [
        authMiddleware.checkJwt,
        profilesController.deleteProfileImage
    ]);

    return profileRouter;
};
