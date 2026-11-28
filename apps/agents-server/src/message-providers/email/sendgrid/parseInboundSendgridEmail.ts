import type { InboundEmail } from '../_common/Email';
import { parseInboundEmail } from '../_common/parseInboundEmail';

/**
 * Function parseInboundSendgridEmail will parse raw inbound email from Sendgrid and return Email object
 */
export async function parseInboundSendgridEmail(rawEmail: string): Promise<InboundEmail> {
    return parseInboundEmail(rawEmail);
}
