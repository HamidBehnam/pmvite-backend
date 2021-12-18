import fs from "fs";
import dotenv from "dotenv";
import path = require('path');
import {winstonService} from "./winston.service";

const envPath = path.resolve(__dirname, '../.env');
// the alternative path is added to cover the cases where I need to compile using
// tsc compiler locally and for debugging purposes
const envPathAlternative = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath) || fs.existsSync(envPathAlternative)) {
    winstonService.Logger.info("Using .env file to provide config environment variables");
    dotenv.config({ path: fs.existsSync(envPath) ? envPath : envPathAlternative });
} else {
    throw new Error('please provide the .env file.');
}

class ConfigService {
    private readonly _port;
    private readonly _mongodb_uri: string;
    private readonly _auth0_domain: string;
    private readonly _auth0_audience: string;
    private readonly _machine_to_machine_client_id: string;
    private readonly _machine_to_machine_client_secret: string;
    private readonly _auth0_custom_rule_namespace: string;
    private readonly _sendgrid_api_key: string;
    private readonly _cors_allowed_origins: string;

    constructor() {
        this._port = process.env.PORT;
        this._mongodb_uri = process.env.MONGODB_URI as string;
        this._auth0_domain = process.env.AUTH0_DOMAIN as string;
        this._auth0_audience = process.env.AUTH0_AUDIENCE as string;
        this._machine_to_machine_client_id = process.env.MACHINE_TO_MACHINE_CLIENT_ID as string;
        this._machine_to_machine_client_secret = process.env.MACHINE_TO_MACHINE_CLIENT_SECRET as string;
        this._auth0_custom_rule_namespace = process.env.AUTH0_CUSTOM_RULE_NAMESPACE as string;
        this._sendgrid_api_key = process.env.SENDGRID_API_KEY as string;
        this._cors_allowed_origins = process.env.CORS_ALLOWED_ORIGINS as string;
    }


    get port() {
        return this._port;
    }

    get mongodb_uri(): string {
        return this._mongodb_uri;
    }

    get auth0_domain(): string {
        return this._auth0_domain;
    }

    get auth0_audience(): string {
        return this._auth0_audience;
    }

    get machine_to_machine_client_id(): string {
        return this._machine_to_machine_client_id;
    }

    get machine_to_machine_client_secret(): string {
        return this._machine_to_machine_client_secret;
    }

    get auth0_custom_rule_namespace(): string {
        return this._auth0_custom_rule_namespace;
    }

    get sendgrid_api_key(): string {
        return this._sendgrid_api_key;
    }

    get cors_allowed_origins(): RegExp[] {
        return this._cors_allowed_origins.split(',')
            .map(pattern => new RegExp(pattern.trim()));
    }
}

export const configService = new ConfigService();
