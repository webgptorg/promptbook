'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { Pause, Play } from 'lucide-react';
import type { ReactElement } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { colorToDataUrl } from '../../../_packages/color.index';
import { PROMPTBOOK_CHAT_COLOR, USER_CHAT_COLOR } from '../../../config';
import type { ToolCall } from '../../../types/ToolCall';
import { isAssistantPreparationToolCall } from '../../../types/ToolCall';
import type { id } from '../../../types/typeAliases';
import { attachClientVersionHeader } from '../../../utils/clientVersion';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { resolveToolCallIdempotencyKey } from '../../../utils/toolCalls/resolveToolCallIdempotencyKey';
import { classNames } from '../../_common/react-utils/classNames';
import { AvatarProfileTooltip } from '../../AvatarProfile/AvatarProfile/AvatarProfileTooltip';
import { AgentChip, type AgentChipData } from '../AgentChip';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import { SourceChip } from '../SourceChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { collectTeamToolCallSummary, type TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import { isTeamToolName } from '../utils/createTeamToolNameFromUrl';
import { getChatMessageTimingDisplay } from '../utils/getChatMessageTimingDisplay';
import type { ToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import { buildToolCallChipText, getToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import {
    dedupeCitationsBySource,
    extractCitationsFromMessage,
    type ParsedCitation,
} from '../utils/parseCitationsFromContent';
import { parseMessageButtons } from '../utils/parseMessageButtons';
import {
    getLatestStreamingFeatureBoundary,
    sanitizeStreamingMessageContent,
    type StreamingFeatureBoundary,
} from '../utils/sanitizeStreamingMessageContent';
import { splitMessageContentIntoSegments } from '../utils/splitMessageContentIntoSegments';
import styles from './Chat.module.css';
import { chatCssClassNames } from './chatCssClassNames';
import { ChatMessageMap } from './ChatMessageMap';
import type { ChatProps } from './ChatProps';
import { LOADING_INTERACTIVE_IMAGE } from './constants';
import { ImagePromptRenderer } from './ImagePromptRenderer';

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
     * Optional cached metadata keyed by TEAM tool names to enrich tool call chips.
     */
    teamAgentProfiles?: ChatProps['teamAgentProfiles'];
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
 * Placeholder types that describe which rich feature is still streaming.
 *
 * @private internal helper of <ChatMessageItem/>
 */
type StreamingFeaturePlaceholderKind = 'map' | 'image' | 'math' | 'feature';

/**
 * Human-friendly labels associated with each streaming rich feature kind.
 *
 * @private internal helper of <ChatMessageItem/>
 */
const STREAMING_FEATURE_PLACEHOLDER_LABELS: Record<StreamingFeaturePlaceholderKind, string> = {
    map: 'Map preview',
    image: 'Image generation',
    math: 'Math formula',
    feature: 'Rich content',
};

/**
 * Resolves which rich feature is still streaming so the UI can render the matching placeholder.
 *
 * @param boundary - Streaming metadata returned by the sanitizer.
 * @param source - Original message content that contains the pending markup.
 * @returns Friendly placeholder kind to render inside the chat bubble.
 * @private internal helper of <ChatMessageItem/>
 */
function resolveStreamingFeaturePlaceholderKind(
    boundary: StreamingFeatureBoundary,
    source: string,
): StreamingFeaturePlaceholderKind {
    if (boundary.kind === 'imagePrompt') {
        return 'image';
    }

    if (boundary.kind === 'math') {
        return 'math';
    }

    if (boundary.kind === 'codeFence') {
        const snippet = source.slice(boundary.index, boundary.index + 20).toLowerCase();
        if (snippet.includes('geojson')) {
            return 'map';
        }
    }

    return 'feature';
}

/**
 * Props for `<StreamingFeaturePlaceholder/>`.
 *
 * @private internal helper of <ChatMessageItem/>
 */
type StreamingFeaturePlaceholderProps = {
    /**
     * Kind of the placeholder to render.
     */
    readonly kind: StreamingFeaturePlaceholderKind;
};

/**
 * Renders the placeholder UI for streaming rich features.
 *
 * @private internal helper of <ChatMessageItem/>
 */
function StreamingFeaturePlaceholder({ kind }: StreamingFeaturePlaceholderProps) {
    return (
        <div className={styles.richFeaturePlaceholder} aria-live="polite">
            <span className={styles.richFeaturePlaceholderSpinner} aria-hidden="true" />
            <div className={styles.richFeaturePlaceholderCopy}>
                <span className={styles.richFeaturePlaceholderTitle}>{STREAMING_FEATURE_PLACEHOLDER_LABELS[kind]}</span>
                <span className={styles.richFeaturePlaceholderStatus}>Waiting for the agent…</span>
            </div>
        </div>
    );
}

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
    teamAgentProfiles?: ChatProps['teamAgentProfiles'],
): AgentChipData | null {
    const resolvedChipletInfo = chipletInfo || getToolCallChipletInfo(toolCall);
    const baseAgentData = resolvedChipletInfo.agentData;
    const profileOverride = teamAgentProfiles?.[toolCall.name];

    if (profileOverride) {
        const fallbackUrl = profileOverride.url || baseAgentData?.url;
        if (!fallbackUrl) {
            return null;
        }

        return {
            url: fallbackUrl,
            label: profileOverride.label || baseAgentData?.label,
            imageUrl: profileOverride.imageUrl ?? baseAgentData?.imageUrl,
            publicUrl: profileOverride.publicUrl ?? baseAgentData?.publicUrl,
        };
    }

    if (baseAgentData) {
        return baseAgentData;
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
 * Status variants for tool call chips.
 */
type ToolCallChipStatus = 'ongoing' | 'done' | 'error';

/**
 * Metadata rendered inside a single tool call chip.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type ToolCallChipEntry = {
    /**
     * Stable key for React rendering.
     */
    key: string;
    /**
     * Tool call represented by this chip.
     */
    toolCall: ToolCall;
    /**
     * Chip label text.
     */
    label: string;
    /**
     * Current status of the tool call.
     */
    status: ToolCallChipStatus;
    /**
     * Optional agent metadata for TEAM or transitive tool calls.
     */
    teamAgentData: AgentChipData | null;
    /**
     * Marks entries built for transitive tool calls.
     */
    isTransitive: boolean;
};

/**
 * Builds a stable key used for rendering a tool call chip.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function buildToolCallChipKey(toolCall: ToolCall, options?: { originLabel?: string }): string {
    const baseKey = getToolCallSnapshotKey(toolCall);
    if (options?.originLabel) {
        return `${baseKey}::${options.originLabel}`;
    }

    return baseKey;
}

/**
 * Converts ongoing tool calls into chip entries consumed by the UI.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function buildOngoingToolCallChips(
    toolCalls: ReadonlyArray<OngoingToolCall> | undefined,
    teammates: TeammatesMap | undefined,
    teamAgentProfiles: ChatProps['teamAgentProfiles'] | undefined,
): Array<ToolCallChipEntry> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    const entries = new Map<string, ToolCallChipEntry>();
    for (const toolCall of toolCalls) {
        const key = buildToolCallChipKey(toolCall);
        const chipletInfo = getToolCallChipletInfo(toolCall);
        const label = buildToolCallChipText(chipletInfo);
        const teamAgentData = resolveTeamAgentChipData(toolCall, teammates, chipletInfo, teamAgentProfiles);

        entries.set(key, {
            key,
            toolCall,
            label,
            status: 'ongoing',
            teamAgentData,
            isTransitive: false,
        });
    }

    return Array.from(entries.values());
}

/**
 * Builds the final tool call chips that are shown when a message completes.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function buildFinalToolCallChips(
    completedToolCalls: Array<ToolCall> | undefined,
    transitiveToolCalls: ReadonlyArray<TransitiveToolCall>,
    teammates: TeammatesMap | undefined,
    teamAgentProfiles: ChatProps['teamAgentProfiles'] | undefined,
): Array<ToolCallChipEntry> {
    const entries: Array<ToolCallChipEntry> = [];

    if (completedToolCalls && completedToolCalls.length > 0) {
        for (const toolCall of completedToolCalls) {
            const key = buildToolCallChipKey(toolCall);
            const chipletInfo = getToolCallChipletInfo(toolCall);
            const label = buildToolCallChipText(chipletInfo);
            const teamAgentData = resolveTeamAgentChipData(toolCall, teammates, chipletInfo, teamAgentProfiles);

            entries.push({
                key,
                toolCall,
                label,
                status: hasToolCallErrors(toolCall) ? 'error' : 'done',
                teamAgentData,
                isTransitive: false,
            });
        }
    }

    if (transitiveToolCalls && transitiveToolCalls.length > 0) {
        for (const transitive of transitiveToolCalls) {
            const key = buildToolCallChipKey(transitive.toolCall, { originLabel: transitive.origin.label });
            const chipletInfo = getToolCallChipletInfo(transitive.toolCall);
            const label = buildToolCallChipText(chipletInfo);
            const agentData: AgentChipData = {
                url: transitive.origin.url || 'about:blank',
                label: transitive.origin.label,
            };

            entries.push({
                key,
                toolCall: transitive.toolCall,
                label,
                status: hasToolCallErrors(transitive.toolCall) ? 'error' : 'done',
                teamAgentData: agentData,
                isTransitive: true,
            });
        }
    }

    return entries;
}

/**
 * Renders a single tool call chip.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function renderToolCallChip(
    chip: ToolCallChipEntry,
    onToolCallClick?: (toolCall: NonNullable<ChatMessage['toolCalls']>[number]) => void,
): ReactElement {
    const isOngoing = chip.status === 'ongoing';
    const hasErrors = chip.status === 'error';

    return (
        <button
            key={chip.key}
            type="button"
            className={classNames(
                styles.toolCallChip,
                chip.teamAgentData && styles.teamToolCall,
                chip.isTransitive && styles.transitiveToolCall,
                hasErrors && styles.toolCallWithError,
                isOngoing && styles.toolCallChipOngoing,
            )}
            onClick={(event) => {
                event.stopPropagation();
                if (!isOngoing && onToolCallClick) {
                    onToolCallClick(chip.toolCall);
                }
            }}
            disabled={isOngoing}
        >
            {chip.teamAgentData && (
                <AgentChip
                    agent={chip.teamAgentData}
                    className={chip.isTransitive ? styles.transitiveAgentChip : styles.teamAgentChip}
                    isClickable={false}
                />
            )}
            <span className={styles.toolCallLabel}>{chip.label}</span>
            <span className={styles.toolCallChipStatus}>
                {isOngoing ? (
                    <span className={styles.toolCallChipSpinner} aria-hidden="true" />
                ) : hasErrors ? (
                    '⚠️'
                ) : null}
            </span>
        </button>
    );
}

/**
 * Builds the stable key used to detect duplicate snapshots for a tool call.
 *
 * @private internal utility of `<ChatMessageItem/>`
 */
function getToolCallSnapshotKey(toolCall: ToolCall): string {
    const providedIdempotencyKey = typeof toolCall.idempotencyKey === 'string' ? toolCall.idempotencyKey.trim() : '';
    const normalizedKey = providedIdempotencyKey || resolveToolCallIdempotencyKey(toolCall);
    return `tool-snapshot:${normalizedKey}`;
}

/**
 * Deduplicates a list of tool calls by their idempotency key, keeping only the most recent
 * non-error snapshot for each invocation and dropping errored snapshots once a counterpart
 * with the same key succeeds.
 *
 * @private internal utility of `<ChatMessageItem/>`
 */
function dedupeToolCalls(toolCalls: ReadonlyArray<ToolCall> | undefined): Array<ToolCall> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    const seen = new Map<string, ToolCall>();
    for (const toolCall of toolCalls) {
        const key = getToolCallSnapshotKey(toolCall);
        const existing = seen.get(key);
        if (existing) {
            const existingHasErrors = hasToolCallErrors(existing);
            const incomingHasErrors = hasToolCallErrors(toolCall);
            if (!existingHasErrors && incomingHasErrors) {
                continue;
            }
            seen.delete(key);
        }

        seen.set(key, toolCall);
    }

    return Array.from(seen.values());
}

/**
 * Determines whether a tool call reported execution errors.
 *
 * @param toolCall - Tool call to inspect.
 * @returns `true` when the tool call contains at least one error entry.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function hasToolCallErrors(toolCall: ToolCall): boolean {
    return Array.isArray(toolCall.errors) && toolCall.errors.length > 0;
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
            teammates,
            teamAgentProfiles,
            onToolCallClick,
            onCitationClick,
            soundSystem,
            isSpeechPlaybackEnabled,
            elevenLabsVoiceId,
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

        const ongoingToolCallChips = useMemo(
            () => buildOngoingToolCallChips(message.ongoingToolCalls, teammates, teamAgentProfiles),
            [message.ongoingToolCalls, teammates, teamAgentProfiles],
        );
        const finalToolCallChips = useMemo(
            () => buildFinalToolCallChips(completedToolCalls, transitiveToolCalls, teammates, teamAgentProfiles),
            [completedToolCalls, transitiveToolCalls, teammates, teamAgentProfiles],
        );
        const toolCallChips = isComplete ? finalToolCallChips : ongoingToolCallChips;
        const toolCallChipCount = toolCallChips.length;
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
                    body: JSON.stringify({ text: payloadText, voiceId: elevenLabsVoiceId }),
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
        }, [
            attachMessageAudioListeners,
            audioUrl,
            elevenLabsVoiceId,
            getMessageTextForSpeech,
            isAudioLoading,
            shouldShowPlayButton,
        ]);

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
                {avatarSrc && (
                    <div
                        ref={avatarRef}
                        className={classNames(
                            styles.avatar,
                            chatCssClassNames.messageAvatar,
                            isMe ? chatCssClassNames.userAvatar : chatCssClassNames.agentAvatar,
                        )}
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

                <div className={classNames(styles.messageStack, chatCssClassNames.messageStack)}>
                    {shouldShowParticipantLabel && participantLabel && (
                        <div className={styles.participantLabel}>{participantLabel}</div>
                    )}
                    <div
                        className={classNames(styles.messageText, chatCssClassNames.messageContent)}
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
                            <>
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

                                        if (segment.type === 'code') {
                                            return (
                                                <CodeBlock
                                                    key={`code-${segmentIndex}`}
                                                    code={segment.code}
                                                    language={segment.language}
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
                                {streamingFeaturePlaceholderKind && (
                                    <StreamingFeaturePlaceholder kind={streamingFeaturePlaceholderKind} />
                                )}
                            </>
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

                        {toolCallChips.length > 0 && (
                            <div className={styles.toolCallChips}>
                                {toolCallChips.map((chip) => renderToolCallChip(chip, onToolCallClick))}
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
