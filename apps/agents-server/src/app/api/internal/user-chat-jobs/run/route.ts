import { processNextLocalUserChatJob } from '@/src/utils/localChatRunner';
import {
    recoverExpiredRunningUserChatJobs,
    resolveUserChatWorkerInternalToken,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { after, NextResponse } from 'next/server';

/**
 * Allows one worker invocation to run for the platform maximum.
 *
 * Next.js requires this segment config to stay a static literal instead of an imported constant.
 */
export const maxDuration = 300;

/**
 * Claims and processes one durable user-chat job in a background-safe route.
 */
export async function GET(request: Request) {
    return handleUserChatJobWorkerRequest(request);
}

/**
 * Claims and processes one durable user-chat job in a background-safe route.
 */
export async function POST(request: Request) {
    return handleUserChatJobWorkerRequest(request);
}

/**
 * Validates authorization and executes one durable user-chat worker tick.
 *
 * @param request - Incoming route request.
 * @returns Worker execution response.
 */
async function handleUserChatJobWorkerRequest(request: Request) {
    if (!isAuthorizedUserChatWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    const body =
        request.method === 'POST'
            ? ((await request.json().catch(() => ({}))) as {
                  preferredJobId?: unknown;
              })
            : {};
    const preferredJobId = typeof body.preferredJobId === 'string' ? body.preferredJobId : undefined;

    try {
        await recoverExpiredRunningUserChatJobs();

        const processedJob = await processNextLocalUserChatJob({ preferredJobId });
        if (!processedJob) {
            return new Response(null, { status: 204 });
        }

        after(() =>
            triggerUserChatJobWorker({ origin }).catch((error) =>
                console.error('[user-chat-job] requeue failed', error),
            ),
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[user-chat-job] worker route failed', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to process durable chat job.',
            },
            { status: 500 },
        );
    }
}

/**
 * Validates the internal worker token.
 *
 * @private route helper
 */
function isAuthorizedUserChatWorkerRequest(request: Request): boolean {
    return isAuthorizedInternalWorkerRequest(request);
}

/**
 * Validates the shared internal worker token.
 *
 * @private route helper
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-user-chat-worker-token');
    return token === resolveUserChatWorkerInternalToken();
}
