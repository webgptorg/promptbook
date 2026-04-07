import {
    claimNextQueuedUserChatJob,
    createUserChatJobFailureDetails,
    finalizeUserChatJob,
    persistUserChatJobTerminalState,
    recoverExpiredRunningUserChatJobs,
    resolveUserChatWorkerInternalToken,
    runUserChatJob,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { after, NextResponse } from 'next/server';

/**
 * Allows one worker invocation to run for the platform maximum.
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

        const claimedJob = await claimNextQueuedUserChatJob({ preferredJobId });
        if (!claimedJob) {
            return new Response(null, { status: 204 });
        }

        try {
            await runUserChatJob(claimedJob);
        } catch (error) {
            const failureReason = error instanceof Error ? error.message : 'Chat generation failed.';
            const failureDetails = createUserChatJobFailureDetails({
                job: claimedJob,
                summary: failureReason,
                source: 'userChatJobWorkerRoute',
                provider: claimedJob.provider,
                error,
            });

            console.error('[user-chat-job] unexpected worker failure', {
                chatId: claimedJob.chatId,
                messageId: claimedJob.userMessageId,
                jobId: claimedJob.id,
                error,
            });

            await persistUserChatJobTerminalState({
                job: claimedJob,
                status: 'FAILED',
                failureReason,
                failureDetails,
            }).catch(async () => {
                await finalizeUserChatJob({
                    jobId: claimedJob.id,
                    status: 'FAILED',
                    failureReason,
                    failureDetails,
                });
            });
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
 * Validates internal worker-token or Vercel cron authorization.
 *
 * @private route helper
 */
function isAuthorizedUserChatWorkerRequest(request: Request): boolean {
    return isAuthorizedInternalWorkerRequest(request) || isAuthorizedVercelCronRequest(request);
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

/**
 * Validates the optional Vercel cron bearer token configured via `CRON_SECRET`.
 *
 * @private route helper
 */
function isAuthorizedVercelCronRequest(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const userAgent = request.headers.get('user-agent') || '';

    if (request.method === 'GET' && userAgent.startsWith('vercel-cron/')) {
        return true;
    }

    if (!cronSecret) {
        return false;
    }

    const authorization = request.headers.get('authorization');
    return authorization === `Bearer ${cronSecret}`;
}
