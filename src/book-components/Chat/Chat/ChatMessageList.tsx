'use client';

import type { UIEvent } from 'react';
import type { Promisable } from 'type-fest';
import type { id } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import styles from './Chat.module.css';
import { ChatMessageItem } from './ChatMessageItem';
import type { ChatProps } from './ChatProps';

/**
 * Props for the Chat message list container.
 *
 * @private component of `<Chat/>`
 */
export type ChatMessageListProps = {
    messages: ReadonlyArray<ChatMessage>;
    participants: ReadonlyArray<ChatParticipant>;
    expandedMessageId: id | null;
    messageRatings: Map<id, number>;
    setExpandedMessageId: (value: id | null) => void;
    handleRating: (message: ChatMessage, rating: number) => void;
    mode: 'LIGHT' | 'DARK';
    isCopyButtonEnabled?: boolean;
    isFeedbackEnabled?: boolean;
    /**
     * Chooses which feedback controls should be rendered.
     */
    feedbackMode?: ChatProps['feedbackMode'];
    /**
     * Optional localized labels used by feedback controls.
     */
    feedbackTranslations?: ChatProps['feedbackTranslations'];
    /**
     * Optional localized labels used by timestamp metadata.
     */
    timingTranslations?: ChatProps['timingTranslations'];
    /**
     * Optional moment locale used to format message timestamps.
     */
    chatLocale?: ChatProps['chatLocale'];
    onCopy?: () => void;
    onMessage?: (messageContent: string) => Promisable<void>;
    onActionButton?: ChatProps['onActionButton'];
    onCreateAgent?: (bookContent: string) => void;
    toolTitles?: Record<string, string>;
    teammates?: ChatProps['teammates'];
    teamAgentProfiles?: ChatProps['teamAgentProfiles'];
    CHAT_VISUAL_MODE?: ChatProps['CHAT_VISUAL_MODE'];
    onToolCallClick?: (toolCall: NonNullable<ChatMessage['toolCalls']>[number]) => void;
    onCitationClick?: (citation: ParsedCitation) => void;
    soundSystem?: ChatProps['soundSystem'];
    isSpeechPlaybackEnabled?: ChatProps['isSpeechPlaybackEnabled'];
    elevenLabsVoiceId?: ChatProps['elevenLabsVoiceId'];
    setChatMessagesElement: (element: HTMLDivElement | null) => void;
    onScroll: (event: UIEvent<HTMLDivElement>) => void;
    chatMessagesClassName?: string;
    hasActions: boolean;
};

/**
 * Renders the list of chat messages.
 *
 * @private component of `<Chat/>`
 */
export function ChatMessageList(props: ChatMessageListProps) {
    const {
        messages,
        participants,
        expandedMessageId,
        messageRatings,
        setExpandedMessageId,
        handleRating,
        mode,
        isCopyButtonEnabled,
        isFeedbackEnabled,
        feedbackMode,
        feedbackTranslations,
        timingTranslations,
        chatLocale,
        onCopy,
        onMessage,
        onActionButton,
        onCreateAgent,
        toolTitles,
        teammates,
        onToolCallClick,
        onCitationClick,
        CHAT_VISUAL_MODE,
        soundSystem,
        isSpeechPlaybackEnabled,
        elevenLabsVoiceId,
        teamAgentProfiles,
        setChatMessagesElement,
        onScroll,
        chatMessagesClassName,
        hasActions,
    } = props;

    const firstMessage = messages[0];
    const firstMsgContent = firstMessage?.content || '';
    const firstMsgLines = firstMsgContent.split(/\r?\n/).length;
    const firstMsgChars = firstMsgContent.length;
    const isFirstLong = firstMsgLines > 5 || firstMsgChars > 50;
    const shouldPadForActions = hasActions && isFirstLong;

    return (
        <div
            className={classNames(
                styles.chatMessages,
                chatMessagesClassName,
                shouldPadForActions && styles.hasActionsAndFirstMessageIsLong,
            )}
            ref={setChatMessagesElement}
            onScroll={onScroll}
        >
            {messages.map((message, index) => {
                const participant = participants.find((entry) => entry.name === message.sender);
                const isLastMessage = index === messages.length - 1;
                const isExpanded = expandedMessageId === message.id;
                const currentRating = messageRatings.get(message.id || message.content /* <-[??] */) || 0;

                return (
                    <ChatMessageItem
                        key={resolveRenderedMessageKey(message)}
                        message={message}
                        participant={participant}
                        participants={participants}
                        isLastMessage={isLastMessage}
                        onMessage={onMessage}
                        onActionButton={onActionButton}
                        setExpandedMessageId={setExpandedMessageId}
                        isExpanded={isExpanded}
                        currentRating={currentRating}
                        handleRating={handleRating}
                        mode={mode}
                        isCopyButtonEnabled={isCopyButtonEnabled}
                        isFeedbackEnabled={isFeedbackEnabled}
                        feedbackMode={feedbackMode}
                        feedbackTranslations={feedbackTranslations}
                        timingTranslations={timingTranslations}
                        chatLocale={chatLocale}
                        onCopy={onCopy}
                        onCreateAgent={onCreateAgent}
                        toolTitles={toolTitles}
                        teammates={teammates}
                        teamAgentProfiles={teamAgentProfiles}
                        CHAT_VISUAL_MODE={CHAT_VISUAL_MODE}
                        onToolCallClick={onToolCallClick}
                        onCitationClick={onCitationClick}
                        soundSystem={soundSystem}
                        isSpeechPlaybackEnabled={isSpeechPlaybackEnabled}
                        elevenLabsVoiceId={elevenLabsVoiceId}
                    />
                );
            })}

            <div style={{ height: 100 }}></div>
        </div>
    );
}

/**
 * Resolves a stable React key for one rendered chat message.
 *
 * Canonical user messages echoed back from the server keep the same
 * `clientMessageId` as their optimistic predecessor, so preferring that key
 * lets React preserve the existing DOM node while the optimistic bubble is
 * reconciled into the canonical transcript.
 *
 * @param message - Rendered chat message.
 * @returns Stable React key for the message row.
 * @private component of `<Chat/>`
 */
function resolveRenderedMessageKey(message: ChatMessage): id {
    return message.clientMessageId || message.id || message.content;
}
