import Joi from "joi";
import { UserStatistic } from '../../common/types/enums';

class ProfilesJoiService {
    private readonly _getProfilesSchemaCore = {
        limit: Joi.number().integer().min(1).max(100),
        page: Joi.number().integer().min(1),
        sort: Joi.string().valid(
            'firstName',
            '-firstName',
            'lastName',
            '-lastName',
            'createdAt',
            '-createdAt',
            ...this.getUserStatisticsItems('-')
        ),
        stat: Joi.array().items(Joi.string().valid(
            ...this.getUserStatisticsItems()
        ))
    };

    private readonly _getProfilesAutocompleteSchemaCore = {
        ...this._getProfilesSchemaCore,
        term: Joi.string()
    };

    get getProfilesSchema(): Joi.ObjectSchema<any> {
        return Joi.object(this._getProfilesSchemaCore);
    }

    get getProfilesAutocompleteSchema(): Joi.ObjectSchema<any> {
        return Joi.object(this._getProfilesAutocompleteSchemaCore);
    }

    get getProfilesSchemaKeys(): string[] {
        return Object.keys(this._getProfilesSchemaCore);
    }

    getUserStatisticsItems(prefix?: string): string[] {
        let userStatisticsItems: string[] = [
            UserStatistic.ActiveTasksStat,
            UserStatistic.AcceptedTasksStat,
            UserStatistic.CreatedProjectsStat,
            UserStatistic.ExternalCollaborationsStat
        ];

        if (prefix) {
            userStatisticsItems = [
                ...userStatisticsItems,
                ...userStatisticsItems.map(statisticItem => prefix + statisticItem)
            ];
        }

        return userStatisticsItems;
    }
}

export const profilesJoiService = new ProfilesJoiService();
