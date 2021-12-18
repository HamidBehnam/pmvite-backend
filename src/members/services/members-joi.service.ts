import Joi from 'joi';
import { ProjectMemberRole } from '../../common/types/enums';

class MembersJoiService {
    private readonly _getMembersSchema = Joi.object({
        limit: Joi.number().integer().min(1).max(100),
        page: Joi.number().integer().min(1),
        sort: Joi.string().valid('role', '-role', 'roleTitle', '-roleTitle', 'createdAt', '-createdAt'),
        role: Joi.array().items(Joi.number().integer().valid(
            ProjectMemberRole.Contributor,
            ProjectMemberRole.Developer,
            ProjectMemberRole.Admin,
            ProjectMemberRole.Creator
        ))
    });

    get getMembersSchema(): Joi.ObjectSchema<any> {
        return this._getMembersSchema;
    }
}

export const membersJoiService = new MembersJoiService();
