import { after, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { cancelScheduledUserChatTimeout, getUserChatTimeoutById } from '@/src/utils/userChatTimeout';
import {
    getUserChatJobById,
    persistUserChatJobTerminalState,
    requestUserChatJobCancellation,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Requests admin cancellation for one queued or running durable chat task.
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
            if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
                return NextResponse.json({ error: 'Task is already finished.' }, { status: 409 });
            }

            console.info('[admin-chat-task] cancel', {
                actor,
                taskId,
                reason,
                kind: 'CHAT_COMPLETION',
                status: job.status,
            });

            const cancellationRequestedJob = await requestUserChatJobCancellation(taskId);
            if (!cancellationRequestedJob) {
                return NextResponse.json({ error: 'Task could not be cancelled.' }, { status: 409 });
            }

            if (job.status === 'QUEUED') {
                await persistUserChatJobTerminalState({
                    job: cancellationRequestedJob,
                    status: 'CANCELLED',
                    failureReason: 'Chat generation was cancelled by an administrator before it started.',
                });
            } else {
                after(() =>
                    triggerUserChatJobWorker({
                        origin: new URL(request.url).origin,
                        preferredJobId: taskId,
                    }).catch((error) =>
                        console.error('[admin-chat-task] failed to wake worker after cancellation request', error),
                    ),
                );
            }

            return NextResponse.json({ ok: true });
        }

        const timeout = await getUserChatTimeoutById(taskId);
        if (!timeout) {
            return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
        }

        if (timeout.status === 'COMPLETED' || timeout.status === 'FAILED' || timeout.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Task is already finished.' }, { status: 409 });
        }

        console.info('[admin-chat-task] cancel', {
            actor,
            taskId,
            reason,
            kind: 'CHAT_TIMEOUT',
            status: timeout.status,
        });

        const cancelledTimeout = await cancelScheduledUserChatTimeout(taskId);
        if (!cancelledTimeout) {
            return NextResponse.json({ error: 'Task could not be cancelled.' }, { status: 409 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[admin-chat-task] cancel failed', { taskId, error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel task.' },
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
