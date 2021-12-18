import Joi from "joi";
import { ProjectMemberRole, ProjectStatistic, WorkStatus } from '../../common/types/enums';

class ProjectsJoiService {
    private readonly _getProjectsSchemaCore = {
        limit: Joi.number().integer().min(1).max(100),
        page: Joi.number().integer().min(1),
        sort: Joi.string().valid(
            'title',
            '-title',
            'createdAt',
            '-createdAt',
            ...this.getProjectStatisticsItems('-')
        ),
        role: Joi.array().items(Joi.number().integer().valid(
            ProjectMemberRole.Contributor,
            ProjectMemberRole.Developer,
            ProjectMemberRole.Admin,
            ProjectMemberRole.Creator
        )),
        status: Joi.array().items(Joi.string().valid(
            WorkStatus.NotStarted,
            WorkStatus.InProgress,
            WorkStatus.InQA,
            WorkStatus.InUAT,
            WorkStatus.MoreWorkIsNeeded,
            WorkStatus.Done,
            WorkStatus.Accepted,
        )),
        stat: Joi.array().items(Joi.string().valid(
            ProjectStatistic.MembersStat,
            ProjectStatistic.AttachmentsStat,
            ProjectStatistic.ActiveTasksStat,
            ProjectStatistic.AcceptedTasksStat,
            ProjectStatistic.AvailableTasksStat
        ))
    };

    get getProjectsSchema(): Joi.ObjectSchema<any> {
        return Joi.object(this._getProjectsSchemaCore);
    }

    get getProjectsSchemaKeys(): string[] {
        return Object.keys(this._getProjectsSchemaCore);
    }

    getProjectStatisticsItems(prefix?: string): string[] {
        let projectStatisticsItems: string[] = [
            ProjectStatistic.MembersStat,
            ProjectStatistic.AttachmentsStat,
            ProjectStatistic.ActiveTasksStat,
            ProjectStatistic.AcceptedTasksStat,
            ProjectStatistic.AvailableTasksStat,
        ];

        if (prefix) {
            projectStatisticsItems = [
                ...projectStatisticsItems,
                ...projectStatisticsItems.map(statisticItem => prefix + statisticItem)
            ];
        }

        return projectStatisticsItems;
    }
}

export const projectsJoiService = new ProjectsJoiService();
