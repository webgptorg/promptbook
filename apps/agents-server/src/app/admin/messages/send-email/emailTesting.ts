import type { string_email, string_emails, string_markdown } from '@promptbook-local/types';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { ParseError } from '../../../../../../../src/errors/ParseError';
import { spaceTrim } from '../../../../../../../src/utils/organization/spaceTrim';
import type { OutboundEmail } from '../../../../message-providers/email/_common/Email';
import { parseEmailAddress } from '../../../../message-providers/email/_common/utils/parseEmailAddress';
import { parseEmailAddresses } from '../../../../message-providers/email/_common/utils/parseEmailAddresses';
import { stringifyEmailAddress } from '../../../../message-providers/email/_common/utils/stringifyEmailAddress';
import { getEmailAddressDomain, normalizeEmailDomain } from '../../../../utils/email/agentEmailAddress';

/**
 * Raw values submitted through the administration email testing form.
 */
export type EmailTestingFormValues = {
    readonly from: string;
    readonly to: string;
    readonly subject: string;
    readonly body: string;
};

/**
 * Reads and validates the required values of the administration email testing form.
 */
export function readEmailTestingFormValues(formData: FormData): EmailTestingFormValues {
    return {
        from: readRequiredEmailTestingFormText(formData, 'from'),
        to: readRequiredEmailTestingFormText(formData, 'to'),
        subject: readRequiredEmailTestingFormText(formData, 'subject'),
        body: readRequiredEmailTestingFormText(formData, 'body'),
    };
}

/**
 * Creates the normalized outbound email persisted and delivered by the testing tool.
 */
export function createEmailTestingOutboundEmail(formValues: EmailTestingFormValues): OutboundEmail {
    const sender = parseEmailTestingSender(formValues.from);
    const recipients = parseEmailTestingRecipients(formValues.to);

    return {
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        sender,
        recipients,
        subject: formValues.subject,
        content: formValues.body as string_markdown,
        threadId: crypto.randomUUID(),
        cc: [],
        attachments: [],
        metadata: {},
    };
}

/**
 * Ensures that a normal administrator sends test mail only from the current server's domain.
 */
export function assertEmailTestingSenderDomainAllowed(options: {
    readonly sender: string_email;
    readonly currentServerDomain: string;
    readonly isGlobalAdmin: boolean;
}): void {
    if (options.isGlobalAdmin) {
        return;
    }

    const senderDomain = getEmailAddressDomain(options.sender);
    const currentServerDomain = normalizeEmailDomain(options.currentServerDomain);

    if (senderDomain === currentServerDomain) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            You are only allowed to send test emails from the current server's domain.

            **Current server domain:** \`${currentServerDomain}\`
            **Sender domain:** \`${senderDomain}\`
        `),
    );
}

/**
 * Reads one required string value from the submitted email testing form.
 */
function readRequiredEmailTestingFormText(formData: FormData, fieldName: string): string {
    const value = formData.get(fieldName);

    if (typeof value !== 'string' || !value.trim()) {
        throw new ParseError(
            spaceTrim(`
                The \`${fieldName}\` field is required to send a test email.
            `),
        );
    }

    return value;
}

/**
 * Parses one sender while converting parser failures into a user-facing branded error.
 */
function parseEmailTestingSender(value: string): string_email {
    try {
        return stringifyEmailAddress(parseEmailAddress(value.trim() as string_email));
    } catch (error) {
        throw new ParseError(
            spaceTrim(`
                The \`from\` email address is invalid.

                **Cause:** \`${getEmailTestingErrorMessage(error)}\`
            `),
        );
    }
}

/**
 * Parses one or more comma-separated recipients into transport-ready addresses.
 */
function parseEmailTestingRecipients(value: string): string_email[] {
    let recipients: string_email[];

    try {
        recipients = parseEmailAddresses(value.trim() as string_emails).map(stringifyEmailAddress);
    } catch (error) {
        throw new ParseError(
            spaceTrim(`
                The \`to\` email address is invalid.

                **Cause:** \`${getEmailTestingErrorMessage(error)}\`
            `),
        );
    }

    if (recipients.length > 0) {
        return recipients;
    }

    throw new ParseError(
        spaceTrim(`
            The \`to\` email address is invalid.

            **Cause:** \`No recipient email addresses were provided.\`
        `),
    );
}

/**
 * Gets a safe textual reason from an arbitrary parsing failure.
 */
function getEmailTestingErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
