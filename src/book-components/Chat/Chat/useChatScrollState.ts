'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from 'react';
import { useChatActionsOverlap } from '../hooks/useChatActionsOverlap';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';

/**
 * Inputs required to coordinate Chat scroll behavior.
 *
 * @private function of `useChatScrollState`
 */
type UseChatScrollStateProps = {
    messages: ReadonlyArray<ChatMessage>;
};

/**
 * Stable copy used by the scroll-to-bottom indicator.
 *
 * @private function of `useChatScrollState`
 */
type ScrollIndicatorText = {
    readonly badgeLabel: string;
    readonly ariaLabel: string;
};

/**
 * Public result consumed by `<Chat/>`.
 *
 * @private function of `useChatScrollState`
 */
type UseChatScrollStateResult = {
    readonly actionsRef: MutableRefObject<HTMLDivElement | null>;
    readonly ariaLabel: string;
    readonly badgeLabel: string;
    readonly handleChatScroll: (event: UIEvent<HTMLDivElement>) => void;
    readonly isMobile: boolean;
    readonly scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
    readonly setChatMessagesElement: (element: HTMLDivElement | null) => void;
    readonly shouldDisableActions: boolean;
    readonly shouldFadeActions: boolean;
    readonly shouldShowScrollToBottom: boolean;
};

/**
 * Arguments required to synchronize unseen-message counters.
 *
 * @private function of `useChatScrollState`
 */
type SyncUnseenMessagesCountProps = {
    readonly isAutoScrolling: boolean;
    readonly lastSeenMessagesRef: MutableRefObject<number>;
    readonly messagesLength: number;
    readonly setUnseenMessagesCount: (updater: number | ((previous: number) => number)) => void;
    readonly unseenMessagesCount: number;
};

/**
 * Builds the copy used by the scroll indicator badge and the button's accessible label.
 *
 * @param count - Number of unseen messages.
 * @returns Labels tailored to the current unseen message count.
 *
 * @private function of `useChatScrollState`
 */
function buildScrollIndicatorText(count: number): ScrollIndicatorText {
    if (count <= 0) {
        return {
            badgeLabel: '',
            ariaLabel: 'Scroll to the latest message',
        };
    }

    const messageWord = count === 1 ? 'message' : 'messages';
    const badgeLabel = `${count} new ${messageWord}`;

    return {
        badgeLabel,
        ariaLabel: `${badgeLabel} below. Scroll to the latest message.`,
    };
}

/**
 * Checks whether the latest rendered chat message is visible inside the messages viewport.
 *
 * @param chatMessagesElement - Scrollable chat messages container.
 * @param messageSelector - Selector that targets chat message nodes.
 * @returns `true` when any part of the latest message is visible.
 *
 * @private function of `useChatScrollState`
 */
function isLatestMessageVisible(chatMessagesElement: HTMLDivElement | null, messageSelector: string): boolean {
    if (!chatMessagesElement) {
        return true;
    }

    const messageElements = Array.from(chatMessagesElement.querySelectorAll<HTMLElement>(messageSelector));
    const latestMessageElement = messageElements[messageElements.length - 1];
    if (!latestMessageElement) {
        return true;
    }

    const containerRect = chatMessagesElement.getBoundingClientRect();
    const latestMessageRect = latestMessageElement.getBoundingClientRect();

    return latestMessageRect.bottom > containerRect.top && latestMessageRect.top < containerRect.bottom;
}

/**
 * Resets the unseen-message counter when the user is effectively back at the latest message.
 *
 * @private function of `useChatScrollState`
 */
function resetUnseenMessagesCount({
    lastSeenMessagesRef,
    messagesLength,
    setUnseenMessagesCount,
    unseenMessagesCount,
}: Omit<SyncUnseenMessagesCountProps, 'isAutoScrolling'>): void {
    lastSeenMessagesRef.current = messagesLength;

    if (unseenMessagesCount !== 0) {
        setUnseenMessagesCount(0);
    }
}

/**
 * Synchronizes the unseen-message counter with the latest chat state.
 *
 * @private function of `useChatScrollState`
 */
function syncUnseenMessagesCount({
    isAutoScrolling,
    lastSeenMessagesRef,
    messagesLength,
    setUnseenMessagesCount,
    unseenMessagesCount,
}: SyncUnseenMessagesCountProps): void {
    if (messagesLength < lastSeenMessagesRef.current) {
        resetUnseenMessagesCount({
            lastSeenMessagesRef,
            messagesLength,
            setUnseenMessagesCount,
            unseenMessagesCount,
        });
        return;
    }

    if (isAutoScrolling) {
        resetUnseenMessagesCount({
            lastSeenMessagesRef,
            messagesLength,
            setUnseenMessagesCount,
            unseenMessagesCount,
        });
        return;
    }

    if (messagesLength > lastSeenMessagesRef.current) {
        setUnseenMessagesCount(messagesLength - lastSeenMessagesRef.current);
    }
}

/**
 * Detects whether the latest rendered assistant message is still streaming.
 *
 * @private function of `useChatScrollState`
 */
function isStreamingAgentMessage(messages: ReadonlyArray<ChatMessage>): boolean {
    const lastMessage = messages[messages.length - 1];
    return Boolean(lastMessage && lastMessage.sender !== 'USER' && !lastMessage.isComplete);
}

/**
 * Coordinates auto-scroll, overlap tracking, and the scroll-to-bottom indicator for `<Chat/>`.
 *
 * @private function of `<Chat/>`
 */
export function useChatScrollState({ messages }: UseChatScrollStateProps): UseChatScrollStateResult {
    const { isAutoScrolling, chatMessagesRef, handleScroll, handleMessagesChange, scrollToBottom, isMobile } =
        useChatAutoScroll();
    const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);
    const [isLatestMessageInView, setIsLatestMessageInView] = useState(true);
    const lastSeenMessagesRef = useRef(messages.length);
    const chatMessagesElementRef = useRef<HTMLDivElement | null>(null);

    const chatMessageSelector = `.${styles.chatMessage}`;
    const chatMessageCollisionTargetSelector = `.${styles.messageStack}`;
    const {
        actionsRef,
        setChatMessagesElement: setChatMessagesElementWithOverlap,
        handleChatScroll: handleChatScrollWithOverlap,
        isActionsOverlapping,
        isActionsScrolling,
    } = useChatActionsOverlap({
        chatMessagesRef,
        handleScroll,
        messageSelector: chatMessageSelector,
        messageCollisionSelector: chatMessageCollisionTargetSelector,
        messages,
    });

    const updateLatestMessageVisibility = useCallback(
        (chatMessagesElement?: HTMLDivElement | null) => {
            const targetElement = chatMessagesElement ?? chatMessagesElementRef.current;
            const nextVisibility = isLatestMessageVisible(targetElement, chatMessageSelector);
            setIsLatestMessageInView((currentVisibility) =>
                currentVisibility === nextVisibility ? currentVisibility : nextVisibility,
            );
        },
        [chatMessageSelector],
    );

    const setChatMessagesElement = useCallback(
        (element: HTMLDivElement | null) => {
            chatMessagesElementRef.current = element;
            setChatMessagesElementWithOverlap(element);
            updateLatestMessageVisibility(element);
        },
        [setChatMessagesElementWithOverlap, updateLatestMessageVisibility],
    );

    const handleChatScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) => {
            handleChatScrollWithOverlap(event);
            updateLatestMessageVisibility(event.currentTarget);
        },
        [handleChatScrollWithOverlap, updateLatestMessageVisibility],
    );

    useEffect(() => {
        syncUnseenMessagesCount({
            isAutoScrolling,
            lastSeenMessagesRef,
            messagesLength: messages.length,
            setUnseenMessagesCount,
            unseenMessagesCount,
        });
    }, [messages.length, isAutoScrolling, unseenMessagesCount]);

    const { badgeLabel, ariaLabel } = useMemo(
        () => buildScrollIndicatorText(unseenMessagesCount),
        [unseenMessagesCount],
    );
    const isLatestStreamingAgentMessage = isStreamingAgentMessage(messages);

    useEffect(() => {
        handleMessagesChange(isLatestStreamingAgentMessage);

        const animationFrame = requestAnimationFrame(() => {
            updateLatestMessageVisibility();
        });

        return () => cancelAnimationFrame(animationFrame);
    }, [messages, handleMessagesChange, updateLatestMessageVisibility, isLatestStreamingAgentMessage]);

    useEffect(() => {
        const handleResize = () => {
            updateLatestMessageVisibility();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateLatestMessageVisibility]);

    return {
        actionsRef,
        ariaLabel,
        badgeLabel,
        handleChatScroll,
        isMobile,
        scrollToBottom,
        setChatMessagesElement,
        shouldDisableActions: isActionsOverlapping && isActionsScrolling,
        shouldFadeActions: isActionsOverlapping,
        shouldShowScrollToBottom: !isAutoScrolling && !isLatestMessageInView,
    };
}
