import {Document, model, Model, Schema, Types} from "mongoose";
import {WorkStatus} from "../../common/types/enums";

export interface ITask extends Document {
    assigneeUserId: string;
    assignee: Types.ObjectId;
    project: Types.ObjectId;
    title: string;
    description: string;
    status: string;
}

const TaskSchema: Schema = new Schema({
    assigneeUserId: {
        type: String
    },
    assignee: {
        type: Types.ObjectId,
        ref: 'Member'
    },
    project: {
        type: Types.ObjectId,
        ref: 'Project',
        required: true
    },
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
    }
}, {
    timestamps: true
});

export const Task: Model<ITask> = model('Task', TaskSchema);

