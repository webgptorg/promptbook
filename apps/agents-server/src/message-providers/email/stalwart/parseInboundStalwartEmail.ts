import { ParseError } from '../../../../../../src/errors/ParseError';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import type { InboundEmail } from '../_common/Email';
import { parseInboundEmail } from '../_common/parseInboundEmail';
import type { StalwartMtaHookPayload } from './StalwartMtaHookPayload';

/**
 * Parsed Stalwart inbound message together with the SMTP transport envelope.
 */
export type ParsedInboundStalwartEmail = {
    readonly email: InboundEmail;
    readonly envelopeSender: string;
    readonly envelopeRecipients: ReadonlyArray<string>;
    readonly queueId: string | null;
};

/**
 * Reconstructs an RFC 5322 message from Stalwart's DATA-stage MTA hook payload.
 */
export async function parseInboundStalwartEmail(
    payload: StalwartMtaHookPayload,
): Promise<ParsedInboundStalwartEmail> {
    if (payload.context?.stage?.toUpperCase() !== 'DATA') {
        throw new ParseError(
            spaceTrim(`
                Stalwart sent an unsupported MTA hook stage.

                **Expected:** \`DATA\`
                **Received:** \`${payload.context?.stage || 'missing'}\`
            `),
        );
    }

    const headers = payload.message?.headers;
    const contents = payload.message?.contents;
    const envelopeSender = payload.envelope?.from?.address?.trim() || '';
    const envelopeRecipients = (payload.envelope?.to || [])
        .map((recipient) => recipient.address.trim())
        .filter(Boolean);

    if (!headers || typeof contents !== 'string' || envelopeRecipients.length === 0) {
        throw new ParseError(
            spaceTrim(`
                Stalwart sent an incomplete DATA-stage MTA hook payload.

                Required fields are \`message.headers\`, \`message.contents\`, and \`envelope.to\`.
            `),
        );
    }

    const rawEmail = `${[...(payload.message?.serverHeaders || []), ...headers]
        .map(([name, value]) => `${name}: ${value}`)
        .join('\r\n')}\r\n\r\n${contents}`;

    let email: InboundEmail;
    try {
        email = await parseInboundEmail(rawEmail);
    } catch (error) {
        throw new ParseError(
            spaceTrim(`
                Stalwart supplied an invalid RFC 5322 message.

                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }

    return {
        email,
        envelopeSender,
        envelopeRecipients,
        queueId: payload.context?.queue?.id || null,
    };
}
