import type { ChatMessage } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import { resolveChatMessageReplyPreviewText } from '../../../../../src/book-components/Chat/utils/resolveChatMessageReplyPreviewText';
import { UserChatReplyValidationError } from './UserChatReplyValidationError';

/**
 * Preview length used when reply context is embedded into LLM prompt text.
 *
 * @private helper for `userChat`
 */
const USER_CHAT_REPLY_PROMPT_PREVIEW_MAX_LENGTH = 320;

/**
 * Resolves an optional reply reference from request-level `threadId` and `repliedToMessageId` inputs.
 */
export function resolveUserChatReplyReference(options: {
    chatId: string;
    threadId?: string | null;
    repliedToMessageId?: string | null;
    messages: ReadonlyArray<ChatMessage>;
}): ChatMessage['replyingTo'] | undefined {
    const { chatId, threadId, repliedToMessageId, messages } = options;
    const hasThreadId = typeof threadId === 'string' && threadId.length > 0;
    const hasRepliedToMessageId = typeof repliedToMessageId === 'string' && repliedToMessageId.length > 0;

    if (!hasThreadId && !hasRepliedToMessageId) {
        return undefined;
    }

    if (!hasThreadId || !hasRepliedToMessageId) {
        throw new UserChatReplyValidationError(
            'USER_CHAT_REPLY_FIELDS_INCOMPLETE',
            {
                chatId,
                repliedToMessageId: repliedToMessageId || null,
                replyThreadId: threadId || null,
            },
            spaceTrim(`
                Reply creation requires both \`threadId\` and \`repliedToMessageId\`.
            `),
        );
    }

    if (threadId !== chatId) {
        throw new UserChatReplyValidationError(
            'USER_CHAT_REPLY_THREAD_MISMATCH',
            {
                chatId,
                repliedToMessageId,
                replyThreadId: threadId,
            },
            spaceTrim(`
                Reply target thread \`${threadId}\` does not match chat \`${chatId}\`.
            `),
        );
    }

    const repliedToMessage = resolveReplyTargetMessage({
        chatId,
        repliedToMessageId,
        messages,
    });

    const attachmentNames = resolveReplyAttachmentNames(repliedToMessage);

    return {
        threadId,
        messageId: repliedToMessageId,
        sender: typeof repliedToMessage.sender === 'string' ? repliedToMessage.sender : String(repliedToMessage.sender),
        content: repliedToMessage.content,
        ...(attachmentNames.length > 0 ? { attachmentNames } : {}),
    };
}

/**
 * Ensures persisted message arrays only contain valid in-thread reply references.
 */
export function assertValidUserChatMessageReplies(options: {
    chatId: string;
    messages: ReadonlyArray<ChatMessage>;
}): void {
    const { chatId, messages } = options;
    const messageIndexById = new Map<string, number>();

    for (let index = 0; index < messages.length; index++) {
        const messageId = resolveMessageId(messages[index]);
        if (messageId && !messageIndexById.has(messageId)) {
            messageIndexById.set(messageId, index);
        }
    }

    for (let index = 0; index < messages.length; index++) {
        const message = messages[index]!;
        const messageId = resolveMessageId(message);
        const messageIdLabel = messageId || 'unknown';
        const rawReplyReference = (message as { replyingTo?: unknown }).replyingTo;
        if (rawReplyReference === undefined) {
            continue;
        }

        const replyReference = normalizeUserChatReplyReference(rawReplyReference);
        if (!replyReference) {
            throw new UserChatReplyValidationError(
                'USER_CHAT_REPLY_REFERENCE_INVALID',
                {
                    chatId,
                    repliedToMessageId:
                        typeof (rawReplyReference as { messageId?: unknown } | null)?.messageId === 'string'
                            ? (rawReplyReference as { messageId: string }).messageId
                            : null,
                    replyThreadId:
                        typeof (rawReplyReference as { threadId?: unknown } | null)?.threadId === 'string'
                            ? (rawReplyReference as { threadId: string }).threadId
                            : null,
                    messageId,
                },
                spaceTrim(`
                    Message reply metadata is invalid for chat \`${chatId}\`.
                `),
            );
        }

        if (replyReference.threadId !== chatId) {
            throw new UserChatReplyValidationError(
                'USER_CHAT_REPLY_THREAD_MISMATCH',
                {
                    chatId,
                    repliedToMessageId: replyReference.messageId,
                    replyThreadId: replyReference.threadId,
                    messageId,
                },
                spaceTrim(`
                    Message \`${messageIdLabel}\` replies to thread \`${replyReference.threadId}\`, but it is stored in chat \`${chatId}\`.
                `),
            );
        }

        const repliedToMessageIndex = messageIndexById.get(replyReference.messageId);
        if (repliedToMessageIndex === undefined) {
            throw new UserChatReplyValidationError(
                'USER_CHAT_REPLY_TARGET_NOT_FOUND',
                {
                    chatId,
                    repliedToMessageId: replyReference.messageId,
                    replyThreadId: replyReference.threadId,
                    messageId,
                },
                spaceTrim(`
                    Message \`${messageIdLabel}\` replies to \`${replyReference.messageId}\`, which does not exist in chat \`${chatId}\`.
                `),
            );
        }

        if (repliedToMessageIndex >= index) {
            throw new UserChatReplyValidationError(
                'USER_CHAT_REPLY_TARGET_AFTER_MESSAGE',
                {
                    chatId,
                    repliedToMessageId: replyReference.messageId,
                    replyThreadId: replyReference.threadId,
                    messageId,
                },
                spaceTrim(`
                    Message \`${messageIdLabel}\` can only reply to earlier messages in chat \`${chatId}\`.
                `),
            );
        }

        const repliedToMessage = messages[repliedToMessageIndex]!;
        if (repliedToMessage.isComplete === false) {
            throw new UserChatReplyValidationError(
                'USER_CHAT_REPLY_TARGET_INCOMPLETE',
                {
                    chatId,
                    repliedToMessageId: replyReference.messageId,
                    replyThreadId: replyReference.threadId,
                    messageId,
                },
                spaceTrim(`
                    Message \`${messageIdLabel}\` replies to \`${replyReference.messageId}\`, which is not complete yet.
                `),
            );
        }
    }
}

/**
 * Safely normalizes stored reply-reference JSON loaded from persisted chat history.
 */
export function normalizeUserChatReplyReference(rawReplyReference: unknown): ChatMessage['replyingTo'] | undefined {
    if (!rawReplyReference || typeof rawReplyReference !== 'object' || Array.isArray(rawReplyReference)) {
        return undefined;
    }

    const replyReference = rawReplyReference as {
        threadId?: unknown;
        messageId?: unknown;
        sender?: unknown;
        content?: unknown;
        attachmentNames?: unknown;
    };

    if (
        typeof replyReference.threadId !== 'string' ||
        replyReference.threadId.trim().length === 0 ||
        typeof replyReference.messageId !== 'string' ||
        replyReference.messageId.trim().length === 0 ||
        typeof replyReference.sender !== 'string' ||
        replyReference.sender.trim().length === 0 ||
        typeof replyReference.content !== 'string'
    ) {
        return undefined;
    }

    const normalizedAttachmentNames = Array.isArray(replyReference.attachmentNames)
        ? replyReference.attachmentNames
              .filter((attachmentName): attachmentName is string => typeof attachmentName === 'string')
              .map((attachmentName) => attachmentName.trim())
              .filter(Boolean)
        : [];

    return {
        threadId: replyReference.threadId.trim(),
        messageId: replyReference.messageId.trim(),
        sender: replyReference.sender.trim(),
        content: replyReference.content,
        ...(normalizedAttachmentNames.length > 0 ? { attachmentNames: normalizedAttachmentNames } : {}),
    };
}

/**
 * Rewrites one chat message into the reply-aware plain-text content consumed by chat-model providers.
 */
export function createReplyAwareUserChatPromptMessage(message: ChatMessage): ChatMessage {
    const replyAwareContent = createReplyAwareUserChatPromptContent(message);
    return replyAwareContent === message.content
        ? message
        : {
              ...message,
              content: replyAwareContent,
          };
}

/**
 * Rewrites one message body with explicit reply metadata so providers that only receive
 * plain message content still preserve the replied-to context.
 */
export function createReplyAwareUserChatPromptContent(
    message: Pick<ChatMessage, 'content' | 'replyingTo' | 'attachments'>,
): string {
    if (!message.replyingTo) {
        return message.content;
    }

    const replyReference = message.replyingTo;
    const repliedToPreview = resolveChatMessageReplyPreviewText(
        {
            content: replyReference.content,
            attachmentNames: replyReference.attachmentNames,
        },
        {
            maxLength: USER_CHAT_REPLY_PROMPT_PREVIEW_MAX_LENGTH,
            emptyLabel: 'Original message',
        },
    );
    const currentMessageText =
        typeof message.content === 'string' && message.content.trim().length > 0
            ? message.content
            : '[No text content. See attachments if provided.]';

    return spaceTrim(
        (block) => `
            Reply context:
            - Thread ID: \`${replyReference.threadId}\`
            - Reply target ID: \`${replyReference.messageId}\`
            - Reply target sender: \`${replyReference.sender}\`
            - Reply target preview: ${repliedToPreview}

            Message:
            ${block(currentMessageText)}
        `,
    );
}

/**
 * Resolves one valid persisted reply target from current chat history.
 *
 * @private helper for `userChat`
 */
function resolveReplyTargetMessage(options: {
    chatId: string;
    repliedToMessageId: string;
    messages: ReadonlyArray<ChatMessage>;
}): ChatMessage {
    const { chatId, repliedToMessageId, messages } = options;
    const repliedToMessage = messages.find((message) => resolveMessageId(message) === repliedToMessageId);

    if (!repliedToMessage) {
        throw new UserChatReplyValidationError(
            'USER_CHAT_REPLY_TARGET_NOT_FOUND',
            {
                chatId,
                repliedToMessageId,
                replyThreadId: chatId,
            },
            spaceTrim(`
                Reply target message \`${repliedToMessageId}\` was not found in chat \`${chatId}\`.
            `),
        );
    }

    if (repliedToMessage.isComplete === false) {
        throw new UserChatReplyValidationError(
            'USER_CHAT_REPLY_TARGET_INCOMPLETE',
            {
                chatId,
                repliedToMessageId,
                replyThreadId: chatId,
            },
            spaceTrim(`
                Reply target message \`${repliedToMessageId}\` is still being generated and cannot be replied to yet.
            `),
        );
    }

    return repliedToMessage;
}

/**
 * Resolves stable message id when present.
 *
 * @private helper for `userChat`
 */
function resolveMessageId(message: ChatMessage | undefined): string | null {
    return typeof message?.id === 'string' && message.id.trim().length > 0 ? message.id : null;
}

/**
 * Extracts attachment names stored with a replied-to message snapshot.
 *
 * @private helper for `userChat`
 */
function resolveReplyAttachmentNames(message: ChatMessage): Array<string> {
    if (!Array.isArray(message.attachments) || message.attachments.length === 0) {
        return [];
    }

    const attachmentNames = message.attachments
        .map((attachment) => (typeof attachment?.name === 'string' ? attachment.name.trim() : ''))
        .filter(Boolean);

    return attachmentNames;
}
