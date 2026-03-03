import { getUserChat, updateUserChatMessages } from '@/src/utils/userChat';
import type { ChatMessage, string_date_iso8601, ToolCall } from '@promptbook-local/types';
import { $getCurrentDate } from '@promptbook-local/utils';

/**
 * Interval used for throttled persistence of in-progress assistant text.
 */
const STREAM_PERSIST_DEBOUNCE_MS = 1_000;

/**
 * Placeholder content shown while the assistant is still preparing a response.
 */
const DEFAULT_STREAMING_PLACEHOLDER_TEXT = 'Thinking...';

/**
 * Fallback text stored when streaming fails before a final response can be produced.
 */
const DEFAULT_STREAMING_FAILURE_MESSAGE = 'The response was interrupted. Please try again.';

/**
 * Input required to persist one server-side stream into a `UserChat` record.
 */
export type CreateUserChatStreamPersistenceOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    thread?: ReadonlyArray<ChatMessage>;
    userMessage: string;
    attachments?: ChatMessage['attachments'];
};

/**
 * Payload used when finalizing the persisted assistant response.
 */
export type CompleteUserChatStreamPersistenceOptions = {
    content: string;
    toolCalls?: ReadonlyArray<ToolCall>;
    generationDurationMs?: number;
};

/**
 * Runtime controller used by `/api/chat` to keep `UserChat.messages` synchronized with stream progress.
 */
export type UserChatStreamPersistence = {
    appendDelta: (deltaContent: string) => void;
    setToolCalls: (toolCalls: ReadonlyArray<ToolCall>) => void;
    flush: () => Promise<void>;
    complete: (options: CompleteUserChatStreamPersistenceOptions) => Promise<void>;
    fail: (errorMessage?: string) => Promise<void>;
};

/**
 * Creates one persistence controller that mirrors streamed agent output into a user chat row.
 *
 * Returns `null` when the target chat does not exist for the supplied user/agent scope.
 */
export async function createUserChatStreamPersistence(
    options: CreateUserChatStreamPersistenceOptions,
): Promise<UserChatStreamPersistence | null> {
    const { userId, agentPermanentId, chatId, userMessage, attachments } = options;

    const existingChat = await getUserChat({
        userId,
        agentPermanentId,
        chatId,
    });

    if (!existingChat) {
        return null;
    }

    const baseMessages = resolveBaseMessages(options.thread, existingChat.messages, userMessage, attachments);
    const assistantMessageId = createAssistantMessageId(baseMessages);
    const assistantCreatedAt = $getCurrentDate() as string_date_iso8601;

    let streamedContent = '';
    let streamedToolCalls: ReadonlyArray<ToolCall> | undefined;
    let persistedMessages = upsertAssistantStreamingMessage(baseMessages, {
        assistantMessageId,
        assistantCreatedAt,
        content: streamedContent,
        toolCalls: streamedToolCalls,
    });

    await updateUserChatMessages({
        userId,
        agentPermanentId,
        chatId,
        messages: persistedMessages,
    });

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    let persistQueue: Promise<void> = Promise.resolve();
    let lastPersistedHash = JSON.stringify(persistedMessages);
    let isFinalized = false;

    const enqueuePersist = (messages: ReadonlyArray<ChatMessage>): Promise<void> => {
        persistQueue = persistQueue
            .catch(() => undefined)
            .then(async () => {
                await updateUserChatMessages({
                    userId,
                    agentPermanentId,
                    chatId,
                    messages,
                });
            });

        return persistQueue;
    };

    const flushStreamingSnapshot = async (force: boolean): Promise<void> => {
        if (isFinalized) {
            return;
        }

        const nextMessages = upsertAssistantStreamingMessage(persistedMessages, {
            assistantMessageId,
            assistantCreatedAt,
            content: streamedContent,
            toolCalls: streamedToolCalls,
        });
        const nextHash = JSON.stringify(nextMessages);

        if (!force && nextHash === lastPersistedHash) {
            return;
        }

        lastPersistedHash = nextHash;
        persistedMessages = nextMessages;
        await enqueuePersist(nextMessages);
    };

    const clearPersistTimer = (): void => {
        if (!persistTimer) {
            return;
        }

        clearTimeout(persistTimer);
        persistTimer = null;
    };

    const scheduleStreamingPersist = (): void => {
        if (persistTimer) {
            return;
        }

        persistTimer = setTimeout(() => {
            persistTimer = null;
            void flushStreamingSnapshot(false);
        }, STREAM_PERSIST_DEBOUNCE_MS);
    };

    const appendDelta = (deltaContent: string): void => {
        if (!deltaContent || isFinalized) {
            return;
        }

        streamedContent += deltaContent;
        scheduleStreamingPersist();
    };

    const setToolCalls = (toolCalls: ReadonlyArray<ToolCall>): void => {
        if (isFinalized) {
            return;
        }

        streamedToolCalls = toolCalls.length > 0 ? [...toolCalls] : undefined;
        scheduleStreamingPersist();
    };

    const flush = async (): Promise<void> => {
        clearPersistTimer();
        if (isFinalized) {
            await persistQueue;
            return;
        }

        await flushStreamingSnapshot(true);
    };

    const complete = async (completion: CompleteUserChatStreamPersistenceOptions): Promise<void> => {
        clearPersistTimer();
        isFinalized = true;

        streamedContent = completion.content;
        streamedToolCalls = completion.toolCalls && completion.toolCalls.length > 0 ? [...completion.toolCalls] : undefined;

        const finalizedMessages = upsertAssistantFinalMessage(persistedMessages, {
            assistantMessageId,
            assistantCreatedAt,
            content: completion.content,
            toolCalls: streamedToolCalls,
            generationDurationMs: completion.generationDurationMs,
        });

        persistedMessages = finalizedMessages;
        lastPersistedHash = JSON.stringify(finalizedMessages);
        await enqueuePersist(finalizedMessages);
    };

    const fail = async (errorMessage?: string): Promise<void> => {
        clearPersistTimer();
        isFinalized = true;

        const failedMessages = upsertAssistantFailureMessage(persistedMessages, {
            assistantMessageId,
            assistantCreatedAt,
            errorMessage,
        });

        persistedMessages = failedMessages;
        lastPersistedHash = JSON.stringify(failedMessages);
        await enqueuePersist(failedMessages);
    };

    return {
        appendDelta,
        setToolCalls,
        flush,
        complete,
        fail,
    };
}

/**
 * Resolves the baseline message list for one streaming chat run.
 */
function resolveBaseMessages(
    thread: ReadonlyArray<ChatMessage> | undefined,
    fallbackMessages: ReadonlyArray<ChatMessage>,
    userMessage: string,
    attachments: ChatMessage['attachments'] | undefined,
): Array<ChatMessage> {
    if (thread && thread.length > 0) {
        return cloneMessages(thread);
    }

    const normalizedFallback = cloneMessages(fallbackMessages);
    const fallbackUserMessage: ChatMessage = {
        id: createRuntimeMessageId('user'),
        sender: 'USER',
        content: userMessage,
        isComplete: true,
        createdAt: $getCurrentDate() as string_date_iso8601,
        attachments,
    };

    return [...normalizedFallback, fallbackUserMessage];
}

/**
 * Creates an id for the persisted assistant message that stays stable for the whole run.
 */
function createAssistantMessageId(messages: ReadonlyArray<ChatMessage>): string {
    const lastMessage = messages[messages.length - 1];

    if (typeof lastMessage?.id === 'string' && lastMessage.id.trim() !== '') {
        return `${lastMessage.id}__assistant`;
    }

    return createRuntimeMessageId('assistant');
}

/**
 * Creates one best-effort runtime message id.
 */
function createRuntimeMessageId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Produces a mutable clone of persisted messages.
 */
function cloneMessages(messages: ReadonlyArray<ChatMessage>): Array<ChatMessage> {
    return messages.map((message) => ({ ...message }));
}

/**
 * Upserts the in-progress assistant message with cumulative stream content.
 */
function upsertAssistantStreamingMessage(
    messages: ReadonlyArray<ChatMessage>,
    options: {
        assistantMessageId: string;
        assistantCreatedAt: string_date_iso8601;
        content: string;
        toolCalls: ReadonlyArray<ToolCall> | undefined;
    },
): Array<ChatMessage> {
    const streamingAssistantMessage: ChatMessage = {
        id: options.assistantMessageId,
        sender: 'AGENT',
        createdAt: options.assistantCreatedAt,
        content: options.content || DEFAULT_STREAMING_PLACEHOLDER_TEXT,
        isComplete: false,
        ongoingToolCalls: options.toolCalls,
    };

    return upsertMessageById(messages, streamingAssistantMessage);
}

/**
 * Upserts the final assistant message into the conversation.
 */
function upsertAssistantFinalMessage(
    messages: ReadonlyArray<ChatMessage>,
    options: {
        assistantMessageId: string;
        assistantCreatedAt: string_date_iso8601;
        content: string;
        toolCalls: ReadonlyArray<ToolCall> | undefined;
        generationDurationMs?: number;
    },
): Array<ChatMessage> {
    const finalizedMessage: ChatMessage = {
        id: options.assistantMessageId,
        sender: 'AGENT',
        createdAt: options.assistantCreatedAt,
        content: options.content,
        isComplete: true,
        generationDurationMs: options.generationDurationMs,
        toolCalls: options.toolCalls,
        completedToolCalls: options.toolCalls,
    };

    return upsertMessageById(messages, finalizedMessage);
}

/**
 * Upserts a failure message when generation aborts unexpectedly.
 */
function upsertAssistantFailureMessage(
    messages: ReadonlyArray<ChatMessage>,
    options: {
        assistantMessageId: string;
        assistantCreatedAt: string_date_iso8601;
        errorMessage?: string;
    },
): Array<ChatMessage> {
    const failureMessage: ChatMessage = {
        id: options.assistantMessageId,
        sender: 'AGENT',
        createdAt: options.assistantCreatedAt,
        content: options.errorMessage?.trim() || DEFAULT_STREAMING_FAILURE_MESSAGE,
        isComplete: true,
    };

    return upsertMessageById(messages, failureMessage);
}

/**
 * Replaces one message by id or appends it when no existing row is found.
 */
function upsertMessageById(messages: ReadonlyArray<ChatMessage>, message: ChatMessage): Array<ChatMessage> {
    const clonedMessages = cloneMessages(messages);
    const existingIndex = clonedMessages.findIndex((currentMessage) => currentMessage.id === message.id);

    if (existingIndex === -1) {
        return [...clonedMessages, message];
    }

    clonedMessages[existingIndex] = message;
    return clonedMessages;
}
