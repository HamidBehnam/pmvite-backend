import {NextFunction, Response} from "express";
import Joi, {ValidationResult} from "joi";
import {Auth0Request} from "../types/interfaces";
import {ValidationDataSource} from "../types/enums";
import {BadRequestError} from "../types/errors";
import {errorHandlerService} from "../services/error-handler.service";

class FieldsMiddleware {

    disallow(disallowedFields: string[]) {
        return (request: Auth0Request, response: Response, next: NextFunction) => {
            const sentFields = Object.keys(request.body);
            let foundDisallowedField;
            disallowedFields.some(disallowedField => {
                const hasDisallowedFields = sentFields.includes(disallowedField);
                if (hasDisallowedFields) {
                    foundDisallowedField = disallowedField;
                }
                return hasDisallowedFields;
            });

            if (foundDisallowedField) {
                const error = new BadRequestError(`request data has disallowed fields: ${foundDisallowedField}`);
                return response.status(errorHandlerService.getStatusCode(error)).send(error);
            }

            next();
        };
    }

    validate(schema: Joi.Schema, dataSource?: ValidationDataSource, stripUnknown = true) {
        return (request: Auth0Request, response: Response, next: NextFunction) => {
            let validationDataSource;

            switch (dataSource) {
                case ValidationDataSource.Headers:
                    validationDataSource = request.headers;
                    break;
                case ValidationDataSource.Query:
                    validationDataSource = request.query;
                    break;
                case ValidationDataSource.Body:
                default:
                    validationDataSource = request.body;
                    break;
            }

            const validationResult: ValidationResult = schema.validate(validationDataSource, {
                // stringUnknown: false, will only let params which are in the schema be in the query parameters
                stripUnknown
            });

            if (validationResult.error) {
                return response.status(errorHandlerService.getStatusCode(validationResult.error))
                    .send(validationResult.error);
            }

            next();
        };
    }
}

export const fieldsMiddleware = new FieldsMiddleware();
