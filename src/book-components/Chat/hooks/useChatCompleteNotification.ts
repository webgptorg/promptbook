'use client';

import { useEffect, useRef } from 'react';
import type { ChatSoundSystem } from '../Chat/ChatProps';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Plays the "message received" sound + vibration exactly once when the last
 * assistant message transitions to a completed / finalized state.
 *
 * Notifications are suppressed for:
 * - Every streaming chunk / intermediate content update
 * - `message_typing` lifecycle events before the message is finalized
 * - Re-renders of an already-notified completed message (idempotent)
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
     * Tracks the stable key of the last message for which the completion
     * notification was already fired, preventing double-firing on re-renders.
     */
    const notifiedMessageKeyRef = useRef<string | number | null>(null);

    useEffect(() => {
        if (!soundSystem || messages.length === 0) {
            return;
        }

        const lastMessage = messages[messages.length - 1];

        // Only notify for completed assistant messages
        if (!lastMessage || lastMessage.sender === 'USER' || !lastMessage.isComplete) {
            return;
        }

        // Derive a stable per-message key; fall back to positional index when
        // the message has no id so we never coalesce distinct messages.
        const messageKey: string | number = lastMessage.id ?? `index-${messages.length - 1}`;

        // Guard: fire only once per unique completed message
        if (notifiedMessageKeyRef.current === messageKey) {
            return;
        }

        notifiedMessageKeyRef.current = messageKey;
        /* not await */ soundSystem.play('message_receive');
    }, [messages, soundSystem]);
}
