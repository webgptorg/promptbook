import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Configuration for the auto-scroll behavior
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
 */
const SCROLL_EVENT_DEBOUNCE_MS = 50;

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

    const [isAutoScrolling, setIsAutoScrolling] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const chatMessagesRef = useRef<HTMLDivElement | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastScrollHeightRef = useRef<number>(0);
    // Tracks whether the user moved away from the bottom so we can suspend auto-scroll.
    const hasManualScrollRef = useRef(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice =
                window.innerWidth <= 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check if user is at the bottom of the chat
    const checkIfAtBottom = useCallback(
        (element: HTMLDivElement): boolean => {
            const { scrollTop, scrollHeight, clientHeight } = element;
            return scrollTop + clientHeight >= scrollHeight - bottomThreshold;
        },
        [bottomThreshold],
    );

    // Scroll to bottom function
    const scrollToBottom = useCallback(
        (behavior: 'smooth' | 'auto' = 'smooth') => {
            const chatMessagesElement = chatMessagesRef.current;
            if (!chatMessagesElement) return;

            if (isMobile) {
                // Mobile-optimized scrolling
                chatMessagesElement.scrollTo({
                    top: chatMessagesElement.scrollHeight,
                    behavior: smoothScroll ? behavior : 'auto',
                });
            } else {
                // Desktop scrolling
                if (smoothScroll && behavior === 'smooth') {
                    chatMessagesElement.style.scrollBehavior = 'smooth';
                    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
                    chatMessagesElement.style.scrollBehavior = 'auto';
                } else {
                    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
                }
            }
            hasManualScrollRef.current = false;
        },
        [isMobile, smoothScroll],
    );

    // Handle scroll events
    const handleScroll = useCallback(
        (event: React.UIEvent<HTMLDivElement>) => {
            const element = event.target as HTMLDivElement;
            if (!element) return;

            const atBottom = checkIfAtBottom(element);
            hasManualScrollRef.current = !atBottom;
            // User scroll should take precedence over app-driven scroll intent.
            if (!atBottom && isAutoScrolling) {
                setIsAutoScrolling(false);
            }

            // Clear any pending scroll timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Debounce scroll position check to avoid too frequent updates
            scrollTimeoutRef.current = setTimeout(() => {
                const isAtBottom = checkIfAtBottom(element);
                setIsAutoScrolling((currentState) => (currentState === isAtBottom ? currentState : isAtBottom));
            }, SCROLL_EVENT_DEBOUNCE_MS);
        },
        [checkIfAtBottom, isAutoScrolling],
    );

    const messagesChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll when messages change (if user is at bottom)
    const handleMessagesChange = useCallback((isStreaming: boolean = false) => {
        const chatMessagesElement = chatMessagesRef.current;
        if (!chatMessagesElement) return;

        // Check if this is a new message (scroll height increased)
        const previousScrollHeight = lastScrollHeightRef.current;
        const currentScrollHeight = chatMessagesElement.scrollHeight;
        const hasNewContent = currentScrollHeight > previousScrollHeight;
        const wasAtBottomBeforeNewContent =
            chatMessagesElement.scrollTop + chatMessagesElement.clientHeight >= previousScrollHeight - bottomThreshold;
        lastScrollHeightRef.current = currentScrollHeight;

        if (!hasNewContent) return;

        // Only auto-scroll if user does NOT have a selection inside chat container
        const selection = window.getSelection();
        let hasSelectionInChat = false;
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (
                chatMessagesElement.contains(range.startContainer) ||
                chatMessagesElement.contains(range.endContainer)
            ) {
                if (!selection.isCollapsed) {
                    hasSelectionInChat = true;
                }
            }
        }

        if (isAutoScrolling && wasAtBottomBeforeNewContent && !hasSelectionInChat && !hasManualScrollRef.current) {
            if (messagesChangeTimeoutRef.current) {
                clearTimeout(messagesChangeTimeoutRef.current);
            }

            // Delay scroll slightly to ensure DOM has updated
            messagesChangeTimeoutRef.current = setTimeout(() => {
                if (hasManualScrollRef.current) {
                    return;
                }

                scrollToBottom(isStreaming ? 'auto' : 'smooth');
            }, isStreaming ? 10 : scrollCheckDelay);
        }
    }, [bottomThreshold, isAutoScrolling, scrollToBottom, scrollCheckDelay]);

    // Ref callback for chat messages container
    const chatMessagesRefCallback = useCallback(
        (element: HTMLDivElement | null) => {
            chatMessagesRef.current = element;

            if (element) {
                // Update last scroll height
                lastScrollHeightRef.current = element.scrollHeight;

                // If auto-scrolling is enabled, scroll to bottom
                if (isAutoScrolling) {
                    // Use requestAnimationFrame for smoother initial scroll
                    requestAnimationFrame(() => {
                        scrollToBottom('auto');
                    });
                }
            }
        },
        [isAutoScrolling, scrollToBottom],
    );

    // Manual scroll to bottom (for button click)
    const handleScrollToBottomClick = useCallback(() => {
        setIsAutoScrolling(true);
        scrollToBottom('smooth');
    }, [scrollToBottom]);

    // Force auto-scroll back on (useful for programmatic control)
    const enableAutoScroll = useCallback(() => {
        setIsAutoScrolling(true);
        scrollToBottom('smooth');
    }, [scrollToBottom]);

    // Disable auto-scroll (useful for programmatic control)
    const disableAutoScroll = useCallback(() => {
        setIsAutoScrolling(false);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (messagesChangeTimeoutRef.current) {
                clearTimeout(messagesChangeTimeoutRef.current);
            }
        };
    }, []);

    return {
        isAutoScrolling,
        chatMessagesRef: chatMessagesRefCallback,
        handleScroll,
        handleMessagesChange,
        scrollToBottom: handleScrollToBottomClick,
        enableAutoScroll,
        disableAutoScroll,
        isMobile,
    };
}
