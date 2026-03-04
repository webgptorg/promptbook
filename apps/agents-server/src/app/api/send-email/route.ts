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
        const result = await send_email(payload);

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
