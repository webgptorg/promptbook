import type { UserChatJobParameters, UserChatJobRecord } from '../userChat/UserChatJobRecord';
import {
    EXTERNAL_USER_CHAT_JOB_PARAMETERS_KEY,
    EXTERNAL_USER_CHAT_JOB_PROVIDER,
    LEGACY_EXTERNAL_USER_CHAT_JOB_PROVIDER,
} from './externalChatRunnerConstants';

/**
 * Metadata persisted with one UserChatJob after it is mirrored to a coding-agent runner folder.
 */
export type ExternalUserChatJobMetadata = {
    version: 2;
    repositoryFullName: string;
    threadId: string;
    fileName: string;
    queuedPath: string;
    finishedPath: string;
    failedPath: string;
    queuedAt: string;
    expectedMessagesBeforeAnswer: number;
};

/**
 * Creates fresh metadata for one external chat job.
 */
export function createExternalUserChatJobMetadata(options: {
    repositoryFullName: string;
    threadId: string;
    threadCreatedAt: string;
    queuedAt: string;
    expectedMessagesBeforeAnswer: number;
}): ExternalUserChatJobMetadata {
    const fileName = createExternalChatMessageFileName(options.threadId, options.threadCreatedAt);

    return {
        version: 2,
        repositoryFullName: options.repositoryFullName,
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
 * Reads external runner metadata from one chat job.
 */
export function getExternalUserChatJobMetadata(
    job: Pick<UserChatJobRecord, 'parameters'>,
): ExternalUserChatJobMetadata | null {
    const rawMetadata = job.parameters[EXTERNAL_USER_CHAT_JOB_PARAMETERS_KEY];
    if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
        return null;
    }

    const metadata = rawMetadata as Record<string, unknown>;
    if (
        metadata.version !== 2 ||
        typeof metadata.repositoryFullName !== 'string' ||
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

    return metadata as ExternalUserChatJobMetadata;
}

/**
 * Returns true when a job is or was managed by the external runner.
 */
export function isExternalUserChatJob(job: Pick<UserChatJobRecord, 'provider' | 'parameters'>): boolean {
    return (
        getExternalUserChatJobMetadata(job) !== null ||
        job.provider === EXTERNAL_USER_CHAT_JOB_PROVIDER ||
        job.provider === LEGACY_EXTERNAL_USER_CHAT_JOB_PROVIDER
    );
}

/**
 * Stores external runner metadata in a UserChatJob parameters object.
 */
export function withExternalUserChatJobMetadata(
    parameters: UserChatJobParameters,
    metadata: ExternalUserChatJobMetadata,
): UserChatJobParameters {
    return {
        ...parameters,
        [EXTERNAL_USER_CHAT_JOB_PARAMETERS_KEY]: metadata,
    };
}

/**
 * Removes external runner metadata from a UserChatJob parameters object.
 */
export function withoutExternalUserChatJobMetadata(parameters: UserChatJobParameters): UserChatJobParameters {
    const nextParameters = { ...parameters };
    delete nextParameters[EXTERNAL_USER_CHAT_JOB_PARAMETERS_KEY];
    return nextParameters;
}

/**
 * Creates the external runner filename required by the git thread-message contract.
 */
export function createExternalChatMessageFileName(threadId: string, threadCreatedAt: string): string {
    const createdOnDate = resolveExternalChatThreadCreatedOnDate(threadCreatedAt);
    const normalizedThreadId = threadId.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

    if (normalizedThreadId.length > 0) {
        return `${createdOnDate}-${normalizedThreadId}.book`;
    }

    return `${createdOnDate}-${Buffer.from(threadId, 'utf8').toString('hex') || 'thread'}.book`;
}

/**
 * Resolves the stable `YYYY-MM-DD` prefix from the original thread creation timestamp.
 *
 * @private helper of `createExternalChatMessageFileName`
 */
function resolveExternalChatThreadCreatedOnDate(threadCreatedAt: string): string {
    const createdOnDate = threadCreatedAt.trim().slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(createdOnDate)) {
        return createdOnDate;
    }

    throw new Error(`Invalid chat thread creation timestamp "${threadCreatedAt}".`);
}
