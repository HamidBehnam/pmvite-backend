import {Document, model, Model, Schema} from "mongoose";

export interface IFileMeta extends Document {
    filename: string;
    contentType: string;
    prefix: string;
    uploadedBy: string;
    storageOwner: string;
    description: string;
    size: number;
    available: boolean;
}

const FileMetaSchema: Schema = new Schema({
    filename: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true
    },
    prefix: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: String,
        required: true
    },
    storageOwner: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    size: {
        type: Number,
        required: true
    },
    available: {
        type: Boolean,
        required: true
    }
}, {
    timestamps: true
});

export const FileMeta: Model<IFileMeta> = model('FileMeta', FileMetaSchema);
