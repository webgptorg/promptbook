import { serializeError } from '@promptbook-local/utils';
import type { UserChatJobRecord } from './UserChatJobRecord';

/**
 * Number of spaces used when pretty-printing persisted failure diagnostics JSON.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_FAILURE_DETAILS_JSON_INDENT = 2;

/**
 * Fallback message used when a non-`Error` value is thrown by user-chat execution.
 *
 * @private function of `userChat`
 */
const UNKNOWN_USER_CHAT_JOB_FAILURE_ERROR_MESSAGE = 'A non-Error value was thrown.';

/**
 * Serializable fallback shape for thrown values that are not `Error` instances.
 *
 * @private function of `userChat`
 */
type UnknownUserChatJobFailureErrorDetails = {
    message: string;
    raw: string | null;
};

/**
 * JSON payload persisted with one failed durable chat job for admin diagnostics.
 *
 * @private function of `userChat`
 */
type UserChatJobFailureDetailsPayload = {
    summary: string;
    source: string;
    recordedAt: string;
    provider: string | null;
    generationDurationMs: number | null;
    error: ReturnType<typeof serializeError> | UnknownUserChatJobFailureErrorDetails | null;
    diagnostics: unknown | null;
    job: {
        id: string;
        status: UserChatJobRecord['status'];
        userId: number;
        agentPermanentId: string;
        chatId: string;
        userMessageId: string;
        assistantMessageId: string;
        clientMessageId: string;
        attemptCount: number;
        queuedAt: string;
        startedAt: string | null;
        updatedAt: string;
        lastHeartbeatAt: string | null;
        leaseExpiresAt: string | null;
    };
};

/**
 * Creates the persisted diagnostic payload stored with one failed durable chat job.
 *
 * @private function of `userChat`
 */
export function createUserChatJobFailureDetails(options: {
    job: Pick<
        UserChatJobRecord,
        | 'id'
        | 'status'
        | 'userId'
        | 'agentPermanentId'
        | 'chatId'
        | 'userMessageId'
        | 'assistantMessageId'
        | 'clientMessageId'
        | 'attemptCount'
        | 'queuedAt'
        | 'startedAt'
        | 'updatedAt'
        | 'lastHeartbeatAt'
        | 'leaseExpiresAt'
    >;
    summary: string;
    source: string;
    recordedAt?: string;
    provider?: string | null;
    generationDurationMs?: number;
    error?: unknown;
    diagnostics?: unknown;
}): string {
    const payload: UserChatJobFailureDetailsPayload = {
        summary: options.summary,
        source: options.source,
        recordedAt: options.recordedAt ?? new Date().toISOString(),
        provider: options.provider ?? null,
        generationDurationMs: options.generationDurationMs ?? null,
        error: resolveSerializableUserChatJobFailureError(options.error),
        diagnostics: options.diagnostics ?? null,
        job: {
            id: options.job.id,
            status: options.job.status,
            userId: options.job.userId,
            agentPermanentId: options.job.agentPermanentId,
            chatId: options.job.chatId,
            userMessageId: options.job.userMessageId,
            assistantMessageId: options.job.assistantMessageId,
            clientMessageId: options.job.clientMessageId,
            attemptCount: options.job.attemptCount,
            queuedAt: options.job.queuedAt,
            startedAt: options.job.startedAt,
            updatedAt: options.job.updatedAt,
            lastHeartbeatAt: options.job.lastHeartbeatAt,
            leaseExpiresAt: options.job.leaseExpiresAt,
        },
    };

    const serializedPayload = JSON.stringify(payload, null, USER_CHAT_JOB_FAILURE_DETAILS_JSON_INDENT);
    if (serializedPayload === undefined) {
        throw new Error('Failed to serialize user chat job failure details.');
    }

    return serializedPayload;
}

/**
 * Serializes one optional thrown value into a durable diagnostic payload.
 *
 * @private function of `userChat`
 */
function resolveSerializableUserChatJobFailureError(
    error: unknown,
): ReturnType<typeof serializeError> | UnknownUserChatJobFailureErrorDetails | null {
    if (error === undefined || error === null) {
        return null;
    }

    if (error instanceof Error) {
        return serializeError(error);
    }

    return {
        message: UNKNOWN_USER_CHAT_JOB_FAILURE_ERROR_MESSAGE,
        raw: resolveThrownValuePreview(error),
    };
}

/**
 * Builds a stable string preview for non-`Error` thrown values.
 *
 * @private function of `userChat`
 */
function resolveThrownValuePreview(error: unknown): string | null {
    if (typeof error === 'string') {
        return error;
    }

    if (
        typeof error === 'number' ||
        typeof error === 'boolean' ||
        typeof error === 'bigint' ||
        typeof error === 'symbol'
    ) {
        return String(error);
    }

    try {
        return JSON.stringify(error) ?? null;
    } catch {
        return Object.prototype.toString.call(error);
    }
}
