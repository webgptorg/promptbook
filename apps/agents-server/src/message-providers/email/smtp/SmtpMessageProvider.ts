import { removeMarkdownFormatting } from '@promptbook-local/markdown-utils';
import type { really_any } from '@promptbook-local/types';
import { marked } from 'marked';
import nodemailer, { type Transporter } from 'nodemailer';
import { MessageProvider } from '../../interfaces/MessageProvider';
import type { OutboundEmail } from '../_common/Email';
import { parseEmailAddress } from '../_common/utils/parseEmailAddress';

/**
 * SMTP provider configuration.
 */
export type SmtpMessageProviderConfiguration = {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
};

/**
 * SMTP-backed message provider used by USE EMAIL runtime sending.
 */
export class SmtpMessageProvider implements MessageProvider {
    private readonly transporter: Transporter;

    public constructor(configuration: SmtpMessageProviderConfiguration) {
        this.transporter = nodemailer.createTransport({
            host: configuration.host,
            port: configuration.port,
            secure: configuration.secure,
            auth: {
                user: configuration.username,
                pass: configuration.password,
            },
        });
    }

    public async send(message: OutboundEmail): Promise<really_any> {
        const sender = parseEmailAddress(message.sender);
        const recipients = (Array.isArray(message.recipients) ? message.recipients : [message.recipients]).filter(
            Boolean,
        ) as string[];
        const ccRecipients = (message.cc || []).map((emailAddress) => {
            if (emailAddress.fullName) {
                return `"${emailAddress.fullName}" <${emailAddress.fullEmail}>`;
            }
            return emailAddress.fullEmail;
        });

        const text = removeMarkdownFormatting(message.content);
        const html = await marked.parse(message.content);

        return this.transporter.sendMail({
            from: sender.fullName
                ? {
                      name: sender.fullName,
                      address: sender.fullEmail,
                  }
                : sender.fullEmail,
            to: recipients,
            cc: ccRecipients.length > 0 ? ccRecipients : undefined,
            subject: message.subject || message.metadata?.subject || 'No Subject',
            text,
            html,
        });
    }
}
