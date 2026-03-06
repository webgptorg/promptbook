'use client';

import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { isPseudoAgentUrl } from '../../../book-2.0/agent-source/pseudoAgentReferences';
import { parseAgentSourceWithCommitments } from '../../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import { validateBook } from '../../../book-2.0/agent-source/string_book';
import type { string_date_iso8601 } from '../../../types/typeAliases';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { MonacoEditorWithShadowDom } from '../../_common/MonacoEditorWithShadowDom';
import { classNames } from '../../_common/react-utils/classNames';
import { BookEditor } from '../../BookEditor/BookEditor';
import { CloseIcon } from '../../icons/CloseIcon';
import { EmailIcon } from '../../icons/EmailIcon';
import { TeacherIcon } from '../../icons/TeacherIcon';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import { FAST_FLOW } from '../MockedChat/constants';
import { MockedChat } from '../MockedChat/MockedChat';
import { SourceChip } from '../SourceChip';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import {
    collectTeamToolCallSummary,
    type TeamToolCallSummary,
    type TransitiveToolCall,
} from '../utils/collectTeamToolCallSummary';
import { buildToolCallChipText, getToolCallChipletInfo, TOOL_TITLES } from '../utils/getToolCallChipletInfo';
import type { AgentProfileData } from '../utils/loadAgentProfile';
import type { AgentChipData } from '../AgentChip/AgentChip';
import { loadAgentProfile, resolveAgentProfileFallback, resolvePreferredAgentLabel } from '../utils/loadAgentProfile';
import {
    parseWalletCredentialToolCallResult,
    type WalletCredentialToolCallResult,
    WALLET_CREDENTIAL_TOOL_CALL_NAME,
} from '../utils/walletCredentialToolCall';
import {
    extractSearchResults,
    getToolCallResultDate,
    getToolCallTimestamp,
    parseRunBrowserToolResult,
    parseTeamToolResult,
    parseToolCallArguments,
    parseToolCallResult,
    resolveRunBrowserArtifactUrl,
} from '../utils/toolCallParsing';
import styles from './Chat.module.css';
import { buildSelfLearningSummary } from './ChatSelfLearningSummary';
import { SelfLearningAvatar, TeamHeaderProfile } from './ChatToolCallModalComponents';
import { ClockIcon } from './ClockIcon';

/**
 * Props for the tool call details modal.
 *
 * @private component of `<Chat/>`
 */
export type ChatToolCallModalProps = {
    isOpen: boolean;
    toolCall: NonNullable<ChatMessage['toolCalls']>[number] | null;
    onClose: () => void;
    toolTitles?: Record<string, string>;
    agentParticipant?: ChatParticipant;
    buttonColor: WithTake<Color>;
    /**
     * Full chat timeline used when generating advanced debug reports.
     */
    chatMessages?: ReadonlyArray<ChatMessage>;
    /**
     * Optional cached team agent metadata keyed by TEAM tool name.
     */
    teamAgentProfiles?: Record<string, AgentChipData>;
};

/**
 * View mode available in the tool action modal.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallModalViewMode = 'simple' | 'advanced';

/**
 * Delay for resetting copied-state feedback on the advanced copy button.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const TOOL_CALL_COPY_FEEDBACK_TIMEOUT_MS = 2200;

/**
 * Modal that renders rich tool call details for chat chiplets.
 *
 * @private component of `<Chat/>`
 */
export function ChatToolCallModal(props: ChatToolCallModalProps) {
    const { isOpen, toolCall, onClose, toolTitles, agentParticipant, buttonColor, chatMessages, teamAgentProfiles } =
        props;
    const [teamProfiles, setTeamProfiles] = useState<Record<string, AgentProfileData>>({});
    const [selectedTeamToolCall, setSelectedTeamToolCall] = useState<TransitiveToolCall | null>(null);
    const [viewMode, setViewMode] = useState<ToolCallModalViewMode>('simple');
    const [isAdvancedReportCopied, setIsAdvancedReportCopied] = useState(false);
    const copyFeedbackTimeoutRef = useRef<number | null>(null);

    const resultRaw = useMemo(() => (toolCall ? parseToolCallResult(toolCall.result) : null), [toolCall]);
    const teamResult = useMemo(() => parseTeamToolResult(resultRaw), [resultRaw]);
    const toolCallDate = useMemo(() => (toolCall ? getToolCallTimestamp(toolCall) : null), [toolCall]);
    const teamToolCallSummary = useMemo(() => collectTeamToolCallSummary(toolCall ? [toolCall] : []), [toolCall]);

    /**
     * Clears the timeout that resets copy feedback text.
     */
    const clearCopyFeedbackTimeout = useCallback((): void => {
        if (copyFeedbackTimeoutRef.current === null) {
            return;
        }

        window.clearTimeout(copyFeedbackTimeoutRef.current);
        copyFeedbackTimeoutRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            clearCopyFeedbackTimeout();
        };
    }, [clearCopyFeedbackTimeout]);

    useEffect(() => {
        if (!isOpen || !toolCall) {
            return;
        }

        const teammateUrl = teamResult?.teammate?.url;

        if (!teammateUrl || teammateUrl === 'VOID' || isPseudoAgentUrl(teammateUrl)) {
            return;
        }

        const fallbackProfile = resolveAgentProfileFallback({
            url: teammateUrl,
            label: teamResult.teammate?.label,
        });
        const teammateOverride = teamAgentProfiles?.[toolCall.name];

        setTeamProfiles((previous) => {
            const nextProfile = {
                label: teammateOverride?.label || fallbackProfile.label,
                imageUrl: teammateOverride?.imageUrl ?? fallbackProfile.imageUrl,
            };

            const existing = previous[teammateUrl];
            if (existing && existing.label === nextProfile.label && existing.imageUrl === nextProfile.imageUrl) {
                return previous;
            }

            return { ...previous, [teammateUrl]: nextProfile };
        });

        if (teammateOverride) {
            return;
        }

        let isMounted = true;
        const profileLoader = loadAgentProfile({ url: teammateUrl, label: teamResult.teammate?.label }).then(
            (profile) => {
                if (!isMounted) {
                    return;
                }

                setTeamProfiles((previous) => {
                    const existing = previous[teammateUrl];
                    if (existing && existing.label === profile.label && existing.imageUrl === profile.imageUrl) {
                        return previous;
                    }
                    return { ...previous, [teammateUrl]: profile };
                });
            },
        );

        return () => {
            isMounted = false;
            void profileLoader;
        };
    }, [isOpen, toolCall, teamResult, teamAgentProfiles]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTeamToolCall(null);
            setViewMode('simple');
            setIsAdvancedReportCopied(false);
            clearCopyFeedbackTimeout();
            return;
        }

        setSelectedTeamToolCall(null);
        setViewMode('simple');
        setIsAdvancedReportCopied(false);
        clearCopyFeedbackTimeout();
    }, [isOpen, toolCall, clearCopyFeedbackTimeout]);

    if (!isOpen || !toolCall) {
        return null;
    }

    const focusedToolCall = selectedTeamToolCall?.toolCall || toolCall;
    const handleCopyAdvancedReport = useCallback(async (): Promise<void> => {
        try {
            const reportMarkdown = buildAdvancedToolCallReportMarkdown({
                rootToolCall: toolCall,
                focusedToolCall,
                toolTitles,
                agentParticipant,
                chatMessages,
                teamToolCallSummary,
            });

            await copyPlainTextToClipboard(reportMarkdown);

            setIsAdvancedReportCopied(true);
            clearCopyFeedbackTimeout();
            copyFeedbackTimeoutRef.current = window.setTimeout(() => {
                copyFeedbackTimeoutRef.current = null;
                setIsAdvancedReportCopied(false);
            }, TOOL_CALL_COPY_FEEDBACK_TIMEOUT_MS);
        } catch (error) {
            console.error('[ChatToolCallModal] Failed to copy advanced report.', error);
            setIsAdvancedReportCopied(false);
        }
    }, [
        agentParticipant,
        chatMessages,
        clearCopyFeedbackTimeout,
        focusedToolCall,
        teamToolCallSummary,
        toolCall,
        toolTitles,
    ]);

    const modalContent =
        viewMode === 'advanced'
            ? renderAdvancedToolCallDetails({
                  toolCall: focusedToolCall,
                  toolTitles,
              })
            : teamResult?.teammate
            ? (() => {
                  const teammateUrl = teamResult.teammate.url || '';
                  const baseTime = toolCallDate ? toolCallDate.getTime() : Date.now();
                  const teamToolCalls = teamToolCallSummary.toolCalls;
                  const teamCitations = teamToolCallSummary.citations;
                  const hasTeamToolCalls = teamToolCalls.length > 0;
                  const hasTeamCitations = teamCitations.length > 0;

                  const messages = (teamResult.conversation || [])
                      .filter((entry) => entry && entry.content)
                      .map((entry, index) => ({
                          id: `team-${index}`,
                          createdAt: new Date(baseTime + index * 1000).toISOString() as string_date_iso8601,
                          sender: entry.sender === 'TEAMMATE' || entry.role === 'TEAMMATE' ? 'TEAMMATE' : 'AGENT',
                          content: entry.content || '',
                          isComplete: true,
                      }));

                  if (messages.length === 0) {
                      if (teamResult.request) {
                          messages.push({
                              id: 'team-request',
                              createdAt: new Date(baseTime).toISOString() as string_date_iso8601,
                              sender: 'AGENT',
                              content: teamResult.request,
                              isComplete: true,
                          });
                      }
                      if (teamResult.response) {
                          messages.push({
                              id: 'team-response',
                              createdAt: new Date(baseTime + 1000).toISOString() as string_date_iso8601,
                              sender: 'TEAMMATE',
                              content: teamResult.response,
                              isComplete: true,
                          });
                      }
                  }

                  const agentName =
                      teamResult.conversation?.find((entry) => entry.sender === 'AGENT' || entry.role === 'AGENT')
                          ?.name || 'Agent';

                  const teammateConversationName =
                      teamResult.conversation?.find((entry) => entry.sender === 'TEAMMATE' || entry.role === 'TEAMMATE')
                          ?.name || '';
                  const teammateProfile = teammateUrl ? teamProfiles[teammateUrl] : undefined;
                  const teammateFallbackProfile = teammateUrl
                      ? resolveAgentProfileFallback({
                            url: teammateUrl,
                            label: teamResult.teammate.label,
                        })
                      : { label: 'Teammate', imageUrl: null };

                  const resolvedAgentLabel = resolvePreferredAgentLabel(
                      [agentParticipant?.fullname, agentName],
                      agentName,
                  );
                  const resolvedAgentAvatar = agentParticipant?.avatarSrc || null;
                  const resolvedAgentHeaderColor = agentParticipant?.color
                      ? Color.fromSafe(agentParticipant.color).toHex()
                      : '#64748b';

                  const resolvedTeammateLabel = resolvePreferredAgentLabel(
                      [teammateConversationName, teammateProfile?.label, teammateFallbackProfile.label],
                      teammateFallbackProfile.label,
                  );
                  const resolvedTeammateAvatar = teammateProfile?.imageUrl || teammateFallbackProfile.imageUrl || null;
                  const teammateLink =
                      teammateUrl && teammateUrl !== 'VOID' && !isPseudoAgentUrl(teammateUrl) ? teammateUrl : undefined;

                  const participants = [
                      {
                          name: 'AGENT',
                          fullname: resolvedAgentLabel,
                          color: agentParticipant?.color || '#64748b',
                          avatarSrc: resolvedAgentAvatar || undefined,
                          isMe: true,
                      },
                      {
                          name: 'TEAMMATE',
                          fullname: resolvedTeammateLabel,
                          color: '#0ea5e9',
                          avatarSrc: resolvedTeammateAvatar || undefined,
                      },
                  ] satisfies Array<ChatParticipant>;

                  return (
                      <>
                          <div className={classNames(styles.searchModalHeader, styles.teamModalHeader)}>
                              <div className={styles.teamHeaderParticipants}>
                                  <TeamHeaderProfile
                                      label={resolvedAgentLabel}
                                      avatarSrc={resolvedAgentAvatar}
                                      fallbackColor={resolvedAgentHeaderColor}
                                  />
                                  <span className={styles.teamHeaderDivider}>talking with</span>
                                  <TeamHeaderProfile
                                      label={resolvedTeammateLabel}
                                      avatarSrc={resolvedTeammateAvatar}
                                      fallbackColor="#0ea5e9"
                                      href={teammateLink}
                                  />
                              </div>
                          </div>

                          <div className={styles.searchModalContent}>
                              {messages.length > 0 ? (
                                  <div className={styles.teamChatContainer}>
                                      <MockedChat
                                          title={`Chat between ${resolvedAgentLabel} and ${resolvedTeammateLabel}`}
                                          messages={messages}
                                          participants={participants}
                                          isResettable={false}
                                          isPausable={false}
                                          isSaveButtonEnabled={false}
                                          isCopyButtonEnabled={false}
                                          visual="STANDALONE"
                                          delayConfig={FAST_FLOW}
                                      />
                                  </div>
                              ) : (
                                  <div className={styles.noResults}>No teammate conversation available.</div>
                              )}

                              {(hasTeamToolCalls || hasTeamCitations) && (
                                  <div className={styles.teamToolCallSection}>
                                      {hasTeamToolCalls && (
                                          <div className={styles.teamToolCallGroup}>
                                              <div className={styles.teamToolCallHeading}>Actions</div>
                                              <div className={styles.teamToolCallChips}>
                                                  {teamToolCalls.map((toolCallEntry, index) => {
                                                      const chipletInfo = getToolCallChipletInfo(
                                                          toolCallEntry.toolCall,
                                                      );
                                                      const chipletText = buildToolCallChipText(chipletInfo);

                                                      return (
                                                          <button
                                                              key={`team-tool-${index}`}
                                                              className={styles.completedToolCall}
                                                              onClick={() => {
                                                                  setSelectedTeamToolCall(toolCallEntry);
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
                                          </div>
                                      )}

                                      {hasTeamCitations && (
                                          <div className={styles.teamToolCallGroup}>
                                              <div className={styles.teamToolCallHeading}>Sources</div>
                                              <div className={styles.teamToolCallChips}>
                                                  {teamCitations.map((citation, index) => (
                                                      <SourceChip
                                                          key={`team-source-${citation.source}-${index}`}
                                                          citation={citation}
                                                          suffix={`by ${citation.origin.label}`}
                                                      />
                                                  ))}
                                              </div>
                                          </div>
                                      )}

                                      {selectedTeamToolCall && (
                                          <div className={styles.teamToolCallDetails}>
                                              <div className={styles.teamToolCallDetailsHeader}>
                                                  <span className={styles.teamToolCallDetailsTitle}>
                                                      Action details
                                                      <span className={styles.toolCallOrigin}>
                                                          by {selectedTeamToolCall.origin.label}
                                                      </span>
                                                  </span>
                                                  <button
                                                      type="button"
                                                      className={styles.teamToolCallDetailsClear}
                                                      onClick={() => {
                                                          setSelectedTeamToolCall(null);
                                                      }}
                                                  >
                                                      Clear
                                                  </button>
                                              </div>
                                              {renderToolCallDetails({
                                                  toolCall: selectedTeamToolCall.toolCall,
                                                  toolTitles,
                                                  agentParticipant,
                                                  buttonColor,
                                              })}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </>
                  );
              })()
            : renderToolCallDetails({
                  toolCall,
                  toolTitles,
                  agentParticipant,
                  buttonColor,
              });

    return (
        <div
            className={styles.ratingModal}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={classNames(styles.ratingModalContent, styles.toolCallModal)}>
                <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Close dialog">
                    <CloseIcon />
                </button>
                {modalContent}
                <div className={styles.toolCallModeFooter}>
                    {viewMode === 'advanced' && (
                        <button
                            type="button"
                            className={styles.toolCallModeButton}
                            onClick={() => {
                                void handleCopyAdvancedReport();
                            }}
                        >
                            {isAdvancedReportCopied ? 'Copied advanced report' : 'Copy advanced report'}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.toolCallModeButton}
                        onClick={() => {
                            setViewMode((previous) => (previous === 'simple' ? 'advanced' : 'simple'));
                        }}
                    >
                        {viewMode === 'simple' ? 'Advanced' : 'Simple'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Context required to build a copyable advanced report in Markdown.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type AdvancedToolCallReportOptions = {
    /**
     * Tool call selected directly from the chip row.
     */
    rootToolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Tool call currently focused in modal details.
     */
    focusedToolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Optional mapping of tool titles.
     */
    toolTitles?: Record<string, string>;
    /**
     * Agent metadata used by the active chat.
     */
    agentParticipant?: ChatParticipant;
    /**
     * Full chat timeline for wider diagnostic context.
     */
    chatMessages?: ReadonlyArray<ChatMessage>;
    /**
     * Flattened TEAM tool-call context.
     */
    teamToolCallSummary: TeamToolCallSummary;
};

/**
 * One parsed commitment type count derived from `agentSource`.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type AgentCommitmentUsage = {
    /**
     * Commitment keyword.
     */
    type: string;
    /**
     * Number of occurrences in the source.
     */
    count: number;
};

/**
 * Copies text into the clipboard with a fallback for older browsers.
 *
 * @param value - Text to copy.
 * @private internal utility of `<ChatToolCallModal/>`
 */
async function copyPlainTextToClipboard(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }

    const temporaryTextarea = document.createElement('textarea');
    temporaryTextarea.value = value;
    temporaryTextarea.setAttribute('readonly', 'true');
    temporaryTextarea.style.position = 'fixed';
    temporaryTextarea.style.opacity = '0';
    document.body.appendChild(temporaryTextarea);
    temporaryTextarea.focus();
    temporaryTextarea.select();

    const wasCopied = document.execCommand('copy');
    document.body.removeChild(temporaryTextarea);

    if (!wasCopied) {
        throw new Error('Clipboard copy failed.');
    }
}

/**
 * Builds the full Markdown payload copied from the advanced tool-call modal.
 *
 * @param options - Report composition context.
 * @returns Markdown text containing tool call payloads and wider chat context.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function buildAdvancedToolCallReportMarkdown(options: AdvancedToolCallReportOptions): string {
    const { rootToolCall, focusedToolCall, toolTitles, agentParticipant, chatMessages, teamToolCallSummary } = options;
    const focusedMetadata = resolveToolCallPresentationMetadata({ toolCall: focusedToolCall, toolTitles });
    const commitmentUsage = collectAgentCommitmentUsage(agentParticipant?.agentSource);
    const payloadSections = createAdvancedToolCallPayloadSections(focusedToolCall);
    const reportLines: string[] = [];

    reportLines.push('# Tool Call Advanced Report');
    reportLines.push('');
    reportLines.push(`- Generated at: \`${new Date().toISOString()}\``);
    reportLines.push(`- Focused action: \`${focusedToolCall.name}\``);
    reportLines.push(`- Root action: \`${rootToolCall.name}\``);
    if (focusedMetadata.title && focusedMetadata.title !== focusedToolCall.name) {
        reportLines.push(`- Display title: ${focusedMetadata.emoji} ${focusedMetadata.title}`);
    }
    reportLines.push('');

    reportLines.push('## Focused Action Payloads');
    reportLines.push('');
    for (const payloadSection of payloadSections) {
        const formattedPayload = formatToolCallPayload(payloadSection.payload);
        const markdownLanguage = formattedPayload.language === 'json' ? 'json' : 'text';
        reportLines.push(`### ${payloadSection.title}`);
        reportLines.push('');
        reportLines.push(renderMarkdownCodeBlock(formattedPayload.content, markdownLanguage));
        reportLines.push('');
    }

    if (focusedToolCall !== rootToolCall) {
        reportLines.push('## Root Tool Call Event');
        reportLines.push('');
        reportLines.push(renderMarkdownCodeBlock(serializeToPrettyJson(rootToolCall), 'json'));
        reportLines.push('');
    }

    reportLines.push('## Agent Context');
    reportLines.push('');
    reportLines.push(`- Agent label: ${agentParticipant?.fullname || agentParticipant?.name || 'Unknown'}`);
    reportLines.push(`- Agent id: \`${agentParticipant?.name || 'Unknown'}\``);
    reportLines.push('');

    if (commitmentUsage.length > 0) {
        reportLines.push('### Commitments Used');
        reportLines.push('');
        for (const commitment of commitmentUsage) {
            reportLines.push(`- \`${commitment.type}\` (${commitment.count})`);
        }
        reportLines.push('');
    }

    if (agentParticipant?.agentSource) {
        reportLines.push('### Agent Source');
        reportLines.push('');
        reportLines.push(renderMarkdownCodeBlock(agentParticipant.agentSource, 'book'));
        reportLines.push('');
    }

    reportLines.push('## Team Context');
    reportLines.push('');
    reportLines.push(`- Team tool calls: ${teamToolCallSummary.toolCalls.length}`);
    reportLines.push(`- Team citations: ${teamToolCallSummary.citations.length}`);
    reportLines.push('');
    if (teamToolCallSummary.toolCalls.length > 0) {
        reportLines.push('### Team Tool Calls');
        reportLines.push('');
        reportLines.push(renderMarkdownCodeBlock(serializeToPrettyJson(teamToolCallSummary.toolCalls), 'json'));
        reportLines.push('');
    }
    if (teamToolCallSummary.citations.length > 0) {
        reportLines.push('### Team Citations');
        reportLines.push('');
        reportLines.push(renderMarkdownCodeBlock(serializeToPrettyJson(teamToolCallSummary.citations), 'json'));
        reportLines.push('');
    }

    reportLines.push('## Chat Timeline');
    reportLines.push('');
    reportLines.push(
        renderMarkdownCodeBlock(
            serializeToPrettyJson(
                (chatMessages || []).map((message) => ({
                    sender: message.sender,
                    createdAt: message.createdAt,
                    isComplete: message.isComplete,
                    content: message.content,
                    toolCalls: message.toolCalls,
                    completedToolCalls: message.completedToolCalls,
                    ongoingToolCalls: message.ongoingToolCalls,
                    citations: message.citations,
                    attachments: message.attachments,
                })),
            ),
            'json',
        ),
    );
    reportLines.push('');

    return reportLines.join('\n');
}

/**
 * Parses agent source and returns sorted commitment usage counts.
 *
 * @param agentSource - Optional agent source.
 * @returns Sorted commitment type counters.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function collectAgentCommitmentUsage(agentSource: ChatParticipant['agentSource'] | undefined): AgentCommitmentUsage[] {
    if (!agentSource) {
        return [];
    }

    try {
        const parseResult = parseAgentSourceWithCommitments(agentSource);
        const commitmentUsageMap = new Map<string, number>();

        for (const commitment of parseResult.commitments) {
            commitmentUsageMap.set(commitment.type, (commitmentUsageMap.get(commitment.type) || 0) + 1);
        }

        return Array.from(commitmentUsageMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => a.type.localeCompare(b.type));
    } catch {
        return [];
    }
}

/**
 * Renders content as a fenced Markdown code block while keeping fences safe.
 *
 * @param content - Raw block content.
 * @param language - Optional Markdown language tag.
 * @returns Markdown code-block string.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderMarkdownCodeBlock(content: string, language?: string): string {
    const fence = resolveMarkdownCodeFence(content);
    const languageSuffix = language ? language : '';

    return `${fence}${languageSuffix}\n${content}\n${fence}`;
}

/**
 * Resolves a backtick fence that is always longer than fences found inside content.
 *
 * @param content - Candidate content for Markdown code block.
 * @returns Fence string (3+ backticks).
 * @private internal utility of `<ChatToolCallModal/>`
 */
function resolveMarkdownCodeFence(content: string): string {
    const backtickRuns = content.match(/`+/g) || [];
    const longestRunLength = backtickRuns.reduce((maxLength, run) => Math.max(maxLength, run.length), 0);
    const fenceLength = Math.max(3, longestRunLength + 1);

    return '`'.repeat(fenceLength);
}

/**
 * Safely serializes arbitrary values into pretty JSON for report sections.
 *
 * @param value - Value to serialize.
 * @returns JSON text or a string fallback.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function serializeToPrettyJson(value: TODO_any): string {
    try {
        const serialized = JSON.stringify(value, null, 2);
        if (serialized !== undefined) {
            return serialized;
        }
    } catch {
        // Fallback below.
    }

    return String(value);
}

/**
 * Metadata for a single memory record returned by MEMORY tools.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type MemoryRecord = {
    /**
     * Unique identifier for the memory entry.
     */
    id?: string;
    /**
     * Stored memory text.
     */
    content?: string;
    /**
     * Indicates if the memory is shared across agents.
     */
    isGlobal?: boolean;
    /**
     * ISO timestamp when the memory was created.
     */
    createdAt?: string;
    /**
     * ISO timestamp when the memory was last updated.
     */
    updatedAt?: string;
};

/**
 * Possible status labels returned by MEMORY tool calls.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type MemoryStatusValue = 'stored' | 'ok' | 'disabled' | 'error' | string;

/**
 * Visual tone used to style memory status badges.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type MemoryStatusTone = 'success' | 'warning' | 'error' | 'neutral';

/**
 * Visual metadata describing how a memory status should appear.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type MemoryStatusInfo = {
    /**
     * Friendly label shown next to the status badge.
     */
    label: string;
    /**
     * Visual tone driving the badge styling.
     */
    tone: MemoryStatusTone;
};

/**
 * Normalized payload derived from the raw MEMORY tool result.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type MemoryToolResult = {
    /**
     * Tool action that produced the payload.
     */
    action: 'store' | 'retrieve';
    /**
     * Reported status string for the action.
     */
    status: MemoryStatusValue;
    /**
     * Optional user-friendly message describing the result.
     */
    message?: string;
    /**
     * Query text used to retrieve memories.
     */
    query?: string;
    /**
     * Record returned after storing a memory.
     */
    memory?: MemoryRecord;
    /**
     * Records returned after retrieving memories.
     */
    memories?: MemoryRecord[];
};

/**
 * Rendering options for the memory-specific tool call view.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type MemoryToolCallViewOptions = {
    /**
     * Raw tool call payload.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Resolved tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool call result.
     */
    resultRaw: TODO_any;
};

/**
 * Maximum number of memory cards rendered inside the modal at once.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const MEMORY_DISPLAY_LIMIT = 3;

/**
 * CSS classes mapped by memory status tone.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const MEMORY_STATUS_CLASS_BY_TONE: Record<MemoryStatusTone, string> = {
    success: styles.memoryStatusSuccess,
    warning: styles.memoryStatusWarning,
    error: styles.memoryStatusError,
    neutral: styles.memoryStatusNeutral,
};

/**
 * Renders a friendly memory summary screen when a MEMORY tool call is selected.
 *
 * @param options - View fragments required to render the memory modal.
 * @returns Memory-specific modal JSX or `null` when the tool is unrelated.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderMemoryToolCall(options: MemoryToolCallViewOptions): ReactElement | null {
    const { toolCall, args, resultRaw } = options;
    if (toolCall.name !== 'retrieve_user_memory' && toolCall.name !== 'store_user_memory') {
        return null;
    }

    const isStoreAction = toolCall.name === 'store_user_memory';
    const memoryResult = buildMemoryToolResult(resultRaw, isStoreAction ? 'store' : 'retrieve');
    if (!memoryResult) {
        return null;
    }

    const heroTitle = isStoreAction ? 'Memory saved' : 'Memories retrieved';
    const heroSubtitle = isStoreAction
        ? 'This detail is now stored so future chats will remember it.'
        : 'The agent pulled these facts from the memory vault.';
    const statusInfo = buildMemoryStatusInfo(memoryResult.status, memoryResult.action);
    const statusClass = MEMORY_STATUS_CLASS_BY_TONE[statusInfo.tone] || styles.memoryStatusNeutral;

    return (
        <>
            <div className={styles.memoryModalHeader}>
                <div className={styles.memoryModalIcon}>🧠</div>
                <div className={styles.memoryModalHeaderText}>
                    <h3 className={styles.memoryModalTitle}>{heroTitle}</h3>
                    <p className={styles.memoryModalSubtitle}>{heroSubtitle}</p>
                </div>
                <div className={classNames(styles.memoryModalStatus, statusClass)}>
                    <span className={styles.memoryStatusDot}></span>
                    {statusInfo.label}
                </div>
            </div>

            <div className={styles.memoryModalContent}>
                {memoryResult.message && <p className={styles.memoryMessage}>{memoryResult.message}</p>}

                {isStoreAction
                    ? renderMemoryStoreSection({ memoryResult, args })
                    : renderMemoryRetrieveSection({ memoryResult, args })}
            </div>
        </>
    );
}

/**
 * Renders the stored memory detail pane.
 *
 * @param options - Store action payload and arguments.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderMemoryStoreSection(options: {
    memoryResult: MemoryToolResult;
    args: Record<string, TODO_any>;
}): ReactElement {
    const { memoryResult, args } = options;
    const storedScope = memoryResult.memory?.isGlobal ?? (typeof args.isGlobal === 'boolean' ? args.isGlobal : false);
    const scopeLabel = storedScope ? 'Global memory' : 'Personal memory';
    const scopeBadge = storedScope ? 'Global' : 'Personal';
    const storedContent =
        memoryResult.memory?.content?.trim() || (typeof args.content === 'string' ? args.content.trim() : '');
    const timestamp =
        formatMemoryTimestamp(memoryResult.memory?.updatedAt) ?? formatMemoryTimestamp(memoryResult.memory?.createdAt);

    return (
        <div className={styles.memoryStoreSection}>
            <div className={styles.memoryMetaRow}>
                <span className={styles.memoryMetaLabel}>Scope</span>
                <span className={styles.memoryMetaValue}>{scopeLabel}</span>
            </div>

            <div className={styles.memoryCard}>
                <div className={styles.memoryCardContent}>
                    {storedContent || 'No memory content was provided for this call.'}
                </div>
                <div className={styles.memoryCardMeta}>
                    <span className={styles.memoryScopeBadge}>{scopeBadge}</span>
                    {timestamp && <span>{timestamp}</span>}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the retrieved memories list.
 *
 * @param options - Retrieve action payload and arguments.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderMemoryRetrieveSection(options: {
    memoryResult: MemoryToolResult;
    args: Record<string, TODO_any>;
}): ReactElement {
    const { memoryResult, args } = options;
    const queryLabel = memoryResult.query?.trim() || (typeof args.query === 'string' ? args.query.trim() : '');
    const memories = (memoryResult.memories || [])
        .map((entry) => entry && normalizeMemoryRecord(entry))
        .filter((entry): entry is MemoryRecord => Boolean(entry && entry.content && entry.content.trim().length > 0));
    const displayedMemories = memories.slice(0, MEMORY_DISPLAY_LIMIT);
    const extraCount = memories.length - displayedMemories.length;

    return (
        <div className={styles.memoryRetrieveSection}>
            {queryLabel && (
                <div className={styles.memoryMetaRow}>
                    <span className={styles.memoryMetaLabel}>Search</span>
                    <span className={styles.memoryMetaValue}>&ldquo;{queryLabel}&rdquo;</span>
                </div>
            )}
            <div className={styles.memoryMetaRow}>
                <span className={styles.memoryMetaLabel}>Matches</span>
                <span className={styles.memoryMetaValue}>{memories.length}</span>
            </div>

            {memories.length === 0 ? (
                <div className={styles.memoryEmptyState}>
                    {memoryResult.message ||
                        (queryLabel
                            ? `No memories match “${queryLabel}”.`
                            : 'No memories were available for this conversation.')}
                </div>
            ) : (
                <>
                    <div className={styles.memoryList}>
                        {displayedMemories.map((memory, index) => {
                            const timestamp =
                                formatMemoryTimestamp(memory.updatedAt) ?? formatMemoryTimestamp(memory.createdAt);

                            return (
                                <div key={memory.id || `${memory.content}-${index}`} className={styles.memoryCard}>
                                    <div className={styles.memoryCardContent}>{memory.content}</div>
                                    <div className={styles.memoryCardMeta}>
                                        <span className={styles.memoryScopeBadge}>
                                            {memory.isGlobal ? 'Global' : 'Personal'}
                                        </span>
                                        {timestamp && <span>{timestamp}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {extraCount > 0 && (
                        <div className={styles.memoryListFooter}>
                            {extraCount} more {extraCount === 1 ? 'memory' : 'memories'} available.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Transforms the raw tool result (or fallback data) into a normalized memory payload.
 *
 * @param raw - Raw data returned by the tool call.
 * @param fallbackAction - Action to assume when the payload does not declare one.
 * @returns Normalized memory details or `null` when no payload exists.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function buildMemoryToolResult(raw: TODO_any, fallbackAction: 'store' | 'retrieve'): MemoryToolResult | null {
    if (raw && typeof raw === 'object') {
        const normalizedMemories = Array.isArray(raw.memories)
            ? raw.memories
                  .map((entry: TODO_any) => entry && normalizeMemoryRecord(entry))
                  .filter((entry: MemoryRecord | null): entry is MemoryRecord => Boolean(entry))
            : [];

        const normalizedMemory = raw.memory ? normalizeMemoryRecord(raw.memory) ?? undefined : undefined;

        return {
            action: raw.action === 'store' ? 'store' : fallbackAction,
            status:
                (typeof raw.status === 'string' ? raw.status : undefined) ??
                (fallbackAction === 'store' ? 'stored' : 'ok'),
            message: typeof raw.message === 'string' ? raw.message : undefined,
            query: typeof raw.query === 'string' ? raw.query : undefined,
            memory: normalizedMemory,
            memories: normalizedMemories.length > 0 ? normalizedMemories : undefined,
        };
    }

    if (typeof raw === 'string') {
        return {
            action: fallbackAction,
            status: 'error',
            message: raw,
        };
    }

    return {
        action: fallbackAction,
        status: fallbackAction === 'store' ? 'stored' : 'ok',
    };
}

/**
 * Normalizes a memory record payload.
 *
 * @param entry - Input record from the memory tool.
 * @returns Normalized record or `null` when the entry is invalid.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function normalizeMemoryRecord(entry: TODO_any): MemoryRecord | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    return {
        id: typeof entry.id === 'string' ? entry.id : undefined,
        content: typeof entry.content === 'string' ? entry.content.trim() : undefined,
        isGlobal: entry.isGlobal === true,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
    };
}

/**
 * Builds friendly status text and tone for memory actions.
 *
 * @param status - Raw status string returned by the tool.
 * @param action - Optional action to better describe neutral statuses.
 * @returns Label and tone for badge styling.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function buildMemoryStatusInfo(status: MemoryStatusValue, action: 'store' | 'retrieve'): MemoryStatusInfo {
    const normalized = (status || (action === 'store' ? 'stored' : 'ok')).toString().toLowerCase();

    if (normalized === 'stored') {
        return { label: 'Saved', tone: 'success' };
    }

    if (normalized === 'ok') {
        return { label: 'Loaded', tone: 'success' };
    }

    if (normalized === 'disabled') {
        return { label: 'Memory disabled', tone: 'warning' };
    }

    if (normalized === 'error') {
        return { label: 'Something went wrong', tone: 'error' };
    }

    return {
        label: action === 'store' ? 'Memory saved' : 'Memory retrieved',
        tone: 'neutral',
    };
}

/**
 * Formats ISO timestamps returned by memory records.
 *
 * @param value - Potential ISO timestamp string.
 * @returns Formatted label or `null` when the timestamp is invalid.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function formatMemoryTimestamp(value?: string): string | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

/**
 * Options for rendering a tool call detail view.
 *
 * @private utility of `<ChatToolCallModal/>`
 */
type ToolCallDetailsOptions = {
    /**
     * Tool call to render.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Optional mapping of tool titles.
     */
    toolTitles?: Record<string, string>;
    /**
     * Agent participant metadata for avatar details.
     */
    agentParticipant?: ChatParticipant;
    /**
     * Chat button color for fallback styling.
     */
    buttonColor: WithTake<Color>;
};

/**
 * Renders a friendly wallet-credential usage summary for non-technical users.
 *
 * @param credential - Safe credential usage metadata.
 * @param toolCallDate - Optional timestamp of the action.
 * @returns Credential details section for the tool modal.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderWalletCredentialToolCall(
    credential: WalletCredentialToolCallResult,
    toolCallDate: Date | null,
): ReactElement {
    const serviceLabel = formatWalletCredentialService(credential.service);
    const sourceToolLabel = TOOL_TITLES[credential.sourceToolName]?.title || credential.sourceToolName;

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    🔐
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Credential</p>
                    <h3 className={styles.toolCallTitle}>{credential.credentialName}</h3>
                    <p className={styles.toolCallSubtitle}>Used securely from your wallet.</p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>What it was used for</p>
                    <p className={styles.toolCallSummary}>{credential.purpose}</p>
                </section>

                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>Credential details</p>
                    <ul className={styles.toolCallList}>
                        <li className={styles.toolCallItem}>
                            <span className={styles.toolCallItemLabel}>Service</span>
                            <span className={styles.toolCallItemValue}>{serviceLabel}</span>
                        </li>
                        <li className={styles.toolCallItem}>
                            <span className={styles.toolCallItemLabel}>Credential reference</span>
                            <span className={styles.toolCallItemValue}>{credential.key}</span>
                        </li>
                        <li className={styles.toolCallItem}>
                            <span className={styles.toolCallItemLabel}>Used by action</span>
                            <span className={styles.toolCallItemValue}>{sourceToolLabel}</span>
                        </li>
                        {toolCallDate && (
                            <li className={styles.toolCallItem}>
                                <span className={styles.toolCallItemLabel}>Time</span>
                                <span className={styles.toolCallItemValue}>{toolCallDate.toLocaleString()}</span>
                            </li>
                        )}
                    </ul>
                </section>
            </div>
        </>
    );
}

/**
 * Converts internal service identifiers into human-friendly labels.
 *
 * @param service - Technical service identifier.
 * @returns Friendly service label.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function formatWalletCredentialService(service: string): string {
    const normalizedService = service.trim().toLowerCase();
    if (normalizedService === 'smtp') {
        return 'Email (SMTP)';
    }
    if (normalizedService === 'github') {
        return 'GitHub';
    }
    return service;
}

/**
 * Renders a visual replay view for `run_browser` tool calls.
 *
 * @param options - Parsed browser tool details needed by the modal.
 * @returns Visual browser replay content.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderRunBrowserToolCall(options: { args: Record<string, TODO_any>; resultRaw: TODO_any }): ReactElement {
    const { args, resultRaw } = options;
    const parsedResult = parseRunBrowserToolResult(resultRaw);
    const initialUrl = parsedResult?.initialUrl || (typeof args.url === 'string' ? args.url : null);
    const finalUrl = parsedResult?.finalUrl || null;
    const finalTitle = parsedResult?.finalTitle || null;
    const artifacts = parsedResult?.artifacts || [];
    const actions = parsedResult?.actions || [];

    return (
        <>
            <div className={classNames(styles.searchModalHeader, styles.browserRunModalHeader)}>
                <span className={styles.searchModalIcon}>🌐</span>
                <div className={styles.browserRunHeaderText}>
                    <span className={styles.browserRunHeaderLabel}>Browser</span>
                    <h3 className={styles.searchModalQuery}>Session replay</h3>
                </div>
            </div>

            <div className={styles.searchModalContent}>
                {(initialUrl || finalUrl || finalTitle) && (
                    <div className={styles.browserRunMeta}>
                        {initialUrl && (
                            <div className={styles.emailField}>
                                <strong>Started at:</strong>
                                <span className={styles.emailRecipients}>
                                    <a href={initialUrl} target="_blank" rel="noreferrer">
                                        {initialUrl}
                                    </a>
                                </span>
                            </div>
                        )}
                        {finalUrl && (
                            <div className={styles.emailField}>
                                <strong>Ended at:</strong>
                                <span className={styles.emailRecipients}>
                                    <a href={finalUrl} target="_blank" rel="noreferrer">
                                        {finalUrl}
                                    </a>
                                </span>
                            </div>
                        )}
                        {finalTitle && (
                            <div className={styles.emailField}>
                                <strong>Final page:</strong>
                                <span className={styles.emailRecipients}>{finalTitle}</span>
                            </div>
                        )}
                    </div>
                )}

                {artifacts.length > 0 ? (
                    <div className={styles.browserRunMediaGrid}>
                        {artifacts.map((artifact, index) => {
                            const mediaUrl = resolveRunBrowserArtifactUrl(artifact.path);
                            const mediaKey = `${artifact.path}-${index}`;
                            const caption = artifact.actionSummary || artifact.label;

                            return (
                                <article key={mediaKey} className={styles.browserRunMediaCard}>
                                    <div className={styles.browserRunMediaCardHeader}>
                                        <h4 className={styles.browserRunMediaTitle}>{artifact.label}</h4>
                                        {caption && <p className={styles.browserRunMediaCaption}>{caption}</p>}
                                    </div>
                                    {artifact.kind === 'video' ? (
                                        <video
                                            className={styles.browserRunMediaVideo}
                                            src={mediaUrl}
                                            controls={true}
                                            playsInline={true}
                                        />
                                    ) : (
                                        <img
                                            className={styles.browserRunMediaImage}
                                            src={mediaUrl}
                                            alt={caption || `Browser artifact ${index + 1}`}
                                            loading="lazy"
                                        />
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.noResults}>No browser visuals were captured for this action.</div>
                )}

                {actions.length > 0 && (
                    <div className={styles.browserRunActionLog}>
                        <h4 className={styles.browserRunActionLogTitle}>Actions</h4>
                        <ol className={styles.browserRunActionList}>
                            {actions.map((action, index) => (
                                <li key={`${action.summary}-${index}`} className={styles.browserRunActionItem}>
                                    {action.summary}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </>
    );
}

/**
 * Renders the detail view for a single tool call.
 *
 * @param options - Rendering options for the tool call.
 */
function renderToolCallDetails(options: ToolCallDetailsOptions): ReactElement {
    const { toolCall, toolTitles, agentParticipant, buttonColor } = options;
    const resultRaw = parseToolCallResult(toolCall.result);
    const args = parseToolCallArguments(toolCall);
    const toolCallDate = getToolCallTimestamp(toolCall);
    const memoryView = renderMemoryToolCall({
        toolCall,
        args,
        resultRaw,
    });
    if (memoryView) {
        return memoryView;
    }

    const walletCredentialResult =
        toolCall.name === WALLET_CREDENTIAL_TOOL_CALL_NAME ? parseWalletCredentialToolCallResult(resultRaw) : null;
    if (walletCredentialResult) {
        return renderWalletCredentialToolCall(walletCredentialResult, toolCallDate);
    }

    const isSearch =
        toolCall.name === 'web_search' || toolCall.name === 'useSearchEngine' || toolCall.name === 'search';
    const isTime = toolCall.name === 'get_current_time' || toolCall.name === 'useTime';
    const isEmail = toolCall.name === 'send_email' || toolCall.name === 'useEmail';
    const isPopup = toolCall.name === 'open_popup' || toolCall.name === 'usePopup' || toolCall.name === 'popup';
    const isRunBrowser = toolCall.name === 'run_browser';
    const isSelfLearning = toolCall.name === 'self-learning';

    const { results, rawText } = extractSearchResults(resultRaw);
    const hasResults = results.length > 0;
    const hasRawText = !hasResults && !!rawText && rawText.trim().length > 0;

    if (isPopup) {
        const url = args.url || (typeof resultRaw === 'string' && resultRaw.includes('http') ? resultRaw : null);

        return (
            <>
                <div className={classNames(styles.searchModalHeader, styles.emailModalHeader)}>
                    <span className={styles.searchModalIcon}>🪟</span>
                    <div className={styles.emailHeaderText}>
                        <span className={styles.emailHeaderLabel}>Popup</span>
                        <h3 className={styles.searchModalQuery}>Open Website</h3>
                    </div>
                </div>

                <div className={styles.searchModalContent}>
                    <div className={styles.emailContainer}>
                        <div className={styles.emailMetadata}>
                            <div className={styles.emailField}>
                                <strong>URL:</strong>
                                <span className={styles.emailRecipients}>
                                    {url ? (
                                        <a href={url} target="_blank" rel="noreferrer">
                                            {url}
                                        </a>
                                    ) : (
                                        'No URL provided'
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className={styles.emailBody}>
                            <p>The agent wants to open a popup window with the URL above.</p>
                            {url && (
                                <div style={{ marginTop: '20px' }}>
                                    <button
                                        type="button"
                                        className={styles.messageButton}
                                        onClick={() => window.open(url, '_blank')}
                                        style={{
                                            backgroundColor: buttonColor.toHex(),
                                            color: buttonColor.then(textColor).toHex(),
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        Open Popup Now
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (isSelfLearning) {
        const summary = buildSelfLearningSummary(toolCall, resultRaw);
        const agentLabel = String(agentParticipant?.fullname || agentParticipant?.name || 'Agent');
        const agentAvatarColor = Color.fromSafe(agentParticipant?.color || buttonColor).toHex();
        const commitmentsHeight = summary.commitmentsLineCount
            ? Math.min(Math.max(summary.commitmentsLineCount * 26, 140), 320)
            : 0;

        return (
            <>
                <div className={classNames(styles.searchModalHeader, styles.selfLearningModalHeader)}>
                    <div className={styles.selfLearningAvatarGroup}>
                        <SelfLearningAvatar
                            label={agentLabel}
                            avatarSrc={agentParticipant?.avatarSrc}
                            fallbackColor={agentAvatarColor}
                        />
                        <SelfLearningAvatar label="Teacher" className={styles.selfLearningTeacher}>
                            <TeacherIcon size={18} />
                        </SelfLearningAvatar>
                    </div>
                    <div className={styles.selfLearningHeaderText}>
                        <h3 className={styles.selfLearningTitle}>Learned commitments</h3>
                    </div>
                </div>

                <div className={styles.searchModalContent}>
                    {(summary.samplesLabel || summary.updatedLabel) && (
                        <div className={styles.selfLearningMetaRow}>
                            {summary.samplesLabel && (
                                <span className={styles.selfLearningMetaChip}>{summary.samplesLabel}</span>
                            )}
                            {summary.updatedLabel && (
                                <span className={styles.selfLearningMeta}>Updated {summary.updatedLabel}</span>
                            )}
                        </div>
                    )}
                    <div className={styles.selfLearningCommitments}>
                        <span className={styles.selfLearningCommitmentsLabel}>Teacher updates</span>
                        {summary.commitments.length > 0 ? (
                            <div className={styles.selfLearningBookEditor}>
                                <BookEditor
                                    value={validateBook(summary.commitmentsText)}
                                    isReadonly={true}
                                    height={commitmentsHeight}
                                    isUploadButtonShown={false}
                                    isCameraButtonShown={false}
                                    isDownloadButtonShown={false}
                                    isAboutButtonShown={false}
                                    isFullscreenButtonShown={false}
                                />
                            </div>
                        ) : (
                            <div className={styles.selfLearningEmpty}>
                                {summary.hasTeacherCommitments
                                    ? 'Commitments were added, but details were not provided.'
                                    : 'No new commitments were added.'}
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    if (isRunBrowser) {
        return renderRunBrowserToolCall({
            args,
            resultRaw,
        });
    }

    if (isSearch) {
        return (
            <>
                <div className={styles.searchModalHeader}>
                    <span className={styles.searchModalIcon}>🔎</span>
                    <h3 className={styles.searchModalQuery}>{args.query || args.searchText || 'Search Results'}</h3>
                </div>

                <div className={styles.searchModalContent}>
                    {hasResults ? (
                        <div className={styles.searchResultsList}>
                            {(results as Array<TODO_any>).map((item, i) => (
                                <div key={i} className={styles.searchResultItem}>
                                    <div className={styles.searchResultUrl}>
                                        {item.url && (
                                            <a href={item.url} target="_blank" rel="noreferrer">
                                                {item.url}
                                            </a>
                                        )}
                                    </div>
                                    <h4 className={styles.searchResultTitle}>
                                        {item.url ? (
                                            <a href={item.url} target="_blank" rel="noreferrer">
                                                {item.title || 'Untitled'}
                                            </a>
                                        ) : (
                                            item.title || 'Untitled'
                                        )}
                                    </h4>
                                    <p className={styles.searchResultSnippet}>{item.snippet || item.content || ''}</p>
                                </div>
                            ))}
                        </div>
                    ) : hasRawText ? (
                        <MarkdownContent className={styles.searchResultsRaw} content={rawText!} />
                    ) : (
                        <div className={styles.noResults}>
                            {resultRaw ? 'No search results found.' : 'Search results are not available.'}
                        </div>
                    )}
                </div>
            </>
        );
    }

    if (isTime) {
        const timeResultDate = getToolCallResultDate(resultRaw);
        const displayDate = timeResultDate || toolCallDate;
        const isValidDate = !!displayDate && !isNaN(displayDate.getTime());
        const relativeLabel = toolCallDate ? `called ${moment(toolCallDate).fromNow()}` : null;

        return (
            <>
                <div className={styles.searchModalHeader}>
                    <span className={styles.searchModalIcon}>⏰</span>
                    <h3 className={styles.searchModalQuery}>Time at call</h3>
                </div>

                <div className={styles.searchModalContent}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            padding: '20px',
                        }}
                    >
                        {isValidDate && displayDate && <ClockIcon date={displayDate} size={150} />}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                {isValidDate && displayDate
                                    ? displayDate.toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      })
                                    : 'Unknown time'}
                            </div>
                            <div style={{ color: '#666' }}>
                                {isValidDate && displayDate ? displayDate.toLocaleDateString() : 'Unknown date'}
                            </div>
                            {relativeLabel && (
                                <div style={{ fontSize: '0.9em', color: '#888', marginTop: '5px' }}>
                                    ({relativeLabel})
                                </div>
                            )}
                            {args.timezone && (
                                <div style={{ fontSize: '0.9em', color: '#888', marginTop: '5px' }}>
                                    Timezone: {args.timezone}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.toolCallDetails}>
                        <p>
                            <strong>Timestamp of call:</strong>
                        </p>
                        <div className={styles.toolCallDataContainer}>
                            <pre className={styles.toolCallData}>
                                {toolCallDate ? toolCallDate.toLocaleString() : 'Unknown'}
                            </pre>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (isEmail) {
        const to = args.to || [];
        const cc = args.cc || [];
        const subject = args.subject || 'No subject';
        const body = args.body || '';
        const recipients = Array.isArray(to) ? to : [to];
        const ccRecipients = Array.isArray(cc) ? cc : [];
        const emailResult = resultRaw && typeof resultRaw === 'object' ? (resultRaw as Record<string, TODO_any>) : null;
        const from =
            (emailResult?.from as string | undefined) ||
            (emailResult?.sender as string | undefined) ||
            'Configured sender';
        const status = typeof emailResult?.status === 'string' ? emailResult.status : null;

        return (
            <>
                <div className={classNames(styles.searchModalHeader, styles.emailModalHeader)}>
                    <span className={styles.searchModalIcon}>
                        <EmailIcon size={26} />
                    </span>
                    <div className={styles.emailHeaderText}>
                        <span className={styles.emailHeaderLabel}>Email</span>
                        <h3 className={styles.searchModalQuery}>{subject}</h3>
                    </div>
                </div>

                <div className={styles.searchModalContent}>
                    <div className={styles.emailContainer}>
                        <div className={styles.emailMetadata}>
                            <div className={styles.emailField}>
                                <strong>From:</strong>
                                <span className={styles.emailRecipients}>{from}</span>
                            </div>
                            <div className={styles.emailField}>
                                <strong>To:</strong>
                                <span className={styles.emailRecipients}>{recipients.join(', ')}</span>
                            </div>
                            {ccRecipients.length > 0 && (
                                <div className={styles.emailField}>
                                    <strong>CC:</strong>
                                    <span className={styles.emailRecipients}>{ccRecipients.join(', ')}</span>
                                </div>
                            )}
                            <div className={styles.emailField}>
                                <strong>Subject:</strong>
                                <span>{subject}</span>
                            </div>
                            {status && (
                                <div className={styles.emailField}>
                                    <strong>Status:</strong>
                                    <span className={styles.emailStatus}>{status}</span>
                                </div>
                            )}
                        </div>
                        <div className={styles.emailBody}>
                            <strong>Message:</strong>
                            <div className={styles.emailBodyContent}>
                                <MarkdownContent content={body} />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const chipletInfo = getToolCallChipletInfo(toolCall);
    const toolMetadata = TOOL_TITLES[toolCall.name];
    const headerEmoji = toolMetadata?.emoji || extractLeadingEmoji(chipletInfo.text) || '🛠️';
    const headerTitle = toolTitles?.[toolCall.name] || toolMetadata?.title || chipletInfo.text || toolCall.name;
    const argumentEntries = buildArgumentEntries(args);
    const resultSummary = buildToolCallResultSummary(resultRaw);
    const resultCount = getResultItemCount(resultRaw);
    const toolCallIssues = normalizeToolCallIssues(toolCall);

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    {headerEmoji}
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Action</p>
                    <h3 className={styles.toolCallTitle}>{headerTitle}</h3>
                    <p className={styles.toolCallSubtitle}>Here is what happened.</p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>Request</p>
                    {argumentEntries.length > 0 ? (
                        <ul className={styles.toolCallList}>
                            {argumentEntries.map((entry) => (
                                <li key={entry.label} className={styles.toolCallItem}>
                                    <span className={styles.toolCallItemLabel}>{entry.label}</span>
                                    <span className={styles.toolCallItemValue}>{entry.value}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.toolCallEmpty}>No extra details were needed.</p>
                    )}
                </section>

                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>Outcome</p>
                    {resultSummary ? (
                        <p className={styles.toolCallSummary}>{resultSummary}</p>
                    ) : (
                        <p className={styles.toolCallEmpty}>The action finished, but there is no short summary.</p>
                    )}
                    {typeof resultCount === 'number' && (
                        <div className={styles.toolCallSummaryMeta}>
                            <span className={styles.toolCallSummaryMetaBadge}>
                                Returned {resultCount} {resultCount === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                    )}
                </section>
            </div>

            {toolCallIssues.length > 0 && (
                <div className={styles.toolCallIssues}>
                    {toolCallIssues.map((issue, index) => (
                        <span
                            key={`${issue.type}-${index}`}
                            className={classNames(
                                styles.toolCallIssueBadge,
                                issue.type === 'warning' ? styles.toolCallIssueWarning : styles.toolCallIssueError,
                            )}
                        >
                            <strong>{issue.label}</strong>: {issue.message}
                        </span>
                    ))}
                </div>
            )}
        </>
    );
}

/**
 * Rendering options for advanced raw payload details.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type AdvancedToolCallDetailsOptions = {
    /**
     * Tool call currently selected in the modal.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Optional mapping of tool titles.
     */
    toolTitles?: Record<string, string>;
};

/**
 * Monaco language identifiers used by advanced payload viewers.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallPayloadLanguage = 'json' | 'plaintext';

/**
 * One payload section rendered in advanced mode.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type AdvancedToolCallPayloadSection = {
    /**
     * Stable section identifier used for Monaco model path.
     */
    id: string;
    /**
     * User-facing panel title.
     */
    title: string;
    /**
     * Raw payload value to render.
     */
    payload: TODO_any;
};

/**
 * Payload formatting result for Monaco rendering.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type FormattedToolCallPayload = {
    /**
     * Editor language used for syntax highlighting.
     */
    language: ToolCallPayloadLanguage;
    /**
     * Textual payload content displayed in Monaco.
     */
    content: string;
};

/**
 * Matches characters unsafe in Monaco in-memory model paths.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const INVALID_MONACO_MODEL_PATH_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Line height used for read-only payload Monaco editors.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const TOOL_CALL_PAYLOAD_EDITOR_LINE_HEIGHT_PX = 19;

/**
 * Minimum Monaco editor height for payload blocks.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const TOOL_CALL_PAYLOAD_EDITOR_MIN_HEIGHT_PX = 114;

/**
 * Maximum Monaco editor height for payload blocks.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const TOOL_CALL_PAYLOAD_EDITOR_MAX_HEIGHT_PX = 418;

/**
 * Shared read-only Monaco settings for advanced payload rendering.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
const TOOL_CALL_PAYLOAD_EDITOR_OPTIONS = {
    readOnly: true,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    folding: false,
    glyphMargin: false,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 13,
    lineHeight: TOOL_CALL_PAYLOAD_EDITOR_LINE_HEIGHT_PX,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'none',
    contextmenu: false,
    scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
    },
    domReadOnly: true,
    wordWrap: 'off',
} as const;

/**
 * Inputs for resolving tool-call presentation metadata used in advanced mode/reporting.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ResolveToolCallPresentationMetadataOptions = {
    /**
     * Tool call being rendered.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Optional mapping of friendly tool titles.
     */
    toolTitles?: Record<string, string>;
};

/**
 * Friendly metadata derived from a tool call for headers and reports.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallPresentationMetadata = {
    /**
     * Emoji shown in the modal header.
     */
    emoji: string;
    /**
     * Human-readable title shown in the header.
     */
    title: string;
};

/**
 * Resolves stable visual metadata (emoji + title) for a tool call.
 *
 * @param options - Resolution options.
 * @returns Friendly metadata used by advanced UI and copied reports.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function resolveToolCallPresentationMetadata(
    options: ResolveToolCallPresentationMetadataOptions,
): ToolCallPresentationMetadata {
    const { toolCall, toolTitles } = options;
    const chipletInfo = getToolCallChipletInfo(toolCall);
    const toolMetadata = TOOL_TITLES[toolCall.name];

    return {
        emoji: toolMetadata?.emoji || extractLeadingEmoji(chipletInfo.text) || '🛠️',
        title: toolTitles?.[toolCall.name] || toolMetadata?.title || chipletInfo.text || toolCall.name,
    };
}

/**
 * Creates advanced payload panels shared by rendering and markdown export.
 *
 * @param toolCall - Tool call currently focused in modal.
 * @returns Ordered payload sections.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function createAdvancedToolCallPayloadSections(
    toolCall: NonNullable<ChatMessage['toolCalls']>[number],
): Array<AdvancedToolCallPayloadSection> {
    return [
        {
            id: 'request',
            title: 'Input payload',
            payload: {
                toolName: toolCall.name,
                arguments: toolCall.arguments,
            },
        },
        { id: 'result', title: 'Output payload', payload: toolCall.result },
        { id: 'raw-model', title: 'Model payload', payload: toolCall.rawToolCall },
        { id: 'event', title: 'Full event', payload: toolCall },
    ];
}

/**
 * Renders a technical view with raw tool input/output payloads.
 *
 * @param options - Rendering options for advanced mode.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderAdvancedToolCallDetails(options: AdvancedToolCallDetailsOptions): ReactElement {
    const { toolCall, toolTitles } = options;
    const presentationMetadata = resolveToolCallPresentationMetadata({ toolCall, toolTitles });
    const payloadSections = createAdvancedToolCallPayloadSections(toolCall);

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    {presentationMetadata.emoji}
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Advanced</p>
                    <h3 className={styles.toolCallTitle}>{presentationMetadata.title}</h3>
                    <p className={styles.toolCallSubtitle}>{toolCall.name}</p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                {payloadSections.map((payloadSection) => (
                    <section key={payloadSection.id} className={styles.toolCallPanel}>
                        <p className={styles.toolCallPanelTitle}>{payloadSection.title}</p>
                        {renderAdvancedToolCallPayload({
                            toolCall,
                            sectionId: payloadSection.id,
                            payload: payloadSection.payload,
                        })}
                    </section>
                ))}
            </div>
        </>
    );
}

/**
 * Rendering options for one advanced Monaco payload section.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type RenderAdvancedToolCallPayloadOptions = {
    /**
     * Tool call shown in the modal.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Unique section id used for Monaco model isolation.
     */
    sectionId: string;
    /**
     * Raw payload for this section.
     */
    payload: TODO_any;
};

/**
 * Renders one advanced payload block using Monaco with syntax highlighting.
 *
 * @param options - Rendering options for one payload section.
 * @returns Monaco-backed payload renderer.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function renderAdvancedToolCallPayload(options: RenderAdvancedToolCallPayloadOptions): ReactElement {
    const { toolCall, sectionId, payload } = options;
    const formattedPayload = formatToolCallPayload(payload);
    const modelPath = createToolCallPayloadMonacoPath({
        toolCall,
        sectionId,
        language: formattedPayload.language,
    });
    const editorHeight = resolveToolCallPayloadEditorHeight(formattedPayload.content);

    return (
        <div className={styles.toolCallPayloadContainer}>
            <div className={styles.toolCallPayloadEditor}>
                <MonacoEditorWithShadowDom
                    height={`${editorHeight}px`}
                    language={formattedPayload.language}
                    path={modelPath}
                    value={formattedPayload.content}
                    theme="vs-light"
                    options={TOOL_CALL_PAYLOAD_EDITOR_OPTIONS}
                />
            </div>
        </div>
    );
}

/**
 * Resolves Monaco editor height from payload line count with bounded limits.
 *
 * @param content - Editor payload content.
 * @returns Height in pixels.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function resolveToolCallPayloadEditorHeight(content: string): number {
    const lineCount = content.split(/\r?\n/).length;
    const estimatedHeight = lineCount * TOOL_CALL_PAYLOAD_EDITOR_LINE_HEIGHT_PX;

    return Math.min(
        Math.max(estimatedHeight, TOOL_CALL_PAYLOAD_EDITOR_MIN_HEIGHT_PX),
        TOOL_CALL_PAYLOAD_EDITOR_MAX_HEIGHT_PX,
    );
}

/**
 * Options required to build one Monaco model path for advanced payload rendering.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type CreateToolCallPayloadMonacoPathOptions = {
    /**
     * Tool call shown inside the modal.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Payload section identifier.
     */
    sectionId: string;
    /**
     * Monaco language used for this payload.
     */
    language: ToolCallPayloadLanguage;
};

/**
 * Builds a stable Monaco model path so advanced payload editors stay isolated.
 *
 * @param options - Path composition inputs.
 * @returns Stable in-memory Monaco model URI.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function createToolCallPayloadMonacoPath(options: CreateToolCallPayloadMonacoPathOptions): string {
    const { toolCall, sectionId, language } = options;
    const stableToolIdentifier = sanitizeMonacoPathPart(
        `${toolCall.name}-${toolCall.idempotencyKey || toolCall.createdAt || 'event'}`,
    );
    const safeSectionId = sanitizeMonacoPathPart(sectionId);
    const extension = language === 'json' ? 'json' : 'txt';

    return `memory://tool-call-modal/${stableToolIdentifier}-${safeSectionId}.${extension}`;
}

/**
 * Normalizes text into a Monaco-safe path segment.
 *
 * @param value - Raw segment value.
 * @returns Monaco-safe segment string.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function sanitizeMonacoPathPart(value: string): string {
    return value.replace(INVALID_MONACO_MODEL_PATH_CHARACTER_PATTERN, '-');
}

/**
 * Attempts to parse a string as JSON payload.
 *
 * @param value - Raw string payload.
 * @returns Parsed payload when string is JSON, otherwise `undefined`.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function tryParseJsonString(value: string): TODO_any | undefined {
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
        return undefined;
    }

    try {
        return JSON.parse(trimmedValue);
    } catch {
        return undefined;
    }
}

/**
 * Converts raw payloads into Monaco-friendly formatted output.
 *
 * JSON objects are pretty printed, and JSON strings are parsed and re-stringified for readability.
 *
 * @param value - Raw payload value.
 * @returns Monaco language + formatted content.
 * @private internal utility of `<ChatToolCallModal/>`
 */
function formatToolCallPayload(value: TODO_any): FormattedToolCallPayload {
    if (value === undefined) {
        return { language: 'plaintext', content: 'undefined' };
    }

    if (value === null) {
        return { language: 'json', content: 'null' };
    }

    if (typeof value === 'string') {
        const parsedJsonString = tryParseJsonString(value);

        if (parsedJsonString === undefined) {
            return { language: 'plaintext', content: value };
        }

        return { language: 'json', content: JSON.stringify(parsedJsonString, null, 2) };
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return { language: 'json', content: JSON.stringify(value, null, 2) };
    }

    if (typeof value === 'bigint') {
        return { language: 'plaintext', content: String(value) };
    }

    try {
        const serialized = JSON.stringify(value, null, 2);
        if (serialized === undefined) {
            return { language: 'plaintext', content: String(value) };
        }

        return { language: 'json', content: serialized };
    } catch {
        return { language: 'plaintext', content: String(value) };
    }
}

/**
 * Represents a single argument entry that is suitable for the friendly modal view.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallArgumentEntry = {
    /**
     * Human-friendly label derived from the raw argument key.
     */
    label: string;
    /**
     * Stringified argument value tailored for display.
     */
    value: string;
};

/**
 * Represents an error or warning surfaced inside the modal footer.
 *
 * @private internal utility of `<ChatToolCallModal/>`
 */
type ToolCallIssue = {
    type: 'error' | 'warning';
    label: string;
    message: string;
};

/**
 * Builds a list of argument entries for the friendly summary view.
 *
 * @param args - Parsed tool call arguments.
 * @returns Array of display-ready argument entries.
 */
function buildArgumentEntries(args: Record<string, TODO_any>): Array<ToolCallArgumentEntry> {
    return Object.entries(args).map(([key, value]) => ({
        label: formatArgumentLabel(key),
        value: formatArgumentValue(value),
    }));
}

/**
 * Normalizes a tool call argument key into human-readable text.
 *
 * @param key - Raw argument key.
 * @returns Humanized label.
 */
function formatArgumentLabel(key: string): string {
    const replaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return replaced.charAt(0).toUpperCase() + replaced.slice(1);
}

/**
 * Converts a value into a display-friendly string without exposing raw JSON.
 *
 * @param value - Arbitrary tool call argument value.
 * @returns Friendly string.
 */
function formatArgumentValue(value: TODO_any): string {
    if (value === null || value === undefined) {
        return 'Not provided';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const text = String(value);
        return text === '' ? 'Empty string' : text;
    }

    if (Array.isArray(value)) {
        const items = value.map((entry) => formatArgumentValue(entry)).filter(Boolean);
        return items.length > 0 ? items.join(', ') : '[array]';
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, TODO_any>)
            .map(([childKey, childValue]) => `${childKey}: ${formatArgumentValue(childValue)}`)
            .filter(Boolean);

        if (entries.length > 0) {
            const joined = entries.join('; ');
            return joined.length > 80 ? `${joined.slice(0, 80)}…` : joined;
        }

        const solo = JSON.stringify(value);
        return solo.length > 80 ? `${solo.slice(0, 80)}…` : solo;
    }

    return String(value);
}

/**
 * Extracts a short natural-language summary from the raw tool call result.
 *
 * @param resultRaw - Decoded tool call result.
 * @returns Friendly summary or `null` when nothing suitable is found.
 */
function buildToolCallResultSummary(resultRaw: TODO_any): string | null {
    if (!resultRaw) {
        return null;
    }

    if (typeof resultRaw === 'string' && resultRaw.trim()) {
        return resultRaw.trim();
    }

    const candidate = findStringCandidate(resultRaw, [
        'summary',
        'text',
        'content',
        'description',
        'message',
        'result',
    ]);

    if (candidate) {
        return candidate;
    }

    if (Array.isArray(resultRaw) && resultRaw.length > 0) {
        const firstEntry = resultRaw[0];
        if (typeof firstEntry === 'string' && firstEntry.trim()) {
            return firstEntry.trim();
        }
        const nested = findStringCandidate(firstEntry, ['title', 'snippet', 'summary']);
        if (nested) {
            return nested;
        }
    }

    return null;
}

/**
 * Searches for the first non-empty string field inside an object.
 *
 * @param value - Object to scan.
 * @param keys - Keys to try in order.
 * @returns First matching string or `null`.
 */
function findStringCandidate(value: TODO_any, keys: string[]): string | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    for (const key of keys) {
        const candidate = (value as Record<string, TODO_any>)[key];
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return null;
}

/**
 * Counts items returned by the tool call when the payload is iterable.
 *
 * @param resultRaw - Tool call result payload.
 * @returns Item count or `null` when the result is not a collection.
 */
function getResultItemCount(resultRaw: TODO_any): number | null {
    if (Array.isArray(resultRaw)) {
        return resultRaw.length;
    }

    if (resultRaw && typeof resultRaw === 'object') {
        const candidates = ['results', 'items', 'data'];
        for (const key of candidates) {
            const candidate = (resultRaw as Record<string, TODO_any>)[key];
            if (Array.isArray(candidate)) {
                return candidate.length;
            }
        }
    }

    return null;
}

/**
 * Normalizes raw tool call errors and warnings for display badges.
 *
 * @param toolCall - Tool call payload to inspect.
 * @returns Array of structured issues.
 */
function normalizeToolCallIssues(toolCall: NonNullable<ChatMessage['toolCalls']>[number]): Array<ToolCallIssue> {
    const warnings = (toolCall.warnings || []).map((value) => ({
        type: 'warning' as const,
        label: 'Warning',
        message: formatIssueValue(value),
    }));

    const errors = (toolCall.errors || []).map((value) => ({
        type: 'error' as const,
        label: 'Error',
        message: formatIssueValue(value),
    }));

    return [...warnings, ...errors];
}

/**
 * Formats an error/warning payload into a single-line string.
 *
 * @param value - Raw issue payload.
 * @returns String suitable for badge display.
 */
function formatIssueValue(value: TODO_any): string {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
        const json = JSON.stringify(value);
        return json.length > 120 ? `${json.slice(0, 120)}…` : json;
    }

    return String(value ?? 'Unknown issue');
}

/**
 * Grabs the leading emoji (if present) from a chiplet label for fallback icons.
 *
 * @param text - Chiplet label text.
 * @returns First character or `null` when empty.
 */
function extractLeadingEmoji(text?: string): string | null {
    if (!text) {
        return null;
    }

    const trimmed = text.trim();
    return trimmed ? trimmed[0]! : null;
}
