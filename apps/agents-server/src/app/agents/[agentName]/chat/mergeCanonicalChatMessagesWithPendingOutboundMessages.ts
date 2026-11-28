'use client';

import type { ChatMessage } from '../../../../../../../src/book-components/Chat/types/ChatMessage';
import { serializeReplyingToSignature } from './chatReplies';

/**
 * Time window used by the fallback reconciliation path when a canonical message
 * does not expose `clientMessageId` but still clearly matches one optimistic
 * user message by content and timestamp.
 */
const PENDING_OUTBOUND_MESSAGE_RECONCILIATION_WINDOW_MS = 10_000;

/**
 * Render states supported by optimistic outbound user messages.
 */
export type PendingOutboundMessageStatus = 'sending' | 'failed';

/**
 * One client-owned optimistic outbound user message scoped to a single chat.
 */
export type PendingOutboundMessageRecord = {
    /**
     * Temporary render identifier kept stable until the canonical transcript arrives.
     */
    readonly tempId: string;

    /**
     * Durable chat identifier that owns this optimistic message.
     */
    readonly chatId: string;

    /**
     * Stable client-generated idempotency key also echoed back by the server.
     */
    readonly clientMessageId: string;

    /**
     * User-authored message content.
     */
    readonly content: string;

    /**
     * Optional uploaded attachments associated with the optimistic message.
     */
    readonly attachments?: ChatMessage['attachments'];

    /**
     * Optional reply snapshot quoted by the optimistic user message.
     */
    readonly replyingTo?: ChatMessage['replyingTo'];

    /**
     * Client-side timestamp used for rendering and fallback matching.
     */
    readonly createdAt: NonNullable<ChatMessage['createdAt']>;

    /**
     * Current optimistic delivery status.
     */
    readonly status: PendingOutboundMessageStatus;

    /**
     * Optional user-facing failure reason shown when delivery fails.
     */
    readonly errorMessage?: string;
};

/**
 * Returns canonical messages merged with still-unconfirmed optimistic outbound
 * user messages for the active durable chat.
 *
 * @param options - Canonical transcript plus pending optimistic messages.
 * @returns Messages ready for rendering without duplicate optimistic bubbles.
 */
export function mergeCanonicalChatMessagesWithPendingOutboundMessages(options: {
    canonicalMessages: ReadonlyArray<ChatMessage>;
    pendingOutboundMessages: ReadonlyArray<PendingOutboundMessageRecord>;
}): Array<ChatMessage> {
    const unresolvedPendingMessages = reconcilePendingOutboundMessagesWithCanonicalMessages(options);

    if (unresolvedPendingMessages.length === 0) {
        return [...options.canonicalMessages];
    }

    return sortRenderedChatMessagesForDisplay([
        ...options.canonicalMessages,
        ...unresolvedPendingMessages.map(createOptimisticUserChatMessageFromPendingOutboundMessage),
    ]);
}

/**
 * Removes optimistic outbound messages already represented by the canonical
 * transcript returned from the server.
 *
 * @param options - Canonical transcript plus current pending optimistic messages.
 * @returns Only the optimistic messages that still need to stay rendered locally.
 */
export function reconcilePendingOutboundMessagesWithCanonicalMessages(options: {
    canonicalMessages: ReadonlyArray<ChatMessage>;
    pendingOutboundMessages: ReadonlyArray<PendingOutboundMessageRecord>;
}): Array<PendingOutboundMessageRecord> {
    return options.pendingOutboundMessages.filter((pendingOutboundMessage) => {
        return !options.canonicalMessages.some((canonicalMessage) =>
            isCanonicalMessageConfirmationForPendingOutboundMessage(canonicalMessage, pendingOutboundMessage),
        );
    });
}

/**
 * Converts one optimistic outbound record into the shared `ChatMessage` shape
 * consumed by the chat UI.
 *
 * @param pendingOutboundMessage - Client-owned optimistic outbound message.
 * @returns Chat bubble rendered alongside canonical transcript messages.
 */
function createOptimisticUserChatMessageFromPendingOutboundMessage(
    pendingOutboundMessage: PendingOutboundMessageRecord,
): ChatMessage {
    return {
        id: pendingOutboundMessage.tempId,
        sender: 'USER',
        content: pendingOutboundMessage.content,
        attachments: pendingOutboundMessage.attachments,
        replyingTo: pendingOutboundMessage.replyingTo,
        createdAt: pendingOutboundMessage.createdAt,
        isComplete: true,
        lifecycleState: pendingOutboundMessage.status === 'sending' ? 'queued' : 'failed',
        lifecycleError: pendingOutboundMessage.status === 'failed' ? pendingOutboundMessage.errorMessage : undefined,
        clientMessageId: pendingOutboundMessage.clientMessageId,
    };
}

/**
 * Returns true when one canonical user message confirms an optimistic outbound
 * message already rendered in the browser.
 *
 * The primary reconciliation path uses `clientMessageId`. A bounded fallback
 * compares sender, content, attachments, and timestamp proximity for older or
 * partial transcripts that do not expose the idempotency key yet.
 *
 * @param canonicalMessage - Server-owned canonical transcript message.
 * @param pendingOutboundMessage - Browser-owned optimistic outbound message.
 * @returns `true` when the optimistic bubble should be removed.
 */
function isCanonicalMessageConfirmationForPendingOutboundMessage(
    canonicalMessage: ChatMessage,
    pendingOutboundMessage: PendingOutboundMessageRecord,
): boolean {
    if (canonicalMessage.sender !== 'USER') {
        return false;
    }

    if (
        canonicalMessage.clientMessageId &&
        canonicalMessage.clientMessageId === pendingOutboundMessage.clientMessageId
    ) {
        return true;
    }

    if (canonicalMessage.content !== pendingOutboundMessage.content) {
        return false;
    }

    if (!areMessageAttachmentsEquivalent(canonicalMessage.attachments, pendingOutboundMessage.attachments)) {
        return false;
    }

    if (
        serializeReplyingToSignature(canonicalMessage.replyingTo) !==
        serializeReplyingToSignature(pendingOutboundMessage.replyingTo)
    ) {
        return false;
    }

    const canonicalTimestamp = resolveTimestampMilliseconds(canonicalMessage.createdAt);
    const optimisticTimestamp = resolveTimestampMilliseconds(pendingOutboundMessage.createdAt);

    if (canonicalTimestamp === null || optimisticTimestamp === null) {
        return false;
    }

    return Math.abs(canonicalTimestamp - optimisticTimestamp) <= PENDING_OUTBOUND_MESSAGE_RECONCILIATION_WINDOW_MS;
}

/**
 * Returns a stable millisecond timestamp for best-effort optimistic fallback
 * reconciliation.
 *
 * @param timestamp - ISO timestamp to parse.
 * @returns Parsed milliseconds or `null` when invalid.
 */
function resolveTimestampMilliseconds(timestamp: string | undefined): number | null {
    if (!timestamp) {
        return null;
    }

    const parsedTimestamp = new Date(timestamp).getTime();
    return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
}

/**
 * Keeps merged optimistic/canonical messages ordered like one natural transcript,
 * especially when assistant streaming begins before the server echoes the user
 * message back canonically.
 *
 * @param messages - Combined canonical transcript plus unresolved optimistic turns.
 * @returns Chronologically ordered messages ready for rendering.
 */
function sortRenderedChatMessagesForDisplay(messages: ReadonlyArray<ChatMessage>): Array<ChatMessage> {
    return [...messages]
        .map((message, index) => ({
            message,
            index,
            timestamp: resolveTimestampMilliseconds(message.createdAt),
            isOptimisticPendingUserMessage:
                message.sender === 'USER' &&
                typeof message.id === 'string' &&
                message.id.startsWith('pending-outbound-user-message:'),
        }))
        .sort((left, right) => {
            if (left.timestamp !== null && right.timestamp !== null && left.timestamp !== right.timestamp) {
                return left.timestamp - right.timestamp;
            }

            if (left.timestamp !== null && right.timestamp !== null) {
                if (left.isOptimisticPendingUserMessage && right.message.sender !== 'USER') {
                    return -1;
                }
                if (right.isOptimisticPendingUserMessage && left.message.sender !== 'USER') {
                    return 1;
                }
            }

            return left.index - right.index;
        })
        .map(({ message }) => message);
}

/**
 * Returns true when canonical and optimistic attachments are equivalent for
 * fallback reconciliation purposes.
 *
 * @param left - Canonical attachments.
 * @param right - Optimistic attachments.
 * @returns `true` when attachments are absent on both sides or serialize equally.
 */
function areMessageAttachmentsEquivalent(left: ChatMessage['attachments'], right: ChatMessage['attachments']): boolean {
    return serializeAttachmentsForReconciliation(left) === serializeAttachmentsForReconciliation(right);
}

/**
 * Serializes attachments into a deterministic string for shallow optimistic
 * reconciliation.
 *
 * @param attachments - Attachments to serialize.
 * @returns Stable serialized representation.
 */
function serializeAttachmentsForReconciliation(attachments: ChatMessage['attachments']): string {
    if (!attachments || attachments.length === 0) {
        return '';
    }

    return JSON.stringify(attachments);
}
