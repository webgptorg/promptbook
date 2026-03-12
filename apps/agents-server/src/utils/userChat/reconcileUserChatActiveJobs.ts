import type { ChatMessage } from '@promptbook-local/types';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';
import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatRecord } from './UserChatRecord';
import {
    EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
    isUserChatJobLeaseExpired,
    resolveTerminalUserChatJobStatusFromMessage,
    resolveUserChatMessageToolCalls,
} from './userChatJobState';

/**
 * Reconciles stale active jobs against the canonical assistant messages already stored in chat history.
 */
export async function reconcileUserChatActiveJobs(options: {
    chat: UserChatRecord;
    activeJobs: ReadonlyArray<UserChatJobRecord>;
}): Promise<boolean> {
    const now = new Date();
    let hasMutatedState = false;

    for (const activeJob of options.activeJobs) {
        const assistantMessage = options.chat.messages.find((message) => message.id === activeJob.assistantMessageId);
        const terminalStatus = assistantMessage
            ? resolveTerminalUserChatJobStatusFromMessage(assistantMessage)
            : null;

        if (terminalStatus) {
            const didFinalize = await finalizeActiveUserChatJob(activeJob, assistantMessage, terminalStatus);
            hasMutatedState = hasMutatedState || didFinalize;
            continue;
        }

        if (!isUserChatJobLeaseExpired(activeJob, now)) {
            continue;
        }

        const didFailExpiredJob = await failExpiredRunningUserChatJob(activeJob, assistantMessage);
        hasMutatedState = hasMutatedState || didFailExpiredJob;
    }

    return hasMutatedState;
}

/**
 * Finalizes one active job whose assistant message is already in a terminal lifecycle state.
 *
 * @private helper of `reconcileUserChatActiveJobs`
 */
async function finalizeActiveUserChatJob(
    job: UserChatJobRecord,
    assistantMessage: Pick<ChatMessage, 'lifecycleError'> | undefined,
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED',
): Promise<boolean> {
    try {
        await finalizeUserChatJob({
            jobId: job.id,
            status,
            provider: job.provider,
            failureReason: assistantMessage?.lifecycleError ?? job.failureReason,
        });
        return true;
    } catch (error) {
        console.error('[user-chat] Failed to reconcile terminal active job', {
            chatId: job.chatId,
            messageId: job.userMessageId,
            jobId: job.id,
            status,
            error,
        });
        return false;
    }
}

/**
 * Marks one expired running job as failed so polling/streaming readers stop showing it as pending forever.
 *
 * @private helper of `reconcileUserChatActiveJobs`
 */
async function failExpiredRunningUserChatJob(
    job: UserChatJobRecord,
    assistantMessage:
        | Pick<ChatMessage, 'content' | 'toolCalls' | 'completedToolCalls' | 'ongoingToolCalls'>
        | undefined,
): Promise<boolean> {
    try {
        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            content: assistantMessage?.content,
            toolCalls: assistantMessage ? resolveUserChatMessageToolCalls(assistantMessage) : undefined,
            provider: job.provider,
            failureReason: EXPIRED_RUNNING_USER_CHAT_JOB_FAILURE_REASON,
        });
        return true;
    } catch (error) {
        console.error('[user-chat] Failed to reconcile expired running job', {
            chatId: job.chatId,
            messageId: job.userMessageId,
            jobId: job.id,
            error,
        });
        return false;
    }
}
