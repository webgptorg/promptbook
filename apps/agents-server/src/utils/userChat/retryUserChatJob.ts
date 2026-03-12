import type { UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobRow } from './UserChatJobRow';
import { getUserChatJobById } from './getUserChatJobById';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';

/**
 * Requeues one failed durable chat job and resets its assistant placeholder.
 *
 * @private function of `userChat`
 */
export async function retryUserChatJob(jobId: string): Promise<UserChatJobRecord | null> {
    const existingJob = await getUserChatJobById(jobId);
    if (!existingJob) {
        return null;
    }

    if (existingJob.status !== 'FAILED') {
        throw new Error(`Only failed user chat jobs can be retried. Job "${jobId}" is "${existingJob.status}".`);
    }

    const nowIso = new Date().toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .update({
            status: 'QUEUED',
            updatedAt: nowIso,
            queuedAt: nowIso,
            startedAt: null,
            completedAt: null,
            cancelRequestedAt: null,
            lastHeartbeatAt: null,
            leaseExpiresAt: null,
            provider: null,
            failureReason: null,
        })
        .eq('id', jobId)
        .eq('status', 'FAILED')
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to retry user chat job "${jobId}": ${error.message}`);
    }

    if (!data) {
        return null;
    }

    await updateUserChatAssistantMessage({
        userId: existingJob.userId,
        agentPermanentId: existingJob.agentPermanentId,
        chatId: existingJob.chatId,
        assistantMessageId: existingJob.assistantMessageId,
        mutateMessage: (message) => ({
            ...message,
            content: '',
            isComplete: false,
            lifecycleState: 'queued',
            lifecycleError: undefined,
            ongoingToolCalls: undefined,
            toolCalls: undefined,
            completedToolCalls: undefined,
            generationDurationMs: undefined,
        }),
    });

    return mapUserChatJobRow(data as UserChatJobRow);
}
