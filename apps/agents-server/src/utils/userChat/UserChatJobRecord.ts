/**
 * Lifecycle status stored for one durable chat-turn job.
 */
export type UserChatJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Parameters persisted with one queued chat turn.
 */
export type UserChatJobParameters = Record<string, unknown>;

/**
 * Durable job row linked to one user-authored chat turn.
 */
export type UserChatJobRecord = {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    userMessageId: string;
    assistantMessageId: string;
    clientMessageId: string;
    status: UserChatJobStatus;
    parameters: UserChatJobParameters;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    lastHeartbeatAt: string | null;
    leaseExpiresAt: string | null;
    attemptCount: number;
    provider: string | null;
    failureReason: string | null;
};

/**
 * Query options for one scoped chat-job lookup.
 */
export type GetUserChatJobOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    jobId: string;
};

/**
 * Query options for resolving a queued/running job by `clientMessageId`.
 */
export type GetUserChatJobByClientMessageIdOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    clientMessageId: string;
};

/**
 * Query options for listing jobs inside one scoped chat.
 */
export type ListUserChatJobsOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    onlyActive?: boolean;
};

/**
 * Input used when persisting one new queued job.
 */
export type CreateUserChatJobOptions = {
    id?: string;
    userId: number;
    agentPermanentId: string;
    chatId: string;
    userMessageId: string;
    assistantMessageId: string;
    clientMessageId: string;
    parameters?: UserChatJobParameters;
};
