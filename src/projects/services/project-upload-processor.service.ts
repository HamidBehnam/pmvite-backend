import {FileOptions, FileUploadResult, ProjectAuthorization} from "../../common/types/interfaces";
import {projectAuthorizationService} from "./project-authorization.service";
import {FileCategory, ProjectMemberRole} from "../../common/types/enums";
import {BadRequestError} from "../../common/types/errors";
import {dbService} from "../../common/services/db.service";

class ProjectUploadProcessorService {

    async process(projectId: string, userId: string, file: Express.Multer.File, requiredRole: ProjectMemberRole, fileCategory: FileCategory, error: any): Promise<FileUploadResult> {

        if (error) {
            throw new BadRequestError(error)
        }

        if (!file) {
            throw new BadRequestError('file is not sent');
        }

        const projectAuthorization: ProjectAuthorization = await projectAuthorizationService.authorize(
            userId,
            projectId,
            requiredRole
        );

        const fileOptions: FileOptions = {
            gridFSBucketWriteStreamOptions: {
                metadata: {
                    project: projectAuthorization.project._id
                }
            }
        };

        return await dbService.saveFile(fileCategory, file, fileOptions);
    }
}

export const projectUploadProcessorService = new ProjectUploadProcessorService();
