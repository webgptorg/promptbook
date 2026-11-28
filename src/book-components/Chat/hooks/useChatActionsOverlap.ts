import { useCallback, useEffect, useRef, useState, type MutableRefObject, type UIEvent } from 'react';

/**
 * Configuration for tracking action button overlap and scroll state.
 *
 * @private component of `<Chat/>`
 */
export type ChatActionsOverlapConfig = {
    /**
     * Provides the chat messages container ref for auto-scroll integration.
     */
    chatMessagesRef: (element: HTMLDivElement | null) => void;
    /**
     * Scroll handler from the auto-scroll hook.
     */
    handleScroll: (event: UIEvent<HTMLDivElement>) => void;
    /**
     * Selector used to locate message elements for overlap checks.
     */
    messageSelector: string;
    /**
     * Optional selector for the actual message content region used for overlap checks.
     *
     * When not provided or when no matching element is found, the full message element is used.
     */
    messageCollisionSelector?: string;
    /**
     * Messages used to trigger overlap recalculation.
     */
    messages: ReadonlyArray<unknown>;
};

/**
 * Result returned by the action overlap tracking hook.
 */
export type ChatActionsOverlapResult = {
    /**
     * Ref for the actions toolbar element.
     */
    actionsRef: MutableRefObject<HTMLDivElement | null>;
    /**
     * Combined ref setter for chat messages (auto-scroll + overlap tracking).
     */
    setChatMessagesElement: (element: HTMLDivElement | null) => void;
    /**
     * Scroll handler that updates both auto-scroll and overlap state.
     */
    handleChatScroll: (event: UIEvent<HTMLDivElement>) => void;
    /**
     * Whether the actions toolbar is currently being scrolled.
     */
    isActionsScrolling: boolean;
    /**
     * Whether the actions toolbar overlaps the first visible message.
     */
    isActionsOverlapping: boolean;
};

/**
 * Checks whether the chat action buttons overlap the first visible message.
 *
 * @private component of `<Chat/>`
 */
function isActionsOverlappingFirstVisibleMessage(
    actionsElement: HTMLElement | null,
    chatMessagesElement: HTMLElement | null,
    messageSelector: string,
    messageCollisionSelector?: string,
): boolean {
    if (!actionsElement || !chatMessagesElement) {
        return false;
    }

    const actionsRect = actionsElement.getBoundingClientRect();
    const messagesRect = chatMessagesElement.getBoundingClientRect();

    if (actionsRect.bottom <= messagesRect.top || actionsRect.top >= messagesRect.bottom) {
        return false;
    }

    const messageElements = Array.from(chatMessagesElement.querySelectorAll<HTMLElement>(messageSelector));
    if (messageElements.length === 0) {
        return false;
    }

    const firstVisibleMessage = messageElements.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > messagesRect.top && rect.top < messagesRect.bottom;
    });

    if (!firstVisibleMessage) {
        return false;
    }

    const collisionElements = messageCollisionSelector
        ? Array.from(firstVisibleMessage.querySelectorAll<HTMLElement>(messageCollisionSelector))
        : [];
    const overlapTargets = collisionElements.length > 0 ? collisionElements : [firstVisibleMessage];

    return overlapTargets.some((targetElement) => {
        const targetRect = targetElement.getBoundingClientRect();
        const overlapsVertically = actionsRect.bottom > targetRect.top && actionsRect.top < targetRect.bottom;
        const overlapsHorizontally = actionsRect.right > targetRect.left && actionsRect.left < targetRect.right;

        return overlapsVertically && overlapsHorizontally;
    });
}

/**
 * Tracks action toolbar overlap while coordinating with chat auto-scroll.
 *
 * @private component of `<Chat/>`
 */
export function useChatActionsOverlap(config: ChatActionsOverlapConfig): ChatActionsOverlapResult {
    const { chatMessagesRef, handleScroll, messageSelector, messageCollisionSelector, messages } = config;
    const actionsFadeDelayMs = 150;
    const chatMessagesElementRef = useRef<HTMLDivElement | null>(null);
    const actionsRef = useRef<HTMLDivElement | null>(null);
    const actionsFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const actionsFadeFrameRef = useRef<number | null>(null);
    const [isActionsScrolling, setIsActionsScrolling] = useState(false);
    const [isActionsOverlapping, setIsActionsOverlapping] = useState(false);

    const scheduleActionsOverlapCheck = useCallback(() => {
        if (actionsFadeFrameRef.current !== null) {
            cancelAnimationFrame(actionsFadeFrameRef.current);
        }

        actionsFadeFrameRef.current = requestAnimationFrame(() => {
            actionsFadeFrameRef.current = null;
            const isOverlapping = isActionsOverlappingFirstVisibleMessage(
                actionsRef.current,
                chatMessagesElementRef.current,
                messageSelector,
                messageCollisionSelector,
            );
            setIsActionsOverlapping(isOverlapping);
        });
    }, [messageCollisionSelector, messageSelector]);

    const setChatMessagesElement = useCallback(
        (element: HTMLDivElement | null) => {
            chatMessagesElementRef.current = element;
            chatMessagesRef(element);
            scheduleActionsOverlapCheck();
        },
        [chatMessagesRef, scheduleActionsOverlapCheck],
    );

    const handleChatScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) => {
            handleScroll(event);

            setIsActionsScrolling(true);
            if (actionsFadeTimeoutRef.current) {
                clearTimeout(actionsFadeTimeoutRef.current);
            }
            actionsFadeTimeoutRef.current = setTimeout(() => {
                setIsActionsScrolling(false);
            }, actionsFadeDelayMs);

            scheduleActionsOverlapCheck();
        },
        [handleScroll, scheduleActionsOverlapCheck],
    );

    useEffect(() => {
        scheduleActionsOverlapCheck();
    }, [messages, scheduleActionsOverlapCheck]);

    useEffect(() => {
        window.addEventListener('resize', scheduleActionsOverlapCheck);

        return () => {
            window.removeEventListener('resize', scheduleActionsOverlapCheck);
        };
    }, [scheduleActionsOverlapCheck]);

    useEffect(() => {
        return () => {
            if (actionsFadeTimeoutRef.current) {
                clearTimeout(actionsFadeTimeoutRef.current);
            }
            if (actionsFadeFrameRef.current !== null) {
                cancelAnimationFrame(actionsFadeFrameRef.current);
            }
        };
    }, []);

    return {
        actionsRef,
        setChatMessagesElement,
        handleChatScroll,
        isActionsScrolling,
        isActionsOverlapping,
    };
}
