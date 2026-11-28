import type { ChatMessage } from '../../../../../../../src/book-components/Chat/types/ChatMessage';
import {
    mergeCanonicalChatMessagesWithPendingOutboundMessages,
    reconcilePendingOutboundMessagesWithCanonicalMessages,
    type PendingOutboundMessageRecord,
} from './mergeCanonicalChatMessagesWithPendingOutboundMessages';

/**
 * Shared timestamp used by deterministic optimistic-message tests.
 */
const TEST_CREATED_AT = '2026-03-14T12:00:00.000Z' as NonNullable<ChatMessage['createdAt']>;
const TEST_ASSISTANT_CREATED_AT = '2026-03-14T12:00:01.000Z' as NonNullable<ChatMessage['createdAt']>;

/**
 * Builds one optimistic outbound message record for test cases.
 *
 * @param overrides - Partial optimistic record overrides.
 * @returns Complete optimistic outbound-message record.
 */
function createPendingOutboundMessageRecord(
    overrides: Partial<PendingOutboundMessageRecord> = {},
): PendingOutboundMessageRecord {
    return {
        tempId: 'pending-outbound-user-message:test-client-message',
        chatId: 'chat-1',
        clientMessageId: 'test-client-message',
        content: 'Hello from the optimistic bubble',
        createdAt: TEST_CREATED_AT,
        status: 'sending',
        ...overrides,
    };
}

/**
 * Builds one canonical user message for reconciliation tests.
 *
 * @param overrides - Partial canonical message overrides.
 * @returns Complete canonical chat message.
 */
function createCanonicalUserMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'canonical-user-message',
        sender: 'USER',
        content: 'Hello from the optimistic bubble',
        createdAt: TEST_CREATED_AT,
        isComplete: true,
        lifecycleState: 'completed',
        clientMessageId: 'test-client-message',
        ...overrides,
    };
}

describe('mergeCanonicalChatMessagesWithPendingOutboundMessages', () => {
    it('should render unmatched optimistic outbound messages as sending user bubbles', () => {
        const pendingOutboundMessage = createPendingOutboundMessageRecord();

        const renderedMessages = mergeCanonicalChatMessagesWithPendingOutboundMessages({
            canonicalMessages: [],
            pendingOutboundMessages: [pendingOutboundMessage],
        });

        expect(renderedMessages).toEqual([
            {
                id: pendingOutboundMessage.tempId,
                sender: 'USER',
                content: pendingOutboundMessage.content,
                attachments: undefined,
                replyingTo: undefined,
                createdAt: pendingOutboundMessage.createdAt,
                isComplete: true,
                lifecycleState: 'queued',
                lifecycleError: undefined,
                clientMessageId: pendingOutboundMessage.clientMessageId,
            },
        ]);
    });

    it('should reconcile optimistic outbound messages by clientMessageId without duplicating the transcript', () => {
        const pendingOutboundMessage = createPendingOutboundMessageRecord();
        const canonicalUserMessage = createCanonicalUserMessage();

        const reconciledPendingOutboundMessages = reconcilePendingOutboundMessagesWithCanonicalMessages({
            canonicalMessages: [canonicalUserMessage],
            pendingOutboundMessages: [pendingOutboundMessage],
        });
        const renderedMessages = mergeCanonicalChatMessagesWithPendingOutboundMessages({
            canonicalMessages: [canonicalUserMessage],
            pendingOutboundMessages: [pendingOutboundMessage],
        });

        expect(reconciledPendingOutboundMessages).toEqual([]);
        expect(renderedMessages).toEqual([canonicalUserMessage]);
    });

    it('should keep failed optimistic outbound messages visible until a canonical confirmation arrives', () => {
        const failedPendingOutboundMessage = createPendingOutboundMessageRecord({
            status: 'failed',
            errorMessage: 'Failed to send chat message.',
        });

        const renderedMessages = mergeCanonicalChatMessagesWithPendingOutboundMessages({
            canonicalMessages: [],
            pendingOutboundMessages: [failedPendingOutboundMessage],
        });

        expect(renderedMessages).toEqual([
            {
                id: failedPendingOutboundMessage.tempId,
                sender: 'USER',
                content: failedPendingOutboundMessage.content,
                attachments: undefined,
                replyingTo: undefined,
                createdAt: failedPendingOutboundMessage.createdAt,
                isComplete: true,
                lifecycleState: 'failed',
                lifecycleError: failedPendingOutboundMessage.errorMessage,
                clientMessageId: failedPendingOutboundMessage.clientMessageId,
            },
        ]);
    });

    it('should preserve reply snapshots on optimistic user bubbles', () => {
        const pendingOutboundMessage = createPendingOutboundMessageRecord({
            replyingTo: {
                threadId: 'chat-1',
                messageId: 'assistant-0',
                sender: 'AGENT',
                content: 'Original reply target',
            },
        });

        const renderedMessages = mergeCanonicalChatMessagesWithPendingOutboundMessages({
            canonicalMessages: [],
            pendingOutboundMessages: [pendingOutboundMessage],
        });

        expect(renderedMessages[0]?.replyingTo).toEqual(pendingOutboundMessage.replyingTo);
    });

    it('should keep an unresolved optimistic user bubble before later assistant messages', () => {
        const pendingOutboundMessage = createPendingOutboundMessageRecord({
            createdAt: TEST_CREATED_AT,
        });
        const canonicalAssistantMessage: ChatMessage = {
            id: 'assistant-1',
            sender: 'AGENT',
            content: 'Assistant is already streaming.',
            createdAt: TEST_ASSISTANT_CREATED_AT,
            isComplete: false,
            lifecycleState: 'running',
        };

        const renderedMessages = mergeCanonicalChatMessagesWithPendingOutboundMessages({
            canonicalMessages: [canonicalAssistantMessage],
            pendingOutboundMessages: [pendingOutboundMessage],
        });

        expect(renderedMessages.map((message) => message.id)).toEqual([
            pendingOutboundMessage.tempId,
            canonicalAssistantMessage.id,
        ]);
    });

    it('should not reconcile fallback-matched messages when their reply targets differ', () => {
        const pendingOutboundMessage = createPendingOutboundMessageRecord({
            clientMessageId: '',
            replyingTo: {
                threadId: 'chat-1',
                messageId: 'assistant-0',
                sender: 'AGENT',
                content: 'First target',
            },
        });
        const canonicalUserMessage = createCanonicalUserMessage({
            clientMessageId: undefined,
            replyingTo: {
                threadId: 'chat-1',
                messageId: 'assistant-1',
                sender: 'AGENT',
                content: 'Different target',
            },
        });

        const reconciledPendingOutboundMessages = reconcilePendingOutboundMessagesWithCanonicalMessages({
            canonicalMessages: [canonicalUserMessage],
            pendingOutboundMessages: [pendingOutboundMessage],
        });

        expect(reconciledPendingOutboundMessages).toEqual([pendingOutboundMessage]);
    });
});
