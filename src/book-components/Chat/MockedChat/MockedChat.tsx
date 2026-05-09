'use client';
import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
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
    'onReset' | 'newChatButtonHref' | /*'onMessage' | */ 'onUseTemplate' | 'isVoiceRecognitionButtonShown'
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

    /**
     * Optional absolute offsets (in milliseconds) for each message.
     *
     * When provided, playback waits according to these deterministic offsets
     * instead of random delay heuristics.
     */
    readonly messageOffsetsMs?: ReadonlyArray<number>;

    /**
     * When true, messages typed in the input are appended only in local UI state.
     *
     * This is useful for demo/recording flows where user interaction should not
     * mutate the persisted mocked-chat preset.
     *
     * @default false
     */
    readonly appendMessagesLocallyOnSend?: boolean;

    /**
     * Optional callback invoked whenever one full simulation run completes.
     */
    onSimulationComplete?(): void;
};

/**
 * Playback state used by the MockedChat simulation loop.
 *
 * @private function of `MockedChat`
 */
type MockedChatPlaybackState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * Shared setter type used when mutating the rendered mocked-chat transcript.
 *
 * @private function of `MockedChat`
 */
type SetDisplayedMessages = Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;

/**
 * Props for the simulation runner used by `MockedChat`.
 *
 * @private function of `MockedChat`
 */
type SimulateMockedChatPlaybackProps = {
    readonly delays: MockedChatDelayConfig;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
    readonly pauseRequestedRef: MutableRefObject<boolean>;
    readonly waitIfPaused: (isCancelledRef: () => boolean) => Promise<void>;
    readonly setDisplayedMessages: SetDisplayedMessages;
    readonly setLocalAppendedMessages: Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;
    readonly setIsSimulationComplete: Dispatch<SetStateAction<boolean>>;
    readonly onSimulationCompleteRef: MutableRefObject<MockedChatProps['onSimulationComplete']>;
    readonly isCancelledRef: () => boolean;
};

/**
 * Resolves one delay value, including random ranges.
 *
 * @private function of `MockedChat`
 */
function getDelay(val: number | [number, number] | undefined, fallback: number): number {
    if (Array.isArray(val) && val.length === 2) {
        const [min, max] = val;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    if (typeof val === 'number') {
        return val;
    }

    return fallback;
}

/**
 * Normalizes message offsets into a monotonic deterministic timeline.
 *
 * @private function of `MockedChat`
 */
function normalizeMessageOffsets(
    messageOffsetsMs: ReadonlyArray<number> | undefined,
    originalMessages: ReadonlyArray<ChatMessage>,
): ReadonlyArray<number> | null {
    if (!messageOffsetsMs || messageOffsetsMs.length === 0) {
        return null;
    }

    let previousOffset = 0;
    return originalMessages.map((_message, messageIndex) => {
        const rawOffset = messageOffsetsMs[messageIndex];
        const nextOffset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset || 0)) : previousOffset;
        previousOffset = Math.max(previousOffset, nextOffset);
        return previousOffset;
    });
}

/**
 * Resolves the deterministic wait before one message when fixed offsets are supplied.
 *
 * @private function of `MockedChat`
 */
function resolveOffsetDelayBeforeMessage(
    normalizedMessageOffsetsMs: ReadonlyArray<number> | null,
    messageIndex: number,
): number {
    if (!normalizedMessageOffsetsMs) {
        return 0;
    }

    const currentOffset = normalizedMessageOffsetsMs[messageIndex] || 0;
    const previousOffset = messageIndex > 0 ? normalizedMessageOffsetsMs[messageIndex - 1] || 0 : 0;
    return Math.max(0, currentOffset - previousOffset);
}

/**
 * Creates the message shape rendered while the mocked transcript is being simulated.
 *
 * @private function of `MockedChat`
 */
function createDisplayedMockedChatMessage(
    originalMessage: ChatMessage,
    content: ChatMessage['content'],
    isComplete: boolean,
): ChatMessage {
    return {
        id: originalMessage.id,
        createdAt: originalMessage.createdAt,
        sender: originalMessage.sender,
        content,
        isComplete,
        expectedAnswer: originalMessage.expectedAnswer,
        isVoiceCall: originalMessage.isVoiceCall,
    };
}

/**
 * Appends one new rendered message to the mocked transcript.
 *
 * @private function of `MockedChat`
 */
function appendDisplayedMessage(setDisplayedMessages: SetDisplayedMessages, nextMessage: ChatMessage): void {
    setDisplayedMessages((previousMessages) => [...previousMessages, nextMessage]);
}

/**
 * Replaces the most recently rendered message in the mocked transcript.
 *
 * @private function of `MockedChat`
 */
function replaceLastDisplayedMessage(setDisplayedMessages: SetDisplayedMessages, nextMessage: ChatMessage): void {
    setDisplayedMessages((previousMessages) => {
        const nextMessages = [...previousMessages];
        nextMessages[nextMessages.length - 1] = nextMessage;
        return nextMessages;
    });
}

/**
 * Resets all simulation-owned UI state before one playback run starts.
 *
 * @private function of `MockedChat`
 */
function resetSimulationState(params: {
    readonly setDisplayedMessages: SetDisplayedMessages;
    readonly setLocalAppendedMessages: Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;
    readonly setIsSimulationComplete: Dispatch<SetStateAction<boolean>>;
}): void {
    const { setDisplayedMessages, setLocalAppendedMessages, setIsSimulationComplete } = params;
    setDisplayedMessages([]);
    setLocalAppendedMessages([]);
    setIsSimulationComplete(false);
}

/**
 * Finalizes the playback run and notifies the caller.
 *
 * @private function of `MockedChat`
 */
function completeSimulation(params: {
    readonly setIsSimulationComplete: Dispatch<SetStateAction<boolean>>;
    readonly onSimulationCompleteRef: MutableRefObject<MockedChatProps['onSimulationComplete']>;
}): void {
    const { setIsSimulationComplete, onSimulationCompleteRef } = params;
    setIsSimulationComplete(true);
    onSimulationCompleteRef.current?.();
}

/**
 * Waits for one delay and reports whether the current playback was cancelled.
 *
 * @private function of `MockedChat`
 */
async function waitForDelay(delayMs: number, isCancelledRef: () => boolean): Promise<boolean> {
    if (delayMs > 0) {
        await forTime(delayMs);
    }

    return isCancelledRef();
}

/**
 * Waits for a paused simulation to resume when a pause has been requested.
 *
 * @private function of `MockedChat`
 */
async function waitForPauseIfRequested(params: {
    readonly pauseRequestedRef: MutableRefObject<boolean>;
    readonly waitIfPaused: (isCancelledRef: () => boolean) => Promise<void>;
    readonly isCancelledRef: () => boolean;
}): Promise<boolean> {
    const { pauseRequestedRef, waitIfPaused, isCancelledRef } = params;

    if (!pauseRequestedRef.current) {
        return false;
    }

    await waitIfPaused(isCancelledRef);
    return isCancelledRef();
}

/**
 * Resolves the first wait before the simulated transcript starts rendering.
 *
 * @private function of `MockedChat`
 */
function resolveInitialSimulationDelay(params: {
    readonly delays: MockedChatDelayConfig;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
    readonly firstMessageIndex: number;
}): number {
    const { delays, normalizedMessageOffsetsMs, firstMessageIndex } = params;

    if (normalizedMessageOffsetsMs) {
        return resolveOffsetDelayBeforeMessage(normalizedMessageOffsetsMs, firstMessageIndex);
    }

    return getDelay(delays.beforeFirstMessage, 1000);
}

/**
 * Returns true when the next inter-message wait should use a longer pause.
 *
 * @private function of `MockedChat`
 */
function shouldUseLongPause(params: {
    readonly delays: MockedChatDelayConfig;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
    readonly messageIndex: number;
}): boolean {
    const { delays, originalMessages, messageIndex } = params;

    return (
        !!delays.longPauseChance &&
        Math.random() < delays.longPauseChance &&
        messageIndex > 0 &&
        originalMessages[messageIndex]!.sender !== originalMessages[messageIndex - 1]!.sender
    );
}

/**
 * Resolves the wait between two rendered messages.
 *
 * @private function of `MockedChat`
 */
function resolveInterMessageDelay(params: {
    readonly delays: MockedChatDelayConfig;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
    readonly messageIndex: number;
}): number {
    const { delays, originalMessages, normalizedMessageOffsetsMs, messageIndex } = params;

    if (normalizedMessageOffsetsMs) {
        return resolveOffsetDelayBeforeMessage(normalizedMessageOffsetsMs, messageIndex);
    }

    if (
        shouldUseLongPause({
            delays,
            originalMessages,
            messageIndex,
        })
    ) {
        return getDelay(delays.longPauseDuration, 2000);
    }

    return getDelay(delays.thinkingBetweenMessages, 2000);
}

/**
 * Types out one message word by word and marks it complete when finished.
 *
 * @private function of `MockedChat`
 */
async function typeMockedChatMessage(params: {
    readonly currentMessage: ChatMessage;
    readonly delays: MockedChatDelayConfig;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
    readonly setDisplayedMessages: SetDisplayedMessages;
    readonly isCancelledRef: () => boolean;
}): Promise<boolean> {
    const { currentMessage, delays, normalizedMessageOffsetsMs, setDisplayedMessages, isCancelledRef } = params;
    const incompleteMessage = createDisplayedMockedChatMessage(currentMessage, '', false);

    appendDisplayedMessage(setDisplayedMessages, incompleteMessage);

    const words = currentMessage.content.split(' ');
    let currentContent = '';

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        if (isCancelledRef()) {
            return true;
        }

        const word = words[wordIndex];
        currentContent += (wordIndex > 0 ? ' ' : '') + word;

        replaceLastDisplayedMessage(
            setDisplayedMessages,
            createDisplayedMockedChatMessage(currentMessage, currentContent, false),
        );

        const wordDelayMs = getDelay(delays.waitAfterWord, 100) + getDelay(delays.extraWordDelay, 50);
        if (await waitForDelay(wordDelayMs, isCancelledRef)) {
            return true;
        }
    }

    replaceLastDisplayedMessage(
        setDisplayedMessages,
        createDisplayedMockedChatMessage(currentMessage, currentMessage.content, true),
    );

    if (!normalizedMessageOffsetsMs && (await waitForDelay(200, isCancelledRef))) {
        return true;
    }

    return false;
}

/**
 * Runs one full mocked-chat playback cycle.
 *
 * @private function of `MockedChat`
 */
async function simulateMockedChatPlayback(props: SimulateMockedChatPlaybackProps): Promise<void> {
    const {
        delays,
        originalMessages,
        normalizedMessageOffsetsMs,
        pauseRequestedRef,
        waitIfPaused,
        setDisplayedMessages,
        setLocalAppendedMessages,
        setIsSimulationComplete,
        onSimulationCompleteRef,
        isCancelledRef,
    } = props;

    resetSimulationState({
        setDisplayedMessages,
        setLocalAppendedMessages,
        setIsSimulationComplete,
    });

    if (originalMessages.length === 0) {
        completeSimulation({
            setIsSimulationComplete,
            onSimulationCompleteRef,
        });
        return;
    }

    const showIntermediateMessages = delays.showIntermediateMessages || 0;
    if (showIntermediateMessages > 0) {
        setDisplayedMessages(originalMessages.slice(0, showIntermediateMessages));
    }

    if (
        await waitForDelay(
            resolveInitialSimulationDelay({
                delays,
                normalizedMessageOffsetsMs,
                firstMessageIndex: showIntermediateMessages,
            }),
            isCancelledRef,
        )
    ) {
        return;
    }

    for (let messageIndex = showIntermediateMessages; messageIndex < originalMessages.length; messageIndex++) {
        if (
            await waitForPauseIfRequested({
                pauseRequestedRef,
                waitIfPaused,
                isCancelledRef,
            })
        ) {
            return;
        }

        const currentMessage = originalMessages[messageIndex];
        if (!currentMessage) {
            continue;
        }

        if (messageIndex > showIntermediateMessages) {
            if (
                await waitForDelay(
                    resolveInterMessageDelay({
                        delays,
                        originalMessages,
                        normalizedMessageOffsetsMs,
                        messageIndex,
                    }),
                    isCancelledRef,
                )
            ) {
                return;
            }

            if (
                await waitForPauseIfRequested({
                    pauseRequestedRef,
                    waitIfPaused,
                    isCancelledRef,
                })
            ) {
                return;
            }
        }

        if (
            await typeMockedChatMessage({
                currentMessage,
                delays,
                normalizedMessageOffsetsMs,
                setDisplayedMessages,
                isCancelledRef,
            })
        ) {
            return;
        }
    }

    completeSimulation({
        setIsSimulationComplete,
        onSimulationCompleteRef,
    });
}

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
        messageOffsetsMs,
        appendMessagesLocallyOnSend = false,
        onSimulationComplete,
        isSaveButtonEnabled = true,
        ...chatProps
    } = props;

    const delays = {
        ...MOCKED_CHAT_DELAY_CONFIGS.NORMAL_FLOW,
        ...delayConfig,
    };

    const [displayedMessages, setDisplayedMessages] = useState<ReadonlyArray<ChatMessage>>([]);
    const [localAppendedMessages, setLocalAppendedMessages] = useState<ReadonlyArray<ChatMessage>>([]);
    const [isSimulationComplete, setIsSimulationComplete] = useState(false);

    const normalizedMessageOffsetsMs = useMemo(
        () => normalizeMessageOffsets(messageOffsetsMs, originalMessages),
        [messageOffsetsMs, originalMessages],
    );

    // Playback state machine
    // RUNNING -> (user clicks Pause) -> PAUSING (finish current message) -> PAUSED
    // PAUSED -> (user clicks Resume) -> RUNNING
    const [playbackState, setPlaybackState] = useState<MockedChatPlaybackState>('RUNNING');
    const pauseRequestedRef = useRef(false);
    const onSimulationCompleteRef = useRef(onSimulationComplete);

    useEffect(() => {
        onSimulationCompleteRef.current = onSimulationComplete;
    }, [onSimulationComplete]);

    const [resetNonce, setResetNonce] = useState(0);
    const onReset = useMemo(() => {
        if (!isResettable) {
            return undefined;
        }

        return () => {
            setDisplayedMessages([]);
            setLocalAppendedMessages([]);
            setIsSimulationComplete(false);
            setResetNonce((nonce) => nonce + 1);
        };
    }, [isResettable]);

    // Helper: Wait while paused (entered only between messages, never mid-typing)
    const waitIfPaused = async (isCancelledRef: () => boolean) => {
        if (!pauseRequestedRef.current) {
            return;
        }

        setPlaybackState('PAUSED');

        // Busy wait with small sleeps until resume
        while (pauseRequestedRef.current) {
            if (isCancelledRef()) {
                return;
            }

            await forTime(100);
        }

        setPlaybackState('RUNNING');
    };

    const requestPause = () => {
        if (playbackState === 'RUNNING') {
            pauseRequestedRef.current = true;
            setPlaybackState('PAUSING');
        }
    };

    const resume = () => {
        pauseRequestedRef.current = false;
        if (playbackState !== 'RUNNING') {
            setPlaybackState('RUNNING');
        }
    };

    useEffect(() => {
        let isCancelled = false;

        simulateMockedChatPlayback({
            delays,
            originalMessages,
            normalizedMessageOffsetsMs,
            pauseRequestedRef,
            waitIfPaused,
            setDisplayedMessages,
            setLocalAppendedMessages,
            setIsSimulationComplete,
            onSimulationCompleteRef,
            isCancelledRef: () => isCancelled,
        }).catch((error) => {
            if (!isCancelled) {
                console.error('Error in MockedChat simulation:', error);
                // Fallback to showing all messages immediately
                setDisplayedMessages(originalMessages);
                setIsSimulationComplete(true);
                onSimulationCompleteRef.current?.();
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [
        originalMessages,
        normalizedMessageOffsetsMs,
        delays.beforeFirstMessage,
        delays.thinkingBetweenMessages,
        delays.waitAfterWord,
        delays.extraWordDelay,
        resetNonce,
    ]);

    const renderedMessages = useMemo(
        () => [...displayedMessages, ...localAppendedMessages],
        [displayedMessages, localAppendedMessages],
    );

    const handleMessage = useMemo(() => {
        if (!chatProps.onMessage && !appendMessagesLocallyOnSend) {
            return undefined;
        }

        return async (messageContent: string) => {
            const trimmedContent = messageContent.trim();
            if (appendMessagesLocallyOnSend && trimmedContent.length > 0) {
                const sender = chatProps.participants?.find((participant) => participant.isMe)?.name || 'USER';
                const localMessage: ChatMessage = {
                    id: `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    sender,
                    content: trimmedContent,
                    isComplete: true,
                    createdAt: new Date().toISOString() as ChatMessage['createdAt'],
                };

                setLocalAppendedMessages((previousMessages) => [...previousMessages, localMessage]);
            }

            if (chatProps.onMessage) {
                await chatProps.onMessage(messageContent);
            }
        };
    }, [appendMessagesLocallyOnSend, chatProps.onMessage, chatProps.participants]);

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
            messages={renderedMessages}
            extraActions={extraActions}
            isSaveButtonEnabled={isSaveButtonEnabled}
            saveFormats={['json', 'md', 'txt', 'html']}
            // Disable input during simulation unless explicitly completed
            onMessage={isSimulationComplete ? handleMessage : undefined}
        />
    );
}
