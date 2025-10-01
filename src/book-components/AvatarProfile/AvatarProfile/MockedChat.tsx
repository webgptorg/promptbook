'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { forTime } from 'waitasecond';
import { Chat } from '../../Chat/Chat/Chat';
import chatStyles from '../../Chat/Chat/Chat.module.css';
import type { ChatProps } from '../../Chat/Chat/ChatProps';
import type { ChatMessage } from '../../Chat/types/ChatMessage';

/**
 * Delay configuration for the MockedChat component
 *
 * @public exported from `@promptbook/components`
 */
export type MockedChatDelayConfig = {
    /**
     * Delay before showing the first message (in milliseconds)
     * @default 1000
     */
    beforeFirstMessage?: number;

    /**
     * Emulated thinking time between messages (in milliseconds)
     * @default 2000
     */
    thinkingBetweenMessages?: number;

    /**
     * Wait time after each written word (in milliseconds)
     * @default 100
     */
    waitAfterWord?: number;

    /**
     * Extra delay on top of the word waiting (in milliseconds)
     * @default 50
     */
    extraWordDelay?: number;
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
     * Whether to show the reset button
     *
     * @default false
     */
    isResetShown?: boolean;

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
        isResetShown = false,
        delayConfig,
        messages: originalMessages,
        isPausable = true,
        ...chatProps
    } = props;

    // Default delay configuration
    const delays: Required<MockedChatDelayConfig> = {
        beforeFirstMessage: delayConfig?.beforeFirstMessage ?? 1000,
        thinkingBetweenMessages: delayConfig?.thinkingBetweenMessages ?? 2000,
        waitAfterWord: delayConfig?.waitAfterWord ?? 100,
        extraWordDelay: delayConfig?.extraWordDelay ?? 50,
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
        if (!isResetShown) {
            return undefined;
        }

        return () => {
            setDisplayedMessages([]);
            setIsSimulationComplete(false);
            setResetNonce((nonce) => nonce + 1);
        };
    }, [resetNonce, isResetShown]);

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

            // Wait before first message
            await forTime(delays.beforeFirstMessage);
            if (isCancelled) return;

            for (let i = 0; i < originalMessages.length; i++) {

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
                    await forTime(delays.thinkingBetweenMessages);
                    if (isCancelled) return;
                    // Pause check (still between messages)
                    if (pauseRequestedRef.current) {
                        await waitIfPaused(() => isCancelled);
                        if (isCancelled) return;
                    }
                }

                // Show incomplete message first (for typing effect)
                const incompleteMessage: ChatMessage = {
                    id: currentMessage.id,
                    date: currentMessage.date,
                    from: currentMessage.from,
                    content: '',
                    isComplete: false,
                    expectedAnswer: currentMessage.expectedAnswer,
                    isVoiceCall: currentMessage.isVoiceCall,
                };

                setDisplayedMessages((prev) => [...prev, incompleteMessage]);

                // Split message content into words
                const words = currentMessage.content.split(' ');
                let currentContent = '';

                // Type each word with delay
                for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
                    if (isCancelled) return;

                    const word = words[wordIndex];
                    currentContent += (wordIndex > 0 ? ' ' : '') + word;

                    // Update the message with current content
                    const updatingMessage: ChatMessage = {
                        id: currentMessage.id,
                        date: currentMessage.date,
                        from: currentMessage.from,
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

                    // Wait after word with extra delay
                    await forTime(delays.waitAfterWord + delays.extraWordDelay);
                    if (isCancelled) return;
                }

                // Mark message as complete
                const completeMessage: ChatMessage = {
                    id: currentMessage.id,
                    date: currentMessage.date,
                    from: currentMessage.from,
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
    const extraActions =
        isPausable ? (
            <button
                className={chatStyles.resetButton}
                onClick={() => {
                    if (playbackState === 'RUNNING') {
                        requestPause();
                    } else if (playbackState === 'PAUSED') {
                        resume();
                    }
                }}
                disabled={playbackState === 'PAUSING'}
            >
                <span className={chatStyles.resetButtonText}>
                    {playbackState === 'RUNNING' && 'Pause'}
                    {playbackState === 'PAUSING' && 'Pausing…'}
                    {playbackState === 'PAUSED' && 'Resume'}
                </span>
            </button>
        ) : undefined;

    // Use the internal Chat component with simulated messages
    return (
        <Chat
            {...chatProps}
            onReset={onReset}
            messages={displayedMessages}
            extraActions={extraActions}
            // Disable input during simulation unless explicitly completed
            onMessage={isSimulationComplete ? chatProps.onMessage : undefined}
        />
    );
}
