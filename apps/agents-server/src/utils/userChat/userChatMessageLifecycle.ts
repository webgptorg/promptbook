import type { ChatMessage } from '../../../../../src/_packages/types.index';

/**
 * Lifecycle states rendered on canonical server-owned chat messages.
 */
export type UserChatMessageLifecycleState = NonNullable<ChatMessage['lifecycleState']>;

/**
 * Creates one persisted user-authored message for a durable chat turn.
 */
export function createQueuedUserChatUserMessage(options: {
    messageId: string;
    clientMessageId: string;
    content: string;
    attachments?: ChatMessage['attachments'];
    createdAt: NonNullable<ChatMessage['createdAt']>;
}): ChatMessage {
    return {
        id: options.messageId,
        sender: 'USER',
        content: options.content,
        attachments: options.attachments,
        createdAt: options.createdAt,
        isComplete: true,
        lifecycleState: 'completed',
        clientMessageId: options.clientMessageId,
    };
}

/**
 * Creates the queued assistant placeholder persisted before worker execution starts.
 */
export function createQueuedUserChatAssistantMessage(options: {
    messageId: string;
    jobId: string;
    createdAt: NonNullable<ChatMessage['createdAt']>;
}): ChatMessage {
    return {
        id: options.messageId,
        sender: 'AGENT',
        content: '',
        createdAt: options.createdAt,
        isComplete: false,
        lifecycleState: 'queued',
        jobId: options.jobId,
    };
}

/**
 * Updates one assistant placeholder inside the canonical chat history.
 */
export function updateAssistantMessageInChat(
    messages: ReadonlyArray<ChatMessage>,
    assistantMessageId: string,
    update: (message: ChatMessage) => ChatMessage,
): Array<ChatMessage> {
    return messages.map((message) => {
        if (message.id !== assistantMessageId) {
            return message;
        }

        return update(message);
    });
}

/**
 * Resolves the message index of one queued user turn.
 */
export function findUserChatMessageIndex(
    messages: ReadonlyArray<ChatMessage>,
    messageId: string,
): number {
    return messages.findIndex((message) => message.id === messageId);
}

/**
 * Returns the prompt thread that existed before one specific user turn.
 */
export function resolvePromptThreadBeforeUserMessage(
    messages: ReadonlyArray<ChatMessage>,
    userMessageId: string,
): Array<ChatMessage> {
    const userMessageIndex = findUserChatMessageIndex(messages, userMessageId);
    if (userMessageIndex === -1) {
        return [];
    }

    return messages.slice(0, userMessageIndex);
}

/**
 * Maps durable job status values to message lifecycle labels rendered by the UI.
 */
export function resolveMessageLifecycleStateFromJobStatus(status: string): UserChatMessageLifecycleState {
    switch (status) {
        case 'QUEUED':
            return 'queued';
        case 'RUNNING':
            return 'running';
        case 'FAILED':
            return 'failed';
        case 'CANCELLED':
            return 'cancelled';
        case 'COMPLETED':
        default:
            return 'completed';
    }
}
