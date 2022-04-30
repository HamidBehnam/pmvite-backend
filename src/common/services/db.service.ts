import mongoose, { Types } from "mongoose";
import {configService} from "./config.service";
import {winstonService} from "./winston.service";
import {GenericError} from "../types/errors";

class DbService {
    private mongooseInstance: mongoose.Mongoose | null;

    constructor() {
        this.mongooseInstance = null;
    }

    connectDB() {

        if (this.mongooseInstance) {
            throw new GenericError('multiple database initializations')
        }

        mongoose.connect(configService.mongodb_uri)
            .then((mongooseInstance) => {
                this.mongooseInstance = mongooseInstance;
                winstonService.Logger.info("successfully connected to the DB");
            }).catch(error => {
            winstonService.Logger.info("unable to connect to the DB", error);
            // throwing the error to make sure server will stop if there's no db connection.
            throw new Error(error);
        });
    }
}

export const dbService = new DbService();
