'use client';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
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
 * Resolved playback state for the mocked chat state machine.
 *
 * @private function of `MockedChat`
 */
type MockedChatPlaybackState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * Fully resolved delay configuration used during playback.
 *
 * @private function of `MockedChat`
 */
type MockedChatResolvedDelayConfig = {
    readonly beforeFirstMessage?: number | [number, number];
    readonly thinkingBetweenMessages?: number | [number, number];
    readonly waitAfterWord?: number | [number, number];
    readonly extraWordDelay?: number | [number, number];
    readonly longPauseChance?: number;
    readonly longPauseDuration?: [number, number];
    readonly blocky?: boolean;
    readonly showIntermediateMessages?: number;
};

/**
 * Shared setters used by the mocked playback helpers.
 *
 * @private function of `MockedChat`
 */
type MockedChatSimulationSetters = {
    readonly setDisplayedMessages: Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;
    readonly setIsSimulationComplete: Dispatch<SetStateAction<boolean>>;
    readonly setLocalAppendedMessages: Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;
    readonly setPlaybackState: Dispatch<SetStateAction<MockedChatPlaybackState>>;
};

/**
 * Shared simulation inputs passed into the playback helpers.
 *
 * @private function of `MockedChat`
 */
type MockedChatSimulationContext = MockedChatSimulationSetters & {
    readonly delays: MockedChatResolvedDelayConfig;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
    readonly onSimulationComplete?: () => void;
    readonly pauseRequestedRef: MutableRefObject<boolean>;
};

/**
 * Returns one random-or-fixed delay value from the configured range.
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
 * Clamps and monotonic-normalizes optional deterministic message offsets.
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
 * Resolves the deterministic wait before the given message index.
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
 * Builds one displayed-message snapshot for the typing simulation.
 *
 * @private function of `MockedChat`
 */
function createDisplayedMessageSnapshot(
    message: ChatMessage,
    content: string,
    isComplete: boolean,
): ChatMessage {
    return {
        id: message.id,
        createdAt: message.createdAt,
        sender: message.sender,
        content,
        isComplete,
        expectedAnswer: message.expectedAnswer,
        isVoiceCall: message.isVoiceCall,
    };
}

/**
 * Replaces the last displayed message in state.
 *
 * @private function of `MockedChat`
 */
function replaceLastDisplayedMessage(
    previousMessages: ReadonlyArray<ChatMessage>,
    nextMessage: ChatMessage,
): ReadonlyArray<ChatMessage> {
    const nextMessages = [...previousMessages];
    nextMessages[nextMessages.length - 1] = nextMessage;
    return nextMessages;
}

/**
 * Resets local playback-managed state before a new simulation run starts.
 *
 * @private function of `MockedChat`
 */
function resetSimulationState({
    setDisplayedMessages,
    setLocalAppendedMessages,
    setIsSimulationComplete,
}: Pick<
    MockedChatSimulationSetters,
    'setDisplayedMessages' | 'setLocalAppendedMessages' | 'setIsSimulationComplete'
>) {
    setDisplayedMessages([]);
    setLocalAppendedMessages([]);
    setIsSimulationComplete(false);
}

/**
 * Marks the simulation as finished and fires the completion callback.
 *
 * @private function of `MockedChat`
 */
function completeSimulation({
    setIsSimulationComplete,
    onSimulationComplete,
}: Pick<MockedChatSimulationContext, 'setIsSimulationComplete' | 'onSimulationComplete'>) {
    setIsSimulationComplete(true);
    onSimulationComplete?.();
}

/**
 * Waits until playback is resumed when a pause was requested between messages.
 *
 * @private function of `MockedChat`
 */
async function waitIfPaused(params: {
    readonly isCancelled: () => boolean;
    readonly pauseRequestedRef: MutableRefObject<boolean>;
    readonly setPlaybackState: Dispatch<SetStateAction<MockedChatPlaybackState>>;
}) {
    const { isCancelled, pauseRequestedRef, setPlaybackState } = params;

    if (!pauseRequestedRef.current) {
        return;
    }

    setPlaybackState('PAUSED');

    while (pauseRequestedRef.current) {
        if (isCancelled()) {
            return;
        }

        await forTime(100);
    }

    setPlaybackState('RUNNING');
}

/**
 * Returns how many initial messages should be shown immediately.
 *
 * @private function of `MockedChat`
 */
function getInitialVisibleMessageCount(delays: MockedChatResolvedDelayConfig): number {
    return delays.showIntermediateMessages || 0;
}

/**
 * Shows the configured leading messages immediately before playback starts typing.
 *
 * @private function of `MockedChat`
 */
function showInitialMessagesImmediately(params: {
    readonly delays: MockedChatResolvedDelayConfig;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
    readonly setDisplayedMessages: Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;
}) {
    const { delays, originalMessages, setDisplayedMessages } = params;
    const initialVisibleMessageCount = getInitialVisibleMessageCount(delays);

    if (initialVisibleMessageCount > 0) {
        setDisplayedMessages(originalMessages.slice(0, initialVisibleMessageCount));
    }
}

/**
 * Waits before rendering the first simulated message.
 *
 * @private function of `MockedChat`
 */
async function waitBeforeFirstRenderedMessage(params: {
    readonly delays: MockedChatResolvedDelayConfig;
    readonly isCancelled: () => boolean;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
}) {
    const { delays, isCancelled, normalizedMessageOffsetsMs } = params;
    const firstMessageIndex = getInitialVisibleMessageCount(delays);
    const initialDelay = normalizedMessageOffsetsMs
        ? resolveOffsetDelayBeforeMessage(normalizedMessageOffsetsMs, firstMessageIndex)
        : getDelay(delays.beforeFirstMessage, 1000);

    if (initialDelay > 0) {
        await forTime(initialDelay);
    }

    return !isCancelled();
}

/**
 * Returns true when the next rendered message should use the configured long-pause branch.
 *
 * @private function of `MockedChat`
 */
function shouldUseLongPause(params: {
    readonly delays: MockedChatResolvedDelayConfig;
    readonly messageIndex: number;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
}): boolean {
    const { delays, messageIndex, originalMessages } = params;

    return !!(
        delays.longPauseChance &&
        Math.random() < delays.longPauseChance &&
        messageIndex > 0 &&
        originalMessages[messageIndex]!.sender !== originalMessages[messageIndex - 1]!.sender
    );
}

/**
 * Waits between two rendered messages, using either deterministic offsets or heuristic delays.
 *
 * @private function of `MockedChat`
 */
async function waitBeforeMessage(params: {
    readonly delays: MockedChatResolvedDelayConfig;
    readonly isCancelled: () => boolean;
    readonly messageIndex: number;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
    readonly originalMessages: ReadonlyArray<ChatMessage>;
}) {
    const { delays, isCancelled, messageIndex, normalizedMessageOffsetsMs, originalMessages } = params;
    const firstRenderedMessageIndex = getInitialVisibleMessageCount(delays);

    if (messageIndex <= firstRenderedMessageIndex) {
        return !isCancelled();
    }

    if (normalizedMessageOffsetsMs) {
        const deterministicDelay = resolveOffsetDelayBeforeMessage(normalizedMessageOffsetsMs, messageIndex);

        if (deterministicDelay > 0) {
            await forTime(deterministicDelay);
        }

        return !isCancelled();
    }

    const nextDelay = shouldUseLongPause({ delays, messageIndex, originalMessages })
        ? getDelay(delays.longPauseDuration, 2000)
        : getDelay(delays.thinkingBetweenMessages, 2000);

    await forTime(nextDelay);
    return !isCancelled();
}

/**
 * Types the current message either word-by-word or immediately in block mode.
 *
 * @private function of `MockedChat`
 */
async function typeMessage(params: {
    readonly currentMessage: ChatMessage;
    readonly delays: MockedChatResolvedDelayConfig;
    readonly isCancelled: () => boolean;
    readonly setDisplayedMessages: Dispatch<SetStateAction<ReadonlyArray<ChatMessage>>>;
}) {
    const { currentMessage, delays, isCancelled, setDisplayedMessages } = params;

    setDisplayedMessages((previousMessages) => [
        ...previousMessages,
        createDisplayedMessageSnapshot(currentMessage, '', false),
    ]);

    if (delays.blocky) {
        setDisplayedMessages((previousMessages) =>
            replaceLastDisplayedMessage(previousMessages, createDisplayedMessageSnapshot(currentMessage, currentMessage.content, true)),
        );
        return !isCancelled();
    }

    const words = currentMessage.content.split(' ');
    let currentContent = '';

    for (const [wordIndex, word] of words.entries()) {
        if (isCancelled()) {
            return false;
        }

        currentContent += (wordIndex > 0 ? ' ' : '') + word;

        setDisplayedMessages((previousMessages) =>
            replaceLastDisplayedMessage(
                previousMessages,
                createDisplayedMessageSnapshot(currentMessage, currentContent, false),
            ),
        );

        await forTime(getDelay(delays.waitAfterWord, 100) + getDelay(delays.extraWordDelay, 50));
    }

    if (isCancelled()) {
        return false;
    }

    setDisplayedMessages((previousMessages) =>
        replaceLastDisplayedMessage(previousMessages, createDisplayedMessageSnapshot(currentMessage, currentMessage.content, true)),
    );

    return !isCancelled();
}

/**
 * Applies the small post-message pause used by heuristic playback mode.
 *
 * @private function of `MockedChat`
 */
async function waitAfterTypedMessage(params: {
    readonly isCancelled: () => boolean;
    readonly normalizedMessageOffsetsMs: ReadonlyArray<number> | null;
}) {
    const { isCancelled, normalizedMessageOffsetsMs } = params;

    if (normalizedMessageOffsetsMs) {
        return !isCancelled();
    }

    await forTime(200);
    return !isCancelled();
}

/**
 * Runs one full mocked-chat simulation pass.
 *
 * @private function of `MockedChat`
 */
async function simulateChat(
    context: MockedChatSimulationContext,
    isCancelled: () => boolean,
): Promise<void> {
    const {
        delays,
        normalizedMessageOffsetsMs,
        onSimulationComplete,
        originalMessages,
        pauseRequestedRef,
        setDisplayedMessages,
        setIsSimulationComplete,
        setLocalAppendedMessages,
        setPlaybackState,
    } = context;

    resetSimulationState({ setDisplayedMessages, setLocalAppendedMessages, setIsSimulationComplete });

    if (originalMessages.length === 0) {
        completeSimulation({ setIsSimulationComplete, onSimulationComplete });
        return;
    }

    showInitialMessagesImmediately({ delays, originalMessages, setDisplayedMessages });

    if (!(await waitBeforeFirstRenderedMessage({ delays, isCancelled, normalizedMessageOffsetsMs }))) {
        return;
    }

    for (let messageIndex = getInitialVisibleMessageCount(delays); messageIndex < originalMessages.length; messageIndex++) {
        if (pauseRequestedRef.current) {
            await waitIfPaused({ isCancelled, pauseRequestedRef, setPlaybackState });
            if (isCancelled()) {
                return;
            }
        }

        const currentMessage = originalMessages[messageIndex];
        if (!currentMessage) {
            continue;
        }

        if (
            !(await waitBeforeMessage({
                delays,
                isCancelled,
                messageIndex,
                normalizedMessageOffsetsMs,
                originalMessages,
            }))
        ) {
            return;
        }

        if (pauseRequestedRef.current) {
            await waitIfPaused({ isCancelled, pauseRequestedRef, setPlaybackState });
            if (isCancelled()) {
                return;
            }
        }

        if (!(await typeMessage({ currentMessage, delays, isCancelled, setDisplayedMessages }))) {
            return;
        }

        if (!(await waitAfterTypedMessage({ isCancelled, normalizedMessageOffsetsMs }))) {
            return;
        }
    }

    completeSimulation({ setIsSimulationComplete, onSimulationComplete });
}

/**
 * Returns the local sender name for appended UI-only messages.
 *
 * @private function of `MockedChat`
 */
function getLocalSenderName(participants: ChatProps['participants']): ChatMessage['sender'] {
    const senderName = participants?.find((participant) => participant.isMe)?.name;
    return senderName === undefined ? 'USER' : String(senderName);
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

    const delays = useMemo<MockedChatResolvedDelayConfig>(
        () => ({
            ...MOCKED_CHAT_DELAY_CONFIGS.NORMAL_FLOW,
            ...delayConfig,
        }),
        [
            delayConfig?.beforeFirstMessage,
            delayConfig?.thinkingBetweenMessages,
            delayConfig?.waitAfterWord,
            delayConfig?.extraWordDelay,
            delayConfig?.longPauseChance,
            delayConfig?.longPauseDuration,
            delayConfig?.blocky,
            delayConfig?.showIntermediateMessages,
        ],
    );

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

        simulateChat(
            {
                delays,
                normalizedMessageOffsetsMs,
                originalMessages,
                onSimulationComplete: () => onSimulationCompleteRef.current?.(),
                pauseRequestedRef,
                setDisplayedMessages,
                setIsSimulationComplete,
                setLocalAppendedMessages,
                setPlaybackState,
            },
            () => isCancelled,
        ).catch((error) => {
            if (!isCancelled) {
                console.error('Error in MockedChat simulation:', error);
                setDisplayedMessages(originalMessages);
                completeSimulation({
                    setIsSimulationComplete,
                    onSimulationComplete: onSimulationCompleteRef.current,
                });
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [
        originalMessages,
        delays,
        normalizedMessageOffsetsMs,
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
                const localMessage: ChatMessage = {
                    id: `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    sender: getLocalSenderName(chatProps.participants),
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
