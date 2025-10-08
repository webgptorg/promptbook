'use client';
import styles from '*.module.css';
import { memo, useEffect, useState } from 'react';
import { Color, textColor } from '../../../_packages/color.index';
import type { id } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { parseMessageButtons } from '../utils/parseMessageButtons';
import { renderMarkdown } from '../utils/renderMarkdown';
import type { ChatProps } from './ChatProps';
import { AVATAR_SIZE, LOADING_INTERACTIVE_IMAGE } from './constants';

type ChatMessageItemProps = {
    message: ChatMessage;
    participant: ChatParticipant | undefined;
    participants: ReadonlyArray<ChatParticipant>;
    isLastMessage: boolean;
    onMessage?: ChatProps['onMessage'];
    setExpandedMessageId: (value: id | null) => void;
    isExpanded: boolean;
    currentRating: number;
    handleRating: (message: ChatMessage, rating: number) => void;
    mode: 'LIGHT' | 'DARK';
};

/**
 * Renders a single chat message item with avatar, content, buttons, and rating.
 */
export const ChatMessageItem = memo(
    ({
        message,
        participant,
        participants,
        isLastMessage,
        onMessage,
        setExpandedMessageId,
        isExpanded,
        currentRating,
        handleRating,
        mode,
    }: ChatMessageItemProps) => {
        const avatarSrc = participant?.avatarSrc || '';
        const color = Color.from((participant && participant.color) || '#ccc');
        const colorOfText = color.then(textColor);
        const { contentWithoutButtons, buttons } = parseMessageButtons(message.content);
        const shouldShowButtons = isLastMessage && buttons.length > 0 && onMessage;
        const [localHoveredRating, setLocalHoveredRating] = useState(0);

        useEffect(() => {
            if (!isExpanded) {
                setLocalHoveredRating(0);
            }
        }, [isExpanded]);

        return (
            <div
                className={classNames(
                    styles.chatMessage,
                    participant?.isMe && styles.isMe,
                    !message.isComplete && styles.isNotCompleteMessage,
                )}
                onClick={() => {
                    console.group('💬', message.content);
                    console.info('message', message);
                    console.info('participant', participant);
                    console.info('participants', participants);
                    console.info('participant avatarSrc', avatarSrc);
                    console.info('participant color', { color, colorOfText });
                    console.groupEnd();
                }}
            >
                {avatarSrc && (
                    <div className={styles.avatar}>
                        <img
                            width={AVATAR_SIZE}
                            height={AVATAR_SIZE}
                            src={avatarSrc}
                            alt={`Avatar of ${message.from.toString().toLocaleLowerCase()}`}
                            style={{
                                backgroundColor: color.toHex(),
                                width: AVATAR_SIZE,
                                height: AVATAR_SIZE,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid rgba(125, 125, 125, 0.1)',
                                flexShrink: 0,
                            }}
                        />
                    </div>
                )}

                <div
                    className={styles.messageText}
                    style={{
                        backgroundColor: color.toHex(),
                        color: colorOfText.toHex(),
                    }}
                >
                    {message.isVoiceCall && (
                        <div className={styles.voiceCallIndicator}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                        </div>
                    )}

                    {message.content === LOADING_INTERACTIVE_IMAGE ? (
                        <>
                            {/* Loading Case: B */}
                            {/* <LoadingInteractiveImage width={50} height={50} isLoading /> */}
                        </>
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{
                                __html: renderMarkdown(contentWithoutButtons),
                            }}
                        />
                    )}

                    {!message.isComplete && <span className={styles.NonCompleteMessageFiller}>{'_'.repeat(70)}</span>}

                    {shouldShowButtons && (
                        <div className={styles.messageButtons}>
                            {buttons.map((button, buttonIndex) => (
                                <button
                                    key={buttonIndex}
                                    className={styles.messageButton}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (onMessage) {
                                            onMessage(button.message);
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: renderMarkdown(button.text),
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {message.isComplete && (
                        <div
                            className={styles.rating}
                            onMouseEnter={() => {
                                setExpandedMessageId(message.id);
                            }}
                            onMouseLeave={() => {
                                setExpandedMessageId(null);
                                setLocalHoveredRating(0);
                            }}
                        >
                            {isExpanded ? (
                                [1, 2, 3, 4, 5].map((star) => (
                                    <span
                                        key={star}
                                        onClick={() => handleRating(message, star)}
                                        onMouseEnter={() => setLocalHoveredRating(star)}
                                        style={{
                                            cursor: 'pointer',
                                            fontSize: '20px',
                                            color:
                                                star <= (localHoveredRating || currentRating || 0)
                                                    ? '#FFD700'
                                                    : mode === 'LIGHT'
                                                    ? '#ccc'
                                                    : '#555',
                                            transition: 'color 0.2s',
                                        }}
                                    >
                                        ⭐
                                    </span>
                                ))
                            ) : (
                                <span
                                    onClick={() => handleRating(message, currentRating || 1)}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        color: currentRating ? '#FFD700' : mode === 'LIGHT' ? '#888' : '#666',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    ⭐
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    },
    (prev, next) => {
        if (prev.message.id !== next.message.id) {
            return false;
        }

        if (prev.message.content !== next.message.content) {
            return false;
        }

        if ((prev.message.isComplete ?? true) !== (next.message.isComplete ?? true)) {
            return false;
        }

        if ((prev.message.isVoiceCall ?? false) !== (next.message.isVoiceCall ?? false)) {
            return false;
        }

        if (prev.participant !== next.participant) {
            return false;
        }

        if (prev.participants !== next.participants) {
            return false;
        }

        if (prev.isLastMessage !== next.isLastMessage) {
            return false;
        }

        if (prev.onMessage !== next.onMessage) {
            return false;
        }

        if (prev.setExpandedMessageId !== next.setExpandedMessageId) {
            return false;
        }

        if (prev.isExpanded !== next.isExpanded) {
            return false;
        }

        if (prev.currentRating !== next.currentRating) {
            return false;
        }

        if (prev.handleRating !== next.handleRating) {
            return false;
        }

        return prev.mode === next.mode;
    },
);
ChatMessageItem.displayName = 'ChatMessageItem';
