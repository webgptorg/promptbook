import {
    claimNextQueuedUserChatJob,
    finalizeUserChatJob,
    listExpiredRunningUserChatJobs,
    persistUserChatJobTerminalState,
    resolveUserChatWorkerInternalToken,
    runUserChatJob,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON } from '@/src/utils/userChat/userChatJobState';
import { after, NextResponse } from 'next/server';

/**
 * Allows one worker invocation to run for the platform maximum.
 */
export const maxDuration = 300;

/**
 * Claims and processes one durable user-chat job in a background-safe route.
 */
export async function POST(request: Request) {
    if (!isAuthorizedUserChatWorkerRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    const body = (await request.json().catch(() => ({}))) as {
        preferredJobId?: unknown;
    };
    const preferredJobId = typeof body.preferredJobId === 'string' ? body.preferredJobId : undefined;

    try {
        await recoverExpiredRunningJobs();

        const claimedJob = await claimNextQueuedUserChatJob({ preferredJobId });
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

        after(() => triggerUserChatJobWorker({ origin }).catch((error) => console.error('[user-chat-job] requeue failed', error)));

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
 * Validates the shared internal worker token.
 *
 * @private route helper
 */
function isAuthorizedUserChatWorkerRequest(request: Request): boolean {
    const token = request.headers.get('x-user-chat-worker-token');
    return token === resolveUserChatWorkerInternalToken();
}

/**
 * Marks running jobs with expired leases as failed so queued work can continue.
 *
 * @private route helper
 */
async function recoverExpiredRunningJobs(): Promise<void> {
    const expiredJobs = await listExpiredRunningUserChatJobs();

    for (const expiredJob of expiredJobs) {
        await persistUserChatJobTerminalState({
            job: expiredJob,
            status: 'FAILED',
            failureReason: EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
        }).catch(async (error) => {
            console.error('[user-chat-job] stale job recovery failed', {
                chatId: expiredJob.chatId,
                messageId: expiredJob.userMessageId,
                jobId: expiredJob.id,
                error,
            });

            await finalizeUserChatJob({
                jobId: expiredJob.id,
                status: 'FAILED',
                failureReason: EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
            });
        });
    }
}
