import { string_markdown } from '@promptbook-local/types';
import { simpleParser } from 'mailparser';
import TurndownService from 'turndown';
import { extractBodyContentFromHtml } from '../../../utils/content/extractBodyContentFromHtml';
import type { InboundEmail } from '../_common/Email';
import { parseEmailAddress } from '../_common/utils/parseEmailAddress';
import { parseEmailAddresses } from '../_common/utils/parseEmailAddresses';

/**
 * Function parseInboundSendgridEmail will parse raw inbound email from Sendgrid and return Email object
 */
export async function parseInboundSendgridEmail(rawEmail: string): Promise<InboundEmail> {
    const parsedEmail = await simpleParser(rawEmail);

    const toArray = !Array.isArray(parsedEmail.to)
        ? parsedEmail.to === undefined
            ? []
            : [parsedEmail.to]
        : parsedEmail.to;
    const to = toArray.flatMap((_) => parseEmailAddresses(_.text));

    const ccArray = !Array.isArray(parsedEmail.cc)
        ? parsedEmail.cc === undefined
            ? []
            : [parsedEmail.cc]
        : parsedEmail.cc;
    const cc = ccArray.flatMap((_) => parseEmailAddresses(_.text));

    const turndownService = new TurndownService();

    const content = (parsedEmail.html
        ? turndownService.turndown(extractBodyContentFromHtml(parsedEmail.html))
        : parsedEmail.text || '') as string_markdown;

    const email: InboundEmail = {
        channel: 'EMAIL',
        direction: 'INBOUND',
        sender: parseEmailAddress(parsedEmail.from?.text || '').fullEmail,
        recipients: to.map((_) => _.fullEmail),
        cc,
        subject: parsedEmail.subject || '',
        content,
        attachments: [
            /* <- TODO: [📯] Parse attachments */
        ],
    };

    return email;
}
