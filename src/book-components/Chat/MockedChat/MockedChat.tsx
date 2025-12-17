'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { forTime } from 'waitasecond';
import chatStyles from '../../Chat/Chat/Chat.module.css';
import { PauseIcon } from '../../icons/PauseIcon';
import { PlayIcon } from '../../icons/PlayIcon';
import { Chat } from '../Chat/Chat';
import type { ChatProps } from '../Chat/ChatProps';
import type { ChatMessage } from '../types/ChatMessage';
import { MOCKED_CHAT_DELAY_CONFIGS } from './constants';

/**
 * Delay configuration for the MockedChat component
 *
 * @public exported from `@promptbook/components`
 */
export type MockedChatDelayConfig = {
    /**
     * Delay before showing the first message (ms)
     * @default 1000
     */
    beforeFirstMessage?: number | [number, number];

    /**
     * Emulated thinking time between messages (ms)
     * Can be a fixed number or [min, max] for random range.
     * @default 2000
     */
    thinkingBetweenMessages?: number | [number, number];

    /**
     * Wait time after each written word (ms)
     * Can be a fixed number or [min, max] for random range.
     * @default 100
     */
    waitAfterWord?: number | [number, number];

    /**
     * Extra delay on top of the word waiting (ms)
     * Can be a fixed number or [min, max] for random range.
     * @default 50
     */
    extraWordDelay?: number | [number, number];

    /**
     * Chance (0-1) that a longer pause occurs before a message (e.g. agent switch)
     * @default 0.2
     */
    longPauseChance?: number;

    /**
     * Range for long pause duration (ms), [min, max]
     * @default [1200, 3500]
     */
    longPauseDuration?: [number, number];

    /**
     * If true, disables typing effect and shows full message at once (BLOCKY_FLOW)
     */
    blocky?: boolean;

    /**
     * This prop will allow to show N first messages immediately, while the rest will be typed out with delays
     * @default 0
     */
    showIntermediateMessages?: number;
};

/**
 * Props for MockedChat component
 *
 * @public exported from `@promptbook/components`
 */
export type MockedChatProps = Omit<
    ChatProps,
    'onReset' | /*'onMessage' | */ 'onUseTemplate' | 'isVoiceRecognitionButtonShown'
> & {
    /**
     * Whether the chat can be reset via the "New chat" button.
     *
     * When true (default), the reset button is shown and clicking it restarts the simulated flow.
     * When false, the reset button is hidden (read-only simulation without manual restart).
     *
     * @default true
     */
    isResettable?: boolean;

    /**
     * Optional delays configuration for emulating typing behavior
     */
    delayConfig?: MockedChatDelayConfig;

    /**
     * When true, shows Pause/Resume control and allows pausing the simulated flow.
     * Pausing finishes the currently typing message first (transitions via PAUSING state),
     * then prevents new messages from starting until resumed.
     *
     * @default true
     */
    isPausable?: boolean;
};

/**
 * MockedChat component that shows the same chat as Chat but emulates ongoing discussion
 * with realistic typing delays and thinking pauses.
 *
 * @public exported from `@promptbook/components`
 */
export function MockedChat(props: MockedChatProps) {
    const {
        delayConfig,
        messages: originalMessages,
        isResettable = true,
        isPausable = true,
        isSaveButtonEnabled = true,
        ...chatProps
    } = props;

    // Helper to get random delay from config
    function getDelay(val: number | [number, number] | undefined, fallback: number): number {
        if (Array.isArray(val) && val.length === 2) {
            const [min, max] = val;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        if (typeof val === 'number') return val;
        return fallback;
    }

    const delays = {
        ...MOCKED_CHAT_DELAY_CONFIGS.NORMAL_FLOW,
        ...delayConfig,
    };

    const [displayedMessages, setDisplayedMessages] = useState<ReadonlyArray<ChatMessage>>([]);
    const [isSimulationComplete, setIsSimulationComplete] = useState(false);

    // Playback state machine
    // RUNNING -> (user clicks Pause) -> PAUSING (finish current message) -> PAUSED
    // PAUSED -> (user clicks Resume) -> RUNNING
    const [playbackState, setPlaybackState] = useState<'RUNNING' | 'PAUSING' | 'PAUSED'>('RUNNING');
    const pauseRequestedRef = useRef(false);

    const [resetNonce, setResetNonce] = useState(0);
    const onReset = useMemo(() => {
        if (!isResettable) {
            return undefined;
        }

        return () => {
            setDisplayedMessages([]);
            setIsSimulationComplete(false);
            setResetNonce((nonce) => nonce + 1);
        };
    }, [resetNonce, isResettable]);

    // Helper: Wait while paused (entered only between messages, never mid-typing)
    const waitIfPaused = async (isCancelledRef: () => boolean) => {
        if (!pauseRequestedRef.current) return;
        setPlaybackState('PAUSED');
        // Busy wait with small sleeps until resume
        while (pauseRequestedRef.current) {
            if (isCancelledRef()) return;
            await forTime(100);
        }
        // Resumed
        setPlaybackState('RUNNING');
    };

    const requestPause = () => {
        if (playbackState === 'RUNNING') {
            pauseRequestedRef.current = true;
            // Will flip to PAUSING when current message completes
            setPlaybackState('PAUSING');
        }
    };

    const resume = () => {
        pauseRequestedRef.current = false;
        if (playbackState !== 'RUNNING') {
            // Actual state will become RUNNING after loop exits waitIfPaused
            setPlaybackState('RUNNING');
        }
    };

    useEffect(() => {
        let isCancelled = false;

        const simulateChat = async () => {
            // Reset state
            setDisplayedMessages([]);
            setIsSimulationComplete(false);

            if (originalMessages.length === 0) {
                setIsSimulationComplete(true);
                return;
            }

            // Show intermediate messages immediately
            const showIntermediateMessages = delays.showIntermediateMessages || 0;
            if (showIntermediateMessages > 0) {
                setDisplayedMessages(originalMessages.slice(0, showIntermediateMessages));
            }

            // Wait before first message (randomized)
            await forTime(getDelay(delays.beforeFirstMessage, 1000));
            if (isCancelled) return;

            for (let i = showIntermediateMessages; i < originalMessages.length; i++) {
                // If a pause was requested earlier, we only pause between messages
                if (pauseRequestedRef.current) {
                    await waitIfPaused(() => isCancelled);
                    if (isCancelled) return;
                }
                if (isCancelled) return;

                const currentMessage = originalMessages[i];
                if (!currentMessage) continue;

                // Add thinking delay between messages (except for the first one)
                if (i > 0) {
                    // Sometimes do a longer pause (agent switch or random)
                    let didLongPause = false;
                    if (
                        delays.longPauseChance &&
                        Math.random() < delays.longPauseChance &&
                        i > 0 &&
                        originalMessages[i]!.sender !== originalMessages[i - 1]!.sender
                    ) {
                        await forTime(getDelay(delays.longPauseDuration, 2000));
                        didLongPause = true;
                        if (isCancelled) return;
                    }
                    // Otherwise normal thinking delay
                    if (!didLongPause) {
                        await forTime(getDelay(delays.thinkingBetweenMessages, 2000));
                        if (isCancelled) return;
                    }
                    // Pause check (still between messages)
                    if (pauseRequestedRef.current) {
                        await waitIfPaused(() => isCancelled);
                        if (isCancelled) return;
                    }
                }

                // Show incomplete message first (for typing effect)
                const incompleteMessage: ChatMessage = {
                    channel: 'PROMPTBOOK_CHAT',
                    id: currentMessage.id,
                    createdAt: currentMessage.createdAt,
                    sender: currentMessage.sender,
                    content: '',
                    isComplete: false,
                    expectedAnswer: currentMessage.expectedAnswer,
                    isVoiceCall: currentMessage.isVoiceCall,
                };

                setDisplayedMessages((prev) => [...prev, incompleteMessage]);

                // Split message content into words
                const words = currentMessage.content.split(' ');
                let currentContent = '';

                // Type each word with delay (randomized)
                for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
                    if (isCancelled) return;

                    const word = words[wordIndex];
                    currentContent += (wordIndex > 0 ? ' ' : '') + word;

                    // Update the message with current content
                    const updatingMessage: ChatMessage = {
                        channel: 'PROMPTBOOK_CHAT',
                        id: currentMessage.id,
                        createdAt: currentMessage.createdAt,
                        sender: currentMessage.sender,
                        content: currentContent,
                        isComplete: false,
                        expectedAnswer: currentMessage.expectedAnswer,
                        isVoiceCall: currentMessage.isVoiceCall,
                    };

                    setDisplayedMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = updatingMessage;
                        return newMessages;
                    });

                    // Wait after word with extra delay (randomized)
                    await forTime(getDelay(delays.waitAfterWord, 100) + getDelay(delays.extraWordDelay, 50));
                    if (isCancelled) return;
                }

                // Mark message as complete
                const completeMessage: ChatMessage = {
                    channel: 'PROMPTBOOK_CHAT',
                    id: currentMessage.id,
                    createdAt: currentMessage.createdAt,
                    sender: currentMessage.sender,
                    content: currentMessage.content,
                    isComplete: true,
                    expectedAnswer: currentMessage.expectedAnswer,
                    isVoiceCall: currentMessage.isVoiceCall,
                };

                setDisplayedMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = completeMessage;
                    return newMessages;
                });

                // Small pause after completing the message
                await forTime(200);
                if (isCancelled) return;

                // Transition PAUSING -> PAUSED (after finishing current message)
                if (pauseRequestedRef.current && playbackState === 'PAUSING') {
                    // Will block further messages
                }
            }

            setIsSimulationComplete(true);
        };

        simulateChat().catch((error) => {
            if (!isCancelled) {
                console.error('Error in MockedChat simulation:', error);
                // Fallback to showing all messages immediately
                setDisplayedMessages(originalMessages);
                setIsSimulationComplete(true);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [
        originalMessages,
        delays.beforeFirstMessage,
        delays.thinkingBetweenMessages,
        delays.waitAfterWord,
        delays.extraWordDelay,
        resetNonce,
    ]);

    // Build extra actions (Pause / Resume)
    const showPauseButton = isPausable && !isSimulationComplete;
    const extraActions = showPauseButton ? (
        <button
            className={`${chatStyles.chatButton} ${chatStyles.pauseButton} ${
                playbackState === 'PAUSING' ? chatStyles.pausing : playbackState === 'PAUSED' ? chatStyles.paused : ''
            }`}
            aria-label={
                playbackState === 'RUNNING'
                    ? 'Pause simulation'
                    : playbackState === 'PAUSING'
                    ? 'Pausing simulation'
                    : 'Resume simulation'
            }
            onClick={() => {
                if (playbackState === 'RUNNING') {
                    requestPause();
                } else if (playbackState === 'PAUSED') {
                    resume();
                }
            }}
            disabled={playbackState === 'PAUSING'}
        >
            {playbackState === 'RUNNING' && (
                <>
                    <PauseIcon size={16} />
                    <span className={chatStyles.chatButtonText}>Pause</span>
                </>
            )}
            {playbackState === 'PAUSING' && (
                <>
                    <PauseIcon size={16} />
                    <span className={chatStyles.chatButtonText}>Pausing…</span>
                </>
            )}
            {playbackState === 'PAUSED' && (
                <>
                    <PlayIcon size={16} />
                    <span className={chatStyles.chatButtonText}>Resume</span>
                </>
            )}
        </button>
    ) : undefined;

    // Use the internal Chat component with simulated messages
    return (
        <Chat
            {...chatProps}
            onReset={isResettable ? onReset : undefined}
            messages={displayedMessages}
            extraActions={extraActions}
            isSaveButtonEnabled={isSaveButtonEnabled}
            saveFormats={['json', 'md', 'txt', 'html']}
            // Disable input during simulation unless explicitly completed
            onMessage={isSimulationComplete && chatProps.onMessage ? chatProps.onMessage : undefined}
        />
    );
}
