'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Color, textColor } from '../../../_packages/color.index';
import { PROMPTBOOK_CHAT_COLOR, USER_CHAT_COLOR } from '../../../config';
import type { id } from '../../../types/typeAliases';
import { just } from '../../../utils/organization/just';
import { classNames } from '../../_common/react-utils/classNames';
import { AvatarProfileTooltip } from '../../AvatarProfile/AvatarProfile/AvatarProfileTooltip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { parseMessageButtons } from '../utils/parseMessageButtons';
import { renderMarkdown } from '../utils/renderMarkdown';
import styles from './Chat.module.css';
import type { ChatProps } from './ChatProps';
import { AVATAR_SIZE, LOADING_INTERACTIVE_IMAGE } from './constants';

/**
 * Props for the `ChatMessageItem` component
 *
 * @private props for internal subcomponent
 */
type ChatMessageItemProps = Pick<ChatProps, 'onMessage' | 'participants'> & {
    message: ChatMessage;
    participant: ChatParticipant | undefined;
    isLastMessage: boolean;
    setExpandedMessageId: (value: id | null) => void;
    isExpanded: boolean;
    currentRating: number;
    handleRating: (message: ChatMessage, rating: number) => void;
    mode: 'LIGHT' | 'DARK';
    /**
     * Enables the copy button for this message bubble.
     */
    isCopyButtonEnabled?: boolean;
    /**
     * Enables the feedback (rating) UI for this message bubble.
     */
    isFeedbackEnabled?: boolean;
    /**
     * Called when the copy button is pressed.
     */
    onCopy?: () => void;
};

/**
 * Renders a single chat message item with avatar, content, buttons, and rating.
 *
 * @private internal subcomponent of `<Chat>` component
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
        isCopyButtonEnabled,
        isFeedbackEnabled,
        onCopy,
    }: ChatMessageItemProps) => {
        const avatarSrc = participant?.avatarSrc || '';
        const [isAvatarHovered, setIsAvatarHovered] = useState(false);
        const isMe = participant?.isMe;
        const color = Color.from(
            (participant && participant.color) || (isMe ? USER_CHAT_COLOR : PROMPTBOOK_CHAT_COLOR),
        );
        const colorOfText = color.then(textColor);
        const { contentWithoutButtons, buttons } = parseMessageButtons(message.content);
        const shouldShowButtons = isLastMessage && buttons.length > 0 && onMessage;
        const [localHoveredRating, setLocalHoveredRating] = useState(0);
        const [copied, setCopied] = useState(false);
        const [tooltipAlign, setTooltipAlign] = useState<'center' | 'left' | 'right'>('center');
        const tooltipRef = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (!isExpanded) {
                setLocalHoveredRating(0);
            }
        }, [isExpanded]);

        const contentWithoutButtonsRef = useRef<HTMLDivElement>(null);
        const contentWithoutButtonsHtml = useMemo(() => renderMarkdown(contentWithoutButtons), [contentWithoutButtons]);

        return (
            <div
                className={classNames(
                    styles.chatMessage,
                    isMe && styles.isMe,
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
                    <div
                        className={styles.avatar}
                        onMouseEnter={() => setIsAvatarHovered(true)}
                        onMouseLeave={() => setIsAvatarHovered(false)}
                    >
                        <img
                            width={AVATAR_SIZE}
                            src={avatarSrc}
                            alt={`Avatar of ${message.from.toString().toLocaleLowerCase()}`}
                            style={{
                                backgroundColor: color.toHex(),
                                width: AVATAR_SIZE,
                            }}
                        />
                        {participant?.agentSource && (
                            <AvatarProfileTooltip
                                agentSource={participant.agentSource}
                                isVisible={isAvatarHovered}
                            />
                        )}
                    </div>
                )}

                <div
                    className={styles.messageText}
                    style={{
                        backgroundColor: color.toHex(),
                        color: colorOfText.toHex(),
                    }}
                >
                    {isCopyButtonEnabled && message.isComplete && (
                        <div className={styles.copyButtonContainer}>
                            <button
                                className={styles.copyButton}
                                title="Copy message"
                                onClick={async (e) => {
                                    e.stopPropagation();

                                    if (navigator.clipboard && window.ClipboardItem) {
                                        const clipboardItems: Record<string, Blob> = {};

                                        if (just(true)) {
                                            clipboardItems['text/html'] = new Blob([contentWithoutButtonsHtml], {
                                                type: 'text/html',
                                            });
                                        }

                                        if (contentWithoutButtonsRef.current) {
                                            const plain = contentWithoutButtonsRef.current.innerText;
                                            clipboardItems['text/plain'] = new Blob([plain], { type: 'text/plain' });
                                        }

                                        await navigator.clipboard.write([new window.ClipboardItem(clipboardItems)]);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);

                                        // Tooltip positioning logic
                                        setTimeout(() => {
                                            const tooltip = tooltipRef.current;
                                            if (tooltip) {
                                                const rect = tooltip.getBoundingClientRect();
                                                if (rect.left < 8) {
                                                    setTooltipAlign('left');
                                                } else if (rect.right > window.innerWidth - 8) {
                                                    setTooltipAlign('right');
                                                } else {
                                                    setTooltipAlign('center');
                                                }
                                            }
                                        }, 10);
                                        if (typeof onCopy === 'function') {
                                            onCopy();
                                        }
                                    } else {
                                        throw new Error(
                                            `Your browser does not support copying to clipboard: navigator.clipboard && window.ClipboardItem.`,
                                        );
                                    }
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <rect
                                        x="7"
                                        y="7"
                                        width="10"
                                        height="14"
                                        rx="2"
                                        fill="#fff"
                                        stroke="#bbb"
                                        strokeWidth="1.5"
                                    />
                                    <rect
                                        x="3"
                                        y="3"
                                        width="10"
                                        height="14"
                                        rx="2"
                                        fill="#fff"
                                        stroke="#bbb"
                                        strokeWidth="1.5"
                                    />
                                </svg>
                                {copied && (
                                    <span
                                        ref={tooltipRef}
                                        className={
                                            styles.copiedTooltip +
                                            (tooltipAlign === 'left'
                                                ? ' ' + styles.copiedTooltipLeft
                                                : tooltipAlign === 'right'
                                                ? ' ' + styles.copiedTooltipRight
                                                : '')
                                        }
                                    >
                                        Copied!
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
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
                            ref={contentWithoutButtonsRef}
                            dangerouslySetInnerHTML={{
                                __html: contentWithoutButtonsHtml,
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

                    {isFeedbackEnabled && message.isComplete && (
                        <div
                            className={styles.rating}
                            onMouseEnter={() => {
                                setExpandedMessageId(message.id || message.content /* <-[💃] */);
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
                                        className={styles.ratingStar}
                                        style={{
                                            color:
                                                star <= (localHoveredRating || currentRating || 0)
                                                    ? '#FFD700'
                                                    : mode === 'LIGHT'
                                                    ? '#ccc'
                                                    : '#555',
                                        }}
                                    >
                                        ⭐
                                    </span>
                                ))
                            ) : (
                                <span
                                    onClick={() => handleRating(message, currentRating || 1)}
                                    className={styles.ratingStar}
                                    style={{
                                        color: currentRating ? '#FFD700' : mode === 'LIGHT' ? '#888' : '#666',
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
