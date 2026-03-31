import {
    claimNextQueuedUserChatJob,
    finalizeUserChatJob,
    persistUserChatJobTerminalState,
    recoverExpiredRunningUserChatJobs,
    resolveUserChatWorkerInternalToken,
    runUserChatJob,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { loadUserChatBackgroundWorkerIntervalMs } from '@/src/utils/userChat/loadUserChatBackgroundWorkerIntervalMs';
import { after, NextResponse } from 'next/server';

/**
 * Invocation mode used by the durable user-chat worker route.
 *
 * @private route helper
 */
type UserChatJobWorkerInvocationMode = 'interactive' | 'cron';

/**
 * Allows one worker invocation to run for the platform maximum.
 */
export const maxDuration = 300;

/**
 * Claims and processes one durable user-chat job for cron-triggered background catch-up.
 */
export async function GET(request: Request) {
    return handleUserChatJobWorkerRequest(request, 'cron');
}

/**
 * Claims and processes one durable user-chat job in response to explicit interactive wake-ups.
 */
export async function POST(request: Request) {
    return handleUserChatJobWorkerRequest(request, 'interactive');
}

/**
 * Authorizes and executes one durable user-chat worker pass.
 *
 * @param request - Incoming worker route request.
 * @param mode - Invocation mode determining claim and requeue behavior.
 * @returns Worker execution response.
 *
 * @private route helper
 */
async function handleUserChatJobWorkerRequest(request: Request, mode: UserChatJobWorkerInvocationMode) {
    if (!isAuthorizedUserChatWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    const preferredJobId = mode === 'interactive' ? await resolvePreferredJobId(request) : undefined;
    const queuedBefore = mode === 'cron' ? await resolveCronQueuedBeforeIso() : undefined;

    try {
        await recoverExpiredRunningUserChatJobs();

        const claimedJob = await claimNextQueuedUserChatJob({
            preferredJobId,
            queuedBefore,
        });
        if (!claimedJob) {
            return new Response(null, { status: 204 });
        }

        try {
            await runUserChatJob(claimedJob);
        } catch (error) {
            const failureReason = error instanceof Error ? error.message : 'Chat generation failed.';

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
            }).catch(async () => {
                await finalizeUserChatJob({
                    jobId: claimedJob.id,
                    status: 'FAILED',
                    failureReason,
                });
            });
        }

        if (mode === 'interactive') {
            after(() =>
                triggerUserChatJobWorker({ origin }).catch((error) =>
                    console.error('[user-chat-job] requeue failed', error),
                ),
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (isMissingUserChatJobTableError(error)) {
            console.warn('[user-chat-job] worker route skipped because durable chat tables are not available yet.');
            return new Response(null, { status: 204 });
        }

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
 * Resolves the optional preferred job id passed by interactive worker wake-ups.
 *
 * @param request - Incoming route request.
 * @returns Preferred job id when provided.
 *
 * @private route helper
 */
async function resolvePreferredJobId(request: Request): Promise<string | undefined> {
    const body = (await request.json().catch(() => ({}))) as {
        preferredJobId?: unknown;
    };

    return typeof body.preferredJobId === 'string' ? body.preferredJobId : undefined;
}

/**
 * Resolves the queue-age cutoff timestamp used for cron-triggered background claims.
 *
 * @returns ISO timestamp representing the oldest allowed queued-at value for cron claims.
 *
 * @private route helper
 */
async function resolveCronQueuedBeforeIso(): Promise<string> {
    const intervalMs = await loadUserChatBackgroundWorkerIntervalMs();
    return new Date(Date.now() - intervalMs).toISOString();
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
 * Validates the shared internal worker token used by self-triggered wake-ups.
 *
 * @private route helper
 */
function isAuthorizedInternalWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-user-chat-worker-token');
    return token === resolveUserChatWorkerInternalToken();
}

/**
 * Validates optional Vercel cron authorization.
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

/**
 * Detects missing durable chat-job table errors during early bootstrap states.
 *
 * @private route helper
 */
function isMissingUserChatJobTableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const normalizedMessage = error.message.toLowerCase();
    if (!normalizedMessage.includes('relation') || !normalizedMessage.includes('does not exist')) {
        return false;
    }

    return normalizedMessage.includes('userchatjob');
}
