import {Document, model, Model, Schema} from "mongoose";

export interface IEmail extends Document {
    userId: string;
    email: string;
}

const EmailSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }
});

export const Email: Model<IEmail> = model('Email', EmailSchema);

