'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { Pause, Play, Reply } from 'lucide-react';
import type { CSSProperties, ReactElement, PointerEvent as ReactPointerEvent } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { colorToDataUrl } from '../../../_packages/color.index';
import { AvatarOrImage } from '../../../avatars/AvatarOrImage';
import { PROMPTBOOK_CHAT_COLOR, USER_CHAT_COLOR } from '../../../config';
import type { id } from '../../../types/typeAliases';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { classNames } from '../../_common/react-utils/classNames';
import { AvatarProfileTooltip } from '../../AvatarProfile/AvatarProfile/AvatarProfileTooltip';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import { SourceChip } from '../SourceChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { createCitationFootnoteRenderModel } from '../utils/createCitationFootnoteRenderModel';
import { getChatMessageTimingDisplay } from '../utils/getChatMessageTimingDisplay';
import { type ParsedCitation } from '../utils/parseCitationsFromContent';
import { parseMessageButtons, type MessageButton } from '../utils/parseMessageButtons';
import { resolveChatMessageReplyPreviewText } from '../utils/resolveChatMessageReplyPreviewText';
import { resolveChatMessageReplySenderLabel } from '../utils/resolveChatMessageReplySenderLabel';
import {
    getLatestStreamingFeatureBoundary,
    sanitizeStreamingMessageContent,
} from '../utils/sanitizeStreamingMessageContent';
import { splitMessageContentIntoSegments } from '../utils/splitMessageContentIntoSegments';
import styles from './Chat.module.css';
import { chatCssClassNames } from './chatCssClassNames';
import { ChatMessageRichContent } from './ChatMessageRichContent';
import { ChatMessageToolCallChips } from './ChatMessageToolCallChips';
import type { ChatProps } from './ChatProps';
import { ChatReplyPreview } from './ChatReplyPreview';
import { createChatMessageToolCallRenderModel } from './createChatMessageToolCallRenderModel';
import { createProgressCardChecklistMarkdown, isProgressCardVisible } from './createProgressCardChecklistMarkdown';
import { resolveStreamingFeaturePlaceholderKind } from './StreamingFeaturePlaceholder';
import { useChatMessageAvatarTooltip } from './useChatMessageAvatarTooltip';
import { useChatMessageSpeechPlayback } from './useChatMessageSpeechPlayback';

/**
 * Props for the `ChatMessageItem` component
 *
 * @private props for internal subcomponent
 */
type ChatMessageItemProps = Pick<
    ChatProps,
    'onMessage' | 'onActionButton' | 'onQuickMessageButton' | 'participants'
> & {
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
     * Optional metadata about teammates for team tool calls
     * Maps tool name to agent information
     */
    teammates?: ChatProps['teammates'];
    /**
     * Called when the user chooses to reply to this message.
     */
    onReplyToMessage?: ChatProps['onReplyToMessage'];
    /**
     * Determines whether this message can be replied to.
     */
    canReplyToMessage?: ChatProps['canReplyToMessage'];
    /**
     * Optional cached metadata keyed by TEAM tool names to enrich tool call chips.
     */
    teamAgentProfiles?: ChatProps['teamAgentProfiles'];
    /**
     * Controls whether assistant replies render as bubbles or article blocks.
     */
    visualMode?: ChatProps['visualMode'];
    /**
     * Called when a tool call chiplet is clicked.
     */
    onToolCallClick?: (toolCall: NonNullable<ChatMessage['toolCalls']>[number]) => void;

    /**
     * Called when a source citation chip is clicked.
     */
    onCitationClick?: (citation: ParsedCitation) => void;
    /**
     * Optional sound system for triggering tool chip events.
     */
    soundSystem?: ChatProps['soundSystem'];
    /**
     * Controls whether the play button below the message is shown.
     */
    isSpeechPlaybackEnabled?: ChatProps['isSpeechPlaybackEnabled'];
    readonly elevenLabsVoiceId?: ChatProps['elevenLabsVoiceId'];
    /**
     * Optional localized labels for Chat UI elements such as lifecycle badges.
     */
    chatUiTranslations?: ChatProps['chatUiTranslations'];
};

/**
 * One quick button entry paired with its stable index inside the current message.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type RenderableMessageButton = {
    readonly button: MessageButton;
    readonly buttonIndex: number;
};

/**
 * Layout variants used for message-level utility actions (copy/read/feedback).
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type MessageActionsLayout = 'bubble-overlay' | 'article-footer';

/**
 * Gesture thresholds used for touch swipe-to-reply.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const REPLY_SWIPE_DIRECTION_LOCK_PX = 16;
const REPLY_SWIPE_TRIGGER_PX = 60;
const REPLY_SWIPE_MAX_TRANSLATE_PX = 84;

/**
 * Resolves the compact lifecycle badge label rendered below durable chat messages.
 *
 * Completed messages intentionally return `null` so the UI stays focused on active or exceptional states.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function resolveMessageLifecycleLabel(
    message: ChatMessage,
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations,
): string | null {
    if (message.sender === 'USER' && message.lifecycleState === 'queued') {
        return chatUiTranslations?.lifecycleSending || 'Sending';
    }

    switch (message.lifecycleState) {
        case 'queued':
            return chatUiTranslations?.lifecycleQueued || 'Queued';
        case 'running':
            return chatUiTranslations?.lifecycleRunning || 'Running';
        case 'failed':
            return chatUiTranslations?.lifecycleFailed || 'Failed';
        case 'cancelled':
            return chatUiTranslations?.lifecycleCancelled || 'Cancelled';
        case 'completed':
            return null;
        default:
            return null;
    }
}

/**
 * Default template used for assistant response-duration metadata.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const DEFAULT_ANSWER_DURATION_LABEL = '{duration} to answer';

/**
 * Resolves one localized assistant response-duration label.
 *
 * @param durationLabel - Compact duration text such as `3.3s`.
 * @param timingTranslations - Optional translation overrides from the host application.
 * @returns Final label rendered next to the timestamp.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function formatAnswerDurationLabel(
    durationLabel: string,
    timingTranslations?: ChatProps['timingTranslations'],
): string {
    const template = timingTranslations?.answerDurationLabel || DEFAULT_ANSWER_DURATION_LABEL;
    return template.replace(/\{duration\}/g, durationLabel);
}

/**
 * Renders a single chat message item with avatar, content, buttons, and rating.
 *
 * @private internal subcomponent of `<Chat>` component
 */
export const ChatMessageItem = memo(
    //                           <- TODO: [🧠] Should we wrap more components in `React.memo`
    //                                          Or make normal function from this?
    (props: ChatMessageItemProps) => {
        const {
            message,
            participant,
            participants,
            isLastMessage,
            onMessage,
            onActionButton,
            onQuickMessageButton,
            setExpandedMessageId,
            isExpanded,
            currentRating,
            handleRating,
            mode,
            isCopyButtonEnabled,
            isFeedbackEnabled,
            feedbackMode = 'stars',
            feedbackTranslations,
            timingTranslations,
            chatLocale,
            onCopy,
            onCreateAgent,
            toolTitles,
            teammates,
            onReplyToMessage,
            canReplyToMessage,
            teamAgentProfiles,
            visualMode = 'ARTICLE_MODE',
            onToolCallClick,
            onCitationClick,
            soundSystem,
            isSpeechPlaybackEnabled,
            elevenLabsVoiceId,
            chatUiTranslations,
        } = props;
        const {
            isComplete = true,
            // <- TODO: Destruct all `messages` properties like `isComplete`
        } = message;
        const avatarSrc = participant?.avatarSrc || null;
        const avatarDefinition = participant?.avatarDefinition || null;
        const avatarVisualId = participant?.avatarVisualId || null;
        const {
            avatarRef,
            tooltipRef,
            isAvatarTooltipVisible,
            avatarTooltipPosition,
            showTooltip,
            handleMouseEnter,
            handleMouseLeave,
        } = useChatMessageAvatarTooltip();
        const toolCallChipCountRef = useRef(0);

        const isMe = participant?.isMe;
        const isAgentArticleMode = visualMode === 'ARTICLE_MODE' && !isMe;
        const timingDisplay = getChatMessageTimingDisplay(message, chatLocale);
        const replyPreviewLabel = chatUiTranslations?.replyingToLabel || 'Replying to';
        const replyActionLabel = chatUiTranslations?.replyActionLabel || 'Reply';
        const replyActionTitle = chatUiTranslations?.replyActionTitle || 'Reply to this message';
        const isReplyActionEnabled = Boolean(
            onReplyToMessage && (canReplyToMessage ? canReplyToMessage(message) : Boolean(message.id && isComplete)),
        );
        const shouldShowTiming = Boolean(isComplete && timingDisplay);
        const lifecycleBadgeLabel = resolveMessageLifecycleLabel(message, chatUiTranslations);
        const shouldShowMessageMeta = Boolean(shouldShowTiming || lifecycleBadgeLabel || isReplyActionEnabled);
        const shouldShowParticipantLabel = (participants || []).some((entry) => entry.name === 'TEAMMATE');
        const participantLabel = participant?.fullname || participant?.name;
        const trimmedMessageContent = message.content.trim();
        const visibleProgressCard = isProgressCardVisible(message.progressCard) ? message.progressCard : null;
        const shouldRenderProgressChecklist = Boolean(
            visibleProgressCard && !isComplete && trimmedMessageContent.length === 0,
        );
        const progressChecklistMarkdown = useMemo(
            () =>
                shouldRenderProgressChecklist && visibleProgressCard
                    ? createProgressCardChecklistMarkdown(visibleProgressCard)
                    : '',
            [shouldRenderProgressChecklist, visibleProgressCard],
        );
        const renderedMessageContent = shouldRenderProgressChecklist ? progressChecklistMarkdown : message.content;
        const color = Color.fromSafe(
            (participant && participant.color) || (isMe ? USER_CHAT_COLOR : PROMPTBOOK_CHAT_COLOR),
        );
        const colorOfText = color.then(textColor);
        const { contentWithoutButtons, buttons } = parseMessageButtons(renderedMessageContent);
        const sanitizedContentWithoutButtons = useMemo(
            () => sanitizeStreamingMessageContent(contentWithoutButtons, { isComplete }),
            [contentWithoutButtons, isComplete],
        );
        const streamingFeatureBoundary = useMemo(() => {
            if (isComplete) {
                return null;
            }

            return getLatestStreamingFeatureBoundary(contentWithoutButtons);
        }, [contentWithoutButtons, isComplete]);
        const streamingFeaturePlaceholderKind = useMemo(() => {
            if (!streamingFeatureBoundary) {
                return null;
            }

            return resolveStreamingFeaturePlaceholderKind(streamingFeatureBoundary, contentWithoutButtons);
        }, [contentWithoutButtons, streamingFeatureBoundary]);
        const citationFootnoteRenderModel = useMemo(
            () =>
                createCitationFootnoteRenderModel({
                    content: sanitizedContentWithoutButtons,
                    citations: message.citations,
                }),
            [message.citations, sanitizedContentWithoutButtons],
        );
        const structuredSourceCitations = useMemo(() => {
            const footnoteSourceKeys = new Set(
                citationFootnoteRenderModel.footnotes.map((footnote) => footnote.citation.source.trim().toLowerCase()),
            );

            return (message.sources || []).filter((source) => {
                const sourceKey = source.source.trim().toLowerCase();
                return sourceKey && !footnoteSourceKeys.has(sourceKey);
            });
        }, [citationFootnoteRenderModel.footnotes, message.sources]);
        const contentSegments = useMemo(
            () => splitMessageContentIntoSegments(citationFootnoteRenderModel.content),
            [citationFootnoteRenderModel.content],
        );
        const hasMapSegment = useMemo(
            () => contentSegments.some((segment) => segment.type === 'map'),
            [contentSegments],
        );
        const [localHoveredRating, setLocalHoveredRating] = useState(0);
        const [copied, setCopied] = useState(false);
        const [tooltipAlign, setTooltipAlign] = useState<'center' | 'left' | 'right'>('center');
        const copyTooltipRef = useRef<HTMLSpanElement>(null);
        const contentWithoutButtonsRef = useRef<HTMLDivElement>(null);
        const [pendingActionButtonIndex, setPendingActionButtonIndex] = useState<number | null>(null);
        const [consumedActionButtonIndexes, setConsumedActionButtonIndexes] = useState<ReadonlySet<number>>(
            () => new Set(),
        );
        const [replySwipeDistance, setReplySwipeDistance] = useState(0);
        const isReportIssueFeedbackMode = feedbackMode === 'report_issue';
        const replySwipeGestureRef = useRef<{
            pointerId: number;
            startX: number;
            startY: number;
            isHorizontalSwipeLocked: boolean;
        } | null>(null);

        const { toolCallChips, transitiveCitations } = useMemo(
            () =>
                createChatMessageToolCallRenderModel({
                    message,
                    teammates,
                    teamAgentProfiles,
                    locale: chatLocale,
                    toolTitles,
                    chatUiTranslations,
                }),
            [message, teammates, teamAgentProfiles, chatLocale, toolTitles, chatUiTranslations],
        );
        const toolCallChipCount = toolCallChips.length;
        const renderableButtons = useMemo<ReadonlyArray<RenderableMessageButton>>(
            () =>
                buttons.reduce<Array<RenderableMessageButton>>((nextButtons, button, buttonIndex) => {
                    if (button.type === 'message') {
                        if (onQuickMessageButton || onMessage) {
                            nextButtons.push({ button, buttonIndex });
                        }

                        return nextButtons;
                    }

                    if (!onActionButton || consumedActionButtonIndexes.has(buttonIndex)) {
                        return nextButtons;
                    }

                    nextButtons.push({ button, buttonIndex });
                    return nextButtons;
                }, []),
            [buttons, consumedActionButtonIndexes, onActionButton, onMessage, onQuickMessageButton],
        );
        const shouldShowButtons = isLastMessage && renderableButtons.length > 0;
        const speechPlaybackEnabled = isSpeechPlaybackEnabled ?? true;
        const shouldShowPlayButton = speechPlaybackEnabled && trimmedMessageContent.length > 0;
        const { audioError, isAudioLoading, isAudioPlaying, handlePlayMessage } = useChatMessageSpeechPlayback({
            trimmedMessageContent,
            contentRef: contentWithoutButtonsRef,
            shouldShowPlayButton,
            elevenLabsVoiceId,
        });
        const playButtonTitle = audioError ?? (isAudioPlaying ? 'Pause message playback' : 'Read message aloud');
        const messageActionsLayout: MessageActionsLayout = isAgentArticleMode ? 'article-footer' : 'bubble-overlay';
        const shouldRenderCopyAndPlayControls = Boolean(isCopyButtonEnabled && isComplete);
        const shouldRenderFeedbackControls = Boolean(isFeedbackEnabled && feedbackMode !== 'off' && isComplete);
        const shouldRenderArticleActionsBar =
            messageActionsLayout === 'article-footer' &&
            (shouldRenderCopyAndPlayControls || shouldRenderFeedbackControls);
        const replyingToMessage = message.replyingTo;
        const replyPreviewText = useMemo(
            () =>
                replyingToMessage
                    ? resolveChatMessageReplyPreviewText(
                          {
                              content: replyingToMessage.content,
                              attachmentNames: replyingToMessage.attachmentNames,
                          },
                          { maxLength: 180, emptyLabel: 'Original message' },
                      )
                    : null,
            [replyingToMessage],
        );
        const replySenderLabel = useMemo(
            () =>
                replyingToMessage
                    ? resolveChatMessageReplySenderLabel({
                          sender: replyingToMessage.sender,
                          participants,
                      })
                    : null,
            [participants, replyingToMessage],
        );
        const swipeDirectionMultiplier = isMe ? -1 : 1;
        const swipeTranslation = `${isMe ? -replySwipeDistance : replySwipeDistance}px`;
        const isReplySwipeArmed = replySwipeDistance >= REPLY_SWIPE_TRIGGER_PX * 0.5;
        const articleModeBackgroundColor = mode === 'DARK' ? 'rgba(15, 23, 42, 0.78)' : '#ffffff';
        const articleModeTextColor = mode === 'DARK' ? '#e2e8f0' : '#0f172a';

        /**
         * Renders the optional message utility buttons used for copy/read actions.
         *
         * @returns Message utility controls or `null` when disabled.
         * @private
         */
        const renderMessageReadAndCopyControls = (): ReactElement | null => {
            if (!shouldRenderCopyAndPlayControls) {
                return null;
            }

            return (
                <div
                    className={classNames(
                        styles.copyButtonContainer,
                        messageActionsLayout === 'article-footer' && styles.articleModeMessageControls,
                    )}
                >
                    <div className={styles.messageControlGroup}>
                        {shouldShowPlayButton && (
                            <button
                                type="button"
                                className={styles.playButton}
                                title={playButtonTitle}
                                aria-label={playButtonTitle}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void handlePlayMessage();
                                }}
                                disabled={isAudioLoading}
                            >
                                {isAudioLoading ? (
                                    <span className={styles.playButtonSpinner} aria-hidden="true" />
                                ) : isAudioPlaying ? (
                                    <Pause className={styles.playButtonIcon} aria-hidden="true" />
                                ) : (
                                    <Play className={styles.playButtonIcon} aria-hidden="true" />
                                )}
                            </button>
                        )}
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
                                        clipboardItems['text/plain'] = new Blob([plain], {
                                            type: 'text/plain',
                                        });
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
                </div>
            );
        };

        /**
         * Renders feedback controls for one completed message.
         *
         * @returns Feedback controls or `null` when disabled.
         * @private
         */
        const renderMessageFeedbackControls = (): ReactElement | null => {
            if (!shouldRenderFeedbackControls) {
                return null;
            }

            return (
                <div
                    className={classNames(
                        styles.rating,
                        messageActionsLayout === 'article-footer' && styles.articleModeRating,
                    )}
                    onMouseEnter={
                        isReportIssueFeedbackMode
                            ? undefined
                            : () => {
                                  setExpandedMessageId(message.id || message.content /* <-[💃] */);
                              }
                    }
                    onMouseLeave={
                        isReportIssueFeedbackMode
                            ? undefined
                            : () => {
                                  setExpandedMessageId(null);
                                  setLocalHoveredRating(0);
                              }
                    }
                >
                    {isReportIssueFeedbackMode ? (
                        <button
                            type="button"
                            onClick={() => handleRating(message, 1)}
                            className={styles.feedbackIssueButton}
                            aria-label={
                                feedbackTranslations?.reportIssueButtonAriaLabel || 'Report issue with this response'
                            }
                            title={feedbackTranslations?.reportIssueButtonTitle || 'Report issue'}
                        >
                            ⚠
                        </button>
                    ) : isExpanded ? (
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
                                    } as CSSProperties
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
                                } as CSSProperties
                            }
                        >
                            ⭐
                        </span>
                    )}
                </div>
            );
        };

        /**
         * Executes one quick action button and marks it consumed after a successful run.
         *
         * @param buttonIndex Stable button index inside the parsed message.
         * @param code JavaScript source generated for the quick action.
         * @returns Promise resolved when the action finishes.
         * @private
         */
        const handleActionButtonClick = useCallback(
            async (buttonIndex: number, code: string): Promise<void> => {
                if (!onActionButton || pendingActionButtonIndex === buttonIndex) {
                    return;
                }

                setPendingActionButtonIndex(buttonIndex);

                try {
                    await onActionButton(code);
                    setConsumedActionButtonIndexes((previousIndexes) => {
                        const nextIndexes = new Set(previousIndexes);
                        nextIndexes.add(buttonIndex);
                        return nextIndexes;
                    });
                } finally {
                    setPendingActionButtonIndex((currentButtonIndex) =>
                        currentButtonIndex === buttonIndex ? null : currentButtonIndex,
                    );
                }
            },
            [onActionButton, pendingActionButtonIndex],
        );

        const resetReplySwipe = useCallback(() => {
            replySwipeGestureRef.current = null;
            setReplySwipeDistance(0);
        }, []);

        const handleReplyPointerDown = useCallback(
            (event: ReactPointerEvent<HTMLDivElement>) => {
                if (!isReplyActionEnabled || event.pointerType !== 'touch') {
                    return;
                }

                replySwipeGestureRef.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    isHorizontalSwipeLocked: false,
                };
            },
            [isReplyActionEnabled],
        );

        const handleReplyPointerMove = useCallback(
            (event: ReactPointerEvent<HTMLDivElement>) => {
                const gesture = replySwipeGestureRef.current;
                if (!gesture || gesture.pointerId !== event.pointerId) {
                    return;
                }

                const directionalDeltaX = (event.clientX - gesture.startX) * swipeDirectionMultiplier;
                const absoluteDeltaY = Math.abs(event.clientY - gesture.startY);

                if (!gesture.isHorizontalSwipeLocked) {
                    if (
                        absoluteDeltaY > REPLY_SWIPE_DIRECTION_LOCK_PX &&
                        absoluteDeltaY > Math.abs(directionalDeltaX)
                    ) {
                        resetReplySwipe();
                        return;
                    }

                    if (directionalDeltaX <= REPLY_SWIPE_DIRECTION_LOCK_PX || directionalDeltaX <= absoluteDeltaY) {
                        return;
                    }

                    gesture.isHorizontalSwipeLocked = true;
                }

                event.preventDefault();
                setReplySwipeDistance(Math.max(0, Math.min(REPLY_SWIPE_MAX_TRANSLATE_PX, directionalDeltaX)));
            },
            [resetReplySwipe, swipeDirectionMultiplier],
        );

        const handleReplyPointerEnd = useCallback(
            (event: ReactPointerEvent<HTMLDivElement>) => {
                const gesture = replySwipeGestureRef.current;
                if (!gesture || gesture.pointerId !== event.pointerId) {
                    return;
                }

                const shouldStartReply = replySwipeDistance >= REPLY_SWIPE_TRIGGER_PX;
                resetReplySwipe();

                if (shouldStartReply) {
                    onReplyToMessage?.(message);
                }
            },
            [message, onReplyToMessage, replySwipeDistance, resetReplySwipe],
        );

        useEffect(() => {
            if (!isExpanded) {
                setLocalHoveredRating(0);
            }
        }, [isExpanded]);

        useEffect(() => {
            setReplySwipeDistance(0);
            replySwipeGestureRef.current = null;
        }, [message.id]);

        useEffect(() => {
            if (toolCallChipCount > toolCallChipCountRef.current) {
                if (soundSystem) {
                    /* not await */ soundSystem.play('tool_call_chip');
                }
            }

            toolCallChipCountRef.current = toolCallChipCount;
        }, [soundSystem, toolCallChipCount]);

        return (
            <div
                className={classNames(
                    styles.chatMessage,
                    isMe && styles.isMe,
                    !isComplete && styles.isNotCompleteMessage,
                    hasMapSegment && styles.messageWithMap,
                    isAgentArticleMode && styles.articleModeAgentMessage,
                    chatCssClassNames.chatMessage,
                    isMe ? chatCssClassNames.userMessage : chatCssClassNames.agentResponse,
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
                {(avatarSrc || (avatarDefinition && avatarVisualId)) && (
                    <div
                        ref={avatarRef}
                        className={classNames(
                            styles.avatar,
                            isAgentArticleMode && styles.articleModeAgentAvatar,
                            chatCssClassNames.messageAvatar,
                            isMe ? chatCssClassNames.userAvatar : chatCssClassNames.agentAvatar,
                        )}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={showTooltip}
                    >
                        {avatarSrc ? (
                            <div
                                style={
                                    {
                                        width: '100%',
                                        height: '100%',
                                        aspectRatio: '1 / 1',

                                        backgroundImage: `url(${participant?.avatarSrc || colorToDataUrl(color)})`,
                                        backgroundColor: color.toHex(),
                                        backgroundRepeat: 'no-repeat',
                                        backgroundSize: 'cover',
                                        borderRadius: '50%',
                                        backgroundPosition: '50% 20%', // <- Note: Center avatar image to the head
                                        '--avatar-bg-color': color.toHex(), // <- TODO: Maybe remove these deprecated CSS variables
                                    } as CSSProperties
                                }
                            />
                        ) : (
                            <AvatarOrImage
                                avatarDefinition={avatarDefinition}
                                visualId={avatarVisualId}
                                size={42}
                                alt={String(participantLabel || 'Agent avatar')}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    aspectRatio: '1 / 1',
                                    borderRadius: '50%',
                                }}
                            />
                        )}
                        {isAvatarTooltipVisible && participant?.agentSource && avatarTooltipPosition && (
                            <AvatarProfileTooltip
                                ref={tooltipRef}
                                agentSource={participant.agentSource}
                                position={avatarTooltipPosition}
                            />
                        )}
                    </div>
                )}

                <div className={classNames(styles.messageStack, chatCssClassNames.messageStack)}>
                    {shouldShowParticipantLabel && participantLabel && (
                        <div className={styles.participantLabel}>{participantLabel}</div>
                    )}
                    <div
                        className={classNames(
                            styles.messageText,
                            isReplyActionEnabled && styles.replyEnabledMessageText,
                            isReplySwipeArmed && styles.replySwipeActive,
                            isAgentArticleMode && styles.articleModeAgentMessageText,
                            chatCssClassNames.messageContent,
                        )}
                        style={
                            {
                                '--message-bg-color': isAgentArticleMode ? articleModeBackgroundColor : color.toHex(),
                                '--message-text-color': isAgentArticleMode ? articleModeTextColor : colorOfText.toHex(),
                                '--chat-message-swipe-offset': swipeTranslation,
                            } as CSSProperties
                        }
                        onPointerDown={handleReplyPointerDown}
                        onPointerMove={handleReplyPointerMove}
                        onPointerUp={handleReplyPointerEnd}
                        onPointerCancel={resetReplySwipe}
                    >
                        {isReplyActionEnabled && (
                            <div
                                className={classNames(
                                    styles.replySwipeIndicator,
                                    isMe && styles.replySwipeIndicatorRight,
                                    isReplySwipeArmed && styles.replySwipeIndicatorActive,
                                )}
                                aria-hidden="true"
                            >
                                <Reply className={styles.replySwipeIndicatorIcon} />
                            </div>
                        )}
                        {!shouldRenderArticleActionsBar && renderMessageReadAndCopyControls()}
                        {message.isVoiceCall && (
                            <div className={styles.voiceCallIndicator}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg>
                            </div>
                        )}

                        {replyingToMessage && replyPreviewText && replySenderLabel && (
                            <ChatReplyPreview
                                label={replyPreviewLabel}
                                senderLabel={replySenderLabel}
                                previewText={replyPreviewText}
                                className={styles.replyBubblePreview}
                            />
                        )}

                        <div ref={contentWithoutButtonsRef}>
                            <ChatMessageRichContent
                                content={message.content}
                                contentSegments={contentSegments}
                                streamingFeaturePlaceholderKind={streamingFeaturePlaceholderKind}
                                onCreateAgent={onCreateAgent}
                                mode={mode}
                            />
                        </div>

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

                        <ChatMessageToolCallChips chips={toolCallChips} onToolCallClick={onToolCallClick} />
                        {citationFootnoteRenderModel.footnotes.length > 0 && (
                            <div className={styles.citationFootnotes}>
                                {citationFootnoteRenderModel.footnotes.map((footnote) => (
                                    <div
                                        key={`citation-footnote-${footnote.number}-${footnote.citation.source}`}
                                        className={styles.citationFootnoteItem}
                                    >
                                        <span className={styles.citationFootnoteNumber}>{footnote.number}</span>
                                        <SourceChip
                                            citation={footnote.citation}
                                            onClick={onCitationClick}
                                            isCitationIdVisible={false}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        {structuredSourceCitations.length > 0 && (
                            <div className={styles.sourceCitations}>
                                {structuredSourceCitations.map((citation, index) => (
                                    <SourceChip
                                        key={`message-source-${citation.source}-${citation.id}-${index}`}
                                        citation={citation}
                                        onClick={onCitationClick}
                                        isCitationIdVisible={false}
                                    />
                                ))}
                            </div>
                        )}
                        {transitiveCitations.length > 0 && (
                            <div className={styles.sourceCitations}>
                                {transitiveCitations.map((citation, index) => (
                                    <SourceChip
                                        key={`team-source-${citation.source}-${index}`}
                                        citation={citation}
                                        suffix={`by ${citation.origin.label}`}
                                        onClick={onCitationClick}
                                    />
                                ))}
                            </div>
                        )}

                        {shouldShowButtons && (
                            <div className={styles.messageButtons}>
                                {renderableButtons.map(({ button, buttonIndex }) => (
                                    <button
                                        key={buttonIndex}
                                        type="button"
                                        className={classNames(
                                            styles.messageButton,
                                            button.type === 'action' && styles.actionMessageButton,
                                        )}
                                        onClick={(event) => {
                                            event.stopPropagation();

                                            if (button.type === 'message') {
                                                const quickMessageHandler = onQuickMessageButton || onMessage;
                                                if (quickMessageHandler) {
                                                    void quickMessageHandler(button.message);
                                                }
                                                return;
                                            }

                                            void handleActionButtonClick(buttonIndex, button.code);
                                        }}
                                        disabled={button.type === 'action' && pendingActionButtonIndex === buttonIndex}
                                        title={button.type === 'action' ? 'Runs an action in your browser' : undefined}
                                        // <- TODO: [🐱‍🚀] `Color` should work with forma `#ff00ff55` *(with alpha)*
                                    >
                                        <MarkdownContent content={button.text} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {!shouldRenderArticleActionsBar && renderMessageFeedbackControls()}
                        {shouldRenderArticleActionsBar && (
                            <div className={styles.articleModeMessageActions}>
                                {renderMessageReadAndCopyControls()}
                                {renderMessageFeedbackControls()}
                            </div>
                        )}
                    </div>
                    {shouldShowMessageMeta && (
                        <div
                            className={styles.messageMeta}
                            title={shouldShowTiming && timingDisplay ? timingDisplay.fullLabel : undefined}
                        >
                            {lifecycleBadgeLabel && (
                                <span className={styles.messageLifecycleBadge}>{lifecycleBadgeLabel}</span>
                            )}
                            {shouldShowTiming && timingDisplay && (
                                <>
                                    <span className={styles.messageTimestamp}>{timingDisplay.timeLabel}</span>
                                    {!isMe && timingDisplay.durationLabel && (
                                        <span className={styles.messageDuration}>
                                            (
                                            {formatAnswerDurationLabel(timingDisplay.durationLabel, timingTranslations)}
                                            )
                                        </span>
                                    )}
                                </>
                            )}
                            {isReplyActionEnabled && (
                                <button
                                    type="button"
                                    className={styles.messageReplyButton}
                                    aria-label={replyActionTitle}
                                    title={replyActionTitle}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onReplyToMessage?.(message);
                                    }}
                                >
                                    <Reply className={styles.messageReplyButtonIcon} />
                                    <span>{replyActionLabel}</span>
                                </button>
                            )}
                        </div>
                    )}
                    {message.lifecycleError && (
                        <div className={styles.messageLifecycleError}>{message.lifecycleError}</div>
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

        if (prev.message.createdAt !== next.message.createdAt) {
            return false;
        }

        if (prev.message.generationDurationMs !== next.message.generationDurationMs) {
            return false;
        }

        if (prev.message.lifecycleState !== next.message.lifecycleState) {
            return false;
        }

        if (prev.message.lifecycleError !== next.message.lifecycleError) {
            return false;
        }

        if (prev.message.clientMessageId !== next.message.clientMessageId) {
            return false;
        }

        if (prev.message.jobId !== next.message.jobId) {
            return false;
        }

        if (prev.message.toolCalls !== next.message.toolCalls) {
            return false;
        }

        if (prev.message.completedToolCalls !== next.message.completedToolCalls) {
            return false;
        }

        if (prev.message.ongoingToolCalls !== next.message.ongoingToolCalls) {
            return false;
        }

        if (prev.message.citations !== next.message.citations) {
            return false;
        }

        if (prev.message.sources !== next.message.sources) {
            return false;
        }

        if (JSON.stringify(prev.message.attachments) !== JSON.stringify(next.message.attachments)) {
            return false;
        }

        if (JSON.stringify(prev.message.replyingTo) !== JSON.stringify(next.message.replyingTo)) {
            return false;
        }

        if ((prev.message.isComplete ?? true) !== (next.message.isComplete ?? true)) {
            return false;
        }

        if ((prev.message.isVoiceCall ?? false) !== (next.message.isVoiceCall ?? false)) {
            return false;
        }

        if (prev.message.progressCard !== next.message.progressCard) {
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

        if (prev.onQuickMessageButton !== next.onQuickMessageButton) {
            return false;
        }

        if (prev.onReplyToMessage !== next.onReplyToMessage) {
            return false;
        }

        if (prev.canReplyToMessage !== next.canReplyToMessage) {
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

        if (prev.isFeedbackEnabled !== next.isFeedbackEnabled) {
            return false;
        }

        if (prev.feedbackMode !== next.feedbackMode) {
            return false;
        }

        if (prev.feedbackTranslations !== next.feedbackTranslations) {
            return false;
        }

        if (prev.handleRating !== next.handleRating) {
            return false;
        }

        if (prev.toolTitles !== next.toolTitles) {
            return false;
        }

        if (prev.teammates !== next.teammates) {
            return false;
        }

        if (prev.onToolCallClick !== next.onToolCallClick) {
            return false;
        }

        if (prev.onCitationClick !== next.onCitationClick) {
            return false;
        }

        if (prev.visualMode !== next.visualMode) {
            return false;
        }

        return prev.mode === next.mode;
    },
);
ChatMessageItem.displayName = 'ChatMessageItem';
