import express = require("express");
import cors = require("cors");
import http = require("http");
import {Application} from "express";
import {dbService} from "./common/services/db.service";
import {configService} from "./common/services/config.service";
import {profilesRoutesConfig} from "./profiles/routes.config";
import {projectsRoutesConfig} from "./projects/routes.config";
import {usersRoutesConfig} from "./users/routes.config";
import {membersRoutesConfig} from "./members/routes.config";
import {tasksRoutesConfig} from "./tasks/routes.config";
import {morganMiddleware} from "./common/middlewares/morgan.middleware";
import {winstonService} from "./common/services/winston.service";
import {authMiddleware} from './common/middlewares/auth.middleware';

configService.secretLoader().then(_ => {

    dbService.connectDB();

    const app: Application = express();
    const main: Application = express();

    // https://stackoverflow.com/a/51844327/2281403
    app.use(express.json());
    // https://stackoverflow.com/a/25471936/2281403
    app.use(express.urlencoded({ extended: true }));

    app.use(cors({
        origin: configService.cors_allowed_origins
    }));

    app.use(authMiddleware.checkJwt);
    app.use(morganMiddleware.morgan);
    app.use(profilesRoutesConfig());
    app.use(projectsRoutesConfig());
    app.use(usersRoutesConfig());
    app.use(membersRoutesConfig());
    app.use(tasksRoutesConfig());

    main.use('/api/v1', app);

    // https://stackoverflow.com/q/17696801/2281403
    const server = http.createServer(main);

    server.listen(configService.port, () => {
        return winstonService.Logger.info(`server is listening on ${configService.port}`);
    });
});
