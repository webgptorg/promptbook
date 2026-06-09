'use client';
// <- Note: [??] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useMemo, type MouseEvent } from 'react';
import { Color } from '../../../utils/color/Color';
import { classNames } from '../../_common/react-utils/classNames';
import { SolidArrowButton } from '../../icons/SolidArrowButton';
import { ChatEffectsSystem } from '../effects/ChatEffectsSystem';
import type { ChatEffectConfig } from '../effects/types/ChatEffectConfig';
import { useChatCompleteNotification } from '../hooks/useChatCompleteNotification';
import { useChatRatings } from '../hooks/useChatRatings';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';
import { ChatActionsBar } from './ChatActionsBar';
import { ChatCitationModal } from './ChatCitationModal';
import { chatCssClassNames, getChatCssClassName } from './chatCssClassNames';
import { ChatInputArea } from './ChatInputArea';
import { ChatMessageList } from './ChatMessageList';
import type { ChatProps } from './ChatProps';
import { ChatRatingModal } from './ChatRatingModal';
import { ChatToolCallModal } from './ChatToolCallModal';
import { useChatPostprocessedMessages } from './useChatPostprocessedMessages';
import { useChatScrollState } from './useChatScrollState';
import { useChatToolCallState } from './useChatToolCallState';

/**
 * Returns whether feedback controls should be rendered for the current chat.
 *
 * @private function of `<Chat/>`
 */
function isChatFeedbackEnabled(onFeedback: ChatProps['onFeedback'], feedbackMode: ChatProps['feedbackMode']): boolean {
    return !!onFeedback && feedbackMode !== 'off';
}

/**
 * Returns whether the actions toolbar should render at all.
 *
 * @private function of `<Chat/>`
 */
function hasChatActions(
    postprocessedMessages: ReadonlyArray<ChatMessage>,
    {
        onReset,
        newChatButtonHref,
        onUseTemplate,
        extraActions,
        isSaveButtonEnabled,
    }: Pick<ChatProps, 'onReset' | 'newChatButtonHref' | 'onUseTemplate' | 'extraActions' | 'isSaveButtonEnabled'>,
): boolean {
    const hasMessages = postprocessedMessages.length !== 0;

    return (
        ((!!onReset || !!newChatButtonHref) && hasMessages) ||
        (isSaveButtonEnabled && hasMessages) ||
        !!onUseTemplate ||
        !!extraActions
    );
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
        onActionButton,
        onQuickMessageButton,
        onReplyToMessage,
        onCancelReply,
        onReset,
        resetRequiresConfirmation = true,
        newChatButtonHref,
        onFeedback,
        feedbackMode = 'stars',
        feedbackTranslations,
        timingTranslations,
        onFileUpload,
        chatLocale,
        speechRecognition,
        placeholderMessageContent,
        defaultMessage,
        enterBehavior,
        resolveEnterBehavior,
        className,
        style,
        isAiTextHumanizedAndPromptbookified = true,
        isVoiceCalling = false,
        isFocusedOnLoad,
        participants = [],
        canReplyToMessage,
        replyingToMessage,
        extraActions,
        actionsContainer,
        saveFormats,
        saveFormatHandlers,
        isSaveButtonEnabled = true,
        isCopyButtonEnabled = true,
        buttonColor: buttonColorRaw,
        onUseTemplate,
        onCreateAgent,
        toolTitles,
        teammates,
        teamAgentProfiles,
        layout,
        visualMode = 'ARTICLE_MODE',
        theme = 'LIGHT',
        effectConfigs,
        soundSystem,
        speechRecognitionLanguage,
        isSpeechPlaybackEnabled = true,
        elevenLabsVoiceId,
        chatUiTranslations,
    } = props;

    const buttonColor = useMemo(() => Color.from(buttonColorRaw || '#0066cc'), [buttonColorRaw]);
    const agentParticipant = useMemo(
        () => participants.find((participant) => participant.name === 'AGENT'),
        [participants],
    );
    const postprocessedMessages = useChatPostprocessedMessages({
        messages,
        isAiTextHumanizedAndPromptbookified,
    });
    const {
        actionsRef,
        ariaLabel,
        badgeLabel,
        handleChatScroll,
        isMobile,
        scrollToBottom,
        setChatMessagesElement,
        shouldDisableActions,
        shouldFadeActions,
        shouldShowScrollToBottom,
    } = useChatScrollState({
        messages: postprocessedMessages,
    });

    const {
        state: {
            ratingModalOpen,
            selectedMessage,
            messageRatings,
            textRating,
            hoveredRating,
            expandedMessageId,
            feedbackStatus,
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
    } = useChatRatings({
        messages,
        onFeedback,
        feedbackMode,
        feedbackTranslations,
        isMobile,
    });
    const {
        citationModalOpen,
        closeCitationModal,
        closeToolCallModal,
        openCitation,
        openToolCall,
        selectedCitation,
        selectedMessageAvailableTools,
        selectedToolCall,
        selectedToolCallIdentity,
        toolCallModalOpen,
    } = useChatToolCallState({
        messages: postprocessedMessages,
    });
    const mode: 'LIGHT' | 'DARK' = theme;

    const scrollToBottomCssClassName = getChatCssClassName('scrollToBottom');

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
    const isFeedbackEnabled = isChatFeedbackEnabled(onFeedback, feedbackMode);
    const hasActions = hasChatActions(postprocessedMessages, {
        onReset,
        newChatButtonHref,
        onUseTemplate,
        extraActions,
        isSaveButtonEnabled,
    });
    const isConstrainedArticleMode = visualMode === 'ARTICLE_MODE' && layout === 'FULL_PAGE';

    useChatCompleteNotification(messages, soundSystem);

    return (
        <>
            {feedbackStatus && (
                <div
                    className={classNames(
                        styles.feedbackStatus,
                        feedbackStatus.variant === 'success'
                            ? styles.feedbackStatusSuccess
                            : styles.feedbackStatusError,
                    )}
                    aria-live="polite"
                    role="status"
                >
                    {feedbackStatus.message}
                </div>
            )}

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
                    layout === 'STANDALONE' && styles.standaloneVisual,
                    layout === 'FULL_PAGE' && styles.fullPageVisual,
                    isConstrainedArticleMode && styles.constrainedArticleVisual,
                    getChatCssClassName('Chat'),
                    chatCssClassNames.chat,
                )}
                data-chat-theme={mode.toLowerCase()}
                {...{ style }}
            >
                <div
                    className={classNames(
                        className,
                        styles.chatMainFlow,
                        getChatCssClassName('chatMainFlow'),
                        chatCssClassNames.chatMainFlow,
                    )}
                >
                    {shouldShowScrollToBottom && (
                        <div className={styles.scrollToBottomContainer}>
                            <div className={styles.scrollToBottomWrapper}>
                                <SolidArrowButton
                                    data-button-type="custom"
                                    direction="down"
                                    iconSize={33}
                                    className={classNames(styles.scrollToBottom, scrollToBottomCssClassName)}
                                    onClick={handleButtonClick(() => scrollToBottom())}
                                    aria-label={ariaLabel}
                                    title={ariaLabel}
                                />
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
                        resetRequiresConfirmation={resetRequiresConfirmation}
                        newChatButtonHref={newChatButtonHref}
                        onUseTemplate={onUseTemplate}
                        extraActions={extraActions}
                        saveFormats={saveFormats}
                        saveFormatHandlers={saveFormatHandlers}
                        isSaveButtonEnabled={isSaveButtonEnabled}
                        shouldFadeActions={shouldFadeActions}
                        shouldDisableActions={shouldDisableActions}
                        chatUiTranslations={chatUiTranslations}
                        onButtonClick={handleButtonClick}
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
                        feedbackMode={feedbackMode}
                        feedbackTranslations={feedbackTranslations}
                        timingTranslations={timingTranslations}
                        chatLocale={chatLocale}
                        onCopy={handleCopy}
                        onMessage={onMessage}
                        onActionButton={onActionButton}
                        onQuickMessageButton={onQuickMessageButton}
                        onReplyToMessage={onReplyToMessage}
                        canReplyToMessage={canReplyToMessage}
                        onCreateAgent={onCreateAgent}
                        toolTitles={toolTitles}
                        teammates={teammates}
                        teamAgentProfiles={teamAgentProfiles}
                        visualMode={visualMode}
                        soundSystem={soundSystem}
                        onToolCallClick={openToolCall}
                        onCitationClick={openCitation}
                        setChatMessagesElement={setChatMessagesElement}
                        onScroll={handleChatScroll}
                        isSpeechPlaybackEnabled={isSpeechPlaybackEnabled}
                        elevenLabsVoiceId={elevenLabsVoiceId}
                        chatUiTranslations={chatUiTranslations}
                        chatMessagesClassName={classNames(
                            isConstrainedArticleMode && styles.articleModeChatMessages,
                            getChatCssClassName('chatMessages'),
                            chatCssClassNames.chatMessages,
                        )}
                        hasActions={hasActions}
                    />

                    {onMessage && (
                        <ChatInputArea
                            onMessage={onMessage}
                            onChange={onChange}
                            onFileUpload={onFileUpload}
                            speechRecognition={speechRecognition}
                            speechRecognitionLanguage={speechRecognitionLanguage}
                            replyingToMessage={replyingToMessage}
                            onCancelReply={onCancelReply}
                            defaultMessage={defaultMessage}
                            enterBehavior={enterBehavior}
                            resolveEnterBehavior={resolveEnterBehavior}
                            placeholderMessageContent={
                                placeholderMessageContent || chatUiTranslations?.inputPlaceholder
                            }
                            isFocusedOnLoad={isFocusedOnLoad}
                            isMobile={isMobile}
                            isVoiceCalling={isVoiceCalling}
                            participants={participants}
                            buttonColor={buttonColor}
                            soundSystem={soundSystem}
                            onButtonClick={handleButtonClick}
                            chatUiTranslations={chatUiTranslations}
                            chatInputClassName={classNames(
                                isConstrainedArticleMode && styles.articleModeChatInput,
                                getChatCssClassName('chatInput'),
                                chatCssClassNames.chatInput,
                            )}
                        />
                    )}
                </div>
            </div>

            <ChatToolCallModal
                isOpen={toolCallModalOpen}
                toolCall={selectedToolCall}
                toolCallIdentity={selectedToolCallIdentity}
                onClose={closeToolCallModal}
                toolTitles={toolTitles}
                agentParticipant={agentParticipant}
                buttonColor={buttonColor}
                teamAgentProfiles={teamAgentProfiles}
                chatUiTranslations={chatUiTranslations}
                locale={chatLocale}
                availableTools={selectedMessageAvailableTools}
                mode={mode}
            />

            <ChatCitationModal
                isOpen={citationModalOpen}
                citation={selectedCitation}
                participants={participants}
                soundSystem={soundSystem}
                onClose={closeCitationModal}
            />

            <ChatRatingModal
                isOpen={ratingModalOpen}
                selectedMessage={selectedMessage}
                postprocessedMessages={postprocessedMessages}
                messages={messages}
                hoveredRating={hoveredRating}
                messageRatings={messageRatings}
                textRating={textRating}
                feedbackMode={feedbackMode}
                feedbackTranslations={feedbackTranslations}
                mode={mode}
                isMobile={isMobile}
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
