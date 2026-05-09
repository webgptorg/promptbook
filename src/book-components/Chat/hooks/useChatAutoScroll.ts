import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
    type UIEvent,
} from 'react';

/**
 * Configuration for the auto-scroll behavior.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatAutoScrollConfig = {
    /**
     * Threshold in pixels from bottom to consider as "at bottom"
     * @default 100
     */
    bottomThreshold?: number;

    /**
     * Whether to use smooth scrolling
     * @default true
     */
    smoothScroll?: boolean;

    /**
     * Delay before checking scroll position after new messages (in milliseconds)
     * @default 100
     */
    scrollCheckDelay?: number;
};

/**
 * Debounce window for synchronizing `isAutoScrolling` with the latest scroll position.
 *
 * @private function of `useChatAutoScroll`
 */
const SCROLL_EVENT_DEBOUNCE_MS = 50;

/**
 * Faster follow-up used while the latest assistant message is still streaming.
 *
 * @private function of `useChatAutoScroll`
 */
const STREAMING_SCROLL_CHECK_DELAY_MS = 10;

/**
 * Viewport width treated as mobile for chat scrolling behavior.
 *
 * @private function of `useChatAutoScroll`
 */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * Mobile-device user agent matcher used by the chat viewport detection.
 *
 * @private function of `useChatAutoScroll`
 */
const MOBILE_DEVICE_USER_AGENT_PATTERN =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Timeout handle used by the hook across browser and Node.js test environments.
 *
 * @private function of `useChatAutoScroll`
 */
type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Scroll behavior used by the hook when moving the chat container.
 *
 * @private function of `useChatAutoScroll`
 */
type ScrollToBottomBehavior = 'smooth' | 'auto';

/**
 * Metrics captured when new chat content may have changed the scroll position.
 *
 * @private function of `useChatAutoScroll`
 */
type MessagesChangeMetrics = {
    readonly currentScrollHeight: number;
    readonly hasNewContent: boolean;
    readonly wasAtBottomBeforeNewContent: boolean;
};

/**
 * Decision produced after evaluating whether a content change should trigger auto-scroll.
 *
 * @private function of `useChatAutoScroll`
 */
type MessagesChangeAutoScrollDecision = {
    readonly currentScrollHeight: number;
    readonly shouldScheduleScroll: boolean;
};

/**
 * Props for the internal scroll-event handler.
 *
 * @private function of `useChatAutoScroll`
 */
type UseChatScrollHandlerProps = {
    readonly checkIfAtBottom: (element: HTMLDivElement) => boolean;
    readonly hasManualScrollRef: MutableRefObject<boolean>;
    readonly isAutoScrolling: boolean;
    readonly scrollTimeoutRef: MutableRefObject<TimeoutHandle | null>;
    readonly setIsAutoScrolling: (nextValue: boolean | ((currentValue: boolean) => boolean)) => void;
};

/**
 * Props for the internal message-change handler.
 *
 * @private function of `useChatAutoScroll`
 */
type UseChatMessagesChangeHandlerProps = {
    readonly bottomThreshold: number;
    readonly chatMessagesRef: MutableRefObject<HTMLDivElement | null>;
    readonly hasManualScrollRef: MutableRefObject<boolean>;
    readonly isAutoScrolling: boolean;
    readonly lastScrollHeightRef: MutableRefObject<number>;
    readonly messagesChangeTimeoutRef: MutableRefObject<TimeoutHandle | null>;
    readonly scrollCheckDelay: number;
    readonly scrollToBottom: (behavior?: ScrollToBottomBehavior) => void;
};

/**
 * Props for the internal chat-container ref callback.
 *
 * @private function of `useChatAutoScroll`
 */
type UseChatMessagesRefCallbackProps = {
    readonly chatMessagesRef: MutableRefObject<HTMLDivElement | null>;
    readonly isAutoScrolling: boolean;
    readonly lastScrollHeightRef: MutableRefObject<number>;
    readonly scrollToBottom: (behavior?: ScrollToBottomBehavior) => void;
};

/**
 * Props for updating auto-scroll state from a direct scroll interaction.
 *
 * @private function of `useChatAutoScroll`
 */
type UpdateAutoScrollStateFromScrollProps = {
    readonly hasManualScrollRef: MutableRefObject<boolean>;
    readonly isAtBottom: boolean;
    readonly isAutoScrolling: boolean;
    readonly setIsAutoScrolling: (nextValue: boolean | ((currentValue: boolean) => boolean)) => void;
};

/**
 * Props for scheduling the debounced "are we at the bottom?" sync after scrolling.
 *
 * @private function of `useChatAutoScroll`
 */
type ScheduleAutoScrollStateSyncProps = {
    readonly element: HTMLDivElement;
    readonly scrollTimeoutRef: MutableRefObject<TimeoutHandle | null>;
    readonly syncAutoScrollState: (element: HTMLDivElement) => void;
};

/**
 * Props used to evaluate whether a messages change should schedule a follow-up scroll.
 *
 * @private function of `useChatAutoScroll`
 */
type EvaluateMessagesChangeAutoScrollProps = {
    readonly bottomThreshold: number;
    readonly chatMessagesElement: HTMLDivElement;
    readonly hasManualScroll: boolean;
    readonly isAutoScrolling: boolean;
    readonly previousScrollHeight: number;
};

/**
 * Props for scheduling the delayed scroll after a messages change.
 *
 * @private function of `useChatAutoScroll`
 */
type ScheduleMessagesChangeAutoScrollProps = {
    readonly hasManualScrollRef: MutableRefObject<boolean>;
    readonly isStreaming: boolean;
    readonly messagesChangeTimeoutRef: MutableRefObject<TimeoutHandle | null>;
    readonly scrollCheckDelay: number;
    readonly scrollToBottom: (behavior?: ScrollToBottomBehavior) => void;
};

/**
 * Props for initializing a freshly mounted chat container.
 *
 * @private function of `useChatAutoScroll`
 */
type InitializeChatMessagesElementProps = {
    readonly element: HTMLDivElement;
    readonly isAutoScrolling: boolean;
    readonly lastScrollHeightRef: MutableRefObject<number>;
    readonly scrollToBottom: (behavior?: ScrollToBottomBehavior) => void;
};

/**
 * Detects whether the current viewport should use the mobile scrolling path.
 *
 * @returns `true` when the viewport or device matches the mobile heuristics.
 *
 * @private function of `useChatAutoScroll`
 */
function isMobileChatViewport(): boolean {
    return (
        window.innerWidth <= MOBILE_BREAKPOINT_PX || MOBILE_DEVICE_USER_AGENT_PATTERN.test(navigator.userAgent)
    );
}

/**
 * Tracks whether the chat should currently use mobile scrolling behavior.
 *
 * @private function of `useChatAutoScroll`
 */
function useMobileChatViewport(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleViewportChange = () => {
            setIsMobile(isMobileChatViewport());
        };

        handleViewportChange();
        window.addEventListener('resize', handleViewportChange);

        return () => window.removeEventListener('resize', handleViewportChange);
    }, []);

    return isMobile;
}

/**
 * Checks whether the messages container is effectively scrolled to the bottom.
 *
 * @param element - Scrollable chat messages container.
 * @param bottomThreshold - Distance from the bottom still considered "at bottom".
 * @returns `true` when the container is within the threshold from the bottom.
 *
 * @private function of `useChatAutoScroll`
 */
function isChatScrolledToBottom(element: HTMLDivElement, bottomThreshold: number): boolean {
    const { scrollTop, scrollHeight, clientHeight } = element;
    return scrollTop + clientHeight >= scrollHeight - bottomThreshold;
}

/**
 * Clears a scheduled timeout when one is currently active.
 *
 * @private function of `useChatAutoScroll`
 */
function clearScheduledTimeout(timeoutRef: MutableRefObject<TimeoutHandle | null>): void {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
}

/**
 * Performs the concrete scroll-to-bottom operation for the current platform.
 *
 * @private function of `useChatAutoScroll`
 */
function performScrollToBottom({
    behavior,
    chatMessagesElement,
    isMobile,
    smoothScroll,
}: {
    readonly behavior: ScrollToBottomBehavior;
    readonly chatMessagesElement: HTMLDivElement;
    readonly isMobile: boolean;
    readonly smoothScroll: boolean;
}): void {
    if (isMobile) {
        chatMessagesElement.scrollTo({
            top: chatMessagesElement.scrollHeight,
            behavior: smoothScroll ? behavior : 'auto',
        });
        return;
    }

    if (smoothScroll && behavior === 'smooth') {
        chatMessagesElement.style.scrollBehavior = 'smooth';
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
        chatMessagesElement.style.scrollBehavior = 'auto';
        return;
    }

    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

/**
 * Detects whether the user currently has a non-collapsed selection inside the chat container.
 *
 * @private function of `useChatAutoScroll`
 */
function hasExpandedSelectionInChat(chatMessagesElement: HTMLDivElement): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return false;
    }

    const range = selection.getRangeAt(0);
    return (
        chatMessagesElement.contains(range.startContainer) || chatMessagesElement.contains(range.endContainer)
    );
}

/**
 * Computes the scroll metrics needed to decide whether new content should trigger auto-scroll.
 *
 * @private function of `useChatAutoScroll`
 */
function getMessagesChangeMetrics({
    bottomThreshold,
    chatMessagesElement,
    previousScrollHeight,
}: {
    readonly bottomThreshold: number;
    readonly chatMessagesElement: HTMLDivElement;
    readonly previousScrollHeight: number;
}): MessagesChangeMetrics {
    const currentScrollHeight = chatMessagesElement.scrollHeight;

    return {
        currentScrollHeight,
        hasNewContent: currentScrollHeight > previousScrollHeight,
        wasAtBottomBeforeNewContent:
            chatMessagesElement.scrollTop + chatMessagesElement.clientHeight >= previousScrollHeight - bottomThreshold,
    };
}

/**
 * Evaluates whether new content should keep the chat pinned to the latest message.
 *
 * @private function of `useChatAutoScroll`
 */
function shouldAutoScrollForMessagesChange({
    hasManualScroll,
    hasNewContent,
    hasSelectionInChat,
    isAutoScrolling,
    wasAtBottomBeforeNewContent,
}: {
    readonly hasManualScroll: boolean;
    readonly hasNewContent: boolean;
    readonly hasSelectionInChat: boolean;
    readonly isAutoScrolling: boolean;
    readonly wasAtBottomBeforeNewContent: boolean;
}): boolean {
    return (
        hasNewContent &&
        isAutoScrolling &&
        wasAtBottomBeforeNewContent &&
        !hasSelectionInChat &&
        !hasManualScroll
    );
}

/**
 * Evaluates whether the latest DOM update should schedule a follow-up scroll.
 *
 * @private function of `useChatAutoScroll`
 */
function evaluateMessagesChangeAutoScroll({
    bottomThreshold,
    chatMessagesElement,
    hasManualScroll,
    isAutoScrolling,
    previousScrollHeight,
}: EvaluateMessagesChangeAutoScrollProps): MessagesChangeAutoScrollDecision {
    const metrics = getMessagesChangeMetrics({
        bottomThreshold,
        chatMessagesElement,
        previousScrollHeight,
    });

    return {
        currentScrollHeight: metrics.currentScrollHeight,
        shouldScheduleScroll: shouldAutoScrollForMessagesChange({
            hasManualScroll,
            hasNewContent: metrics.hasNewContent,
            hasSelectionInChat: hasExpandedSelectionInChat(chatMessagesElement),
            isAutoScrolling,
            wasAtBottomBeforeNewContent: metrics.wasAtBottomBeforeNewContent,
        }),
    };
}

/**
 * Chooses the follow-up delay for the next automatic scroll attempt.
 *
 * @private function of `useChatAutoScroll`
 */
function getMessagesChangeDelay(isStreaming: boolean, scrollCheckDelay: number): number {
    return isStreaming ? STREAMING_SCROLL_CHECK_DELAY_MS : scrollCheckDelay;
}

/**
 * Chooses the scroll behavior for the next automatic scroll attempt.
 *
 * @private function of `useChatAutoScroll`
 */
function getMessagesChangeScrollBehavior(isStreaming: boolean): ScrollToBottomBehavior {
    return isStreaming ? 'auto' : 'smooth';
}

/**
 * Updates the manual-scroll and auto-scroll flags from the latest direct scroll event.
 *
 * @private function of `useChatAutoScroll`
 */
function updateAutoScrollStateFromScroll({
    hasManualScrollRef,
    isAtBottom,
    isAutoScrolling,
    setIsAutoScrolling,
}: UpdateAutoScrollStateFromScrollProps): void {
    hasManualScrollRef.current = !isAtBottom;

    if (!isAtBottom && isAutoScrolling) {
        setIsAutoScrolling(false);
    }
}

/**
 * Schedules the debounced reconciliation that keeps `isAutoScrolling` in sync with the viewport.
 *
 * @private function of `useChatAutoScroll`
 */
function scheduleAutoScrollStateSync({
    element,
    scrollTimeoutRef,
    syncAutoScrollState,
}: ScheduleAutoScrollStateSyncProps): void {
    clearScheduledTimeout(scrollTimeoutRef);
    scrollTimeoutRef.current = setTimeout(() => {
        syncAutoScrollState(element);
    }, SCROLL_EVENT_DEBOUNCE_MS);
}

/**
 * Schedules the delayed scroll that follows a new message or streaming chunk.
 *
 * @private function of `useChatAutoScroll`
 */
function scheduleMessagesChangeAutoScroll({
    hasManualScrollRef,
    isStreaming,
    messagesChangeTimeoutRef,
    scrollCheckDelay,
    scrollToBottom,
}: ScheduleMessagesChangeAutoScrollProps): void {
    clearScheduledTimeout(messagesChangeTimeoutRef);
    messagesChangeTimeoutRef.current = setTimeout(() => {
        if (hasManualScrollRef.current) {
            return;
        }

        scrollToBottom(getMessagesChangeScrollBehavior(isStreaming));
    }, getMessagesChangeDelay(isStreaming, scrollCheckDelay));
}

/**
 * Initializes the chat container reference and restores the pinned-to-bottom state when needed.
 *
 * @private function of `useChatAutoScroll`
 */
function initializeChatMessagesElement({
    element,
    isAutoScrolling,
    lastScrollHeightRef,
    scrollToBottom,
}: InitializeChatMessagesElementProps): void {
    lastScrollHeightRef.current = element.scrollHeight;
    if (!isAutoScrolling) {
        return;
    }

    requestAnimationFrame(() => {
        scrollToBottom('auto');
    });
}

/**
 * Creates the debounced scroll handler that reacts to direct user scrolling.
 *
 * @private function of `useChatAutoScroll`
 */
function useChatScrollHandler({
    checkIfAtBottom,
    hasManualScrollRef,
    isAutoScrolling,
    scrollTimeoutRef,
    setIsAutoScrolling,
}: UseChatScrollHandlerProps): (event: UIEvent<HTMLDivElement>) => void {
    const syncAutoScrollState = useCallback(
        (element: HTMLDivElement) => {
            const isAtBottom = checkIfAtBottom(element);
            setIsAutoScrolling((currentValue) => (currentValue === isAtBottom ? currentValue : isAtBottom));
        },
        [checkIfAtBottom, setIsAutoScrolling],
    );

    return useCallback(
        (event: UIEvent<HTMLDivElement>) => {
            const element = event.currentTarget;
            const isAtBottom = checkIfAtBottom(element);

            updateAutoScrollStateFromScroll({
                hasManualScrollRef,
                isAtBottom,
                isAutoScrolling,
                setIsAutoScrolling,
            });
            scheduleAutoScrollStateSync({
                element,
                scrollTimeoutRef,
                syncAutoScrollState,
            });
        },
        [checkIfAtBottom, hasManualScrollRef, isAutoScrolling, scrollTimeoutRef, setIsAutoScrolling, syncAutoScrollState],
    );
}

/**
 * Creates the message-change handler that decides whether the chat should follow new content.
 *
 * @private function of `useChatAutoScroll`
 */
function useChatMessagesChangeHandler({
    bottomThreshold,
    chatMessagesRef,
    hasManualScrollRef,
    isAutoScrolling,
    lastScrollHeightRef,
    messagesChangeTimeoutRef,
    scrollCheckDelay,
    scrollToBottom,
}: UseChatMessagesChangeHandlerProps): (isStreaming?: boolean) => void {
    return useCallback(
        (isStreaming: boolean = false) => {
            const chatMessagesElement = chatMessagesRef.current;
            if (!chatMessagesElement) {
                return;
            }

            const autoScrollDecision = evaluateMessagesChangeAutoScroll({
                bottomThreshold,
                chatMessagesElement,
                hasManualScroll: hasManualScrollRef.current,
                isAutoScrolling,
                previousScrollHeight: lastScrollHeightRef.current,
            });
            lastScrollHeightRef.current = autoScrollDecision.currentScrollHeight;

            if (!autoScrollDecision.shouldScheduleScroll) {
                return;
            }

            scheduleMessagesChangeAutoScroll({
                hasManualScrollRef,
                isStreaming,
                messagesChangeTimeoutRef,
                scrollCheckDelay,
                scrollToBottom,
            });
        },
        [
            bottomThreshold,
            chatMessagesRef,
            hasManualScrollRef,
            isAutoScrolling,
            lastScrollHeightRef,
            messagesChangeTimeoutRef,
            scrollCheckDelay,
            scrollToBottom,
        ],
    );
}

/**
 * Creates the ref callback that captures the chat container and initializes its scroll state.
 *
 * @private function of `useChatAutoScroll`
 */
function useChatMessagesRefCallback({
    chatMessagesRef,
    isAutoScrolling,
    lastScrollHeightRef,
    scrollToBottom,
}: UseChatMessagesRefCallbackProps): (element: HTMLDivElement | null) => void {
    return useCallback(
        (element: HTMLDivElement | null) => {
            chatMessagesRef.current = element;
            if (!element) {
                return;
            }

            initializeChatMessagesElement({
                element,
                isAutoScrolling,
                lastScrollHeightRef,
                scrollToBottom,
            });
        },
        [chatMessagesRef, isAutoScrolling, lastScrollHeightRef, scrollToBottom],
    );
}

/**
 * Hook for managing auto-scroll behavior in chat components
 *
 * This hook provides:
 * - Automatic scrolling to bottom when new messages arrive (if user is already at bottom)
 * - Detection of when user scrolls away from bottom
 * - Scroll-to-bottom functionality with smooth animation
 * - Mobile-optimized scrolling behavior
 *
 * @public exported from `@promptbook/components`
 */
export function useChatAutoScroll(config: ChatAutoScrollConfig = {}) {
    const { bottomThreshold = 100, smoothScroll = true, scrollCheckDelay = 100 } = config;

    const isMobile = useMobileChatViewport();
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);
    const chatMessagesRef = useRef<HTMLDivElement | null>(null);
    const scrollTimeoutRef = useRef<TimeoutHandle | null>(null);
    const lastScrollHeightRef = useRef(0);
    const hasManualScrollRef = useRef(false);
    const messagesChangeTimeoutRef = useRef<TimeoutHandle | null>(null);

    const checkIfAtBottom = useCallback(
        (element: HTMLDivElement): boolean => isChatScrolledToBottom(element, bottomThreshold),
        [bottomThreshold],
    );

    const scrollToBottom = useCallback(
        (behavior: ScrollToBottomBehavior = 'smooth') => {
            const chatMessagesElement = chatMessagesRef.current;
            if (!chatMessagesElement) {
                return;
            }

            performScrollToBottom({
                behavior,
                chatMessagesElement,
                isMobile,
                smoothScroll,
            });
            hasManualScrollRef.current = false;
        },
        [isMobile, smoothScroll],
    );

    const handleScroll = useChatScrollHandler({
        checkIfAtBottom,
        hasManualScrollRef,
        isAutoScrolling,
        scrollTimeoutRef,
        setIsAutoScrolling,
    });
    const handleMessagesChange = useChatMessagesChangeHandler({
        bottomThreshold,
        chatMessagesRef,
        hasManualScrollRef,
        isAutoScrolling,
        lastScrollHeightRef,
        messagesChangeTimeoutRef,
        scrollCheckDelay,
        scrollToBottom,
    });
    const chatMessagesRefCallback = useChatMessagesRefCallback({
        chatMessagesRef,
        isAutoScrolling,
        lastScrollHeightRef,
        scrollToBottom,
    });

    const activateAutoScroll = useCallback(() => {
        setIsAutoScrolling(true);
        scrollToBottom('smooth');
    }, [scrollToBottom]);

    const disableAutoScroll = useCallback(() => {
        setIsAutoScrolling(false);
    }, []);

    useEffect(() => {
        return () => {
            clearScheduledTimeout(scrollTimeoutRef);
            clearScheduledTimeout(messagesChangeTimeoutRef);
        };
    }, []);

    return {
        isAutoScrolling,
        chatMessagesRef: chatMessagesRefCallback,
        handleScroll,
        handleMessagesChange,
        scrollToBottom: activateAutoScroll,
        enableAutoScroll: activateAutoScroll,
        disableAutoScroll,
        isMobile,
    };
}
