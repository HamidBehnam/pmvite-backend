import fs from "fs";
import dotenv from "dotenv";
import path = require('path');
import {winstonService} from "./winston.service";
import { Map } from 'typescript';

const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

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
    private readonly gcp_project: string;
    private readonly port_explicit: string;
    private readonly port_ref: string;
    private readonly mongodb_uri_ref: string;
    private readonly auth0_domain_ref: string;
    private readonly auth0_audience_ref: string;
    private readonly machine_to_machine_client_id_ref: string;
    private readonly machine_to_machine_client_secret_ref: string;
    private readonly auth0_custom_rule_namespace_ref: string;
    private readonly sendgrid_api_key_ref: string;
    private readonly gcp_storage_bucket_name_ref: string;
    private readonly storage_default_capacity_ref: string;
    private readonly cors_allowed_origins_ref: string;
    private readonly secretReferenceMap = new Map<string, string>();
    private secretLoaderPromises: Promise<any>[];

    constructor() {
        /*
         the reason that GCP_PROJECT (google cloud project) is not in secret manager is because it needs
         to be available to be able to get the secrets defined in google cloud project's secret manager.
        */
        this.gcp_project = process.env.GCP_PROJECT as string;
        /*
         the reason that there are 2 env variables PORT and PORT_REF is because PORT
         is the env variable that will be injected by Cloud Run and PORT_REF is the
         env variable which will be used in case PORT is not injected by Cloud Run.
        */
        this.port_explicit = process.env.PORT as string;
        this.port_ref = process.env.PORT_REF as string;
        this.mongodb_uri_ref = process.env.MONGODB_URI_REF as string;
        this.auth0_domain_ref = process.env.AUTH0_DOMAIN_REF as string;
        this.auth0_audience_ref = process.env.AUTH0_AUDIENCE_REF as string;
        this.machine_to_machine_client_id_ref = process.env.MACHINE_TO_MACHINE_CLIENT_ID_REF as string;
        this.machine_to_machine_client_secret_ref = process.env.MACHINE_TO_MACHINE_CLIENT_SECRET_REF as string;
        this.auth0_custom_rule_namespace_ref = process.env.AUTH0_CUSTOM_RULE_NAMESPACE_REF as string;
        this.sendgrid_api_key_ref = process.env.SENDGRID_API_KEY_REF as string;
        this.gcp_storage_bucket_name_ref = process.env.GCP_STORAGE_BUCKET_NAME_REF as string;
        this.storage_default_capacity_ref = process.env.STORAGE_DEFAULT_CAPACITY_REF as string;
        this.cors_allowed_origins_ref = process.env.CORS_ALLOWED_ORIGINS_REF as string;

        this.secretReferenceMap.set(this.port_ref, '');
        this.secretReferenceMap.set(this.mongodb_uri_ref, '');
        this.secretReferenceMap.set(this.auth0_domain_ref, '');
        this.secretReferenceMap.set(this.auth0_audience_ref, '');
        this.secretReferenceMap.set(this.machine_to_machine_client_id_ref, '');
        this.secretReferenceMap.set(this.machine_to_machine_client_secret_ref, '');
        this.secretReferenceMap.set(this.auth0_custom_rule_namespace_ref, '');
        this.secretReferenceMap.set(this.sendgrid_api_key_ref, '');
        this.secretReferenceMap.set(this.gcp_storage_bucket_name_ref, '');
        this.secretReferenceMap.set(this.storage_default_capacity_ref, '');
        this.secretReferenceMap.set(this.cors_allowed_origins_ref, '');

        this.secretLoaderPromises = [];
    }

    secretLoader() {
        const client = new SecretManagerServiceClient();

        this.secretLoaderPromises = [];

        this.secretReferenceMap.forEach((value: string, key: string) => {
            if (key === this.port_ref && this.port_explicit) {
                /*
                 this is because the Google Cloud Run requirement is to make sure if PORT is injected by
                 Cloud Run the server must listen on that port and if it's not injected by
                 Cloud Run the server could listen on any ports that is defined in the secret manager.
                */
                this.secretReferenceMap.set(this.port_ref, this.port_explicit);
                return;
            }

            const accessSecretPromise = client.accessSecretVersion({
                name: `projects/${this.gcp_project}/secrets/${key}/versions/latest`,
            });

            this.secretLoaderPromises.push(accessSecretPromise);

            accessSecretPromise.then((response: any) => {
                const [secretData] = response;
                this.secretReferenceMap.set(key, secretData.payload.data.toString('utf8'));
            });
        });

        return Promise.all(this.secretLoaderPromises);
    }

    get port(): string {
        return this.secretReferenceMap.get(this.port_ref) as string;
    }

    get mongodb_uri(): string {
        return this.secretReferenceMap.get(this.mongodb_uri_ref) as string;
    }

    get auth0_domain(): string {
        return this.secretReferenceMap.get(this.auth0_domain_ref) as string;
    }

    get auth0_audience(): string {
        return this.secretReferenceMap.get(this.auth0_audience_ref) as string;
    }

    get machine_to_machine_client_id(): string {
        return this.secretReferenceMap.get(this.machine_to_machine_client_id_ref) as string;
    }

    get machine_to_machine_client_secret(): string {
        return this.secretReferenceMap.get(this.machine_to_machine_client_secret_ref) as string;
    }

    get auth0_custom_rule_namespace(): string {
        return this.secretReferenceMap.get(this.auth0_custom_rule_namespace_ref) as string;
    }

    get sendgrid_api_key(): string {
        return this.secretReferenceMap.get(this.sendgrid_api_key_ref) as string;
    }

    get gcp_storage_bucket_name(): string {
        return this.secretReferenceMap.get(this.gcp_storage_bucket_name_ref) as string;
    }

    get storage_default_capacity(): string {
        return this.secretReferenceMap.get(this.storage_default_capacity_ref) as string;
    }

    get cors_allowed_origins(): RegExp[] {
        return (this.secretReferenceMap.get(this.cors_allowed_origins_ref) as string).split(',')
            .map(pattern => new RegExp(pattern.trim()));
    }
}

export const configService = new ConfigService();
