import { $getTableName } from '../../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../../database/$provideSupabaseForServer';
import { parseInboundSendgridEmail } from '../../../../../message-providers/email/sendgrid/parseInboundSendgridEmail';
import {
    resolveSendgridInboundParseWebhookErrorStatus,
    verifySendgridInboundParseWebhook,
} from '../../../../../message-providers/email/sendgrid/verifySendgridInboundParseWebhook';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles post.
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = Buffer.from(await request.arrayBuffer());
        verifySendgridInboundParseWebhook(request.headers, rawBody);

        const formData = await createRequestFromRawBody(request, rawBody).formData();
        const rawEmail = formData.get('email');

        if (typeof rawEmail !== 'string') {
            return NextResponse.json({ error: 'Missing email field' }, { status: 400 });
        }

        const email = await parseInboundSendgridEmail(rawEmail);

        const supabase = await $provideSupabaseForServer();
        const { error } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from(await $getTableName('Message'))
            .insert({
                channel: 'EMAIL',
                direction: 'INBOUND',
                sender: email.sender,
                recipients: email.recipients,
                content: email.content,
                metadata: {
                    subject: email.subject,
                    cc: email.cc,
                    ...email.metadata,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

        if (error) {
            console.error('Failed to insert message', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing inbound email', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: resolveSendgridInboundParseWebhookErrorStatus(error) },
        );
    }
}

/**
 * Recreates a request from verified raw bytes so `formData()` can parse the multipart payload.
 *
 * @param request - Original incoming request.
 * @param rawBody - Verified raw request body.
 * @returns Request with an unread body stream.
 */
function createRequestFromRawBody(request: NextRequest, rawBody: Buffer): Request {
    return new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: new Uint8Array(rawBody),
    });
}
