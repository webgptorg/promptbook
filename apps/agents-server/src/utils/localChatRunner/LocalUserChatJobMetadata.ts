import type { UserChatJobParameters, UserChatJobRecord } from '../userChat/UserChatJobRecord';
import { LOCAL_USER_CHAT_JOB_PARAMETERS_KEY, LOCAL_USER_CHAT_JOB_PROVIDER } from './localChatRunnerConstants';

/**
 * Metadata persisted with one UserChatJob after it is mirrored into a local agent folder.
 */
export type LocalUserChatJobMetadata = {
    version: 1;
    agentDirectoryName: string;
    threadId: string;
    fileName: string;
    queuedPath: string;
    finishedPath: string;
    failedPath: string;
    queuedAt: string;
    expectedMessagesBeforeAnswer: number;
};

/**
 * Creates fresh metadata for one locally queued chat job.
 */
export function createLocalUserChatJobMetadata(options: {
    agentDirectoryName: string;
    threadId: string;
    threadCreatedAt: string;
    queuedAt: string;
    expectedMessagesBeforeAnswer: number;
}): LocalUserChatJobMetadata {
    const fileName = createLocalChatMessageFileName(options.threadId, options.threadCreatedAt);

    return {
        version: 1,
        agentDirectoryName: options.agentDirectoryName,
        threadId: options.threadId,
        fileName,
        queuedPath: `messages/queued/${fileName}`,
        finishedPath: `messages/finished/${fileName}`,
        failedPath: `messages/failed/${fileName}`,
        queuedAt: options.queuedAt,
        expectedMessagesBeforeAnswer: options.expectedMessagesBeforeAnswer,
    };
}

/**
 * Reads local runner metadata from one chat job.
 */
export function getLocalUserChatJobMetadata(
    job: Pick<UserChatJobRecord, 'parameters'>,
): LocalUserChatJobMetadata | null {
    const rawMetadata = job.parameters[LOCAL_USER_CHAT_JOB_PARAMETERS_KEY];
    if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
        return null;
    }

    const metadata = rawMetadata as Record<string, unknown>;
    if (
        metadata.version !== 1 ||
        typeof metadata.agentDirectoryName !== 'string' ||
        typeof metadata.threadId !== 'string' ||
        typeof metadata.fileName !== 'string' ||
        typeof metadata.queuedPath !== 'string' ||
        typeof metadata.finishedPath !== 'string' ||
        typeof metadata.failedPath !== 'string' ||
        typeof metadata.queuedAt !== 'string' ||
        typeof metadata.expectedMessagesBeforeAnswer !== 'number'
    ) {
        return null;
    }

    return metadata as LocalUserChatJobMetadata;
}

/**
 * Returns true when a job is or was managed by the local runner.
 */
export function isLocalUserChatJob(job: Pick<UserChatJobRecord, 'provider' | 'parameters'>): boolean {
    return getLocalUserChatJobMetadata(job) !== null || job.provider === LOCAL_USER_CHAT_JOB_PROVIDER;
}

/**
 * Stores local runner metadata in a UserChatJob parameters object.
 */
export function withLocalUserChatJobMetadata(
    parameters: UserChatJobParameters,
    metadata: LocalUserChatJobMetadata,
): UserChatJobParameters {
    return {
        ...parameters,
        [LOCAL_USER_CHAT_JOB_PARAMETERS_KEY]: metadata,
    };
}

/**
 * Removes local runner metadata from a UserChatJob parameters object.
 */
export function withoutLocalUserChatJobMetadata(parameters: UserChatJobParameters): UserChatJobParameters {
    const nextParameters = { ...parameters };
    delete nextParameters[LOCAL_USER_CHAT_JOB_PARAMETERS_KEY];
    return nextParameters;
}

/**
 * Creates the filename used by one local message-thread book.
 */
export function createLocalChatMessageFileName(threadId: string, threadCreatedAt: string): string {
    const createdOnDate = resolveLocalChatThreadCreatedOnDate(threadCreatedAt);
    const normalizedThreadId = threadId.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

    if (normalizedThreadId.length > 0) {
        return `${createdOnDate}-${normalizedThreadId}.book`;
    }

    return `${createdOnDate}-${Buffer.from(threadId, 'utf8').toString('hex') || 'thread'}.book`;
}

/**
 * Resolves the stable `YYYY-MM-DD` prefix from the original thread creation timestamp.
 */
function resolveLocalChatThreadCreatedOnDate(threadCreatedAt: string): string {
    const createdOnDate = threadCreatedAt.trim().slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/u.test(createdOnDate)) {
        return createdOnDate;
    }

    throw new Error(`Invalid chat thread creation timestamp "${threadCreatedAt}".`);
}
