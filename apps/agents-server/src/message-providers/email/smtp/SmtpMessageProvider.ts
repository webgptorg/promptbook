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
    isTlsCertificateValidationEnabled?: boolean;
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
            tls: {
                rejectUnauthorized: configuration.isTlsCertificateValidationEnabled ?? true,
            },
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
        const headers = normalizeStringRecord(message.metadata?.headers);

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
            replyTo: normalizeOptionalString(message.metadata?.replyTo),
            inReplyTo: normalizeOptionalString(message.metadata?.inReplyTo),
            references: normalizeStringArray(message.metadata?.references),
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        });
    }
}

/**
 * Normalizes an arbitrary metadata value to an optional non-empty string.
 */
function normalizeOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Normalizes an arbitrary metadata value to a string array.
 */
function normalizeStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalizedValues = value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    return normalizedValues.length > 0 ? normalizedValues : undefined;
}

/**
 * Normalizes custom SMTP headers stored in message metadata.
 */
function normalizeStringRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()),
        ),
    );
}
