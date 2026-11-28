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
    recurrenceIntervalMs: number | null;
    cronExpression: string | null;
    startsAt: string | null;
    endsAt: string | null;
    maxRunCount: number | null;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    runCount: number;
    lastFiredAt: string | null;
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
    recurrenceIntervalMs: number | null;
    cronExpression: string | null;
    startsAt: string | null;
    endsAt: string | null;
    maxRunCount: number | null;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    pausedAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    runCount: number;
    lastFiredAt: string | null;
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
    recurrenceIntervalMs?: number | null;
    cronExpression?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxRunCount?: number | null;
    queuedAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    cancelRequestedAt?: string | null;
    pausedAt?: string | null;
    leaseExpiresAt?: string | null;
    attemptCount?: number;
    runCount?: number;
    lastFiredAt?: string | null;
    failureReason?: string | null;
};

/**
 * Input used when persisting one new chat timeout.
 *
 * The schedule fields describe the whole life of a planned message, so `durationMs` and `dueAt` are
 * only needed by a caller that schedules one plain wake-up at a fixed delay.
 */
export type CreateUserChatTimeoutOptions = {
    id?: string;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    durationMs?: number;
    dueAt?: string;
    recurrenceIntervalMs?: number | null;
    cronExpression?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxRunCount?: number | null;
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

/**
 * Query options for listing the timeouts of every agent on the server.
 */
export type ListAllUserChatTimeoutsOptions = {
    /**
     * Largest number of rows to return, newest first.
     */
    limit: number;
};

/**
 * Query options for loading one timeout scoped only to user + agent.
 */
export type GetAgentScopedUserChatTimeoutOptions = {
    /**
     * Owning user, or `undefined` to span every user of the agent
     * (used by the agent goal chat, which plans on behalf of the agent itself).
     */
    userId?: number;
    agentPermanentId: string;
    timeoutId: string;
};

/**
 * Query options for listing all timeouts owned by one user+agent across chats.
 */
export type ListAgentUserChatTimeoutsOptions = {
    /**
     * Owning user, or `undefined` to span every user of the agent
     * (used by the agent goal chat, which plans on behalf of the agent itself).
     */
    userId?: number;
    agentPermanentId: string;
    statuses?: ReadonlyArray<UserChatTimeoutStatus>;
    includePaused?: boolean;
    paused?: boolean;
    limit?: number;
    offset?: number;
};

/**
 * Mutable fields accepted when editing one agent-scoped timeout.
 *
 * Every schedule field that is present is written, so leaving one out keeps it as it is and passing
 * `null` removes it.
 */
export type UpdateAgentScopedUserChatTimeoutPatch = {
    dueAt?: string;
    recurrenceIntervalMs?: number | null;
    cronExpression?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxRunCount?: number | null;
    message?: string | null;
    parameters?: UserChatTimeoutParameters;
    pausedAt?: string | null;
    extendByMs?: number;
};

/**
 * Options for updating one timeout scoped by user + agent + timeout id.
 */
export type UpdateAgentScopedUserChatTimeoutOptions = GetAgentScopedUserChatTimeoutOptions & {
    patch: UpdateAgentScopedUserChatTimeoutPatch;
};
