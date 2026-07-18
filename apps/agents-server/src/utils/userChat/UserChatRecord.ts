import type { ChatMessage } from '@promptbook-local/types';
import type { UserChatSource } from './UserChatSource';

/**
 * User chat aggregate stored per user and per agent.
 */
export type UserChatRecord = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    title: string | null;
    userId: number;
    agentPermanentId: string;
    source: UserChatSource;
    messages: Array<ChatMessage>;
    draftMessage: string | null;
};

/**
 * Lightweight running activity metadata exposed with chat summaries.
 */
export type UserChatRunningActivity = {
    count: number;
};

/**
 * Lightweight timeout activity metadata exposed with chat summaries.
 */
export type UserChatTimeoutActivity = {
    count: number;
    nearestDueAt: string | null;
};

/**
 * Lightweight item used by chat history lists.
 */
export type UserChatSummary = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    source: UserChatSource;
    isReadOnly: boolean;
    /**
     * True when the chat belongs to a different user than the current viewer
     * (visible only to admins/super-admins browsing external chats).
     */
    isExternalUserChat: boolean;
    messagesCount: number;
    title: string;
    preview: string;
    runningActivity: UserChatRunningActivity;
    timeoutActivity: UserChatTimeoutActivity;
};

/**
 * Query options for listing chats.
 */
export type ListUserChatsOptions = {
    userId: number;
    viewerIsAdmin: boolean;
    /**
     * True when the viewer is the environment-backed super-admin
     * who may browse all users' chats on the server.
     */
    viewerIsSuperAdmin?: boolean;
    agentPermanentId: string;
    includeExternalChats?: boolean;
};

/**
 * Query options for loading a single chat.
 */
export type GetUserChatOptions = {
    userId: number;
    viewerIsAdmin?: boolean;
    /**
     * True when the viewer is the environment-backed super-admin
     * who may open other users' chats in a view-only mode.
     */
    viewerIsSuperAdmin?: boolean;
    agentPermanentId: string;
    chatId: string;
};

/**
 * Create options for a chat.
 */
export type CreateUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    source?: UserChatSource;
    chatId?: string;
    messages?: ReadonlyArray<ChatMessage>;
};

/**
 * Update options for replacing persisted chat messages.
 */
export type UpdateUserChatMessagesOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    messages: ReadonlyArray<ChatMessage>;
};

/**
 * Update options for saving chat draft message.
 */
export type UpdateUserChatDraftOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    draftMessage: string | null;
};

/**
 * Delete options for a chat.
 */
export type DeleteUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
};
