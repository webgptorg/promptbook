'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { memo, useEffect, useRef, useState } from 'react';
import { colorToDataUrl } from '../../../_packages/color.index';
import { PROMPTBOOK_CHAT_COLOR, USER_CHAT_COLOR } from '../../../config';
import type { id } from '../../../types/typeAliases';
import { Color } from '../../../utils/color/Color';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { textColor } from '../../../utils/color/operators/furthest';
import { AvatarProfileTooltip } from '../../AvatarProfile/AvatarProfile/AvatarProfileTooltip';
import { classNames } from '../../_common/react-utils/classNames';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { getToolCallChipletText, TOOL_TITLES } from '../utils/formatToolCall';
import { parseMessageButtons } from '../utils/parseMessageButtons';
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
    /**
     * Called when the create agent button is pressed for book code blocks.
     */
    onCreateAgent?: (bookContent: string) => void;
    /**
     * Optional mapping of technical tool names to human-readable titles.
     * e.g., { "web_search": "Searching the web..." }
     */
    toolTitles?: Record<string, string>;
    /**
     * Called when a tool call chiplet is clicked.
     */
    onToolCallClick?: (toolCall: { name: string; arguments?: TODO_any; result?: TODO_any }) => void;
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
        onCreateAgent,
        toolTitles,
        onToolCallClick,
    }: ChatMessageItemProps) => {
        const avatarSrc = participant?.avatarSrc || null;
        const [isAvatarTooltipVisible, setIsAvatarTooltipVisible] = useState(false);
        const [avatarTooltipPosition, setAvatarTooltipPosition] = useState<{ top: number; left: number } | null>(null);
        const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const avatarRef = useRef<HTMLDivElement>(null);
        const tooltipRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const closeTooltip = () => {
                setIsAvatarTooltipVisible(false);
                setAvatarTooltipPosition(null);
            };

            const handleClickOutside = (event: MouseEvent) => {
                if (
                    avatarRef.current &&
                    !avatarRef.current.contains(event.target as Node) &&
                    tooltipRef.current &&
                    !tooltipRef.current.contains(event.target as Node)
                ) {
                    closeTooltip();
                }
            };

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    closeTooltip();
                }
            };

            const handleScroll = () => {
                closeTooltip();
            };

            if (isAvatarTooltipVisible) {
                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('keydown', handleKeyDown);
                window.addEventListener('scroll', handleScroll, true);
            } else {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('scroll', handleScroll, true);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }, [isAvatarTooltipVisible]);

        const showTooltip = () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            if (avatarRef.current) {
                const rect = avatarRef.current.getBoundingClientRect();
                setAvatarTooltipPosition({
                    top: rect.bottom + 5 /* <- 5px offset */,
                    left: rect.left,
                });
                setIsAvatarTooltipVisible(true);
            }
        };

        const handleMouseEnter = () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            hoverTimeoutRef.current = setTimeout(showTooltip, 800);
        };

        const handleMouseLeave = () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            // Note: Do not hide tooltip on mouse leave, it will be hidden by clicking outside
        };

        const isMe = participant?.isMe;
        const color = Color.fromSafe(
            (participant && participant.color) || (isMe ? USER_CHAT_COLOR : PROMPTBOOK_CHAT_COLOR),
        );
        const colorOfText = color.then(textColor);
        const { contentWithoutButtons, buttons } = parseMessageButtons(message.content);
        const shouldShowButtons = isLastMessage && buttons.length > 0 && onMessage;
        const [localHoveredRating, setLocalHoveredRating] = useState(0);
        const [copied, setCopied] = useState(false);
        const [tooltipAlign, setTooltipAlign] = useState<'center' | 'left' | 'right'>('center');
        const copyTooltipRef = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (!isExpanded) {
                setLocalHoveredRating(0);
            }
        }, [isExpanded]);

        const contentWithoutButtonsRef = useRef<HTMLDivElement>(null);

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
                        ref={avatarRef}
                        className={styles.avatar}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={showTooltip}
                    >
                        {/* Note: [㊗️] Using <div/> not <img/> for avatar to 1:1 aspect ratio in every circumstance */}
                        <div
                            style={
                                {
                                    width: AVATAR_SIZE,
                                    height: AVATAR_SIZE,
                                    aspectRatio: '1 / 1',

                                    backgroundImage: `url(${participant?.avatarSrc || colorToDataUrl(color)})`,
                                    backgroundColor: color.toHex(),
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: 'cover',
                                    borderRadius: '50%',
                                    backgroundPosition: '50% 20%', // <- Note: Center avatar image to the head
                                    '--avatar-bg-color': color.toHex(), // <- TODO: Maybe remove these deprecated CSS variables
                                } as React.CSSProperties
                            }
                        />
                        {isAvatarTooltipVisible && participant?.agentSource && avatarTooltipPosition && (
                            <AvatarProfileTooltip
                                ref={tooltipRef}
                                agentSource={participant.agentSource}
                                position={avatarTooltipPosition}
                            />
                        )}
                    </div>
                )}

                <div
                    className={styles.messageText}
                    style={
                        {
                            '--message-bg-color': color.toHex(),
                            '--message-text-color': colorOfText.toHex(),
                        } as React.CSSProperties
                    }
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

                                        if (contentWithoutButtonsRef.current) {
                                            const html = contentWithoutButtonsRef.current.innerHTML;
                                            clipboardItems['text/html'] = new Blob([html], {
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
                                            const tooltip = copyTooltipRef.current;
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
                                        ref={copyTooltipRef}
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
                        <div ref={contentWithoutButtonsRef}>
                            <MarkdownContent content={contentWithoutButtons} onCreateAgent={onCreateAgent} />
                        </div>
                    )}

                    {message.attachments && message.attachments.length > 0 && (
                        <div className={styles.attachments}>
                            {message.attachments.map((attachment, index) => (
                                <a
                                    key={index}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.attachment}
                                    title={attachment.name}
                                >
                                    <span className={styles.attachmentIcon}>📎</span>
                                <span className={styles.attachmentName}>{attachment.name}</span>
                            </a>
                        ))}
                    </div>
                )}

                {message.completedToolCalls && message.completedToolCalls.length > 0 && (
                    <div className={styles.completedToolCalls}>
                        {message.completedToolCalls.map((toolCall, index) => {
                            const chipletText = getToolCallChipletText(toolCall);

                            return (
                                <button
                                    key={index}
                                    className={styles.completedToolCall}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (onToolCallClick) {
                                            onToolCallClick(toolCall);
                                        }
                                    }}
                                >
                                    [{chipletText}]
                                </button>
                            );
                        })}
                    </div>
                )}

                {!message.isComplete && (
                    <div className={styles.ongoingToolCalls}>
                            {message.ongoingToolCalls && message.ongoingToolCalls.length > 0 ? (
                                message.ongoingToolCalls.map((toolCall, index) => {
                                    const toolInfo = TOOL_TITLES[toolCall.name];
                                    const toolTitle = toolTitles?.[toolCall.name] || toolInfo?.title;
                                    const emoji = toolInfo?.emoji || '🛠️';

                                    return (
                                        <div key={index} className={styles.ongoingToolCall}>
                                            <div className={styles.ongoingToolCallSpinner} />
                                            <span className={styles.ongoingToolCallName}>
                                                {toolTitle ? `${emoji} ${toolTitle}...` : `${emoji} Executing ${toolCall.name}...`}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <span className={styles.NonCompleteMessageFiller}>{'_'.repeat(70)}</span>
                            )}
                        </div>
                    )}

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
                                    // <- TODO: [🐱‍🚀] `Color` should work with forma `#ff00ff55` *(with alpha)*
                                >
                                    <MarkdownContent content={button.text} />
                                </button>
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
                                        className={classNames(
                                            styles.ratingStar,
                                            star <= (localHoveredRating || currentRating || 0) && styles.active,
                                        )}
                                        style={
                                            {
                                                '--star-inactive-color': mode === 'LIGHT' ? '#ccc' : '#555',
                                            } as React.CSSProperties
                                        }
                                    >
                                        ⭐
                                    </span>
                                ))
                            ) : (
                                <span
                                    onClick={() => handleRating(message, currentRating || 1)}
                                    className={classNames(styles.ratingStar, currentRating && styles.active)}
                                    style={
                                        {
                                            '--star-inactive-color': mode === 'LIGHT' ? '#888' : '#666',
                                        } as React.CSSProperties
                                    }
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

        if (JSON.stringify(prev.message.attachments) !== JSON.stringify(next.message.attachments)) {
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

        if (prev.toolTitles !== next.toolTitles) {
            return false;
        }

        if (prev.onToolCallClick !== next.onToolCallClick) {
            return false;
        }

        return prev.mode === next.mode;
    },
);
ChatMessageItem.displayName = 'ChatMessageItem';
