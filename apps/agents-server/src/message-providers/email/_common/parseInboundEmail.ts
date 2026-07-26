import type { string_email, string_markdown } from '@promptbook-local/types';
import { simpleParser, type AddressObject, type EmailAddress as ParsedEmailAddress } from 'mailparser';
import TurndownService from 'turndown';
import { extractBodyContentFromHtml } from '../../../utils/content/extractBodyContentFromHtml';
import type { EmailAddress, InboundEmail } from './Email';
import { parseEmailAddress } from './utils/parseEmailAddress';

/**
 * Parses one RFC 5322 message into the shared inbound-email representation.
 */
export async function parseInboundEmail(rawEmail: string | Buffer): Promise<InboundEmail> {
    const parsedEmail = await simpleParser(rawEmail);
    const from = parseAddressObjects(parsedEmail.from);
    const to = parseAddressObjects(parsedEmail.to);
    const cc = parseAddressObjects(parsedEmail.cc);
    const turndownService = new TurndownService();
    const content = (parsedEmail.html
        ? turndownService.turndown(extractBodyContentFromHtml(parsedEmail.html))
        : parsedEmail.text || '') as string_markdown;

    return {
        channel: 'EMAIL',
        direction: 'INBOUND',
        sender: from[0]?.fullEmail || ('' as string_email),
        recipients: to.map((emailAddress) => emailAddress.fullEmail),
        cc,
        subject: parsedEmail.subject || '',
        content,
        attachments: [
            /* <- TODO: [📯] Parse attachments */
        ],
        metadata: {
            messageId: parsedEmail.messageId || null,
            inReplyTo: parsedEmail.inReplyTo || null,
            references: parsedEmail.references || [],
            autoSubmitted: parsedEmail.headers.get('auto-submitted') || null,
            promptbookAgentReply: parsedEmail.headers.get('x-promptbook-agent-reply') || null,
        },
    };
}

/**
 * Normalizes MailParser's singular-or-array address field.
 */
function normalizeAddressObjects<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) {
        return [];
    }

    return Array.isArray(value) ? value : [value];
}

/**
 * Converts MailParser address structures without splitting quoted display names on commas.
 */
function parseAddressObjects(value: AddressObject | AddressObject[] | undefined): EmailAddress[] {
    return normalizeAddressObjects(value)
        .flatMap((addressObject) => addressObject.value)
        .flatMap(flattenParsedEmailAddress)
        .map((address) => parseEmailAddress(address));
}

/**
 * Recursively extracts mailbox strings from regular and grouped parsed addresses.
 */
function flattenParsedEmailAddress(value: ParsedEmailAddress): string[] {
    return [
        ...(value.address ? [value.address] : []),
        ...(value.group || []).flatMap(flattenParsedEmailAddress),
    ];
}
