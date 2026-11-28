'use client';

import { useEffect, useRef } from 'react';
import type { ChatSoundSystem } from '../Chat/ChatProps';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Snapshot of one chat state used to detect real assistant-completion transitions.
 *
 * @private internal helper of `useChatCompleteNotification`
 */
type ChatCompletionNotificationSnapshot = {
    readonly messageKeys: ReadonlyArray<string | number>;
    readonly lastMessageKey: string | number;
    readonly lastMessageSender: ChatMessage['sender'];
    readonly isLastMessageComplete: boolean;
};

/**
 * Plays the "message received" sound + vibration exactly once when the last
 * assistant message transitions to a completed / finalized state.
 *
 * Notifications are suppressed for:
 * - Every streaming chunk / intermediate content update
 * - `message_typing` lifecycle events before the message is finalized
 * - Re-renders of an already-notified completed message (idempotent)
 * - Initial mount hydration with preloaded completed chat history
 * - Switching to another chat thread that already contains completed history
 * - User-originated messages
 *
 * @param messages - Current list of chat messages
 * @param soundSystem - Optional sound system instance; no-op when absent
 *
 * @private internal hook of `<Chat/>`
 */
export function useChatCompleteNotification(
    messages: ReadonlyArray<ChatMessage>,
    soundSystem: ChatSoundSystem | undefined,
): void {
    /**
     * Stores the last observed chat shape so notifications only fire for real
     * within-thread completion transitions instead of mount-time history.
     */
    const previousSnapshotRef = useRef<ChatCompletionNotificationSnapshot | null>(null);

    useEffect(() => {
        if (messages.length === 0) {
            previousSnapshotRef.current = null;
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            previousSnapshotRef.current = null;
            return;
        }

        const currentSnapshot = createChatCompletionNotificationSnapshot(messages);
        const previousSnapshot = previousSnapshotRef.current;
        previousSnapshotRef.current = currentSnapshot;

        if (!soundSystem || !previousSnapshot) {
            return;
        }

        // Only notify for completed assistant messages.
        if (currentSnapshot.lastMessageSender === 'USER' || !currentSnapshot.isLastMessageComplete) {
            return;
        }

        const isSameMessageCompletionTransition =
            previousSnapshot.lastMessageKey === currentSnapshot.lastMessageKey &&
            !previousSnapshot.isLastMessageComplete;
        const isCompletedReplyAppended =
            previousSnapshot.lastMessageSender === 'USER' &&
            areMessageKeyListsSequentialPrefix(previousSnapshot.messageKeys, currentSnapshot.messageKeys);
        const isIncompletePlaceholderReplacedByCompletedReply =
            !previousSnapshot.isLastMessageComplete &&
            areMessageKeyListsMatchingExceptLast(previousSnapshot.messageKeys, currentSnapshot.messageKeys);

        if (
            !isSameMessageCompletionTransition &&
            !isCompletedReplyAppended &&
            !isIncompletePlaceholderReplacedByCompletedReply
        ) {
            return;
        }

        /* not await */ soundSystem.play('message_receive');
    }, [messages, soundSystem]);
}

/**
 * Builds the normalized snapshot used to detect message completion transitions.
 *
 * @private internal helper of `useChatCompleteNotification`
 */
function createChatCompletionNotificationSnapshot(
    messages: ReadonlyArray<ChatMessage>,
): ChatCompletionNotificationSnapshot {
    const messageKeys = messages.map(resolveChatCompletionNotificationMessageKey);
    const lastMessage = messages[messages.length - 1]!;

    return {
        messageKeys,
        lastMessageKey: messageKeys[messageKeys.length - 1]!,
        lastMessageSender: lastMessage.sender,
        isLastMessageComplete: lastMessage.isComplete ?? true,
    };
}

/**
 * Resolves the stable key used to track one message across rerenders.
 *
 * @private internal helper of `useChatCompleteNotification`
 */
function resolveChatCompletionNotificationMessageKey(message: ChatMessage, index: number): string | number {
    return message.id ?? `index-${index}`;
}

/**
 * Returns true when `nextMessageKeys` extends `previousMessageKeys` by one
 * message while preserving the exact earlier conversation prefix.
 *
 * @private internal helper of `useChatCompleteNotification`
 */
function areMessageKeyListsSequentialPrefix(
    previousMessageKeys: ReadonlyArray<string | number>,
    nextMessageKeys: ReadonlyArray<string | number>,
): boolean {
    if (nextMessageKeys.length !== previousMessageKeys.length + 1) {
        return false;
    }

    return previousMessageKeys.every((messageKey, index) => messageKey === nextMessageKeys[index]);
}

/**
 * Returns true when both snapshots share the same conversation prefix but the
 * last message key changed, which can happen when a placeholder is replaced by
 * the finalized assistant message payload.
 *
 * @private internal helper of `useChatCompleteNotification`
 */
function areMessageKeyListsMatchingExceptLast(
    previousMessageKeys: ReadonlyArray<string | number>,
    nextMessageKeys: ReadonlyArray<string | number>,
): boolean {
    if (previousMessageKeys.length === 0 || previousMessageKeys.length !== nextMessageKeys.length) {
        return false;
    }

    return previousMessageKeys.slice(0, -1).every((messageKey, index) => messageKey === nextMessageKeys[index]);
}
