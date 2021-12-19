import mongoose, { Types } from "mongoose";
import {configService} from "./config.service";
import {winstonService} from "./winston.service";
import {GridFSBucket, GridFSBucketWriteStreamOptions} from "mongodb";
import {Map} from "typescript";
import {Readable} from "stream";
import {gridFSModelBuilder} from "./gridfs-model-builder.service";
import {GenericError, NotFoundError} from "../types/errors";
import {FileCategory} from "../types/enums";
import {FileOptions, FileStream, FileUploadResult} from "../types/interfaces";

class DbService {
    private mongooseInstance: mongoose.Mongoose | null;
    private gridFSBuckets = new Map<string, GridFSBucket>();

    constructor() {
        this.mongooseInstance = null;
    }

    connectDB() {

        if (this.mongooseInstance) {
            throw new GenericError('multiple database initializations')
        }

        mongoose.connect(configService.mongodb_uri)
            .then((mongooseInstance) => {
                this.mongooseInstance = mongooseInstance;
                gridFSModelBuilder.run();
                winstonService.Logger.info("successfully connected to the DB");
            }).catch(error => {
            winstonService.Logger.info("unable to connect to the DB", error);
            // throwing the error to make sure server will stop if there's no db connection.
            throw new Error(error);
        });
    }

    saveFile(fileCategory: FileCategory,
             file: Express.Multer.File,
             fileOptions: FileOptions = {}): Promise<FileUploadResult> {

        return new Promise<FileUploadResult>((resolve, reject) => {

            const selectedFileName = fileOptions.filename || file.originalname;

            const gridFSBucketWriteStreamOptions: GridFSBucketWriteStreamOptions =
                fileOptions.gridFSBucketWriteStreamOptions || {};

            const uploadStream = this.getGridFSBucket(fileCategory).openUploadStream(selectedFileName, gridFSBucketWriteStreamOptions);
            const readableStream = new Readable();

            readableStream.push(file.buffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);

            uploadStream.on('error', () => reject('error in uploading the file to database'));
            uploadStream.on('finish', () => resolve({
                id: uploadStream.id.toString()
            }));
        });
    }

    deleteFile(fileCategory: FileCategory, fileId: string): Promise<void> {

        return new Promise<void>((resolve, reject) => {

            this.getGridFSBucket(fileCategory).delete(new mongoose.Types.ObjectId(fileId), (error) => {
                if (error) {
                    reject(error.message);
                }

                resolve();
            });
        });
    }

    async getFile(fileCategory: FileCategory, fileId: string): Promise<any> {

        const foundFiles = await this.getGridFSBucket(fileCategory).find({
            _id: new mongoose.Types.ObjectId(fileId)
        }).toArray();

        if (foundFiles.length === 0) {
            throw new NotFoundError('file does not exist');
        }

        return foundFiles.pop();
    }

    async getFileStream(fileCategory: FileCategory, fileId: string): Promise<FileStream> {

        const file = await this.getFile(fileCategory, fileId);

        return {
            file,
            stream: this.getGridFSBucket(fileCategory).openDownloadStream(new mongoose.Types.ObjectId(fileId))
        };
    }

    async renameFile(fileCategory: FileCategory, fileId: string, filename: string): Promise<void> {

        return new Promise<void>((resolve, reject) => {

            this.getGridFSBucket(fileCategory).rename(new mongoose.Types.ObjectId(fileId), filename, (error) => {
                if (error) {
                    reject(error.message);
                }

                resolve();
            });
        });
    }

    async updateFileDescription(fileCategory: FileCategory, fileId: string, description: string): Promise<void> {

        /*
         the reason for not using mongoose and instead querying mongodb directly is because at the time of writing
         mongoose is not fully compatible for writing data to GridFs and the mongoose models that I've created are
         just for reading and adding the references to other mongoose models. Even I've tried to make the GridFS'
         mongoose models not accessible to make sure they can't be used to add data (file) to GridFS.
        */
        return new Promise<void>((resolve, reject) => {
            if (this.mongooseInstance) {
                this.mongooseInstance.connection.db
                    .collection(`${fileCategory}.files`)
                    .updateOne({_id: new mongoose.Types.ObjectId(fileId)},
                        {$set: {'metadata.description': description}})
                    .then(() => resolve())
                    .catch(() => reject());
            } else {
                reject();
            }
        });
    }

    async deleteFileDescription(fileCategory: FileCategory, fileId: string): Promise<void> {

        /*
         the reason for not using mongoose and instead querying mongodb directly is because at the time of writing
         mongoose is not fully compatible for writing data to GridFs and the mongoose models that I've created are
         just for reading and adding the references to other mongoose models. Even I've tried to make the GridFS'
         mongoose models not accessible to make sure they can't be used to add data (file) to GridFS.
        */
        return new Promise<void>((resolve, reject) => {
            if (this.mongooseInstance) {
                this.mongooseInstance.connection.db
                    .collection(`${fileCategory}.files`)
                    .updateOne({_id: new mongoose.Types.ObjectId(fileId)},
                        {$unset: {'metadata.description': 1}})
                    .then(() => resolve())
                    .catch(() => reject());
            } else {
                reject();
            }
        });
    }

    private getGridFSBucket(fileCategory: FileCategory): GridFSBucket {

        let bucket;

        if (this.gridFSBuckets.has(fileCategory)) {
            bucket = this.gridFSBuckets.get(fileCategory);
        } else {
            if (!this.mongooseInstance) {
                throw new GenericError('database is disconnected');
            }

            bucket = DbService.createGridFSBucket(this.mongooseInstance, fileCategory);
            this.gridFSBuckets.set(fileCategory, bucket);
        }

        if (!bucket) {
            throw new GenericError('bucket is not defined');
        }

        return bucket;
    }

    private static createGridFSBucket(mongooseInstance: mongoose.Mongoose, bucketName: string): GridFSBucket {

        return new mongooseInstance.mongo.GridFSBucket(mongooseInstance.connection.db, {
            bucketName
        });
    }
}

export const dbService = new DbService();
