/** @jest-environment jsdom */

import { act } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { createRoot } from 'react-dom/client';
import type { ChatSoundSystem } from '../Chat/ChatProps';
import type { ChatMessage } from '../types/ChatMessage';
import { useChatCompleteNotification } from './useChatCompleteNotification';

/**
 * Required by React's concurrent-mode act() assertion.
 */
const REACT_ACT_ENVIRONMENT = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean };
REACT_ACT_ENVIRONMENT.IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Creates a minimal mock sound system that records `play` calls.
 */
function createMockSoundSystem(): jest.Mocked<Pick<ChatSoundSystem, 'play'>> & ChatSoundSystem {
    return {
        play: jest.fn(async () => {}),
        isEnabled: jest.fn(() => true),
        setEnabled: jest.fn(),
        toggle: jest.fn(() => true),
    } as unknown as jest.Mocked<Pick<ChatSoundSystem, 'play'>> & ChatSoundSystem;
}

/**
 * Builds a minimal `ChatMessage` for use in tests.
 *
 * @param overrides - Fields to override in the base fixture
 */
function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'msg-1',
        sender: 'ASSISTANT' as const,
        content: 'Hello',
        isComplete: true,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/**
 * Minimal React component that mounts `useChatCompleteNotification` so effects
 * run inside a real React tree (needed for useEffect to fire in tests).
 *
 * @private test harness
 */
function HookHarness({
    messages,
    soundSystem,
}: {
    messages: ReadonlyArray<ChatMessage>;
    soundSystem: ChatSoundSystem | undefined;
}) {
    useChatCompleteNotification(messages, soundSystem);
    return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChatCompleteNotification', () => {
    it('does not play sound for a preloaded completed assistant message on initial mount', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(
                <HookHarness messages={[makeMessage({ id: 'msg-1', isComplete: true })]} soundSystem={soundSystem} />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        document.body.removeChild(container);
    });

    it('plays message_receive once when an assistant message transitions to complete', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        let root: ReturnType<typeof createRoot>;

        // Initial render: streaming (incomplete) message → no sound yet
        await act(async () => {
            root = createRoot(container);
            root.render(
                <HookHarness
                    messages={[makeMessage({ id: 'msg-1', isComplete: false, content: 'He...' })]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        // Transition to complete → sound fires exactly once
        await act(async () => {
            root.render(
                <HookHarness
                    messages={[makeMessage({ id: 'msg-1', isComplete: true, content: 'Hello' })]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).toHaveBeenCalledTimes(1);
        expect(soundSystem.play).toHaveBeenCalledWith('message_receive');

        document.body.removeChild(container);
    });

    it('never plays sound for streaming chunks / intermediate states', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        let root: ReturnType<typeof createRoot>;

        await act(async () => {
            root = createRoot(container);
            root.render(
                <HookHarness
                    messages={[makeMessage({ id: 'msg-1', isComplete: false, content: 'H' })]}
                    soundSystem={soundSystem}
                />,
            );
        });

        // Simulate several streaming chunk updates
        for (const chunk of ['He', 'Hel', 'Hell', 'Hello']) {
            // eslint-disable-next-line no-await-in-loop
            await act(async () => {
                root.render(
                    <HookHarness
                        messages={[makeMessage({ id: 'msg-1', isComplete: false, content: chunk })]}
                        soundSystem={soundSystem}
                    />,
                );
            });
        }

        expect(soundSystem.play).not.toHaveBeenCalled();

        document.body.removeChild(container);
    });

    it('does not re-notify on rerender when the message is already complete', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        const completedMessages: ReadonlyArray<ChatMessage> = [makeMessage({ id: 'msg-1', isComplete: true })];

        let root: ReturnType<typeof createRoot>;

        await act(async () => {
            root = createRoot(container);
            root.render(<HookHarness messages={completedMessages} soundSystem={soundSystem} />);
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        // Rerender with a new array reference but identical content
        await act(async () => {
            root.render(<HookHarness messages={[...completedMessages]} soundSystem={soundSystem} />);
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        document.body.removeChild(container);
    });

    it('does not play sound for user messages', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        await act(async () => {
            const root = createRoot(container);
            root.render(
                <HookHarness
                    messages={[makeMessage({ sender: 'USER' as const, isComplete: true })]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        document.body.removeChild(container);
    });

    it('fires once for a streamed response after existing completed history', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        let root: ReturnType<typeof createRoot>;

        // Existing history is already complete, so it establishes the baseline only.
        await act(async () => {
            root = createRoot(container);
            root.render(
                <HookHarness messages={[makeMessage({ id: 'msg-1', isComplete: true })]} soundSystem={soundSystem} />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        // User sends a new turn, then assistant starts streaming a reply.
        await act(async () => {
            root.render(
                <HookHarness
                    messages={[
                        makeMessage({ id: 'msg-1', isComplete: true }),
                        makeMessage({
                            id: 'msg-user-1',
                            sender: 'USER' as const,
                            isComplete: true,
                            content: 'Question',
                        }),
                        makeMessage({ id: 'msg-2', isComplete: false, content: 'Second...' }),
                    ]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        // Second message completes
        await act(async () => {
            root.render(
                <HookHarness
                    messages={[
                        makeMessage({ id: 'msg-1', isComplete: true }),
                        makeMessage({
                            id: 'msg-user-1',
                            sender: 'USER' as const,
                            isComplete: true,
                            content: 'Question',
                        }),
                        makeMessage({ id: 'msg-2', isComplete: true, content: 'Second complete' }),
                    ]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).toHaveBeenCalledTimes(1);

        document.body.removeChild(container);
    });

    it('plays when a completed assistant reply is appended after the same user turn', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        let root: ReturnType<typeof createRoot>;

        await act(async () => {
            root = createRoot(container);
            root.render(
                <HookHarness
                    messages={[
                        makeMessage({
                            id: 'msg-user-1',
                            sender: 'USER' as const,
                            isComplete: true,
                            content: 'Question',
                        }),
                    ]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        await act(async () => {
            root.render(
                <HookHarness
                    messages={[
                        makeMessage({
                            id: 'msg-user-1',
                            sender: 'USER' as const,
                            isComplete: true,
                            content: 'Question',
                        }),
                        makeMessage({ id: 'msg-2', isComplete: true, content: 'Answer' }),
                    ]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).toHaveBeenCalledTimes(1);
        expect(soundSystem.play).toHaveBeenCalledWith('message_receive');

        document.body.removeChild(container);
    });

    it('does not play when switching to unrelated preloaded completed history', async () => {
        const soundSystem = createMockSoundSystem();
        const container = document.createElement('div');
        document.body.appendChild(container);

        let root: ReturnType<typeof createRoot>;

        await act(async () => {
            root = createRoot(container);
            root.render(
                <HookHarness
                    messages={[
                        makeMessage({ id: 'msg-user-1', sender: 'USER' as const, isComplete: true, content: 'Draft' }),
                    ]}
                    soundSystem={soundSystem}
                />,
            );
        });

        await act(async () => {
            root.render(
                <HookHarness
                    messages={[makeMessage({ id: 'other-chat-msg-1', isComplete: true, content: 'Earlier answer' })]}
                    soundSystem={soundSystem}
                />,
            );
        });

        expect(soundSystem.play).not.toHaveBeenCalled();

        document.body.removeChild(container);
    });
});
