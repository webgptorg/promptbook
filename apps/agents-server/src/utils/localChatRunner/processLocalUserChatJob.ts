import type { Json } from '@/src/database/schema';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
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
    createLocalUserChatJobMetadata,
    getLocalUserChatJobMetadata,
    isLocalUserChatJob,
    withLocalUserChatJobMetadata,
    type LocalUserChatJobMetadata,
} from './LocalUserChatJobMetadata';
import {
    createLocalChatQueuedMessageBook,
    parseLocalChatFailedMessageBook,
    parseLocalChatFinishedMessageBook,
} from './localChatMessageBook';
import { LOCAL_USER_CHAT_JOB_ANSWER_TIMEOUT_MS, LOCAL_USER_CHAT_JOB_PROVIDER } from './localChatRunnerConstants';
import {
    ensureLocalAgentFolder,
    loadLocalAgentSourceSnapshot,
    resolveLocalAgentRootPath,
} from './ensureLocalAgentFolder';

/**
 * Result of processing one local user chat job.
 */
export type ProcessLocalUserChatJobResult = {
    didMutate: boolean;
    outcome: 'queued' | 'completed' | 'failed' | 'cancelled' | 'waiting' | 'ignored';
};

/**
 * Processes one UserChatJob through the local message-folder runner contract.
 */
export async function processLocalUserChatJob(job: UserChatJobRecord): Promise<ProcessLocalUserChatJobResult> {
    try {
        if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
            return { didMutate: false, outcome: 'ignored' };
        }

        const metadata = getLocalUserChatJobMetadata(job);

        if (job.cancelRequestedAt) {
            await removeQueuedLocalMessageIfPresent(metadata);
            await persistUserChatJobTerminalState({
                job,
                status: 'CANCELLED',
                provider: LOCAL_USER_CHAT_JOB_PROVIDER,
                failureReason: 'Chat generation was cancelled before the local agent runner completed.',
            });
            return { didMutate: true, outcome: 'cancelled' };
        }

        if (job.status === 'QUEUED') {
            const claimedJob = await claimNextQueuedUserChatJob({ preferredJobId: job.id });
            return claimedJob ? await enqueueLocalUserChatJob(claimedJob) : { didMutate: false, outcome: 'waiting' };
        }

        if (job.status === 'RUNNING' && !metadata) {
            return await enqueueLocalUserChatJob(job);
        }

        if (!metadata) {
            return { didMutate: false, outcome: 'ignored' };
        }

        return await synchronizeLocalUserChatJob(job, metadata);
    } catch (error) {
        return await handleLocalUserChatJobProcessingError(job, error);
    }
}

/**
 * Processes the next local user chat job waiting for worker attention.
 */
export async function processNextLocalUserChatJob(options: {
    preferredJobId?: string;
} = {}): Promise<ProcessLocalUserChatJobResult | null> {
    if (options.preferredJobId) {
        const claimedPreferredJob = await claimNextQueuedUserChatJob({ preferredJobId: options.preferredJobId });
        if (claimedPreferredJob) {
            return await enqueueLocalUserChatJob(claimedPreferredJob);
        }

        const preferredJob = await getUserChatJobById(options.preferredJobId);
        return preferredJob ? await processLocalUserChatJob(preferredJob) : null;
    }

    const claimedJob = await claimNextQueuedUserChatJob();
    if (claimedJob) {
        return await enqueueLocalUserChatJob(claimedJob);
    }

    const candidates = await listLocalUserChatJobCandidates();
    for (const candidate of candidates) {
        const result = await processLocalUserChatJob(candidate);
        if (result.outcome !== 'ignored') {
            return result;
        }
    }

    return null;
}

/**
 * Enqueues one local queued job into the current agent folder.
 */
async function enqueueLocalUserChatJob(job: UserChatJobRecord): Promise<ProcessLocalUserChatJobResult> {
    const [chat, agentSourceSnapshot] = await Promise.all([
        getUserChat({
            userId: job.userId,
            agentPermanentId: job.agentPermanentId,
            chatId: job.chatId,
        }),
        loadLocalAgentSourceSnapshot(job.agentPermanentId),
    ]);

    if (!chat) {
        await finalizeUserChatJob({
            jobId: job.id,
            status: 'CANCELLED',
            provider: LOCAL_USER_CHAT_JOB_PROVIDER,
            failureReason: 'Chat was deleted before it could be queued for the local agent runner.',
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

    const agentFolder = await ensureLocalAgentFolder(agentSourceSnapshot);
    const queuedAt = new Date().toISOString();
    const metadata = createLocalUserChatJobMetadata({
        agentDirectoryName: agentFolder.directoryName,
        threadId: chat.id,
        threadCreatedAt: chat.createdAt,
        queuedAt,
        expectedMessagesBeforeAnswer: threadMessages.length,
    });
    const queuedMessagePath = join(agentFolder.directoryPath, metadata.queuedPath);

    await mkdir(join(agentFolder.directoryPath, 'messages', 'queued'), { recursive: true });
    await writeFile(queuedMessagePath, createLocalChatQueuedMessageBook({ messages: threadMessages }), 'utf-8');

    await persistLocalUserChatJobEnqueueMetadata(job, metadata);
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
 * Synchronizes one already queued local job with message-folder output.
 */
async function synchronizeLocalUserChatJob(
    job: UserChatJobRecord,
    metadata: LocalUserChatJobMetadata,
): Promise<ProcessLocalUserChatJobResult> {
    const agentDirectoryPath = join(resolveLocalAgentRootPath(), metadata.agentDirectoryName);
    const finishedFileContent = await readOptionalTextFile(join(agentDirectoryPath, metadata.finishedPath));

    if (finishedFileContent !== null) {
        const content = parseLocalChatFinishedMessageBook({
            bookContent: finishedFileContent,
            expectedMessagesBeforeAnswer: metadata.expectedMessagesBeforeAnswer,
        });

        if (content) {
            await persistUserChatJobTerminalState({
                job,
                status: 'COMPLETED',
                provider: LOCAL_USER_CHAT_JOB_PROVIDER,
                content,
                generationDurationMs: resolveLocalUserChatJobDurationMs(metadata.queuedAt),
            });
            return { didMutate: true, outcome: 'completed' };
        }
    }

    const failedFileContent = await readOptionalTextFile(join(agentDirectoryPath, metadata.failedPath));
    if (failedFileContent !== null) {
        const failureReason = parseLocalChatFailedMessageBook({
            bookContent: failedFileContent,
            expectedMessagesBeforeAnswer: metadata.expectedMessagesBeforeAnswer,
        });

        if (!failureReason) {
            return { didMutate: false, outcome: 'waiting' };
        }

        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            provider: LOCAL_USER_CHAT_JOB_PROVIDER,
            failureReason,
            failureDetails: createLocalUserChatJobFailureDetails(job, failureReason, 'localRunnerFailedFile'),
            generationDurationMs: resolveLocalUserChatJobDurationMs(metadata.queuedAt),
        });
        return { didMutate: true, outcome: 'failed' };
    }

    if (isLocalUserChatJobTimedOut(metadata) && job.status !== 'FAILED') {
        const failureReason = 'Local agent runner did not finish the queued message within 30 minutes.';
        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            provider: LOCAL_USER_CHAT_JOB_PROVIDER,
            failureReason,
            failureDetails: createLocalUserChatJobFailureDetails(job, failureReason, 'localRunnerTimeout'),
            generationDurationMs: resolveLocalUserChatJobDurationMs(metadata.queuedAt),
        });
        return { didMutate: true, outcome: 'failed' };
    }

    return { didMutate: false, outcome: 'waiting' };
}

/**
 * Persists local-runner metadata after one chat thread has been mirrored to disk.
 */
async function persistLocalUserChatJobEnqueueMetadata(
    job: UserChatJobRecord,
    metadata: LocalUserChatJobMetadata,
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
            provider: LOCAL_USER_CHAT_JOB_PROVIDER,
            failureReason: null,
            parameters: withLocalUserChatJobMetadata(job.parameters, metadata) as Json,
        })
        .eq('id', job.id)
        .in('status', ['QUEUED', 'RUNNING']);

    if (error) {
        throw new Error(`Failed to mark user chat job "${job.id}" as locally queued: ${error.message}`);
    }
}

/**
 * Lists jobs that can be advanced by one local worker tick.
 */
async function listLocalUserChatJobCandidates(): Promise<Array<UserChatJobRecord>> {
    const userChatJobTable = await provideUserChatJobTable();
    const { data, error } = await userChatJobTable
        .select('*')
        .in('status', ['RUNNING', 'FAILED'])
        .order('queuedAt', { ascending: true })
        .order('createdAt', { ascending: true })
        .limit(20);

    if (error) {
        throw new Error(`Failed to list local user chat job candidates: ${error.message}`);
    }

    const { mapUserChatJobRow } = await import('../userChat/mapUserChatJobRow');
    return ((data || []) as Array<UserChatJobRow>)
        .map((row) => mapUserChatJobRow(row))
        .filter((candidate) => candidate.status === 'RUNNING' || isLocalUserChatJob(candidate));
}

/**
 * Handles one processing failure without hiding jobs already queued on disk.
 */
async function handleLocalUserChatJobProcessingError(
    job: UserChatJobRecord,
    error: unknown,
): Promise<ProcessLocalUserChatJobResult> {
    const metadata = getLocalUserChatJobMetadata(job);
    const failureReason = error instanceof Error ? error.message : 'Local agent runner synchronization failed.';

    if (job.status === 'QUEUED' || (job.status === 'RUNNING' && !metadata) || (metadata && isLocalUserChatJobTimedOut(metadata))) {
        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            provider: LOCAL_USER_CHAT_JOB_PROVIDER,
            failureReason,
            failureDetails: createLocalUserChatJobFailureDetails(job, failureReason, 'localRunnerSyncError', error),
        });
        return { didMutate: true, outcome: 'failed' };
    }

    console.error('[local-chat-runner] Failed to synchronize local user chat job', {
        chatId: job.chatId,
        jobId: job.id,
        error,
    });

    return { didMutate: false, outcome: isLocalUserChatJob(job) ? 'waiting' : 'ignored' };
}

/**
 * Creates failure details for local runner terminal states.
 */
function createLocalUserChatJobFailureDetails(
    job: UserChatJobRecord,
    failureReason: string,
    source: string,
    error?: unknown,
): string {
    return createUserChatJobFailureDetails({
        job,
        summary: failureReason,
        source,
        provider: LOCAL_USER_CHAT_JOB_PROVIDER,
        error,
    });
}

/**
 * Removes a not-yet-answered local queue file after cancellation when it still exists.
 */
async function removeQueuedLocalMessageIfPresent(metadata: LocalUserChatJobMetadata | null): Promise<void> {
    if (!metadata) {
        return;
    }

    await rm(join(resolveLocalAgentRootPath(), metadata.agentDirectoryName, metadata.queuedPath), {
        force: true,
    }).catch(() => undefined);
}

/**
 * Reads one text file and treats missing local runner output as absent.
 */
async function readOptionalTextFile(path: string): Promise<string | null> {
    try {
        return await readFile(path, 'utf-8');
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Returns true when one local job exceeded its visible timeout.
 */
function isLocalUserChatJobTimedOut(metadata: LocalUserChatJobMetadata): boolean {
    const queuedAtMs = Date.parse(metadata.queuedAt);
    return Number.isFinite(queuedAtMs) && Date.now() - queuedAtMs >= LOCAL_USER_CHAT_JOB_ANSWER_TIMEOUT_MS;
}

/**
 * Resolves elapsed time since the local message was queued.
 */
function resolveLocalUserChatJobDurationMs(queuedAt: string): number | undefined {
    const queuedAtMs = Date.parse(queuedAt);
    if (!Number.isFinite(queuedAtMs)) {
        return undefined;
    }

    return Math.max(0, Date.now() - queuedAtMs);
}

/**
 * Returns true when one filesystem error indicates a missing path.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
