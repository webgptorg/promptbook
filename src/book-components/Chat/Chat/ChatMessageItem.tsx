'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { Pause, Play } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { colorToDataUrl } from '../../../_packages/color.index';
import { PROMPTBOOK_CHAT_COLOR, USER_CHAT_COLOR } from '../../../config';
import type { ToolCall } from '../../../types/ToolCall';
import { isAssistantPreparationToolCall } from '../../../types/ToolCall';
import type { id } from '../../../types/typeAliases';
import { attachClientVersionHeader } from '../../../utils/clientVersion';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { getToolCallIdentity } from '../../../utils/toolCalls/getToolCallIdentity';
import { classNames } from '../../_common/react-utils/classNames';
import { AvatarProfileTooltip } from '../../AvatarProfile/AvatarProfile/AvatarProfileTooltip';
import { AgentChip, type AgentChipData } from '../AgentChip';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import { SourceChip } from '../SourceChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { collectTeamToolCallSummary } from '../utils/collectTeamToolCallSummary';
import { isTeamToolName } from '../utils/createTeamToolNameFromUrl';
import { getChatMessageTimingDisplay } from '../utils/getChatMessageTimingDisplay';
import type { ToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import { buildToolCallChipText, getToolCallChipletInfo, TOOL_TITLES } from '../utils/getToolCallChipletInfo';
import {
    dedupeCitationsBySource,
    extractCitationsFromMessage,
    type ParsedCitation,
} from '../utils/parseCitationsFromContent';
import { parseMessageButtons } from '../utils/parseMessageButtons';
import { parseToolCallArguments } from '../utils/toolCallParsing';
import styles from './Chat.module.css';
import type { ChatProps } from './ChatProps';
import { LOADING_INTERACTIVE_IMAGE } from './constants';
import { ImagePromptRenderer } from './ImagePromptRenderer';
import { ChatMessageMap } from './ChatMessageMap';
import { splitMessageContentIntoSegments } from '../utils/splitMessageContentIntoSegments';
import { sanitizeStreamingMessageContent } from '../utils/sanitizeStreamingMessageContent';

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
     * Optional metadata about teammates for team tool calls
     * Maps tool name to agent information
     */
    teammates?: TeammatesMap;
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
};

/**
 * Metadata for a teammate agent tool.
 */
type TeammateMetadata = {
    url: string;
    label?: string;
    instructions?: string;
    toolName: string;
};

/**
 * Lookup map of teammate metadata by tool name.
 */
type TeammatesMap = Record<string, TeammateMetadata>;

/**
 * Maximum characters allowed in a single ElevenLabs speech request.
 *
 * @private
 */
const MAX_MESSAGE_SPEECH_LENGTH = 4500;

/**
 * Finds teammate metadata by tool name, falling back to the toolName field when needed.
 */
function findTeammateByToolName(teammates: TeammatesMap | undefined, toolName: string): TeammateMetadata | undefined {
    if (!teammates) {
        return undefined;
    }

    return teammates[toolName] || Object.values(teammates).find((teammate) => teammate.toolName === toolName);
}

/**
 * Resolves agent chip data for TEAM tool calls using tool results or teammate metadata.
 */
function resolveTeamAgentChipData(
    toolCall: NonNullable<ChatMessage['toolCalls']>[number],
    teammates: TeammatesMap | undefined,
    chipletInfo?: ToolCallChipletInfo,
): AgentChipData | null {
    const resolvedChipletInfo = chipletInfo || getToolCallChipletInfo(toolCall);

    if (resolvedChipletInfo.agentData) {
        return resolvedChipletInfo.agentData;
    }

    if (!isTeamToolName(toolCall.name)) {
        return null;
    }

    const teammate = findTeammateByToolName(teammates, toolCall.name);
    if (!teammate?.url) {
        return null;
    }

    return {
        url: teammate.url,
        label: teammate.label,
    };
}

/**
 * Ongoing tool call entry used for grouping.
 */
type OngoingToolCall = NonNullable<ChatMessage['ongoingToolCalls']>[number];

/**
 * Grouped ongoing tool call metadata for rendering.
 */
type OngoingToolCallGroup = {
    /**
     * Stable key for the grouped tool call entry.
     */
    key: string;
    /**
     * Representative tool call for the group.
     */
    toolCall: OngoingToolCall;
    /**
     * Number of ongoing tool calls in this group.
     */
    count: number;
    /**
     * Optional display title for the tool call chip.
     */
    displayTitle?: string;
    /**
     * Emoji used for the tool call chip.
     */
    emoji: string;
    /**
     * Optional agent data for TEAM tool calls.
     */
    teamAgentData: AgentChipData | null;
};

/**
 * Appends a count suffix when multiple ongoing tool calls share the same group.
 */
function appendOngoingToolCallCount(label: string, count: number): string {
    if (count <= 1) {
        return label;
    }

    return `${label} (${count}x)`;
}

/**
 * Builds the label for an ongoing tool call group.
 */
function buildOngoingToolCallLabel(group: OngoingToolCallGroup): string {
    const baseLabel = group.displayTitle || `Executing ${group.toolCall.name}`;
    return appendOngoingToolCallCount(baseLabel, group.count);
}

/**
 * Extracts the assistant preparation phase for grouping, when present.
 */
function getOngoingToolCallPreparationPhase(toolCall: OngoingToolCall): string | undefined {
    if (!isAssistantPreparationToolCall(toolCall)) {
        return undefined;
    }

    const toolArguments = parseToolCallArguments(toolCall);
    return typeof toolArguments.phase === 'string' ? toolArguments.phase : undefined;
}

/**
 * Builds a stable participant identity for ongoing tool call grouping.
 */
function getOngoingToolCallParticipantKey(teamAgentData: AgentChipData | null): string {
    return teamAgentData?.url || '';
}

/**
 * Builds a stable grouping key for ongoing tool calls.
 */
function getOngoingToolCallGroupKey(
    toolCall: OngoingToolCall,
    options: {
        preparationPhase?: string;
        participantKey?: string;
    },
): string {
    return `${toolCall.name}::${options.preparationPhase || ''}::${options.participantKey || ''}`;
}

/**
 * Deduplicates a list of tool calls by their stable identity, keeping the most recent entry.
 *
 * @private internal utility of `<ChatMessageItem/>`
 */
function dedupeToolCalls(toolCalls: ReadonlyArray<ToolCall> | undefined): Array<ToolCall> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    const seen = new Map<string, ToolCall>();
    for (const toolCall of toolCalls) {
        const identity = getToolCallIdentity(toolCall);
        if (seen.has(identity)) {
            seen.delete(identity);
        }
        seen.set(identity, toolCall);
    }

    return Array.from(seen.values());
}

/**
 * Groups ongoing tool calls by tool identity to avoid duplicate chips.
 */
function groupOngoingToolCalls(
    toolCalls: ReadonlyArray<OngoingToolCall> | undefined,
    toolTitles: Record<string, string> | undefined,
    teammates: TeammatesMap | undefined,
): Array<OngoingToolCallGroup> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    const grouped = new Map<string, OngoingToolCallGroup>();
    const ordered: Array<OngoingToolCallGroup> = [];

    for (const toolCall of toolCalls) {
        const preparationPhase = getOngoingToolCallPreparationPhase(toolCall);
        const teamAgentData = resolveTeamAgentChipData(toolCall, teammates);
        const participantKey = getOngoingToolCallParticipantKey(teamAgentData);
        const groupKey = getOngoingToolCallGroupKey(toolCall, {
            preparationPhase,
            participantKey,
        });
        const existing = grouped.get(groupKey);

        if (existing) {
            existing.count += 1;
            continue;
        }

        const toolInfo = TOOL_TITLES[toolCall.name];
        const isTeamTool = isTeamToolName(toolCall.name);
        const toolTitle =
            toolTitles?.[toolCall.name] || toolInfo?.title || (isTeamTool ? 'Consulting teammate' : undefined);
        const displayTitle = preparationPhase ? `${toolTitle || toolCall.name}: ${preparationPhase}` : toolTitle;
        const emoji = isTeamTool ? '??' : toolInfo?.emoji || '???';

        const group: OngoingToolCallGroup = {
            key: groupKey,
            toolCall,
            count: 1,
            displayTitle,
            emoji,
            teamAgentData,
        };

        grouped.set(groupKey, group);
        ordered.push(group);
    }

    return ordered;
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
            teammates,
            onToolCallClick,
            onCitationClick,
            soundSystem,
            isSpeechPlaybackEnabled,
        } = props;
        const {
            isComplete = true,
            // <- TODO: Destruct all `messages` properties like `isComplete`
        } = message;
        const avatarSrc = participant?.avatarSrc || null;
        const [isAvatarTooltipVisible, setIsAvatarTooltipVisible] = useState(false);
        const [avatarTooltipPosition, setAvatarTooltipPosition] = useState<{ top: number; left: number } | null>(null);
        const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const avatarRef = useRef<HTMLDivElement>(null);
        const tooltipRef = useRef<HTMLDivElement>(null);
        const toolCallChipCountRef = useRef(0);

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
        const timingDisplay = getChatMessageTimingDisplay(message);
        const shouldShowTiming = Boolean(isComplete && timingDisplay);
        const shouldShowParticipantLabel = (participants || []).some((entry) => entry.name === 'TEAMMATE');
        const participantLabel = participant?.fullname || participant?.name;
        const color = Color.fromSafe(
            (participant && participant.color) || (isMe ? USER_CHAT_COLOR : PROMPTBOOK_CHAT_COLOR),
        );
        const colorOfText = color.then(textColor);
        const { contentWithoutButtons, buttons } = parseMessageButtons(message.content);
        const sanitizedContentWithoutButtons = useMemo(
            () => sanitizeStreamingMessageContent(contentWithoutButtons, { isComplete }),
            [contentWithoutButtons, isComplete],
        );
        const contentSegments = useMemo(
            () => splitMessageContentIntoSegments(sanitizedContentWithoutButtons),
            [sanitizedContentWithoutButtons],
        );
        const hasMapSegment = useMemo(
            () => contentSegments.some((segment) => segment.type === 'map'),
            [contentSegments],
        );
        const completedToolCalls = dedupeToolCalls(
            (message.toolCalls || message.completedToolCalls)?.filter(
                (toolCall) => !isAssistantPreparationToolCall(toolCall),
            ),
        );
        const teamToolCallSummary = useMemo(() => collectTeamToolCallSummary(completedToolCalls), [completedToolCalls]);
        const transitiveToolCalls = teamToolCallSummary.toolCalls;
        const transitiveCitations = teamToolCallSummary.citations;
        // Extract citations from message content
        const messageWithCitations = extractCitationsFromMessage(message);
        const citations = messageWithCitations.citations || [];
        const displayCitations = dedupeCitationsBySource(citations);
        const [localHoveredRating, setLocalHoveredRating] = useState(0);
        const [copied, setCopied] = useState(false);
        const [tooltipAlign, setTooltipAlign] = useState<'center' | 'left' | 'right'>('center');
        const copyTooltipRef = useRef<HTMLSpanElement>(null);
        const contentWithoutButtonsRef = useRef<HTMLDivElement>(null);
        const audioRef = useRef<HTMLAudioElement | null>(null);
        const [audioUrl, setAudioUrl] = useState<string | null>(null);
        const [isAudioLoading, setIsAudioLoading] = useState(false);
        const [isAudioPlaying, setIsAudioPlaying] = useState(false);
        const [audioError, setAudioError] = useState<string | null>(null);

        const ongoingToolCallGroups = useMemo(
            () => groupOngoingToolCalls(message.ongoingToolCalls, toolTitles, teammates),
            [message.ongoingToolCalls, toolTitles, teammates],
        );
        const completedToolCallCount = completedToolCalls?.length ?? 0;
        const transitiveToolCallCount = transitiveToolCalls.length;
        const ongoingToolCallCount = ongoingToolCallGroups.length;
        const toolCallChipCount = completedToolCallCount + transitiveToolCallCount + ongoingToolCallCount;
        const shouldShowButtons = isLastMessage && buttons.length > 0 && onMessage;
        const trimmedMessageContent = message.content.trim();
        const speechPlaybackEnabled = isSpeechPlaybackEnabled ?? true;
        const shouldShowPlayButton = speechPlaybackEnabled && trimmedMessageContent.length > 0;
        const playButtonTitle = audioError ?? (isAudioPlaying ? 'Pause message playback' : 'Read message aloud');

        /**
         * Attaches playback listeners to keep the UI in sync with the audio element.
         *
         * @private
         */
        const attachMessageAudioListeners = useCallback((element: HTMLAudioElement) => {
            element.onplay = () => {
                setIsAudioPlaying(true);
            };
            element.onpause = () => {
                setIsAudioPlaying(false);
            };
            element.onended = () => {
                setIsAudioPlaying(false);
                element.currentTime = 0;
            };
        }, []);

        /**
         * Derives the plain text that should be spoken, preferring the rendered node over raw markdown.
         *
         * @private
         */
        const getMessageTextForSpeech = useCallback(() => {
            const renderedText = contentWithoutButtonsRef.current?.innerText?.trim();
            if (renderedText) {
                return renderedText;
            }

            return trimmedMessageContent;
        }, [trimmedMessageContent]);

        /**
         * Fetches ElevenLabs speech audio (or replays cached audio) when the play button is pressed.
         *
         * @private
         */
        const handlePlayMessage = useCallback(async () => {
            if (isAudioLoading) {
                return;
            }

            if (!shouldShowPlayButton) {
                setAudioError('Nothing to read aloud.');
                return;
            }

            const speechText = getMessageTextForSpeech();
            if (!speechText) {
                setAudioError('Nothing to read aloud.');
                return;
            }

            const payloadText =
                speechText.length > MAX_MESSAGE_SPEECH_LENGTH
                    ? speechText.slice(0, MAX_MESSAGE_SPEECH_LENGTH).trim()
                    : speechText;

            if (!payloadText) {
                setAudioError('Nothing to read aloud.');
                return;
            }

            setAudioError(null);

            const playAudio = async (element: HTMLAudioElement) => {
                try {
                    await element.play();
                } catch (playError) {
                    setAudioError(playError instanceof Error ? playError.message : 'Browser blocked audio playback.');
                }
            };

            if (audioUrl) {
                const audio = audioRef.current ?? new Audio(audioUrl);
                audioRef.current = audio;
                attachMessageAudioListeners(audio);

                if (audio.paused) {
                    await playAudio(audio);
                } else {
                    audio.pause();
                }

                return;
            }

            setIsAudioLoading(true);
            try {
                const response = await fetch('/api/elevenlabs/tts', {
                    method: 'POST',
                    headers: attachClientVersionHeader({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ text: payloadText }),
                });

                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(body || 'Unable to request speech audio.');
                }

                const buffer = await response.arrayBuffer();
                const blob = new Blob([buffer], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                attachMessageAudioListeners(audio);

                setAudioUrl((previousUrl) => {
                    if (previousUrl) {
                        URL.revokeObjectURL(previousUrl);
                    }

                    return url;
                });

                await playAudio(audio);
            } catch (error) {
                setAudioError(error instanceof Error ? error.message : 'Failed to generate speech.');
            } finally {
                setIsAudioLoading(false);
            }
        }, [attachMessageAudioListeners, audioUrl, getMessageTextForSpeech, isAudioLoading, shouldShowPlayButton]);

        useEffect(() => {
            if (!isExpanded) {
                setLocalHoveredRating(0);
            }
        }, [isExpanded]);

        useEffect(() => {
            return () => {
                audioRef.current?.pause();
                audioRef.current = null;
            };
        }, []);

        useEffect(() => {
            return () => {
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }
            };
        }, [audioUrl]);

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

                <div className={styles.messageStack}>
                    {shouldShowParticipantLabel && participantLabel && (
                        <div className={styles.participantLabel}>{participantLabel}</div>
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
                        {isCopyButtonEnabled && isComplete && (
                            <div className={styles.copyButtonContainer}>
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

                                                await navigator.clipboard.write([
                                                    new window.ClipboardItem(clipboardItems),
                                                ]);
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
                                {contentSegments.map((segment, segmentIndex) => {
                                    if (segment.type === 'text') {
                                        return (
                                            <MarkdownContent
                                                key={`text-${segmentIndex}`}
                                                content={segment.content}
                                                onCreateAgent={onCreateAgent}
                                            />
                                        );
                                    }

                                    if (segment.type === 'image') {
                                        return (
                                            <ImagePromptRenderer
                                                key={`image-${segmentIndex}`}
                                                alt={segment.alt}
                                                prompt={segment.prompt}
                                            />
                                        );
                                    }

                                    if (segment.type === 'map') {
                                        return <ChatMessageMap key={`map-${segmentIndex}`} data={segment.data} />;
                                    }

                                    return null;
                                })}
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

                        {completedToolCalls && completedToolCalls.length > 0 && (
                            <div className={styles.completedToolCalls}>
                                {completedToolCalls.map((toolCall, index) => {
                                    const chipletInfo = getToolCallChipletInfo(toolCall);
                                    const chipletText = buildToolCallChipText(chipletInfo);
                                    const teamAgentData = resolveTeamAgentChipData(toolCall, teammates, chipletInfo);

                                    // If this is a team tool with agent data, use AgentChip
                                    if (teamAgentData) {
                                        return (
                                            <AgentChip
                                                key={index}
                                                agent={teamAgentData}
                                                isClickable={true}
                                                onClick={(event) => {
                                                    event?.stopPropagation?.();
                                                    if (onToolCallClick) {
                                                        onToolCallClick(toolCall);
                                                    }
                                                }}
                                            />
                                        );
                                    }

                                    // Otherwise, use the old button style
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
                                            {chipletText}
                                        </button>
                                    );
                                })}
                                {transitiveToolCalls.map((toolCallEntry, index) => {
                                    const chipletInfo = getToolCallChipletInfo(toolCallEntry.toolCall);
                                    const chipletText = buildToolCallChipText(chipletInfo);

                                    return (
                                        <button
                                            key={`team-tool-${index}`}
                                            className={styles.completedToolCall}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (onToolCallClick) {
                                                    onToolCallClick(toolCallEntry.toolCall);
                                                }
                                            }}
                                        >
                                            <span>{chipletText}</span>
                                            <span className={styles.toolCallOrigin}>
                                                by {toolCallEntry.origin.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {(displayCitations.length > 0 || transitiveCitations.length > 0) && (
                            <div className={styles.sourceCitations}>
                                {displayCitations.map((citation) => (
                                    <SourceChip
                                        key={`${citation.source}-${citation.url || 'no-url'}`}
                                        citation={citation}
                                        onClick={onCitationClick}
                                    />
                                ))}
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

                        {!isComplete && ongoingToolCallGroups.length > 0 && (
                            <div className={styles.ongoingToolCalls}>
                                {ongoingToolCallGroups.map((group) => {
                                    if (group.teamAgentData) {
                                        const labelSuffix = group.count > 1 ? ` (${group.count}x)` : '';

                                        return (
                                            <AgentChip
                                                key={group.key}
                                                agent={group.teamAgentData}
                                                isOngoing={true}
                                                labelSuffix={labelSuffix}
                                            />
                                        );
                                    }

                                    const label = buildOngoingToolCallLabel(group);

                                    return (
                                        <div key={group.key} className={styles.ongoingToolCall}>
                                            <div className={styles.ongoingToolCallSpinner} />
                                            <span className={styles.ongoingToolCallName}>
                                                {`${group.emoji} ${label}...`}
                                            </span>
                                        </div>
                                    );
                                })}
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

                        {isFeedbackEnabled && isComplete && (
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
                    {shouldShowTiming && timingDisplay && (
                        <div className={styles.messageMeta} title={timingDisplay.fullLabel}>
                            <span className={styles.messageTimestamp}>{timingDisplay.timeLabel}</span>
                            {!isMe && timingDisplay.durationLabel && (
                                <span className={styles.messageDuration}>
                                    ({timingDisplay.durationLabel} to answer)
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

        if (prev.message.createdAt !== next.message.createdAt) {
            return false;
        }

        if (prev.message.generationDurationMs !== next.message.generationDurationMs) {
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

        if (prev.teammates !== next.teammates) {
            return false;
        }

        if (prev.onToolCallClick !== next.onToolCallClick) {
            return false;
        }

        if (prev.onCitationClick !== next.onCitationClick) {
            return false;
        }

        return prev.mode === next.mode;
    },
);
ChatMessageItem.displayName = 'ChatMessageItem';
