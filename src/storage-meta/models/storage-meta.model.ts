import {Document, model, Model, Schema} from "mongoose";

export interface IStorageMeta extends Document {
    userId: string;
    capacity: number;
}

const StorageMetaSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

export const StorageMeta: Model<IStorageMeta> = model('StorageMeta', StorageMetaSchema);
