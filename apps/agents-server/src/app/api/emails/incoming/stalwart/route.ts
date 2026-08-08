import { timingSafeEqual } from 'node:crypto';
import { AuthenticationError } from '../../../../../../../../src/errors/AuthenticationError';
import { EnvironmentMismatchError } from '../../../../../../../../src/errors/EnvironmentMismatchError';
import { ParseError } from '../../../../../../../../src/errors/ParseError';
import { spaceTrim } from '../../../../../../../../src/utils/organization/spaceTrim';
import type { StalwartMtaHookPayload } from '../../../../../message-providers/email/stalwart/StalwartMtaHookPayload';
import { parseInboundStalwartEmail } from '../../../../../message-providers/email/stalwart/parseInboundStalwartEmail';
import { $provideServer } from '../../../../../tools/$provideServer';
import { processInboundAgentEmail } from '../../../../../utils/email/processInboundAgentEmail';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Receives Stalwart's authenticated DATA-stage MTA hook.
 */
export async function POST(request: NextRequest) {
    try {
        verifyStalwartMtaHookAuthorization(request.headers.get('authorization'));
        const payload = (await request.json()) as StalwartMtaHookPayload;
        const parsedEmail = await parseInboundStalwartEmail(payload);

        // Note: `request.nextUrl` describes the internal listener this process was reached on, so behind
        //       the VPS reverse proxy its hostname is `localhost` and never the mail domain. The server
        //       registry is the single source of truth which already decides the database namespace of
        //       this request, so the mail domain and the worker origin are taken from it as well.
        const { publicUrl } = await $provideServer();
        const result = await processInboundAgentEmail({
            email: parsedEmail.email,
            envelope: {
                sender: parsedEmail.envelopeSender,
                recipients: parsedEmail.envelopeRecipients,
                queueId: parsedEmail.queueId,
            },
            domain: publicUrl.hostname,
            origin: publicUrl.origin,
        });

        return NextResponse.json({
            action: 'discard',
            response: {
                status: 250,
                enhancedStatus: '2.0.0',
                message: `Accepted by Agents Server (${result.createdChatIds.length} chat threads).`,
                disconnect: false,
            },
        });
    } catch (error) {
        console.error('[stalwart-mta-hook]', error);

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ParseError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof EnvironmentMismatchError) {
            return NextResponse.json({ error: error.message }, { status: 503 });
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process the inbound email.' },
            { status: 500 },
        );
    }
}

/**
 * Authenticates Stalwart without leaking timing information about the shared hook secret.
 */
function verifyStalwartMtaHookAuthorization(authorization: string | null): void {
    const expectedToken = process.env.PTBK_STALWART_MTA_HOOK_TOKEN;
    if (!expectedToken) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Stalwart inbound email is not configured.

                Set \`PTBK_STALWART_MTA_HOOK_TOKEN\` on the Agents Server.
            `),
        );
    }

    const suppliedToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
    const expectedBuffer = Buffer.from(expectedToken);
    const suppliedBuffer = Buffer.from(suppliedToken);
    const isAuthorized =
        expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);

    if (!isAuthorized) {
        throw new AuthenticationError('Invalid Stalwart MTA hook authorization.');
    }
}
