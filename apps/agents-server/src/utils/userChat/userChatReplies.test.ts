import type { ChatMessage } from '@promptbook-local/types';
import { describe, expect, it } from '@jest/globals';
import { UserChatReplyValidationError } from './UserChatReplyValidationError';
import {
    assertValidUserChatMessageReplies,
    createReplyAwareUserChatPromptContent,
    resolveUserChatReplyReference,
} from './userChatReplies';

/**
 * Stable timestamp reused across reply-helper tests.
 */
const TEST_CREATED_AT = '2026-04-10T12:00:00.000Z' as NonNullable<ChatMessage['createdAt']>;

/**
 * Creates one minimal chat message fixture for reply-helper tests.
 */
function createChatMessageFixture(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'message-1',
        sender: 'USER',
        content: 'Hello',
        createdAt: TEST_CREATED_AT,
        isComplete: true,
        ...overrides,
    };
}

/**
 * Asserts one callback throws the branded reply-validation error.
 */
function expectReplyValidationError(callback: () => unknown): UserChatReplyValidationError {
    try {
        callback();
    } catch (error) {
        expect(error).toBeInstanceOf(UserChatReplyValidationError);
        return error as UserChatReplyValidationError;
    }

    throw new Error('Expected reply validation error.');
}

describe('userChatReplies', () => {
    it('creates a persisted reply snapshot from an earlier in-thread message', () => {
        const replyReference = resolveUserChatReplyReference({
            chatId: 'chat-1',
            threadId: 'chat-1',
            repliedToMessageId: 'assistant-1',
            messages: [
                createChatMessageFixture({
                    id: 'assistant-1',
                    sender: 'AGENT',
                    content: 'Can you focus on the quarterly budget?',
                    attachments: [
                        {
                            name: 'budget.xlsx',
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            url: 'https://example.com/budget.xlsx',
                        },
                    ],
                }),
            ],
        });

        expect(replyReference).toEqual({
            threadId: 'chat-1',
            messageId: 'assistant-1',
            sender: 'AGENT',
            content: 'Can you focus on the quarterly budget?',
            attachmentNames: ['budget.xlsx'],
        });
    });

    it('rejects reply targets from a different thread', () => {
        const error = expectReplyValidationError(() =>
            resolveUserChatReplyReference({
                chatId: 'chat-1',
                threadId: 'chat-2',
                repliedToMessageId: 'assistant-1',
                messages: [],
            }),
        );

        expect(error.code).toBe('USER_CHAT_REPLY_THREAD_MISMATCH');
    });

    it('rejects persisted replies that point to a later or incomplete message', () => {
        const laterMessageError = expectReplyValidationError(() =>
            assertValidUserChatMessageReplies({
                chatId: 'chat-1',
                messages: [
                    createChatMessageFixture({
                        id: 'reply-1',
                        content: 'Reply body',
                        replyingTo: {
                            threadId: 'chat-1',
                            messageId: 'assistant-1',
                            sender: 'AGENT',
                            content: 'Original body',
                        },
                    }),
                    createChatMessageFixture({
                        id: 'assistant-1',
                        sender: 'AGENT',
                        content: 'Original body',
                    }),
                ],
            }),
        );

        expect(laterMessageError.code).toBe('USER_CHAT_REPLY_TARGET_AFTER_MESSAGE');

        const incompleteTargetError = expectReplyValidationError(() =>
            assertValidUserChatMessageReplies({
                chatId: 'chat-1',
                messages: [
                    createChatMessageFixture({
                        id: 'assistant-1',
                        sender: 'AGENT',
                        content: 'Still thinking',
                        isComplete: false,
                    }),
                    createChatMessageFixture({
                        id: 'reply-1',
                        content: 'Reply body',
                        replyingTo: {
                            threadId: 'chat-1',
                            messageId: 'assistant-1',
                            sender: 'AGENT',
                            content: 'Still thinking',
                        },
                    }),
                ],
            }),
        );

        expect(incompleteTargetError.code).toBe('USER_CHAT_REPLY_TARGET_INCOMPLETE');
    });

    it('rewrites prompt content with explicit reply context for the model', () => {
        const promptContent = createReplyAwareUserChatPromptContent({
            content: 'Yes, focus on operating expenses.',
            attachments: undefined,
            replyingTo: {
                threadId: 'chat-1',
                messageId: 'assistant-1',
                sender: 'AGENT',
                content: 'Can you focus on the quarterly budget?',
            },
        });

        expect(promptContent).toContain('Thread ID: `chat-1`');
        expect(promptContent).toContain('Reply target ID: `assistant-1`');
        expect(promptContent).toContain('Can you focus on the quarterly budget?');
        expect(promptContent).toContain('Yes, focus on operating expenses.');
    });
});
