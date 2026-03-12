import type { Json } from '@/src/database/schema';

/**
 * Lifecycle status stored for one durable chat timeout.
 */
export type UserChatTimeoutStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Prompt parameters persisted with one scheduled timeout.
 */
export type UserChatTimeoutParameters = Record<string, unknown>;

/**
 * Durable timeout row linked to one user chat thread.
 */
export type UserChatTimeoutRecord = {
    id: string;
    timeoutId: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    status: UserChatTimeoutStatus;
    message: string | null;
    parameters: UserChatTimeoutParameters;
    durationMs: number;
    dueAt: string;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    failureReason: string | null;
};

/**
 * Database row shape for `UserChatTimeout`.
 */
export type UserChatTimeoutRow = {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    status: UserChatTimeoutStatus;
    message: string | null;
    parameters: Json;
    durationMs: number;
    dueAt: string;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    failureReason: string | null;
};

/**
 * Insert payload shape for `UserChatTimeout`.
 */
export type UserChatTimeoutInsert = {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    status: UserChatTimeoutStatus;
    message?: string | null;
    parameters?: Json;
    durationMs: number;
    dueAt: string;
    queuedAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    cancelRequestedAt?: string | null;
    leaseExpiresAt?: string | null;
    attemptCount?: number;
    failureReason?: string | null;
};

/**
 * Input used when persisting one new chat timeout.
 */
export type CreateUserChatTimeoutOptions = {
    id?: string;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    durationMs: number;
    dueAt?: string;
    message?: string;
    parameters?: UserChatTimeoutParameters;
};

/**
 * Query options for loading one scoped timeout.
 */
export type GetUserChatTimeoutOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    timeoutId: string;
};

/**
 * Query options for listing timeouts inside one scoped chat.
 */
export type ListUserChatTimeoutsOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    onlyActive?: boolean;
};
