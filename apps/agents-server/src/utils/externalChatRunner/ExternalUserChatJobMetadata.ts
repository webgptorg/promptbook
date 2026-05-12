import { randomUUID } from 'crypto';
import type { UserChatJobParameters, UserChatJobRecord } from '../userChat/UserChatJobRecord';
import {
    EXTERNAL_USER_CHAT_JOB_PARAMETERS_KEY,
    EXTERNAL_USER_CHAT_JOB_PROVIDER,
} from './externalChatRunnerConstants';

/**
 * Metadata persisted with one UserChatJob after it is mirrored to GitHub.
 */
export type ExternalUserChatJobMetadata = {
    version: 1;
    repositoryFullName: string;
    externalChatId: string;
    fileName: string;
    queuedPath: string;
    finishedPath: string;
    failedPath: string;
    queuedAt: string;
};

/**
 * Creates fresh metadata for one external chat job.
 */
export function createExternalUserChatJobMetadata(options: {
    repositoryFullName: string;
    queuedAt: string;
}): ExternalUserChatJobMetadata {
    const externalChatId = randomUUID();
    const fileName = createExternalChatMessageFileName(new Date(options.queuedAt), externalChatId);

    return {
        version: 1,
        repositoryFullName: options.repositoryFullName,
        externalChatId,
        fileName,
        queuedPath: `messages/queued/${fileName}`,
        finishedPath: `messages/finished/${fileName}`,
        failedPath: `messages/failed/${fileName}`,
        queuedAt: options.queuedAt,
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
        metadata.version !== 1 ||
        typeof metadata.repositoryFullName !== 'string' ||
        typeof metadata.externalChatId !== 'string' ||
        typeof metadata.fileName !== 'string' ||
        typeof metadata.queuedPath !== 'string' ||
        typeof metadata.finishedPath !== 'string' ||
        typeof metadata.failedPath !== 'string' ||
        typeof metadata.queuedAt !== 'string'
    ) {
        return null;
    }

    return metadata as ExternalUserChatJobMetadata;
}

/**
 * Returns true when a job is or was managed by the external runner.
 */
export function isExternalUserChatJob(job: Pick<UserChatJobRecord, 'provider' | 'parameters'>): boolean {
    return getExternalUserChatJobMetadata(job) !== null || job.provider === EXTERNAL_USER_CHAT_JOB_PROVIDER;
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
 * Creates the external runner filename required by the git message contract.
 */
export function createExternalChatMessageFileName(date: Date, externalChatId: string): string {
    return `${formatExternalChatMessageTimestamp(date)}-${externalChatId}.book`;
}

/**
 * Formats one UTC timestamp as YYYY-MM-DD-HH-MM.
 */
function formatExternalChatMessageTimestamp(date: Date): string {
    return [
        date.getUTCFullYear(),
        padDatePart(date.getUTCMonth() + 1),
        padDatePart(date.getUTCDate()),
        padDatePart(date.getUTCHours()),
        padDatePart(date.getUTCMinutes()),
    ].join('-');
}

/**
 * Pads one timestamp part to two digits.
 */
function padDatePart(value: number): string {
    return String(value).padStart(2, '0');
}
