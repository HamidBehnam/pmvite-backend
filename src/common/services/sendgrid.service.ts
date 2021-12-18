import {MailService} from "@sendgrid/mail";
import {configService} from "./config.service";
import {ClientResponse} from "@sendgrid/client/src/response";

class SendgridService {
    private mailService: MailService;

    constructor() {
        this.mailService = new MailService();
        this.mailService.setApiKey(configService.sendgrid_api_key);
    }

    sendEmail(to: string|{email: string, name?: string}, from: string|{email: string, name?: string}, templateId: string): Promise<[ClientResponse, Record<string, unknown>]> {
        return this.mailService.send({
            to,
            from,
            templateId
        });
    }
}

export const sendgridService = new SendgridService();
