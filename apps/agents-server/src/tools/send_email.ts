import type { really_any } from '../../../../src/_packages/types.index';
import { readToolRuntimeContextFromToolArgs } from '../../../../src/commitments/_common/toolRuntimeContext';
import type { Message } from '../../../../src/types/Message';
import type { OutboundEmail } from '../message-providers/email/_common/Email';
import { parseEmailAddresses } from '../message-providers/email/_common/utils/parseEmailAddresses';
import { SmtpMessageProvider } from '../message-providers/email/smtp/SmtpMessageProvider';
import { parseUseEmailSmtpCredential } from '../utils/messages/parseUseEmailSmtpCredential';
import { isSendMessageDeliveryError, sendMessage, type SendMessageResult } from '../utils/messages/sendMessage';
import { USE_EMAIL_SMTP_WALLET_KEY, USE_EMAIL_SMTP_WALLET_SERVICE } from '../utils/useEmailSmtpWalletConstants';

/**
 * Hidden runtime context shape used by USE EMAIL server tool.
 */
type UseEmailRuntimeContext = {
    email?: {
        smtpCredential?: string;
        fromAddress?: string;
    };
};

/**
 * Arguments accepted by `send_email`.
 *
 * The preferred format is `message`, compatible with Promptbook `Message` type.
 * Legacy aliases (`to`, `cc`, `subject`, `body`) are still supported.
 */
type SendEmailToolArgs = {
    message?: Message<string>;
    to?: string[];
    cc?: string[];
    subject?: string;
    body?: string;
    __promptbookToolRuntimeContext?: unknown;
};

/**
 * Structured tool result returned when SMTP wallet credentials are missing.
 */
type EmailWalletCredentialRequiredToolResult = {
    action: 'email-auth';
    status: 'wallet-credential-required';
    recordType: 'ACCESS_TOKEN';
    service: string;
    key: string;
    message: string;
};

/**
 * Tool result returned by `send_email`.
 */
type SendEmailToolResult = {
    action: 'send-email';
    status: 'sent' | 'failed';
    messageId: number;
    from: string;
    to: string[];
    cc: string[];
    subject: string;
    attempts: SendMessageResult['attempts'];
};

/**
 * Sends one outbound email using wallet-backed SMTP credentials and persists message/send attempts.
 */
export async function send_email(args: SendEmailToolArgs): Promise<string> {
    const runtimeContext = (readToolRuntimeContextFromToolArgs(args as Record<string, really_any>) ||
        {}) as UseEmailRuntimeContext;
    const smtpCredentialRaw = runtimeContext.email?.smtpCredential?.trim() || '';
    const defaultFromAddress = runtimeContext.email?.fromAddress?.trim() || undefined;

    if (!smtpCredentialRaw) {
        return JSON.stringify(createEmailWalletCredentialRequiredResult(defaultFromAddress));
    }

    const smtpCredential = parseUseEmailSmtpCredential(smtpCredentialRaw);
    const email = normalizeSendEmailPayload(args, smtpCredential.fromAddress || defaultFromAddress);
    const smtpProvider = new SmtpMessageProvider({
        host: smtpCredential.host,
        port: smtpCredential.port,
        secure: smtpCredential.secure,
        username: smtpCredential.username,
        password: smtpCredential.password,
    });

    try {
        const result = await sendMessage(email, {
            providers: [
                {
                    providerName: 'SMTP',
                    provider: smtpProvider,
                },
            ],
        });
        return JSON.stringify(buildSendEmailToolResult('sent', email, result));
    } catch (error) {
        if (isSendMessageDeliveryError(error)) {
            return JSON.stringify(buildSendEmailToolResult('failed', email, error.result));
        }

        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Builds wallet-required result payload for USE EMAIL.
 */
function createEmailWalletCredentialRequiredResult(
    defaultFromAddress?: string,
): EmailWalletCredentialRequiredToolResult {
    const fromAddressInstruction = defaultFromAddress ? `\nDefault sender from commitment: ${defaultFromAddress}` : '';

    return {
        action: 'email-auth',
        status: 'wallet-credential-required',
        recordType: 'ACCESS_TOKEN',
        service: USE_EMAIL_SMTP_WALLET_SERVICE,
        key: USE_EMAIL_SMTP_WALLET_KEY,
        message: [
            'SMTP credentials are missing in wallet.',
            `Add ACCESS_TOKEN record with service "${USE_EMAIL_SMTP_WALLET_SERVICE}" and key "${USE_EMAIL_SMTP_WALLET_KEY}".`,
            'Put SMTP JSON into Secret, for example:',
            '{"host":"smtp.example.com","port":587,"secure":false,"username":"agent@example.com","password":"..."}',
            fromAddressInstruction,
        ]
            .join('\n')
            .trim(),
    };
}

/**
 * Builds final tool payload from delivery result.
 */
function buildSendEmailToolResult(
    status: SendEmailToolResult['status'],
    email: OutboundEmail,
    sendResult: SendMessageResult,
): SendEmailToolResult {
    const recipients = Array.isArray(email.recipients)
        ? [...email.recipients]
        : email.recipients
        ? [email.recipients]
        : [];

    return {
        action: 'send-email',
        status,
        messageId: sendResult.messageId,
        from: email.sender,
        to: recipients,
        cc: email.cc.map((address: { fullEmail: string }) => address.fullEmail),
        subject: email.subject,
        attempts: sendResult.attempts,
    };
}

/**
 * Normalizes incoming `send_email` arguments into one outbound email payload.
 */
function normalizeSendEmailPayload(args: SendEmailToolArgs, fallbackFromAddress?: string): OutboundEmail {
    const normalizedMessage = isRecord(args.message) ? (args.message as Message<string>) : undefined;
    const normalizedMetadata = isRecord(normalizedMessage?.metadata)
        ? (normalizedMessage?.metadata as Record<string, unknown>)
        : {};

    const recipientsInput = normalizeStringArray(normalizedMessage?.recipients) || normalizeStringArray(args.to);
    const ccInput = normalizeStringArray(normalizedMetadata.cc) || normalizeStringArray(args.cc) || [];
    const subject = normalizeNonEmptyString(normalizedMetadata.subject) || normalizeNonEmptyString(args.subject);
    const body = normalizeNonEmptyString(normalizedMessage?.content) || normalizeNonEmptyString(args.body);
    const sender = normalizeNonEmptyString(normalizedMessage?.sender) || fallbackFromAddress;

    if (!sender) {
        throw new Error('Sender email is missing. Configure sender in USE EMAIL or in SMTP credential.');
    }
    if (!recipientsInput || recipientsInput.length === 0) {
        throw new Error('At least one recipient email address is required.');
    }
    if (!subject) {
        throw new Error('Email subject is required.');
    }
    if (!body) {
        throw new Error('Email body is required.');
    }

    const parsedSender = parseEmailAddresses(sender);
    const senderAddress = parsedSender[0];
    if (!senderAddress) {
        throw new Error('Sender email is invalid.');
    }

    const parsedRecipients = parseEmailAddresses(recipientsInput.join(', '));
    if (parsedRecipients.length === 0) {
        throw new Error('At least one valid recipient email address is required.');
    }
    const parsedCc = ccInput.length > 0 ? parseEmailAddresses(ccInput.join(', ')) : [];
    const threadId =
        typeof normalizedMessage?.threadId === 'string' && normalizedMessage.threadId.trim()
            ? normalizedMessage.threadId
            : undefined;

    return {
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        sender: senderAddress.fullEmail,
        recipients: parsedRecipients.map((recipient) => recipient.fullEmail),
        cc: parsedCc,
        subject,
        content: body,
        attachments: [],
        threadId,
        metadata: {
            ...normalizedMetadata,
            subject,
            cc: parsedCc.map((address) => address.fullEmail),
        },
    };
}

/**
 * Type guard for plain objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalizes one required textual input.
 */
function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}

/**
 * Normalizes array-like string values.
 */
function normalizeStringArray(value: unknown): string[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (Array.isArray(value)) {
        const parsedValues = value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
        return parsedValues.length > 0 ? parsedValues : undefined;
    }

    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        return trimmedValue ? [trimmedValue] : undefined;
    }

    return undefined;
}
