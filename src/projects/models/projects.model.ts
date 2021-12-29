import {Document, model, Model, Schema, Types} from "mongoose";
import {IMember} from "../../members/models/members.model";
import {ITask} from "../../tasks/models/tasks.model";
import {IGridFSFile} from "../../common/services/gridfs-model-builder.service";
import {WorkStatus} from "../../common/types/enums";

export interface IProject extends Document {
    title: string;
    description: string;
    status: string;
    createdBy: string;
    objectives: string;
    members: Types.ObjectId[] | IMember[];
    tasks: Types.ObjectId[] | ITask[];
    image: Types.ObjectId | IGridFSFile;
    attachments: Types.ObjectId[] | IGridFSFile[] | string[];
}

const ProjectSchema: Schema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: [
            WorkStatus.NotStarted,
            WorkStatus.InProgress,
            WorkStatus.Done,
            WorkStatus.InQA,
            WorkStatus.InUAT,
            WorkStatus.MoreWorkIsNeeded,
            WorkStatus.Accepted
        ],
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    objectives: {
        type: String,
        required: true
    },
    members: {
        type: [{
            type: Types.ObjectId,
            ref: 'Member'
        }]
    },
    tasks: {
        type: [{
            type: Types.ObjectId,
            ref: 'Task'
        }]
    },
    image: {
        type: Types.ObjectId,
        ref: 'Image'
    },
    attachments: {
        type: [{
            type: String,
            ref: 'Attachment'
        }]
    }
}, {
    toJSON: {
        virtuals: true
    },
    timestamps: true
});

ProjectSchema.virtual("titleStatus").get(function (this: IProject) {
    return `${this.title} - ${this.status}`;
});

export const Project: Model<IProject> = model('Project', ProjectSchema);
