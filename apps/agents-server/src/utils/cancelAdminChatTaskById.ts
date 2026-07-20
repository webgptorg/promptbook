import { after } from 'next/server';
import { cancelScheduledUserChatTimeout, getUserChatTimeoutById } from '@/src/utils/userChatTimeout';
import {
    getUserChatJobById,
    persistUserChatJobTerminalState,
    requestUserChatJobCancellation,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';

/**
 * Outcome of one admin-requested cancellation of a durable chat task.
 *
 * - `CANCELLED` — the task was queued/running and its cancellation was requested.
 * - `ALREADY_FINISHED` — the task exists but already reached a terminal state.
 * - `NOT_CANCELLABLE` — the task exists but its cancellation could not be persisted.
 * - `NOT_FOUND` — no durable chat job or timeout matched the id.
 *
 * @private internal admin utility of Agents Server
 */
export type CancelAdminChatTaskOutcome = 'CANCELLED' | 'ALREADY_FINISHED' | 'NOT_CANCELLABLE' | 'NOT_FOUND';

/**
 * Inputs required to cancel one durable chat task on behalf of an administrator.
 *
 * @private internal admin utility of Agents Server
 */
export type CancelAdminChatTaskByIdOptions = {
    /**
     * Global id of the durable chat job or timeout to cancel.
     */
    taskId: string;

    /**
     * Human-readable actor recorded in the cancellation audit log.
     */
    actor: string;

    /**
     * Required operator-supplied reason recorded in the cancellation audit log.
     */
    reason: string;

    /**
     * Request origin used to wake the durable chat worker for running jobs.
     */
    requestOrigin: string;
};

/**
 * Requests admin cancellation for one queued or running durable chat task.
 *
 * The function resolves the task as either a durable chat-completion job or a scheduled chat
 * timeout, mirrors the single-task admin cancel semantics (immediately finalizing queued jobs
 * and waking the worker for running jobs), and reports the resulting outcome to the caller.
 *
 * @param options - Task id, audit metadata, and request origin.
 * @returns The cancellation outcome for the resolved task.
 * @private internal admin utility of Agents Server
 */
export async function cancelAdminChatTaskById(options: CancelAdminChatTaskByIdOptions): Promise<CancelAdminChatTaskOutcome> {
    const { taskId, actor, reason, requestOrigin } = options;
    const job = await getUserChatJobById(taskId);

    if (job) {
        if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
            return 'ALREADY_FINISHED';
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
            return 'NOT_CANCELLABLE';
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
                    origin: requestOrigin,
                    preferredJobId: taskId,
                }).catch((error) =>
                    console.error('[admin-chat-task] failed to wake worker after cancellation request', error),
                ),
            );
        }

        return 'CANCELLED';
    }

    const timeout = await getUserChatTimeoutById(taskId);
    if (!timeout) {
        return 'NOT_FOUND';
    }

    if (timeout.status === 'COMPLETED' || timeout.status === 'FAILED' || timeout.status === 'CANCELLED') {
        return 'ALREADY_FINISHED';
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
        return 'NOT_CANCELLABLE';
    }

    return 'CANCELLED';
}
