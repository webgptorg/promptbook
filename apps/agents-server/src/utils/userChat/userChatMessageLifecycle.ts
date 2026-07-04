import type { ChatMessage } from '../../../../../src/_packages/types.index';
import { appendChatAttachmentContextWithContent } from '../../../../../src/utils/chat/chatAttachments/appendChatAttachmentContextWithContent';

/**
 * Lifecycle states rendered on canonical server-owned chat messages.
 */
export type UserChatMessageLifecycleState = NonNullable<ChatMessage['lifecycleState']>;

/**
 * Message shape written into local/external chat-runner `.book` files.
 */
export type UserChatRunnerThreadMessage = Pick<ChatMessage, 'content'> & {
    sender: 'USER' | 'AGENT';
};

/**
 * Creates one persisted user-authored message for a durable chat turn.
 */
export function createQueuedUserChatUserMessage(options: {
    messageId: string;
    clientMessageId: string;
    content: string;
    attachments?: ChatMessage['attachments'];
    replyingTo?: ChatMessage['replyingTo'];
    createdAt: NonNullable<ChatMessage['createdAt']>;
}): ChatMessage {
    return {
        id: options.messageId,
        sender: 'USER',
        content: options.content,
        attachments: options.attachments,
        replyingTo: options.replyingTo,
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
 * Creates the complete chat thread mirrored to a runner before it writes the next answer.
 */
export async function createUserChatRunnerThreadMessages(options: {
    messages: ReadonlyArray<ChatMessage>;
    userMessageId: string;
    resolveInitialAgentMessage: () => string | null | undefined;
}): Promise<Array<UserChatRunnerThreadMessage>> {
    const userMessage = options.messages.find((message) => message.id === options.userMessageId);
    if (!userMessage) {
        return [];
    }

    const previousThreadMessages = resolvePromptThreadBeforeUserMessage(options.messages, options.userMessageId);

    const threadMessages = [
        ...createInitialUserChatRunnerThreadMessages({
            isFirstUserTurn: previousThreadMessages.length === 0,
            resolveInitialAgentMessage: options.resolveInitialAgentMessage,
        }),
        ...previousThreadMessages,
        userMessage,
    ].filter(isUserChatRunnerThreadMessage);

    return await Promise.all(threadMessages.map(createUserChatRunnerThreadMessage));
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

/**
 * Recreates the synthetic first agent message that the UI shows for empty durable chats.
 */
function createInitialUserChatRunnerThreadMessages(options: {
    isFirstUserTurn: boolean;
    resolveInitialAgentMessage: () => string | null | undefined;
}): Array<UserChatRunnerThreadMessage> {
    if (!options.isFirstUserTurn) {
        return [];
    }

    const initialAgentMessage = options.resolveInitialAgentMessage();
    if (!initialAgentMessage || initialAgentMessage.trim().length === 0) {
        return [];
    }

    return [
        {
            sender: 'AGENT',
            content: initialAgentMessage,
        },
    ];
}

/**
 * Returns true when one persisted message should be visible to out-of-process runners.
 */
function isUserChatRunnerThreadMessage(message: ChatMessage): message is ChatMessage & UserChatRunnerThreadMessage {
    const isRunnerSender = message.sender === 'USER' || message.sender === 'AGENT';
    return message.isComplete !== false && isRunnerSender;
}

/**
 * Creates one runner-visible message with attachment context inlined into user-authored content.
 *
 * @private helper of `createUserChatRunnerThreadMessages`
 */
async function createUserChatRunnerThreadMessage(
    message: ChatMessage & UserChatRunnerThreadMessage,
): Promise<UserChatRunnerThreadMessage> {
    return {
        sender: message.sender,
        content: await createUserChatRunnerThreadMessageContent(message),
    };
}

/**
 * Adds attachment URLs and best-effort text previews to user messages mirrored into runner `.book` files.
 *
 * @private helper of `createUserChatRunnerThreadMessage`
 */
async function createUserChatRunnerThreadMessageContent(
    message: ChatMessage & UserChatRunnerThreadMessage,
): Promise<string> {
    if (message.sender !== 'USER' || !message.attachments || message.attachments.length === 0) {
        return message.content;
    }

    return await appendChatAttachmentContextWithContent(message.content, message.attachments, {
        allowLocalhost: true,
    });
}
