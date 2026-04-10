'use client';

import { useSyncExternalStore } from 'react';
import type { ChatMessage } from '../../../../../../../src/book-components/Chat/types/ChatMessage';
import {
    reconcilePendingOutboundMessagesWithCanonicalMessages,
    type PendingOutboundMessageRecord,
} from './mergeCanonicalChatMessagesWithPendingOutboundMessages';
import { serializeReplyingToSignature } from './chatReplies';

/**
 * Prefix used for optimistic temporary user-message ids.
 */
const PENDING_OUTBOUND_MESSAGE_TEMP_ID_PREFIX = 'pending-outbound-user-message';

/**
 * Shared empty snapshot reused when one chat has no optimistic outbound messages.
 */
const EMPTY_PENDING_OUTBOUND_MESSAGES: ReadonlyArray<PendingOutboundMessageRecord> = [];

/**
 * Internal listener registry for the lightweight optimistic outbound-message store.
 */
const pendingOutboundMessagesListeners = new Set<() => void>();

/**
 * In-memory optimistic outbound-message state scoped by durable `chatId`.
 */
const pendingOutboundMessagesByChatId = new Map<string, Array<PendingOutboundMessageRecord>>();

/**
 * Input required to queue or re-queue one optimistic outbound message.
 */
export type QueuePendingOutboundMessageOptions = {
    /**
     * Durable chat identifier that owns the optimistic message.
     */
    readonly chatId: string;

    /**
     * Stable client-generated idempotency key reused for canonical reconciliation.
     */
    readonly clientMessageId: string;

    /**
     * Raw user-authored message content.
     */
    readonly content: string;

    /**
     * Optional attachments associated with the outbound message.
     */
    readonly attachments?: ChatMessage['attachments'];

    /**
     * Optional reply snapshot quoted by the optimistic user message.
     */
    readonly replyingTo?: ChatMessage['replyingTo'];

    /**
     * Optional precomputed optimistic timestamp.
     */
    readonly createdAt?: NonNullable<ChatMessage['createdAt']>;
};

/**
 * Input required to mark one optimistic outbound message as failed.
 */
export type MarkPendingOutboundMessageFailedOptions = {
    /**
     * Durable chat identifier that owns the optimistic message.
     */
    readonly chatId: string;

    /**
     * Stable client-generated idempotency key used to find the optimistic message.
     */
    readonly clientMessageId: string;

    /**
     * User-facing failure reason rendered below the optimistic bubble.
     */
    readonly errorMessage: string;
};

/**
 * Input required to migrate optimistic outbound messages from one chat id to another.
 */
export type ReassignPendingOutboundMessagesChatIdOptions = {
    /**
     * Source chat identifier currently owning the optimistic messages.
     */
    readonly fromChatId: string;

    /**
     * Target chat identifier that should own the optimistic messages.
     */
    readonly toChatId: string;
};

/**
 * Subscribes one component to optimistic outbound-message store changes.
 *
 * @param listener - Callback triggered after each store mutation.
 * @returns Unsubscribe function.
 */
function subscribeToPendingOutboundMessages(listener: () => void): () => void {
    pendingOutboundMessagesListeners.add(listener);

    return () => {
        pendingOutboundMessagesListeners.delete(listener);
    };
}

/**
 * Returns the optimistic outbound messages currently stored for one chat.
 *
 * @param chatId - Durable chat identifier or `null` when no chat is selected.
 * @returns Immutable optimistic-message snapshot for the requested chat.
 */
function getPendingOutboundMessagesSnapshot(chatId: string | null): ReadonlyArray<PendingOutboundMessageRecord> {
    if (!chatId) {
        return EMPTY_PENDING_OUTBOUND_MESSAGES;
    }

    return pendingOutboundMessagesByChatId.get(chatId) || EMPTY_PENDING_OUTBOUND_MESSAGES;
}

/**
 * Broadcasts a store mutation to all optimistic outbound-message subscribers.
 */
function emitPendingOutboundMessagesStoreChange(): void {
    for (const listener of pendingOutboundMessagesListeners) {
        listener();
    }
}

/**
 * Returns a stable optimistic temporary message id for one client-generated
 * outbound-message idempotency key.
 *
 * @param clientMessageId - Client-generated idempotency key.
 * @returns Deterministic optimistic temporary message id.
 */
function createPendingOutboundMessageTempId(clientMessageId: string): string {
    return `${PENDING_OUTBOUND_MESSAGE_TEMP_ID_PREFIX}:${clientMessageId}`;
}

/**
 * Writes optimistic outbound messages for one chat and only emits when the
 * snapshot meaningfully changed.
 *
 * @param chatId - Durable chat identifier.
 * @param nextPendingOutboundMessages - Next optimistic messages for this chat.
 */
function setPendingOutboundMessagesForChat(
    chatId: string,
    nextPendingOutboundMessages: Array<PendingOutboundMessageRecord>,
): void {
    const previousPendingOutboundMessages = pendingOutboundMessagesByChatId.get(chatId) || EMPTY_PENDING_OUTBOUND_MESSAGES;

    if (arePendingOutboundMessageSnapshotsEquivalent(previousPendingOutboundMessages, nextPendingOutboundMessages)) {
        return;
    }

    if (nextPendingOutboundMessages.length === 0) {
        pendingOutboundMessagesByChatId.delete(chatId);
    } else {
        pendingOutboundMessagesByChatId.set(chatId, nextPendingOutboundMessages);
    }

    emitPendingOutboundMessagesStoreChange();
}

/**
 * Returns true when two optimistic outbound-message snapshots are equivalent.
 *
 * @param left - Previous optimistic snapshot.
 * @param right - Next optimistic snapshot.
 * @returns `true` when no subscriber-visible change occurred.
 */
function arePendingOutboundMessageSnapshotsEquivalent(
    left: ReadonlyArray<PendingOutboundMessageRecord>,
    right: ReadonlyArray<PendingOutboundMessageRecord>,
): boolean {
    if (left === right) {
        return true;
    }

    if (left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index++) {
        const leftMessage = left[index]!;
        const rightMessage = right[index]!;

        if (
            leftMessage.tempId !== rightMessage.tempId ||
            leftMessage.chatId !== rightMessage.chatId ||
            leftMessage.clientMessageId !== rightMessage.clientMessageId ||
            leftMessage.content !== rightMessage.content ||
            leftMessage.createdAt !== rightMessage.createdAt ||
            leftMessage.status !== rightMessage.status ||
            leftMessage.errorMessage !== rightMessage.errorMessage ||
            !areAttachmentsEquivalent(leftMessage.attachments, rightMessage.attachments) ||
            serializeReplyingToSignature(leftMessage.replyingTo) !== serializeReplyingToSignature(rightMessage.replyingTo)
        ) {
            return false;
        }
    }

    return true;
}

/**
 * Returns true when two optimistic attachment collections are equivalent.
 *
 * @param left - Previous attachments snapshot.
 * @param right - Next attachments snapshot.
 * @returns `true` when both snapshots serialize equally.
 */
function areAttachmentsEquivalent(left: ChatMessage['attachments'], right: ChatMessage['attachments']): boolean {
    if (!left?.length && !right?.length) {
        return true;
    }

    return JSON.stringify(left || []) === JSON.stringify(right || []);
}

/**
 * Returns the optimistic outbound messages for one selected chat and keeps the
 * component subscribed to future mutations.
 *
 * @param chatId - Durable chat identifier or `null` when no chat is selected.
 * @returns Optimistic outbound messages for the active chat.
 */
export function usePendingOutboundMessages(chatId: string | null): ReadonlyArray<PendingOutboundMessageRecord> {
    return useSyncExternalStore(
        subscribeToPendingOutboundMessages,
        () => getPendingOutboundMessagesSnapshot(chatId),
        () => EMPTY_PENDING_OUTBOUND_MESSAGES,
    );
}

/**
 * Queues or refreshes one optimistic outbound message for the active durable chat.
 *
 * Re-queueing an existing message keeps the same temporary id so the optimistic
 * bubble remains stable across retries and reconciliation.
 *
 * @param options - Optimistic outbound-message payload.
 * @returns Stored optimistic outbound-message snapshot.
 */
export function queuePendingOutboundMessage(
    options: QueuePendingOutboundMessageOptions,
): PendingOutboundMessageRecord {
    const currentPendingOutboundMessages = pendingOutboundMessagesByChatId.get(options.chatId) || [];
    const existingPendingOutboundMessage = currentPendingOutboundMessages.find(
        (pendingOutboundMessage) => pendingOutboundMessage.clientMessageId === options.clientMessageId,
    );

    const nextPendingOutboundMessage: PendingOutboundMessageRecord = existingPendingOutboundMessage
        ? {
              ...existingPendingOutboundMessage,
              content: options.content,
              attachments: options.attachments,
              replyingTo: options.replyingTo,
              status: 'sending',
              errorMessage: undefined,
          }
        : {
              tempId: createPendingOutboundMessageTempId(options.clientMessageId),
              chatId: options.chatId,
              clientMessageId: options.clientMessageId,
              content: options.content,
              attachments: options.attachments,
              replyingTo: options.replyingTo,
              createdAt: (options.createdAt || new Date().toISOString()) as NonNullable<ChatMessage['createdAt']>,
              status: 'sending',
          };

    const nextPendingOutboundMessages = existingPendingOutboundMessage
        ? currentPendingOutboundMessages.map((pendingOutboundMessage) =>
              pendingOutboundMessage.clientMessageId === options.clientMessageId
                  ? nextPendingOutboundMessage
                  : pendingOutboundMessage,
          )
        : [...currentPendingOutboundMessages, nextPendingOutboundMessage];

    setPendingOutboundMessagesForChat(options.chatId, nextPendingOutboundMessages);
    return nextPendingOutboundMessage;
}

/**
 * Marks one optimistic outbound message as failed while keeping the bubble visible.
 *
 * @param options - Failed optimistic outbound-message data.
 */
export function markPendingOutboundMessageFailed(options: MarkPendingOutboundMessageFailedOptions): void {
    const currentPendingOutboundMessages = pendingOutboundMessagesByChatId.get(options.chatId);
    if (!currentPendingOutboundMessages || currentPendingOutboundMessages.length === 0) {
        return;
    }

    const nextPendingOutboundMessages = currentPendingOutboundMessages.map((pendingOutboundMessage) => {
        if (pendingOutboundMessage.clientMessageId !== options.clientMessageId) {
            return pendingOutboundMessage;
        }

        return {
            ...pendingOutboundMessage,
            status: 'failed' as const,
            errorMessage: options.errorMessage,
        };
    });

    setPendingOutboundMessagesForChat(options.chatId, nextPendingOutboundMessages);
}

/**
 * Removes optimistic outbound messages already confirmed by the canonical
 * transcript returned from the server.
 *
 * @param chatId - Durable chat identifier whose optimistic messages should be reconciled.
 * @param canonicalMessages - Canonical transcript currently rendered for the chat.
 */
export function reconcilePendingOutboundMessages(
    chatId: string,
    canonicalMessages: ReadonlyArray<ChatMessage>,
): void {
    const currentPendingOutboundMessages = pendingOutboundMessagesByChatId.get(chatId);
    if (!currentPendingOutboundMessages || currentPendingOutboundMessages.length === 0) {
        return;
    }

    const nextPendingOutboundMessages = reconcilePendingOutboundMessagesWithCanonicalMessages({
        canonicalMessages,
        pendingOutboundMessages: currentPendingOutboundMessages,
    });

    setPendingOutboundMessagesForChat(chatId, nextPendingOutboundMessages);
}

/**
 * Deletes all optimistic outbound messages for one chat.
 *
 * @param chatId - Durable chat identifier whose optimistic messages should be cleared.
 */
export function clearPendingOutboundMessages(chatId: string): void {
    if (!pendingOutboundMessagesByChatId.has(chatId)) {
        return;
    }

    pendingOutboundMessagesByChatId.delete(chatId);
    emitPendingOutboundMessagesStoreChange();
}

/**
 * Reassigns optimistic outbound messages from one chat id to another while
 * preserving status/error state and deduplicating by `clientMessageId`.
 *
 * This is used when one optimistic temporary chat id is replaced by the durable
 * server chat id after chat creation resolves.
 *
 * @param options - Source and target chat identifiers for optimistic messages.
 */
export function reassignPendingOutboundMessagesChatId(options: ReassignPendingOutboundMessagesChatIdOptions): void {
    if (options.fromChatId === options.toChatId) {
        return;
    }

    const sourceMessages = pendingOutboundMessagesByChatId.get(options.fromChatId);
    if (!sourceMessages || sourceMessages.length === 0) {
        return;
    }

    const targetMessages = pendingOutboundMessagesByChatId.get(options.toChatId) || [];
    const sourceMessagesWithTargetChatId = sourceMessages.map((message) => ({
        ...message,
        chatId: options.toChatId,
        replyingTo: message.replyingTo
            ? {
                  ...message.replyingTo,
                  threadId: options.toChatId,
              }
            : undefined,
    }));
    const targetMessageClientMessageIds = new Set(
        targetMessages.map((targetMessage) => targetMessage.clientMessageId),
    );
    const mergedMessages = [
        ...targetMessages,
        ...sourceMessagesWithTargetChatId.filter(
            (sourceMessage) => !targetMessageClientMessageIds.has(sourceMessage.clientMessageId),
        ),
    ];

    pendingOutboundMessagesByChatId.delete(options.fromChatId);

    if (mergedMessages.length === 0) {
        pendingOutboundMessagesByChatId.delete(options.toChatId);
    } else {
        pendingOutboundMessagesByChatId.set(options.toChatId, mergedMessages);
    }

    emitPendingOutboundMessagesStoreChange();
}
