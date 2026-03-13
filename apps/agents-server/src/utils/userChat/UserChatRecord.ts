import type { ChatMessage } from '@promptbook-local/types';

/**
 * User chat aggregate stored per user and per agent.
 */
export type UserChatRecord = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    userId: number;
    agentPermanentId: string;
    messages: Array<ChatMessage>;
    draftMessage: string | null;
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
    messagesCount: number;
    title: string;
    preview: string;
    timeoutActivity: UserChatTimeoutActivity;
};

/**
 * Query options for listing chats.
 */
export type ListUserChatsOptions = {
    userId: number;
    agentPermanentId: string;
};

/**
 * Query options for loading a single chat.
 */
export type GetUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
};

/**
 * Create options for a chat.
 */
export type CreateUserChatOptions = {
    userId: number;
    agentPermanentId: string;
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
