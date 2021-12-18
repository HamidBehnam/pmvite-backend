import Joi from 'joi';
import { WorkStatus } from '../../common/types/enums';

class TasksJoiService {
    private readonly _getTasksSchema = Joi.object({
        limit: Joi.number().integer().min(1).max(100),
        page: Joi.number().integer().min(1),
        sort: Joi.string().valid('title', '-title', 'status', '-status', 'createdAt', '-createdAt'),
        status: Joi.array().items(Joi.string().valid(
            WorkStatus.NotStarted,
            WorkStatus.InProgress,
            WorkStatus.InQA,
            WorkStatus.InUAT,
            WorkStatus.MoreWorkIsNeeded,
            WorkStatus.Done,
            WorkStatus.Accepted,
        ))
    });

    get getTasksSchema(): Joi.ObjectSchema<any> {
        return this._getTasksSchema;
    }
}

export const tasksJoiService = new TasksJoiService();
