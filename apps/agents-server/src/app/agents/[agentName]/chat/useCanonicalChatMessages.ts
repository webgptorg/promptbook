'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getRandomThinkingMessageDelayMs,
    getRandomThinkingMessageVariant,
    normalizeThinkingMessageVariants,
} from '../../../../../../../src/book-components/Chat/utils/thinkingMessageVariants';
import { createWordLikeDeltas } from '../../../../utils/chat/createWordLikeDeltas';

/**
 * Delay between browser-side text reveal chunks reconstructed from canonical chat snapshots.
 */
const CANONICAL_CHAT_REVEAL_DELAY_MS = 45;

/**
 * Options accepted by `useCanonicalChatMessages`.
 */
type UseCanonicalChatMessagesOptions = {
    initialMessage: string;
    messages: ReadonlyArray<ChatMessage>;
    thinkingMessages?: ReadonlyArray<string>;
    isActiveBrowserTab: boolean;
};

/**
 * Returns chat messages ready for rendering in the canonical durable-chat panel.
 *
 * The hook keeps the canonical server state authoritative while restoring browser-only UX
 * for active tabs:
 * - empty queued/running assistant placeholders rotate through `THINKING_MESSAGES`
 * - persisted content deltas are revealed progressively so focused viewers see smooth streaming
 */
export function useCanonicalChatMessages(options: UseCanonicalChatMessagesOptions): ReadonlyArray<ChatMessage> {
    const { initialMessage, messages, thinkingMessages, isActiveBrowserTab } = options;
    const normalizedThinkingMessages = useMemo(
        () => normalizeThinkingMessageVariants(thinkingMessages),
        [thinkingMessages],
    );
    const [messageContentOverrides, setMessageContentOverrides] = useState<Record<string, string>>({});
    const messageContentOverridesRef = useRef<Record<string, string>>({});
    const previousCanonicalContentRef = useRef<Record<string, string>>({});
    const thinkingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const revealTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    /**
     * Stores one browser-side override value for the rendered message content.
     */
    const setMessageContentOverride = useCallback((messageId: string, content: string): void => {
        if (messageContentOverridesRef.current[messageId] === content) {
            return;
        }

        messageContentOverridesRef.current = {
            ...messageContentOverridesRef.current,
            [messageId]: content,
        };
        setMessageContentOverrides(messageContentOverridesRef.current);
    }, []);

    /**
     * Removes one browser-side content override once the canonical message should render directly.
     */
    const clearMessageContentOverride = useCallback((messageId: string): void => {
        if (!(messageId in messageContentOverridesRef.current)) {
            return;
        }

        const nextOverrides = { ...messageContentOverridesRef.current };
        delete nextOverrides[messageId];
        messageContentOverridesRef.current = nextOverrides;
        setMessageContentOverrides(nextOverrides);
    }, []);

    /**
     * Clears one scheduled thinking-message rotation.
     */
    const clearThinkingTimer = useCallback((messageId: string): void => {
        const timer = thinkingTimersRef.current.get(messageId);
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        thinkingTimersRef.current.delete(messageId);
    }, []);

    /**
     * Clears one scheduled text reveal timer.
     */
    const clearRevealTimer = useCallback((messageId: string): void => {
        const timer = revealTimersRef.current.get(messageId);
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        revealTimersRef.current.delete(messageId);
    }, []);

    /**
     * Stops all browser-side timers associated with one message.
     */
    const clearMessageTimers = useCallback(
        (messageId: string): void => {
            clearThinkingTimer(messageId);
            clearRevealTimer(messageId);
        },
        [clearRevealTimer, clearThinkingTimer],
    );

    useEffect(() => {
        const thinkingTimers = thinkingTimersRef.current;
        const revealTimers = revealTimersRef.current;

        return () => {
            for (const timer of thinkingTimers.values()) {
                clearTimeout(timer);
            }

            for (const timer of revealTimers.values()) {
                clearTimeout(timer);
            }

            thinkingTimers.clear();
            revealTimers.clear();
        };
    }, []);

    useEffect(() => {
        const liveMessageIds = new Set<string>();

        /**
         * Schedules one thinking-message rotation loop for a queued/running assistant placeholder.
         */
        const scheduleThinkingRotation = (messageId: string, currentVariant: string): void => {
            clearThinkingTimer(messageId);

            if (!isActiveBrowserTab || normalizedThinkingMessages.length <= 1) {
                return;
            }

            const timer = setTimeout(() => {
                const nextVariant = getRandomThinkingMessageVariant(normalizedThinkingMessages, currentVariant);
                setMessageContentOverride(messageId, nextVariant);
                scheduleThinkingRotation(messageId, nextVariant);
            }, getRandomThinkingMessageDelayMs());

            thinkingTimersRef.current.set(messageId, timer);
        };

        /**
         * Reveals one persisted canonical content delta progressively inside the active browser tab.
         */
        const revealMessageContent = (messageId: string, targetContent: string): void => {
            clearRevealTimer(messageId);

            const currentRenderedContent =
                messageContentOverridesRef.current[messageId] ??
                previousCanonicalContentRef.current[messageId] ??
                targetContent;
            const sharedPrefixLength = resolveSharedPrefixLength(currentRenderedContent, targetContent);
            const stablePrefix = targetContent.slice(0, sharedPrefixLength);
            const pendingDeltas = createWordLikeDeltas(targetContent.slice(sharedPrefixLength));

            setMessageContentOverride(messageId, stablePrefix);

            /**
             * Applies the next reveal delta immediately and then re-schedules itself while needed.
             */
            const applyNextDelta = (): void => {
                const nextDelta = pendingDeltas.shift();
                if (!nextDelta) {
                    clearRevealTimer(messageId);
                    setMessageContentOverride(messageId, targetContent);
                    return;
                }

                const nextContent = `${messageContentOverridesRef.current[messageId] ?? stablePrefix}${nextDelta}`;
                setMessageContentOverride(messageId, nextContent);

                if (pendingDeltas.length === 0) {
                    clearRevealTimer(messageId);
                    return;
                }

                const timer = setTimeout(applyNextDelta, CANONICAL_CHAT_REVEAL_DELAY_MS);
                revealTimersRef.current.set(messageId, timer);
            };

            if (pendingDeltas.length === 0) {
                return;
            }

            applyNextDelta();
        };

        for (let index = 0; index < messages.length; index++) {
            const message = messages[index]!;
            const messageId = resolveMessageId(message, index);
            const canonicalContent = message.content;
            const previousCanonicalContent = previousCanonicalContentRef.current[messageId];
            const hasSeenCanonicalContentBefore = previousCanonicalContent !== undefined;

            if (!shouldManageMessageInBrowser(message)) {
                clearMessageTimers(messageId);
                clearMessageContentOverride(messageId);
                previousCanonicalContentRef.current[messageId] = canonicalContent;
                continue;
            }

            liveMessageIds.add(messageId);

            if (shouldShowThinkingMessage(message)) {
                clearRevealTimer(messageId);

                const currentVariant =
                    messageContentOverridesRef.current[messageId] ||
                    getRandomThinkingMessageVariant(normalizedThinkingMessages);
                setMessageContentOverride(messageId, currentVariant);
                scheduleThinkingRotation(messageId, currentVariant);
                previousCanonicalContentRef.current[messageId] = canonicalContent;
                continue;
            }

            clearThinkingTimer(messageId);

            if (!isActiveBrowserTab) {
                clearRevealTimer(messageId);
                setMessageContentOverride(messageId, canonicalContent);
                previousCanonicalContentRef.current[messageId] = canonicalContent;
                continue;
            }

            if (!hasSeenCanonicalContentBefore) {
                setMessageContentOverride(messageId, canonicalContent);
                previousCanonicalContentRef.current[messageId] = canonicalContent;
                continue;
            }

            if (messageContentOverridesRef.current[messageId] === canonicalContent) {
                previousCanonicalContentRef.current[messageId] = canonicalContent;
                continue;
            }

            revealMessageContent(messageId, canonicalContent);
            previousCanonicalContentRef.current[messageId] = canonicalContent;
        }

        for (const messageId of Object.keys(previousCanonicalContentRef.current)) {
            if (liveMessageIds.has(messageId)) {
                continue;
            }

            clearMessageTimers(messageId);
            clearMessageContentOverride(messageId);
            delete previousCanonicalContentRef.current[messageId];
        }
    }, [
        clearMessageContentOverride,
        clearMessageTimers,
        clearRevealTimer,
        clearThinkingTimer,
        isActiveBrowserTab,
        messages,
        normalizedThinkingMessages,
        setMessageContentOverride,
    ]);

    return useMemo<ReadonlyArray<ChatMessage>>(
        () => [
            {
                id: 'canonical-agent-initial-message',
                sender: 'AGENT',
                content: initialMessage,
                createdAt: messages[0]?.createdAt,
                isComplete: true,
            },
            ...messages.map((message, index) => {
                const messageId = resolveMessageId(message, index);
                const browserContentOverride = messageContentOverrides[messageId];

                return browserContentOverride === undefined
                    ? message
                    : {
                          ...message,
                          content: browserContentOverride,
                      };
            }),
        ],
        [initialMessage, messageContentOverrides, messages],
    );
}

/**
 * Returns `true` when the browser should manage the message content locally for streaming UX.
 */
function shouldManageMessageInBrowser(message: ChatMessage): boolean {
    return message.sender !== 'USER' && message.isComplete === false;
}

/**
 * Returns `true` when the browser should show a transient thinking placeholder.
 */
function shouldShowThinkingMessage(message: ChatMessage): boolean {
    return (
        shouldManageMessageInBrowser(message) &&
        (message.lifecycleState === 'queued' || message.lifecycleState === 'running') &&
        message.content.trim().length === 0
    );
}

/**
 * Resolves a stable message id for browser-side timers and content overrides.
 */
function resolveMessageId(message: ChatMessage, index: number): string {
    return typeof message.id === 'string' || typeof message.id === 'number'
        ? String(message.id)
        : `canonical-message-${index}`;
}

/**
 * Resolves the shared prefix length between the currently rendered and target content.
 */
function resolveSharedPrefixLength(left: string, right: string): number {
    const maxLength = Math.min(left.length, right.length);
    let index = 0;

    while (index < maxLength && left[index] === right[index]) {
        index++;
    }

    return index;
}
