'use client';

import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatSource } from './userChat/UserChatSource';

export { cancelAgentUserTimeout } from './userChatClient/cancelAgentUserTimeout';
export { cancelUserChatJob } from './userChatClient/cancelUserChatJob';
export { cancelUserChatTimeout } from './userChatClient/cancelUserChatTimeout';
export { createUserChat } from './userChatClient/createUserChat';
export { createUserChatClientMessageId } from './userChatClient/createUserChatClientMessageId';
export { fetchAgentUserTimeouts } from './userChatClient/fetchAgentUserTimeouts';
export { fetchUserChat } from './userChatClient/fetchUserChat';
export { fetchUserChats } from './userChatClient/fetchUserChats';
export { removeUserChat } from './userChatClient/removeUserChat';
export { runAgentUserTimeoutBulkAction } from './userChatClient/runAgentUserTimeoutBulkAction';
export { saveUserChatDraft } from './userChatClient/saveUserChatDraft';
export { saveUserChatMessages } from './userChatClient/saveUserChatMessages';
export { sendUserChatMessage } from './userChatClient/sendUserChatMessage';
export { streamUserChat } from './userChatClient/streamUserChat';
export { updateAgentUserTimeout } from './userChatClient/updateAgentUserTimeout';
export { UserChatApiError } from './userChatClient/UserChatApiError';

/**
 * Optional fetch configuration for chat-save requests.
 */
export type UserChatSaveRequestOptions = {
    /**
     * Enables keepalive mode so save requests can continue during page unload.
     */
    keepalive?: boolean;
};

/**
 * Chat list item returned by user-chat API.
 */
export type UserChatSummary = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    source: UserChatSource;
    isReadOnly: boolean;
    messagesCount: number;
    title: string;
    preview: string;
    runningActivity: {
        count: number;
    };
    timeoutActivity: {
        count: number;
        nearestDueAt: string | null;
    };
};

/**
 * Active durable job linked to the currently open chat.
 */
export type UserChatJob = {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    userMessageId: string;
    assistantMessageId: string;
    clientMessageId: string;
    status: 'QUEUED' | 'RUNNING';
    parameters: Record<string, unknown>;
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
 * Active durable timeout linked to the currently open chat.
 */
export type UserChatTimeout = {
    id: string;
    timeoutId: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    userId: number;
    agentPermanentId: string;
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    message: string | null;
    parameters: Record<string, unknown>;
    durationMs: number;
    dueAt: string;
    recurrenceIntervalMs: number | null;
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
 * Aggregated timeout counters used in the global agent timeout manager.
 */
export type AgentUserTimeoutCounters = {
    allCount: number;
    queuedCount: number;
    runningCount: number;
    pausedCount: number;
    completedCount: number;
    failedCount: number;
    cancelledCount: number;
};

/**
 * API payload for the agent-wide timeout list endpoint.
 */
export type AgentUserTimeoutListResponse = {
    items: Array<UserChatTimeout>;
    counters: AgentUserTimeoutCounters;
    generatedAt: string;
};

/**
 * Editable timeout fields accepted by the agent-wide timeout update endpoint.
 */
export type AgentUserTimeoutUpdatePayload = {
    dueAt?: string;
    recurrenceIntervalMs?: number | null;
    message?: string | null;
    parameters?: Record<string, unknown>;
    paused?: boolean;
    extendByMs?: number;
};

/**
 * Supported bulk timeout actions in the agent-wide timeout manager.
 */
export type AgentUserTimeoutBulkAction = 'cancel_all_active' | 'pause_all_active' | 'resume_all_paused';

/**
 * API payload returned after one bulk timeout action.
 */
export type AgentUserTimeoutBulkActionResponse = {
    action: AgentUserTimeoutBulkAction;
    matchedCount: number;
    updatedCount: number;
    timeoutIds: Array<string>;
    hasMore: boolean;
    generatedAt: string;
};

/**
 * API payload for list endpoint.
 */
export type UserChatsSnapshot = {
    chats: Array<UserChatSummary>;
    activeChatId: string | null;
    activeMessages: Array<ChatMessage>;
    activeDraftMessage?: string | null;
    activeJobs: Array<UserChatJob>;
    activeTimeouts: Array<UserChatTimeout>;
};

/**
 * Optional query flags for loading user-chat snapshots.
 */
export type FetchUserChatsOptions = {
    /**
     * When true, admin users can include frozen external chats in the listing.
     */
    showExternalChats?: boolean;
};

/**
 * API payload for single chat detail endpoint.
 */
export type UserChatDetail = {
    chat: UserChatSummary;
    messages: Array<ChatMessage>;
    draftMessage?: string | null;
    activeJobs: Array<UserChatJob>;
    activeTimeouts: Array<UserChatTimeout>;
};

/**
 * API payload returned after enqueueing one durable turn.
 */
export type UserChatEnqueueResult = UserChatDetail & {
    job: UserChatJob;
};

/**
 * Callback hooks accepted by the canonical user-chat stream client.
 */
export type StreamUserChatOptions = {
    /**
     * Abort signal used to stop reading the long-lived stream.
     */
    signal?: AbortSignal;
    /**
     * Called whenever the server emits a refreshed canonical chat snapshot.
     */
    onSnapshot: (chatDetail: UserChatDetail) => void;
};
