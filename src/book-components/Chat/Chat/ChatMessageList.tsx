'use client';

import type { UIEvent } from 'react';
import type { Promisable } from 'type-fest';
import type { id } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ChatProps } from './ChatProps';
import { ChatMessageItem } from './ChatMessageItem';
import styles from './Chat.module.css';

/**
 * Props for the Chat message list container.
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
    onCopy?: () => void;
    onMessage?: (messageContent: string) => Promisable<void>;
    onCreateAgent?: (bookContent: string) => void;
    toolTitles?: Record<string, string>;
    teammates?: ChatProps['teammates'];
    onToolCallClick?: (toolCall: NonNullable<ChatMessage['toolCalls']>[number]) => void;
    onCitationClick?: (citation: ParsedCitation) => void;
    setChatMessagesElement: (element: HTMLDivElement | null) => void;
    onScroll: (event: UIEvent<HTMLDivElement>) => void;
    chatMessagesClassName?: string;
    hasActions: boolean;
};

/**
 * Renders the list of chat messages.
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
        onCopy,
        onMessage,
        onCreateAgent,
        toolTitles,
        teammates,
        onToolCallClick,
        onCitationClick,
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
                        key={message.id}
                        message={message}
                        participant={participant}
                        participants={participants}
                        isLastMessage={isLastMessage}
                        onMessage={onMessage}
                        setExpandedMessageId={setExpandedMessageId}
                        isExpanded={isExpanded}
                        currentRating={currentRating}
                        handleRating={handleRating}
                        mode={mode}
                        isCopyButtonEnabled={isCopyButtonEnabled}
                        isFeedbackEnabled={isFeedbackEnabled}
                        onCopy={onCopy}
                        onCreateAgent={onCreateAgent}
                        toolTitles={toolTitles}
                        teammates={teammates}
                        onToolCallClick={onToolCallClick}
                        onCitationClick={onCitationClick}
                    />
                );
            })}

            <div style={{ height: 100 }}></div>
        </div>
    );
}
