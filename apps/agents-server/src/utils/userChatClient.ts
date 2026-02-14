'use client';

import type { ChatMessage } from '@promptbook-local/types';

/**
 * Chat list item returned by user-chat API.
 */
export type UserChatSummary = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    messagesCount: number;
    title: string;
    preview: string;
};

/**
 * API payload for list endpoint.
 */
export type UserChatsSnapshot = {
    chats: Array<UserChatSummary>;
    activeChatId: string | null;
    activeMessages: Array<ChatMessage>;
};

/**
 * API payload for single chat detail endpoint.
 */
export type UserChatDetail = {
    chat: UserChatSummary;
    messages: Array<ChatMessage>;
};

/**
 * Fetches chats for one agent and includes resolved active chat messages.
 */
export async function fetchUserChats(agentName: string, chatId?: string): Promise<UserChatsSnapshot> {
    const query = new URLSearchParams();
    if (chatId) {
        query.set('chat', chatId);
    }

    const queryString = query.toString();
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats${queryString ? `?${queryString}` : ''}`,
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load chats.');
    }

    return (await response.json()) as UserChatsSnapshot;
}

/**
 * Creates a new empty chat for one agent.
 */
export async function createUserChat(agentName: string): Promise<UserChatDetail> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create chat.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Loads a single chat detail by id.
 */
export async function fetchUserChat(agentName: string, chatId: string): Promise<UserChatDetail> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`, {
        method: 'GET',
        cache: 'no-store',
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load chat.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Replaces stored messages for one chat.
 */
export async function saveUserChatMessages(
    agentName: string,
    chatId: string,
    messages: ReadonlyArray<ChatMessage>,
): Promise<UserChatDetail> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save chat.');
    }

    return (await response.json()) as UserChatDetail;
}

/**
 * Deletes one chat by id.
 */
export async function removeUserChat(agentName: string, chatId: string): Promise<void> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete chat.');
    }
}
