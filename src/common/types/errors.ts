// the reason for adding the GenericError type is because express doesn't send the error object of the errors with the
// type of "Error" properly. For instance if you throw new Error('error') and try to send it to client using:
// response.send(error), an empty error message will be sent to the client.
export class GenericError extends Error {
    error: string;

    constructor(message: string) {
        super(message);
        this.name = 'GenericError';
        this.error = message;
        Error.captureStackTrace(this, GenericError);
        // added setPrototypeOf to be able to get the error type using instanceof:
        // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, GenericError.prototype);
    }
}

export class NotFoundError extends GenericError {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class BadRequestError extends GenericError {
    constructor(message: string) {
        super(message);
        this.name = 'BadRequestError';
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

export class NotAuthorizedError extends GenericError {
    constructor(message: string) {
        super(message);
        this.name = 'NotAuthorizedError';
        Object.setPrototypeOf(this, NotAuthorizedError.prototype);
    }
}

