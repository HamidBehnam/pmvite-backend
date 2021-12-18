import Joi from 'joi';

class QueryService {
    private readonly _defaultQueryParams: any;

    constructor() {
        this._defaultQueryParams = {
            limit: 10,
            page: 1,
            sort: '-createdAt'
        };
    }

    defaultQueryParamsTypeConvertor(queryParams: any) {
        if (queryParams.limit) {
            queryParams.limit = + queryParams.limit;
        }

        if (queryParams.page)  {
            queryParams.page = + queryParams.page;
        }

        if (queryParams.sort) {
            let sortIndicator = 1;
            let sortField = queryParams.sort;

            if (queryParams.sort.charAt(0) === '-') {
                sortIndicator = -1;
                sortField = queryParams.sort.slice(1);
            }

            queryParams.sort = {
                [sortField]: sortIndicator
            };
        }

        return queryParams;
    }

    get defaultQueryParams(): any {
        return this._defaultQueryParams;
    }

    queryParamsProcessor(queryParams: any,
                       defaultQueryParams = this.defaultQueryParams,
                       typeConvertor = this.defaultQueryParamsTypeConvertor) {
        const getProfilesQueryParams = {
            ...defaultQueryParams,
            ...queryParams
        };

        return typeConvertor(getProfilesQueryParams);
    }

    /*
     will be used to generate the $match object for aggregate queries
    */
    queryFilterBuilder(filter: any, condition: any) {
        filter = filter || {$match: {}};
        filter = {
            ...filter,
            $match: {
                ...filter.$match,
                ...condition
            }
        };

        return filter;
    }

    silentValidator(joiSchema: Joi.ObjectSchema<any>, joiSchemaKeys: string[], dataSource: any) {
        joiSchemaKeys.forEach(schemaKey => {
            if (dataSource[schemaKey] &&
                joiSchema.validate({[schemaKey]: dataSource[schemaKey]}).error) {
                delete dataSource[schemaKey];
            }
        });

        return dataSource;
    }
}

export const queryService = new QueryService();
