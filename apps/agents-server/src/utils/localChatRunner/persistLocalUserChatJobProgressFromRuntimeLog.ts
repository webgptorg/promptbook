import type { ChatMessage } from '@promptbook-local/types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { buildAgentMessageRuntimeLogPathFromFileName } from '../../../../../src/utils/agent-message-runtime/agentMessageRuntimePaths';
import { resolveAgentMessageRuntimeActivity } from '../../../../../src/utils/agent-message-runtime/resolveAgentMessageRuntimeActivity';
import { updateUserChatAssistantMessage } from '../userChat/updateUserChatAssistantMessage';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import { resolveLocalAgentRootPath } from './ensureLocalAgentFolder';
import type { LocalUserChatJobMetadata } from './LocalUserChatJobMetadata';

/**
 * Maximum number of remembered per-job progress activities before the oldest entry is evicted.
 *
 * Keeps the in-process deduplication cache bounded on a long-running server without needing an
 * explicit cleanup call when a job finishes.
 *
 * @private internal constant of `persistLocalUserChatJobProgressFromRuntimeLog`
 */
const MAX_TRACKED_PROGRESS_ACTIVITY_JOBS = 500;

/**
 * Last progress activity already persisted per running job, so unchanged runner output
 * does not trigger a redundant chat write on every poll.
 *
 * @private internal state of `persistLocalUserChatJobProgressFromRuntimeLog`
 */
const lastPersistedProgressActivityByJobId = new Map<string, string>();

/**
 * Remembers the latest persisted progress activity for one job, evicting the oldest tracked job
 * once the cache grows past its cap.
 *
 * @private internal helper of `persistLocalUserChatJobProgressFromRuntimeLog`
 */
function rememberPersistedProgressActivity(jobId: string, activity: string): void {
    lastPersistedProgressActivityByJobId.set(jobId, activity);

    if (lastPersistedProgressActivityByJobId.size <= MAX_TRACKED_PROGRESS_ACTIVITY_JOBS) {
        return;
    }

    const oldestJobId = lastPersistedProgressActivityByJobId.keys().next().value;
    if (oldestJobId !== undefined) {
        lastPersistedProgressActivityByJobId.delete(oldestJobId);
    }
}

/**
 * Surfaces the local agent runner's live activity as the durable chat progress card.
 *
 * While a queued message is being answered, the local runner streams the answering
 * harness output into a runtime log next to the queued message on the shared agent
 * folder. This best-effort helper reads that log, resolves the latest user-friendly
 * assistant narration, and stores it on the still-running assistant placeholder so the
 * chat shows what the agent is doing right now instead of only rotating `THINKING_MESSAGES`.
 *
 * Any failure (missing log, unreadable file, no structured narration yet) is swallowed so
 * progress reporting can never break the durable chat synchronization itself.
 */
export async function persistLocalUserChatJobProgressFromRuntimeLog(
    job: UserChatJobRecord,
    metadata: LocalUserChatJobMetadata,
): Promise<void> {
    try {
        const runtimeLogPath = buildAgentMessageRuntimeLogPathFromFileName(
            join(resolveLocalAgentRootPath(), metadata.agentDirectoryName),
            metadata.fileName,
        );
        const logText = await readOptionalRuntimeLog(runtimeLogPath);
        if (logText === null) {
            return;
        }

        const activity = resolveAgentMessageRuntimeActivity(logText);
        if (!activity || lastPersistedProgressActivityByJobId.get(job.id) === activity) {
            return;
        }

        rememberPersistedProgressActivity(job.id, activity);
        await updateUserChatAssistantMessage({
            userId: job.userId,
            agentPermanentId: job.agentPermanentId,
            chatId: job.chatId,
            assistantMessageId: job.assistantMessageId,
            mutateMessage: (message) => applyRuntimeProgressActivity(message, activity),
        });
    } catch (error) {
        console.warn('[local-chat-runner] progress_update_from_runtime_log_failed', {
            chatId: job.chatId,
            jobId: job.id,
            error,
        });
    }
}

/**
 * Applies one resolved runner activity onto a still-running assistant placeholder.
 *
 * The placeholder is left untouched once it is no longer an empty running message, so a
 * finished answer or a message that already started streaming content is never overwritten.
 *
 * @private internal helper of `persistLocalUserChatJobProgressFromRuntimeLog`
 */
function applyRuntimeProgressActivity(message: ChatMessage, activity: string): ChatMessage {
    const isRunningPlaceholder =
        message.isComplete === false &&
        message.lifecycleState === 'running' &&
        message.content.trim().length === 0;

    if (!isRunningPlaceholder || message.progressCard?.now === activity) {
        return message;
    }

    return {
        ...message,
        progressCard: {
            now: activity,
            items: [],
            updatedAt: new Date().toISOString() as NonNullable<ChatMessage['progressCard']>['updatedAt'],
            isVisible: true,
        },
    };
}

/**
 * Reads one runtime log file, treating a missing log as "no activity yet".
 *
 * @private internal helper of `persistLocalUserChatJobProgressFromRuntimeLog`
 */
async function readOptionalRuntimeLog(runtimeLogPath: string): Promise<string | null> {
    try {
        return await readFile(runtimeLogPath, 'utf-8');
    } catch {
        return null;
    }
}
