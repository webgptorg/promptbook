/** @jest-environment jsdom */
import { describe, expect, it, jest } from '@jest/globals';
import { act, useEffect, type UIEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { type ChatAutoScrollConfig, useChatAutoScroll } from './useChatAutoScroll';

/**
 * React test flag required by concurrent `act(...)` checks.
 */
const REACT_ACT_ENVIRONMENT = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
REACT_ACT_ENVIRONMENT.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Height of the chat viewport used by scroll tests.
 */
const TEST_CLIENT_HEIGHT = 200;

/**
 * Debounce window used by `useChatAutoScroll` when syncing scroll state.
 */
const SCROLL_DEBOUNCE_TEST_WAIT_MS = 60;

/**
 * Hook snapshot shape captured from the harness component.
 */
type AutoScrollHookSnapshot = ReturnType<typeof useChatAutoScroll>;

/**
 * Props for the hook harness component.
 */
type HookHarnessProps = {
    config: ChatAutoScrollConfig;
    onSnapshot: (snapshot: AutoScrollHookSnapshot) => void;
};

/**
 * Mounts `useChatAutoScroll` so tests can drive it through a real DOM element.
 *
 * @private unit-test harness
 */
function HookHarness({ config, onSnapshot }: HookHarnessProps) {
    const autoScroll = useChatAutoScroll(config);

    useEffect(() => {
        onSnapshot(autoScroll);
    }, [autoScroll, onSnapshot]);

    return <div data-testid="chat-messages" ref={autoScroll.chatMessagesRef} />;
}

/**
 * Defines mutable `scrollHeight` and fixed `clientHeight` on a jsdom element.
 *
 * @private unit-test helper
 */
function defineScrollableMetrics(
    element: HTMLDivElement,
    initialScrollHeight: number,
): { setScrollHeight: (value: number) => void } {
    let scrollHeight = initialScrollHeight;

    Object.defineProperty(element, 'clientHeight', {
        configurable: true,
        get: () => TEST_CLIENT_HEIGHT,
    });

    Object.defineProperty(element, 'scrollHeight', {
        configurable: true,
        get: () => scrollHeight,
    });

    return {
        setScrollHeight(value: number) {
            scrollHeight = value;
        },
    };
}

/**
 * Creates a typed scroll event object for the hook's `handleScroll` callback.
 *
 * @private unit-test helper
 */
function createScrollEvent(element: HTMLDivElement): UIEvent<HTMLDivElement> {
    return { target: element, currentTarget: element } as unknown as UIEvent<HTMLDivElement>;
}

describe('useChatAutoScroll', () => {
    it('keeps user position when new content appears after manual scroll up', () => {
        jest.useFakeTimers();

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        let latestSnapshot: AutoScrollHookSnapshot | null = null;

        act(() => {
            root.render(
                <HookHarness
                    config={{ smoothScroll: false, scrollCheckDelay: 0 }}
                    onSnapshot={(snapshot) => {
                        latestSnapshot = snapshot;
                    }}
                />,
            );
        });

        const chatMessagesElement = container.querySelector('[data-testid="chat-messages"]') as HTMLDivElement;
        expect(chatMessagesElement).toBeTruthy();
        const metrics = defineScrollableMetrics(chatMessagesElement, 1000);

        act(() => {
            latestSnapshot!.chatMessagesRef(chatMessagesElement);
        });

        act(() => {
            chatMessagesElement.scrollTop = 800;
            latestSnapshot!.handleScroll(createScrollEvent(chatMessagesElement));
            jest.advanceTimersByTime(SCROLL_DEBOUNCE_TEST_WAIT_MS);
        });

        act(() => {
            chatMessagesElement.scrollTop = 420;
            latestSnapshot!.handleScroll(createScrollEvent(chatMessagesElement));
            jest.advanceTimersByTime(SCROLL_DEBOUNCE_TEST_WAIT_MS);
        });

        expect(latestSnapshot!.isAutoScrolling).toBe(false);

        act(() => {
            metrics.setScrollHeight(1200);
            latestSnapshot!.handleMessagesChange();
            jest.runOnlyPendingTimers();
        });

        expect(chatMessagesElement.scrollTop).toBe(420);

        act(() => {
            root.unmount();
        });
        jest.useRealTimers();
    });

    it('scrolls to bottom when new content appears and user was already at bottom', () => {
        jest.useFakeTimers();

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        let latestSnapshot: AutoScrollHookSnapshot | null = null;

        act(() => {
            root.render(
                <HookHarness
                    config={{ smoothScroll: false, scrollCheckDelay: 0 }}
                    onSnapshot={(snapshot) => {
                        latestSnapshot = snapshot;
                    }}
                />,
            );
        });

        const chatMessagesElement = container.querySelector('[data-testid="chat-messages"]') as HTMLDivElement;
        expect(chatMessagesElement).toBeTruthy();
        const metrics = defineScrollableMetrics(chatMessagesElement, 1000);

        act(() => {
            latestSnapshot!.chatMessagesRef(chatMessagesElement);
            chatMessagesElement.scrollTop = 800;
            latestSnapshot!.handleScroll(createScrollEvent(chatMessagesElement));
            jest.advanceTimersByTime(SCROLL_DEBOUNCE_TEST_WAIT_MS);
        });

        expect(latestSnapshot!.isAutoScrolling).toBe(true);

        act(() => {
            metrics.setScrollHeight(1200);
            latestSnapshot!.handleMessagesChange();
            jest.runOnlyPendingTimers();
        });

        expect(chatMessagesElement.scrollTop).toBe(1200);

        act(() => {
            root.unmount();
        });
        jest.useRealTimers();
    });
});
