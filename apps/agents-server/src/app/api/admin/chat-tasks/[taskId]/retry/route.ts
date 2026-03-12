import { after, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { getUserChatTimeoutById, kickUserChatTimeoutWorkerTick, retryUserChatTimeout } from '@/src/utils/userChatTimeout';
import { getUserChatJobById, retryUserChatJob, triggerUserChatJobWorker } from '@/src/utils/userChat';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Requeues one failed durable chat task from the admin dashboard.
 */
export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId: rawTaskId } = await params;
    const taskId = decodeURIComponent(rawTaskId);
    const reason = await readRequiredAdminReason(request);

    if (!reason) {
        return NextResponse.json({ error: 'A non-empty reason is required.' }, { status: 400 });
    }

    try {
        const actor = (await getCurrentUser())?.username || 'admin';
        const job = await getUserChatJobById(taskId);

        if (job) {
            if (job.status !== 'FAILED') {
                return NextResponse.json({ error: 'Only failed tasks can be retried.' }, { status: 409 });
            }

            console.info('[admin-chat-task] retry', {
                actor,
                taskId,
                reason,
                kind: 'CHAT_COMPLETION',
                previousAttemptCount: job.attemptCount,
            });

            const retriedJob = await retryUserChatJob(taskId);
            if (!retriedJob) {
                return NextResponse.json({ error: 'Task could not be retried.' }, { status: 409 });
            }

            after(() =>
                triggerUserChatJobWorker({
                    origin: new URL(request.url).origin,
                    preferredJobId: retriedJob.id,
                }).catch((error) => console.error('[admin-chat-task] failed to wake worker after retry', error)),
            );

            return NextResponse.json({ ok: true });
        }

        const timeout = await getUserChatTimeoutById(taskId);
        if (!timeout) {
            return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
        }

        if (timeout.status !== 'FAILED') {
            return NextResponse.json({ error: 'Only failed tasks can be retried.' }, { status: 409 });
        }

        console.info('[admin-chat-task] retry', {
            actor,
            taskId,
            reason,
            kind: 'CHAT_TIMEOUT',
            previousAttemptCount: timeout.attemptCount,
        });

        const retriedTimeout = await retryUserChatTimeout(taskId);
        if (!retriedTimeout) {
            return NextResponse.json({ error: 'Task could not be retried.' }, { status: 409 });
        }

        kickUserChatTimeoutWorkerTick();

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[admin-chat-task] retry failed', { taskId, error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to retry task.' },
            { status: 500 },
        );
    }
}

/**
 * Reads and validates the required admin reason payload.
 */
async function readRequiredAdminReason(request: Request): Promise<string | null> {
    const payload = (await request.json().catch(() => ({}))) as {
        reason?: unknown;
    };

    if (typeof payload.reason !== 'string') {
        return null;
    }

    const reason = payload.reason.trim();
    return reason.length > 0 ? reason : null;
}
