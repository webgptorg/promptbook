import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { send_email } from '../../../tools/send_email';

/**
 * API endpoint for sending emails via the Agents Server queue.
 *
 * This endpoint proxies the server-side send_email tool for browser usage.
 *
 * @route POST /api/send-email
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        const to = payload?.to;
        const cc = payload?.cc;
        const subject = payload?.subject;
        const body = payload?.body;

        if (!Array.isArray(to) || to.length === 0) {
            return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
        }

        if (cc !== undefined && !Array.isArray(cc)) {
            return NextResponse.json({ error: 'CC must be an array of email addresses' }, { status: 400 });
        }

        if (typeof subject !== 'string' || subject.trim() === '') {
            return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
        }

        if (typeof body !== 'string' || body.trim() === '') {
            return NextResponse.json({ error: 'Body is required' }, { status: 400 });
        }

        const result = await send_email({ to, cc, subject, body });

        return NextResponse.json(
            {
                success: true,
                result,
            },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    } catch (error) {
        assertsError(error);
        console.error('Error sending email:', error);

        return NextResponse.json(
            {
                error: serializeError(error),
                success: false,
            },
            { status: 500 },
        );
    }
}
