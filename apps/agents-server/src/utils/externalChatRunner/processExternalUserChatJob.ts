import type { Json } from '@/src/database/schema';
import { createUserChatJobFailureDetails } from '../userChat/createUserChatJobFailureDetails';
import { claimNextQueuedUserChatJob } from '../userChat/claimNextQueuedUserChatJob';
import { finalizeUserChatJob } from '../userChat/finalizeUserChatJob';
import { getUserChat } from '../userChat/getUserChat';
import { getUserChatJobById } from '../userChat/getUserChatJobById';
import { persistUserChatJobTerminalState } from '../userChat/persistUserChatJobTerminalState';
import { provideUserChatJobTable } from '../userChat/provideUserChatJobTable';
import { updateUserChatAssistantMessage } from '../userChat/updateUserChatAssistantMessage';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { UserChatJobRow } from '../userChat/UserChatJobRow';
import { resolvePromptThreadBeforeUserMessage } from '../userChat/userChatMessageLifecycle';
import {
    EXTERNAL_USER_CHAT_JOB_ANSWER_TIMEOUT_MS,
    EXTERNAL_USER_CHAT_JOB_PROVIDER,
} from './externalChatRunnerConstants';
import {
    createExternalUserChatJobMetadata,
    getExternalUserChatJobMetadata,
    isExternalUserChatJob,
    withExternalUserChatJobMetadata,
    type ExternalUserChatJobMetadata,
} from './ExternalUserChatJobMetadata';
import {
    ensureExternalAgentRepository,
    loadExternalAgentSourceSnapshot,
} from './ensureExternalAgentRepository';
import {
    readGithubFile,
    upsertGithubFile,
} from './GithubRepositoryClient';
import {
    createExternalChatQueuedMessageBook,
    parseExternalChatFailedMessageBook,
    parseExternalChatFinishedMessageBook,
} from './externalChatMessageBook';
import { ensureExternalChatRunnerGithubConfiguration } from './ExternalChatRunnerConfiguration';
import { loadLocalAgentRunnerConfiguration } from './LocalAgentRunnerConfiguration';
import {
    readLocalAgentRunnerFile,
    upsertLocalAgentRunnerFile,
} from './LocalAgentRunnerFileClient';

/**
 * Result of processing one external user chat job.
 */
export type ProcessExternalUserChatJobResult = {
    didMutate: boolean;
    outcome: 'queued' | 'completed' | 'failed' | 'cancelled' | 'waiting' | 'ignored';
};

/**
 * Processes one UserChatJob through the git-backed external runner contract.
 */
export async function processExternalUserChatJob(job: UserChatJobRecord): Promise<ProcessExternalUserChatJobResult> {
    try {
        if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
            return { didMutate: false, outcome: 'ignored' };
        }

        if (job.cancelRequestedAt) {
            await persistUserChatJobTerminalState({
                job,
                status: 'CANCELLED',
                provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
                failureReason: 'Chat generation was cancelled before the external runner completed.',
            });
            return { didMutate: true, outcome: 'cancelled' };
        }

        const metadata = getExternalUserChatJobMetadata(job);
        if (job.status === 'QUEUED') {
            const claimedJob = await claimNextQueuedUserChatJob({ preferredJobId: job.id });
            return claimedJob ? await enqueueExternalUserChatJob(claimedJob) : { didMutate: false, outcome: 'waiting' };
        }

        if (job.status === 'RUNNING' && !metadata) {
            return await enqueueExternalUserChatJob(job);
        }

        if (!metadata) {
            return { didMutate: false, outcome: 'ignored' };
        }

        return await synchronizeExternalUserChatJob(job, metadata);
    } catch (error) {
        return await handleExternalUserChatJobProcessingError(job, error);
    }
}

/**
 * Processes the next external user chat job waiting for worker attention.
 */
export async function processNextExternalUserChatJob(options: {
    preferredJobId?: string;
} = {}): Promise<ProcessExternalUserChatJobResult | null> {
    if (options.preferredJobId) {
        const claimedPreferredJob = await claimNextQueuedUserChatJob({ preferredJobId: options.preferredJobId });
        if (claimedPreferredJob) {
            return await enqueueExternalUserChatJob(claimedPreferredJob);
        }

        const preferredJob = await getUserChatJobById(options.preferredJobId);
        return preferredJob ? await processExternalUserChatJob(preferredJob) : null;
    }

    const claimedJob = await claimNextQueuedUserChatJob();
    if (claimedJob) {
        return await enqueueExternalUserChatJob(claimedJob);
    }

    const candidates = await listExternalUserChatJobCandidates();
    for (const candidate of candidates) {
        const result = await processExternalUserChatJob(candidate);
        if (result.outcome !== 'ignored') {
            return result;
        }
    }

    return null;
}

/**
 * Enqueues one local queued job into the external repository.
 */
async function enqueueExternalUserChatJob(job: UserChatJobRecord): Promise<ProcessExternalUserChatJobResult> {
    const [chat, agentSourceSnapshot] = await Promise.all([
        getUserChat({
            userId: job.userId,
            agentPermanentId: job.agentPermanentId,
            chatId: job.chatId,
        }),
        loadExternalAgentSourceSnapshot(job.agentPermanentId),
    ]);

    if (!chat) {
        await finalizeUserChatJob({
            jobId: job.id,
            status: 'CANCELLED',
            provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
            failureReason: 'Chat was deleted before it could be enqueued externally.',
        });
        return { didMutate: true, outcome: 'cancelled' };
    }

    const userMessage = chat.messages.find((message) => message.id === job.userMessageId);
    if (!userMessage) {
        throw new Error(`User message "${job.userMessageId}" was not found in chat "${job.chatId}".`);
    }

    const previousThreadMessages = resolvePromptThreadBeforeUserMessage(chat.messages, job.userMessageId);
    if (previousThreadMessages.some((message) => message.sender === 'AGENT' && message.isComplete === false)) {
        return { didMutate: false, outcome: 'waiting' };
    }

    const threadMessages = [...previousThreadMessages, userMessage]
        .filter((message) => message.isComplete !== false)
        .filter((message) => message.sender === 'USER' || message.sender === 'AGENT')
        .map((message) => ({
            sender: String(message.sender),
            content: message.content,
        }));

    const repository = await ensureExternalAgentRepository(agentSourceSnapshot);
    const queuedAt = new Date().toISOString();
    const metadata = createExternalUserChatJobMetadata({
        repositoryFullName: repository.fullName,
        threadId: chat.id,
        threadCreatedAt: chat.createdAt,
        queuedAt,
        expectedMessagesBeforeAnswer: threadMessages.length,
    });
    await upsertExternalRunnerFile({
        repositoryFullName: repository.fullName,
        path: metadata.queuedPath,
        content: createExternalChatQueuedMessageBook({ messages: threadMessages }),
        message: `Queue chat thread ${metadata.threadId}`,
    });

    await persistExternalUserChatJobEnqueueMetadata(job, metadata);
    await updateUserChatAssistantMessage({
        userId: job.userId,
        agentPermanentId: job.agentPermanentId,
        chatId: job.chatId,
        assistantMessageId: job.assistantMessageId,
        mutateMessage: (message) => ({
            ...message,
            isComplete: false,
            lifecycleState: 'running',
            lifecycleError: undefined,
        }),
    });

    return { didMutate: true, outcome: 'queued' };
}

/**
 * Synchronizes one already-enqueued external job with repository message folders.
 */
async function synchronizeExternalUserChatJob(
    job: UserChatJobRecord,
    metadata: ExternalUserChatJobMetadata,
): Promise<ProcessExternalUserChatJobResult> {
    const finishedFile = await readExternalRunnerFile(metadata.repositoryFullName, metadata.finishedPath);

    if (finishedFile) {
        const content = parseExternalChatFinishedMessageBook({
            bookContent: finishedFile.content,
            expectedMessagesBeforeAnswer: metadata.expectedMessagesBeforeAnswer,
        });

        if (content) {
            await persistUserChatJobTerminalState({
                job,
                status: 'COMPLETED',
                provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
                content,
                generationDurationMs: resolveExternalUserChatJobDurationMs(metadata.queuedAt),
            });
            return { didMutate: true, outcome: 'completed' };
        }
    }

    const failedFile = await readExternalRunnerFile(metadata.repositoryFullName, metadata.failedPath);
    if (failedFile) {
        const failureReason = parseExternalChatFailedMessageBook({
            bookContent: failedFile.content,
            expectedMessagesBeforeAnswer: metadata.expectedMessagesBeforeAnswer,
        });

        if (!failureReason) {
            return { didMutate: false, outcome: 'waiting' };
        }

        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
            failureReason,
            failureDetails: createExternalUserChatJobFailureDetails(job, failureReason, 'externalRunnerFailedFile'),
            generationDurationMs: resolveExternalUserChatJobDurationMs(metadata.queuedAt),
        });
        return { didMutate: true, outcome: 'failed' };
    }

    if (isExternalUserChatJobTimedOut(metadata) && job.status !== 'FAILED') {
        const failureReason = 'External chat runner did not finish the queued message within 5 minutes.';
        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
            failureReason,
            failureDetails: createExternalUserChatJobFailureDetails(job, failureReason, 'externalRunnerTimeout'),
            generationDurationMs: resolveExternalUserChatJobDurationMs(metadata.queuedAt),
        });
        return { didMutate: true, outcome: 'failed' };
    }

    return { didMutate: false, outcome: 'waiting' };
}

/**
 * Writes one queued runner file through the configured local or GitHub backend.
 */
async function upsertExternalRunnerFile(options: {
    readonly repositoryFullName: string;
    readonly path: string;
    readonly content: string;
    readonly message: string;
}): Promise<void> {
    if (loadLocalAgentRunnerConfiguration()) {
        await upsertLocalAgentRunnerFile({
            projectPath: options.repositoryFullName,
            path: options.path,
            content: options.content,
        });
        return;
    }

    await upsertGithubFile({
        configuration: ensureExternalChatRunnerGithubConfiguration(),
        repositoryFullName: options.repositoryFullName,
        path: options.path,
        content: options.content,
        message: options.message,
    });
}

/**
 * Reads one finished or failed runner file through the configured local or GitHub backend.
 */
async function readExternalRunnerFile(
    repositoryFullName: string,
    path: string,
): Promise<{ readonly content: string } | null> {
    if (loadLocalAgentRunnerConfiguration()) {
        return await readLocalAgentRunnerFile(repositoryFullName, path);
    }

    return await readGithubFile(ensureExternalChatRunnerGithubConfiguration(), repositoryFullName, path);
}

/**
 * Persists external-runner metadata after one chat thread has been mirrored to the runner backend.
 */
async function persistExternalUserChatJobEnqueueMetadata(
    job: UserChatJobRecord,
    metadata: ExternalUserChatJobMetadata,
): Promise<void> {
    const nowIso = new Date().toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const { error } = await userChatJobTable
        .update({
            status: 'RUNNING',
            updatedAt: nowIso,
            startedAt: job.startedAt || nowIso,
            lastHeartbeatAt: nowIso,
            leaseExpiresAt: null,
            attemptCount: job.attemptCount,
            provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
            failureReason: null,
            parameters: withExternalUserChatJobMetadata(job.parameters, metadata) as Json,
        })
        .eq('id', job.id)
        .in('status', ['QUEUED', 'RUNNING']);

    if (error) {
        throw new Error(`Failed to mark user chat job "${job.id}" as externally queued: ${error.message}`);
    }
}

/**
 * Lists jobs that can be advanced by one worker tick.
 */
async function listExternalUserChatJobCandidates(): Promise<Array<UserChatJobRecord>> {
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .select('*')
        .in('status', ['RUNNING', 'FAILED'])
        .order('queuedAt', { ascending: true })
        .order('createdAt', { ascending: true })
        .limit(20);

    if (error) {
        throw new Error(`Failed to list external user chat job candidates: ${error.message}`);
    }

    const { mapUserChatJobRow } = await import('../userChat/mapUserChatJobRow');
    return ((data || []) as Array<UserChatJobRow>)
        .map((row) => mapUserChatJobRow(row))
        .filter((candidate) => candidate.status === 'RUNNING' || isExternalUserChatJob(candidate));
}

/**
 * Handles one processing failure without permanently hiding externally queued jobs.
 */
async function handleExternalUserChatJobProcessingError(
    job: UserChatJobRecord,
    error: unknown,
): Promise<ProcessExternalUserChatJobResult> {
    const metadata = getExternalUserChatJobMetadata(job);
    const failureReason = error instanceof Error ? error.message : 'External chat runner synchronization failed.';

    if (job.status === 'QUEUED' || (job.status === 'RUNNING' && !metadata) || (metadata && isExternalUserChatJobTimedOut(metadata))) {
        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
            failureReason,
            failureDetails: createExternalUserChatJobFailureDetails(job, failureReason, 'externalRunnerSyncError', error),
        });
        return { didMutate: true, outcome: 'failed' };
    }

    console.error('[external-chat-runner] Failed to synchronize external user chat job', {
        chatId: job.chatId,
        jobId: job.id,
        error,
    });

    return { didMutate: false, outcome: isExternalUserChatJob(job) ? 'waiting' : 'ignored' };
}

/**
 * Creates failure details for external runner terminal states.
 */
function createExternalUserChatJobFailureDetails(
    job: UserChatJobRecord,
    failureReason: string,
    source: string,
    error?: unknown,
): string {
    return createUserChatJobFailureDetails({
        job,
        summary: failureReason,
        source,
        provider: EXTERNAL_USER_CHAT_JOB_PROVIDER,
        error,
    });
}

/**
 * Returns true when one external job exceeded the visible timeout.
 */
function isExternalUserChatJobTimedOut(metadata: ExternalUserChatJobMetadata): boolean {
    const queuedAtMs = Date.parse(metadata.queuedAt);
    return Number.isFinite(queuedAtMs) && Date.now() - queuedAtMs >= EXTERNAL_USER_CHAT_JOB_ANSWER_TIMEOUT_MS;
}

/**
 * Resolves elapsed time since the external message was queued.
 */
function resolveExternalUserChatJobDurationMs(queuedAt: string): number | undefined {
    const queuedAtMs = Date.parse(queuedAt);
    if (!Number.isFinite(queuedAtMs)) {
        return undefined;
    }

    return Math.max(0, Date.now() - queuedAtMs);
}
