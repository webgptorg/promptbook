import { resolveUserChatWorkerInternalToken } from '@/src/utils/userChat';
import { runUserChatTimeoutWorkerTick } from '@/src/utils/userChatTimeout';
import { NextResponse } from 'next/server';

/**
 * Allows one timeout-worker invocation to run for the platform maximum.
 */
export const maxDuration = 300;

/**
 * Runs one durable timeout-worker tick for Vercel cron and internal wake-ups.
 */
export async function GET(request: Request) {
    return handleUserChatTimeoutWorkerRequest(request);
}

/**
 * Runs one durable timeout-worker tick for internal wake-ups.
 */
export async function POST(request: Request) {
    return handleUserChatTimeoutWorkerRequest(request);
}

/**
 * Validates authorization and executes one timeout-worker tick.
 *
 * @param request - Incoming route request.
 * @returns Worker execution response.
 */
async function handleUserChatTimeoutWorkerRequest(request: Request) {
    if (!isAuthorizedUserChatTimeoutWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await runUserChatTimeoutWorkerTick();
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[user-chat-timeout] worker route failed', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to process durable timeout worker tick.',
            },
            { status: 500 },
        );
    }
}

/**
 * Validates internal worker-token or Vercel cron authorization.
 *
 * @param request - Incoming route request.
 * @returns `true` when the request may execute the timeout worker.
 */
function isAuthorizedUserChatTimeoutWorkerRequest(request: Request): boolean {
    return isAuthorizedInternalWorkerRequest(request) || isAuthorizedVercelCronRequest(request);
}

/**
 * Validates the shared internal worker token used by self-triggered wake-ups.
 *
 * @param request - Incoming route request.
 * @returns `true` when the internal worker token matches.
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-user-chat-worker-token');
    return token === resolveUserChatWorkerInternalToken();
}

/**
 * Validates the optional Vercel cron bearer token configured via `CRON_SECRET`.
 *
 * @param request - Incoming route request.
 * @returns `true` when the request carries the configured cron secret.
 */
function isAuthorizedVercelCronRequest(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET?.trim();

    if (!cronSecret) {
        return false;
    }

    const authorization = request.headers.get('authorization');
    return authorization === `Bearer ${cronSecret}`;
}
