import { randomUUID } from 'crypto';
import type { AddMessageToChatThreadOptions } from '../ChatThread';
import type { ChatThread } from '../ChatThread';
import type { ChatThreadMessage } from '../ChatThread';
import type { CreateChatThreadOptions } from '../ChatThread';
import type { string_uuid } from '../../types/typeAliases';

/**
 * Creates a new empty chat thread
 */
export function createChatThread(options: CreateChatThreadOptions = {}): ChatThread {
    const now = new Date();
    const messages: ChatThreadMessage[] = [];

    // Add system message if provided
    if (options.systemMessage) {
        messages.push({
            id: randomUUID() as string_uuid,
            role: 'system',
            content: options.systemMessage,
            timestamp: now,
        });
    }

    return {
        id: randomUUID() as string_uuid,
        title: options.title,
        messages,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Adds a message to an existing chat thread
 */
export function addMessageToChatThread(
    thread: ChatThread,
    messageOptions: AddMessageToChatThreadOptions,
): ChatThread {
    const now = new Date();
    
    const newMessage: ChatThreadMessage = {
        id: randomUUID() as string_uuid,
        role: messageOptions.role,
        name: messageOptions.name,
        content: messageOptions.content,
        timestamp: now,
    };

    return {
        ...thread,
        messages: [...thread.messages, newMessage],
        updatedAt: now,
    };
}

/**
 * Gets the last N messages from a chat thread
 */
export function getLastMessages(thread: ChatThread, count: number): ReadonlyArray<ChatThreadMessage> {
    return thread.messages.slice(-count);
}

/**
 * Gets messages from a chat thread starting from a specific message ID
 */
export function getMessagesFromId(thread: ChatThread, messageId: string): ReadonlyArray<ChatThreadMessage> {
    const messageIndex = thread.messages.findIndex(message => message.id === messageId);
    if (messageIndex === -1) {
        return [];
    }
    return thread.messages.slice(messageIndex);
}

/**
 * Converts chat thread messages to OpenAI format
 */
export function convertThreadToOpenAIMessages(thread: ChatThread): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
}> {
    return thread.messages.map(message => ({
        role: message.role,
        content: message.content,
        ...(message.name && { name: message.name }),
    }));
}

/**
 * Gets the system message from a chat thread (if any)
 */
export function getSystemMessage(thread: ChatThread): ChatThreadMessage | undefined {
    return thread.messages.find(message => message.role === 'system');
}

/**
 * Creates a new thread with updated title
 */
export function updateChatThreadTitle(thread: ChatThread, title: string): ChatThread {
    return {
        ...thread,
        title,
        updatedAt: new Date(),
    };
}

/**
 * Checks if a chat thread is empty (has no user or assistant messages)
 */
export function isChatThreadEmpty(thread: ChatThread): boolean {
    return !thread.messages.some(message => message.role === 'user' || message.role === 'assistant');
}
