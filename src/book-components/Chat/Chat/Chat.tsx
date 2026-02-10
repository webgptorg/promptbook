'use client';
// <- Note: [??] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Color } from '../../../utils/color/Color';
import { humanizeAiText } from '../../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../../utils/markdown/promptbookifyAiText';
import { classNames } from '../../_common/react-utils/classNames';
import { ArrowIcon } from '../../icons/ArrowIcon';
import { ChatEffectsSystem } from '../effects/ChatEffectsSystem';
import type { ChatEffectConfig } from '../effects/types/ChatEffectConfig';
import { useChatActionsOverlap } from '../hooks/useChatActionsOverlap';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { useChatRatings } from '../hooks/useChatRatings';
import type { ChatMessage } from '../types/ChatMessage';
import type { id } from '../../../types/typeAliases';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import { ChatActionsBar } from './ChatActionsBar';
import { ChatCitationModal } from './ChatCitationModal';
import { ChatInputArea } from './ChatInputArea';
import { ChatMessageList } from './ChatMessageList';
import type { ChatProps } from './ChatProps';
import { ChatRatingModal } from './ChatRatingModal';
import { ChatToolCallModal } from './ChatToolCallModal';
import styles from './Chat.module.css';

/**
 * Represents formatted text for the scroll-to-bottom indicator.
 *
 * @private
 */
type ScrollIndicatorText = {
    /**
     * Label that appears on the badge.
     */
    readonly badgeLabel: string;

    /**
     * Accessible text describing the action.
     */
    readonly ariaLabel: string;
};

/**
 * Builds the copy used by the scroll indicator badge and the button's accessible labels.
 *
 * @param count - Number of unseen messages.
 * @returns Labels tailored to the current unseen message count.
 * @private
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
 * Renders a chat with messages and input for new messages
 *
 * Note: 🔇 This component does NOT have speak functionality, it just allows to trigger voice recognition
 *
 * Note: There are multiple chat components:
 * - `<Chat/>` renders chat as it is without any logic
 * - `<LlmChat/>` connected to LLM Execution Tools of Promptbook
 *
 * Use <WorkerChat/> or <SignalChat/> in most cases.
 *
 * @public exported from `@promptbook/components`
 */
export function Chat(props: ChatProps) {
    const {
        title = 'Chat',
        messages,
        onChange,
        onMessage,
        onReset,
        onFeedback,
        onFileUpload,
        speechRecognition,
        placeholderMessageContent,
        defaultMessage,
        children,
        className,
        style,
        isAiTextHumanizedAndPromptbookified = true,
        isVoiceCalling = false,
        isFocusedOnLoad,
        participants = [],
        extraActions,
        actionsContainer,
        saveFormats,
        isSaveButtonEnabled = true,
        isCopyButtonEnabled = true,
        buttonColor: buttonColorRaw,
        onUseTemplate,
        onCreateAgent,
        toolTitles,
        teammates,
        visual,
        effectConfigs,
        soundSystem,
        speechRecognitionLanguage,
    } = props;

    const buttonColor = useMemo(() => Color.from(buttonColorRaw || '#0066cc'), [buttonColorRaw]);
    const agentParticipant = useMemo(
        () => participants.find((participant) => participant.name === 'AGENT'),
        [participants],
    );

    const postprocessedMessages = useMemo<ReadonlyArray<ChatMessage>>(() => {
        if (!isAiTextHumanizedAndPromptbookified) {
            return messages;
        }

        return messages.map((message) => {
            return { ...message, content: promptbookifyAiText(humanizeAiText(message.content)) };
        });
    }, [messages, isAiTextHumanizedAndPromptbookified]);

    const {
        isAutoScrolling,
        chatMessagesRef,
        handleScroll,
        handleMessagesChange,
        scrollToBottom,
        isMobile: isMobileFromHook,
    } = useChatAutoScroll();

    const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);
    const lastSeenMessagesRef = useRef(messages.length);


    const chatMessageSelector = `.${styles.chatMessage}`;
    const { actionsRef, setChatMessagesElement, handleChatScroll, isActionsOverlapping, isActionsScrolling } =
        useChatActionsOverlap({
            chatMessagesRef,
            handleScroll,
            messageSelector: chatMessageSelector,
            messages: postprocessedMessages,
        });

    useEffect(() => {
        if (messages.length < lastSeenMessagesRef.current) {
            lastSeenMessagesRef.current = messages.length;
            if (unseenMessagesCount !== 0) {
                setUnseenMessagesCount(0);
            }
            return;
        }

        if (isAutoScrolling) {
            lastSeenMessagesRef.current = messages.length;
            if (unseenMessagesCount !== 0) {
                setUnseenMessagesCount(0);
            }
            return;
        }

        if (messages.length > lastSeenMessagesRef.current) {
            setUnseenMessagesCount(messages.length - lastSeenMessagesRef.current);
        }
    }, [messages.length, isAutoScrolling, unseenMessagesCount]);

    const { badgeLabel, ariaLabel } = useMemo(
        () => buildScrollIndicatorText(unseenMessagesCount),
        [unseenMessagesCount],
    );

    const {
        state: {
            ratingModalOpen,
            selectedMessage,
            messageRatings,
            textRating,
            hoveredRating,
            expandedMessageId,
            ratingConfirmation,
        },
        actions: {
            setRatingModalOpen,
            setSelectedMessage,
            setMessageRatings,
            setTextRating,
            setHoveredRating,
            setExpandedMessageId,
            handleRating,
            submitRating,
        },
    } = useChatRatings({ messages, onFeedback, isMobile: isMobileFromHook });

    const [toolCallModalOpen, setToolCallModalOpen] = useState(false);
    const [selectedToolCall, setSelectedToolCall] = useState<NonNullable<ChatMessage['toolCalls']>[number] | null>(
        null,
    );
    const [citationModalOpen, setCitationModalOpen] = useState(false);
    const [selectedCitation, setSelectedCitation] = useState<ParsedCitation | null>(null);
    const [mode] = useState<'LIGHT' | 'DARK'>('LIGHT');

    useEffect(() => {
        handleMessagesChange();
    }, [postprocessedMessages, handleMessagesChange]);

    const useChatCssClassName = (suffix: string) => `chat-${suffix}`;
    const scrollToBottomCssClassName = useChatCssClassName('scrollToBottom');

    const handleButtonClick = useCallback(
        (originalHandler?: (event: MouseEvent<HTMLButtonElement>) => void) => {
            return (event: MouseEvent<HTMLButtonElement>) => {
                if (soundSystem) {
                    /* not await */ soundSystem.play('button_click');
                }
                if (originalHandler) {
                    originalHandler(event);
                }
            };
        },
        [soundSystem],
    );

    const handleCopy = useCallback(() => {}, []);
    const isFeedbackEnabled = !!onFeedback;
    const shouldFadeActions = isActionsOverlapping;
    const shouldDisableActions = isActionsOverlapping && isActionsScrolling;
    const hasActions =
        (!!onReset && postprocessedMessages.length !== 0) ||
        (isSaveButtonEnabled && postprocessedMessages.length !== 0) ||
        !!onUseTemplate ||
        !!extraActions;

    const previousMessagesLengthRef = useRef(messages.length);
    const streamingMessageIdRef = useRef<id | null>(null);
    const streamingMessageContentRef = useRef<string | null>(null);

    useEffect(() => {
        if (!soundSystem || messages.length === 0) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            return;
        }

        if (messages.length > previousMessagesLengthRef.current) {
            if (lastMessage.sender !== 'USER') {
                if (lastMessage.isComplete) {
                    /* not await */ soundSystem.play('message_receive');
                } else {
                    /* not await */ soundSystem.play('message_typing');
                }
            }
        } else if (messages.length === previousMessagesLengthRef.current && lastMessage.sender !== 'USER') {
            if (lastMessage.isComplete) {
                /* not await */ soundSystem.play('message_receive');
            }
        }

        previousMessagesLengthRef.current = messages.length;
    }, [messages, soundSystem]);

    useEffect(() => {
        if (!soundSystem) {
            streamingMessageIdRef.current = null;
            streamingMessageContentRef.current = null;
            return;
        }

        if (postprocessedMessages.length === 0) {
            streamingMessageIdRef.current = null;
            streamingMessageContentRef.current = null;
            return;
        }

        const lastMessage = postprocessedMessages[postprocessedMessages.length - 1];
        if (!lastMessage || lastMessage.sender === 'USER' || lastMessage.isComplete) {
            streamingMessageIdRef.current = null;
            streamingMessageContentRef.current = null;
            return;
        }

        const lastMessageId = lastMessage.id ?? null;

        if (streamingMessageIdRef.current !== lastMessageId) {
            streamingMessageIdRef.current = lastMessageId;
            streamingMessageContentRef.current = lastMessage.content;
            return;
        }

        if (streamingMessageContentRef.current !== lastMessage.content) {
            streamingMessageContentRef.current = lastMessage.content;
            soundSystem.vibrate?.('message_stream_chunk');
        }
    }, [postprocessedMessages, soundSystem]);

    return (
        <>
            {ratingConfirmation && <div className={styles.ratingConfirmation}>{ratingConfirmation}</div>}

            {effectConfigs && effectConfigs.length > 0 && (
                <ChatEffectsSystem
                    messages={postprocessedMessages}
                    effectConfigs={effectConfigs as ReadonlyArray<ChatEffectConfig>}
                    soundSystem={soundSystem}
                />
            )}

            <div
                className={classNames(
                    className,
                    styles.Chat,
                    visual === 'STANDALONE' && styles.standaloneVisual,
                    visual === 'FULL_PAGE' && styles.fullPageVisual,
                    useChatCssClassName('Chat'),
                )}
                {...{ style }}
            >
                <div className={classNames(className, styles.chatMainFlow, useChatCssClassName('chatMainFlow'))}>
                    {children && <div className={classNames(styles.chatChildren)}>{children}</div>}

                    {!isAutoScrolling && (
                        <div className={styles.scrollToBottomContainer}>
                            <div className={styles.scrollToBottomWrapper}>
                                <button
                                    data-button-type="custom"
                                    className={classNames(styles.scrollToBottom, scrollToBottomCssClassName)}
                                    onClick={handleButtonClick(scrollToBottom)}
                                    aria-label={ariaLabel}
                                    title={ariaLabel}
                                >
                                    <ArrowIcon direction="DOWN" size={33} />
                                </button>
                                {badgeLabel && (
                                    <span className={styles.scrollToBottomBadge} aria-live="polite" role="status">
                                        {badgeLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {isVoiceCalling && (
                        <div className={styles.voiceCallIndicatorBar}>
                            <div className={styles.voiceCallIndicator}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg>
                                <span>Voice call active</span>
                                <div className={styles.voiceCallPulse}></div>
                            </div>
                        </div>
                    )}

                    <ChatActionsBar
                        actionsRef={actionsRef}
                        actionsContainer={actionsContainer}
                        messages={postprocessedMessages}
                        participants={participants}
                        title={title}
                        onReset={onReset}
                        onUseTemplate={onUseTemplate}
                        extraActions={extraActions}
                        saveFormats={saveFormats}
                        isSaveButtonEnabled={isSaveButtonEnabled}
                        shouldFadeActions={shouldFadeActions}
                        shouldDisableActions={shouldDisableActions}
                        onButtonClick={handleButtonClick}
                        soundSystem={soundSystem}
                    />

                    <ChatMessageList
                        messages={postprocessedMessages}
                        participants={participants}
                        expandedMessageId={expandedMessageId}
                        messageRatings={messageRatings}
                        setExpandedMessageId={setExpandedMessageId}
                        handleRating={handleRating}
                        mode={mode}
                        isCopyButtonEnabled={isCopyButtonEnabled}
                        isFeedbackEnabled={isFeedbackEnabled}
                        onCopy={handleCopy}
                        onMessage={onMessage}
                        onCreateAgent={onCreateAgent}
                        toolTitles={toolTitles}
                        teammates={teammates}
                        soundSystem={soundSystem}
                        onToolCallClick={(toolCall) => {
                            setSelectedToolCall(toolCall);
                            setToolCallModalOpen(true);
                        }}
                        onCitationClick={(citation) => {
                            setSelectedCitation(citation);
                            setCitationModalOpen(true);
                        }}
                        setChatMessagesElement={setChatMessagesElement}
                        onScroll={handleChatScroll}
                        chatMessagesClassName={useChatCssClassName('chatMessages')}
                        hasActions={hasActions}
                    />

                    {onMessage && (
                        <ChatInputArea
                            onMessage={onMessage}
                            onChange={onChange}
                            onFileUpload={onFileUpload}
                            speechRecognition={speechRecognition}
                            speechRecognitionLanguage={speechRecognitionLanguage}
                            defaultMessage={defaultMessage}
                            placeholderMessageContent={placeholderMessageContent}
                            isFocusedOnLoad={isFocusedOnLoad}
                            isMobile={isMobileFromHook}
                            isVoiceCalling={isVoiceCalling}
                            participants={participants}
                            buttonColor={buttonColor}
                            soundSystem={soundSystem}
                            onButtonClick={handleButtonClick}
                            chatInputClassName={useChatCssClassName('chatInput')}
                        />
                    )}
                </div>
            </div>

            <ChatToolCallModal
                isOpen={toolCallModalOpen}
                toolCall={selectedToolCall}
                onClose={() => setToolCallModalOpen(false)}
                toolTitles={toolTitles}
                agentParticipant={agentParticipant}
                buttonColor={buttonColor}
            />

            <ChatCitationModal
                isOpen={citationModalOpen}
                citation={selectedCitation}
                participants={participants}
                soundSystem={soundSystem}
                onClose={() => setCitationModalOpen(false)}
            />

            <ChatRatingModal
                isOpen={ratingModalOpen}
                selectedMessage={selectedMessage}
                postprocessedMessages={postprocessedMessages}
                messages={messages}
                hoveredRating={hoveredRating}
                messageRatings={messageRatings}
                textRating={textRating}
                mode={mode}
                isMobile={isMobileFromHook}
                onClose={() => setRatingModalOpen(false)}
                setHoveredRating={setHoveredRating}
                setMessageRatings={setMessageRatings}
                setSelectedMessage={setSelectedMessage}
                setTextRating={setTextRating}
                submitRating={submitRating}
            />
        </>
    );
}
