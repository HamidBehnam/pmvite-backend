import {Document, model, Model, Schema} from "mongoose";
import {GenericError} from "../types/errors";

// this is the document interface for <bucketName>.files collection that mongo creates.
export interface IGridFSFile extends Document {
    length: number;
    chunkSize: number;
    uploadDate: Date;
    filename: string;
    md5: string;
    metadata: Record<string, unknown>;
}

class GridFSModelBuilder {
    // setting the models as private to make sure these models won't be access and used
    // to create the documents through mongoose, GridFS needs to be handled directly by Mongo (or third party
    // libraries, which I haven't used in this app), at this time mongoose doesn't have a wrapper around Mongo's GridFS,
    // it's added here only to be able to "populate" the file metadata.
    private image: Model<IGridFSFile>;
    private attachment: Model<IGridFSFile>;

    // this is the schema for <bucketName>.files collection that mongo creates.
    gridFSFileSchema: Schema = new Schema({
        length: {
            type: Number
        },
        chunkSize: {
            type: Number
        },
        uploadDate: {
            type: Date
        },
        filename: {
            type: String
        },
        md5: {
            type: String
        },
        metadata: {
            type: Object
        }
    });

    constructor() {
        this.makeSchemaReadonly();
        this.image = model('Image', this.gridFSFileSchema, 'images.files');
        this.attachment = model('Attachment', this.gridFSFileSchema, 'attachments.files');
    }

    private makeSchemaReadonly() {
        const errorMessage = 'wrong way to manipulate the GridFS';

        const operations = [
            'save',
            'update',
            'updateOne',
            'updateMany',
            'findOneAndRemove',
            'findOneAndDelete',
            'findOneAndUpdate',
            'insertMany',
        ];

        operations.forEach(operation => this.gridFSFileSchema.pre(operation, () => {
            throw new GenericError(errorMessage);
        }))

        this.gridFSFileSchema.pre('de', { document: true, query: false }, () => {
            throw new GenericError(errorMessage);
        })

        this.gridFSFileSchema.pre('remove', { query: true, document: false }, () => {
            throw new GenericError(errorMessage);
        })
    }

    run(): void {
        // doesn't do anything, since the models here are not gonna be used (and imported) like any other mongoose
        // models this function is just to make sure the module is imported and the models are created.
    }
}

export const gridFSModelBuilder = new GridFSModelBuilder();
