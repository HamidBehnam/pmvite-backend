import multer from "multer";
import {BadRequestError} from "../types/errors";
import {Auth0Request} from "../types/interfaces";

class MulterMiddleware {

    private readonly storage;
    private imageMulterCore;
    private attachmentMulterCore;

    constructor() {
        this.storage = multer.memoryStorage();

        this.imageMulterCore = multer({
            storage: this.storage,
            limits: {
                fileSize: 2000000,
                fields: 0,
                files: 1,
                parts: 1
            },
            fileFilter(req: Auth0Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
                const acceptableFileTypes = [
                    'image/png',
                    'image/jpeg',
                    'image/gif',
                    'image/svg+xml'
                ];

                if (acceptableFileTypes.includes(file.mimetype)) {
                    return callback(null, true);
                }

                callback(new BadRequestError('acceptable files: *.png, *.jpeg, *.jpg, *.gif, *.svg'));
            }
        });

        this.attachmentMulterCore = multer({
            storage: this.storage,
            limits: {
                fileSize: 105906176,
                fields: 0,
                files: 1,
                parts: 1
            },
            fileFilter(req: Auth0Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
                const acceptableFileTypes = [
                    'application/pdf',
                    'application/json',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-powerpoint',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'image/png',
                    'image/jpeg',
                    'text/plain'
                ];

                if (acceptableFileTypes.includes(file.mimetype)) {
                    return callback(null, true);
                }

                callback(new BadRequestError(
                    'acceptable files: *.pdf, *.doc, *.docx, *.ppt, *.pptx, *.xls, *xlsx, *.png, *.jpeg, *.jpg, *.txt, *.json'
                ));
            }
        });
    }

    imageMulter(fieldName: string) {
        return this.imageMulterCore.single(fieldName);
    }

    imageMulterArray(fieldName: string, maxCount: number) {
        return this.imageMulterCore.array(fieldName, maxCount);
    }

    imageMulterFields(fields: any) {
        return this.imageMulterCore.fields(fields);
    }

    attachmentMulter(fieldName: string) {
        return this.attachmentMulterCore.single(fieldName);
    }

    attachmentMulterArray(fieldName: string, maxCount: number) {
        return this.attachmentMulterCore.array(fieldName, maxCount);
    }

    attachmentMulterFields(fields: any) {
        return this.attachmentMulterCore.fields(fields);
    }
}

export const multerMiddleware = new MulterMiddleware();
