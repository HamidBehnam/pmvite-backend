import winston from "winston";
import * as path from "path";

class WinstonService {
    private levels = {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    }

    private colors = {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'white',
    }

    private format = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
            (info) => `${info.timestamp} ${info.level}: ${info.message}`,
        ),
    )

    private transports = [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: path.resolve(__dirname, '../logs/error.log'),
            level: 'error',
        }),
        new winston.transports.File({
            filename: path.resolve(__dirname, '../logs/all.log')
        }),
    ]

    constructor() {
        winston.addColors(this.colors)
    }

    private level() {
        // Note: if you're using webpack and you're passing --env NODE_ENV=xyz it'll also set the process.env.NODE_ENV
        const env = process.env.NODE_ENV || 'development'
        const isDevelopment = env === 'development'
        return isDevelopment ? 'debug' : 'warn'
    }

    private _Logger = winston.createLogger({
        level: this.level(),
        levels: this.levels,
        format: this.format,
        transports: this.transports,
    })


    get Logger(): winston.Logger {
        return this._Logger;
    }
}

export const winstonService = new WinstonService();
