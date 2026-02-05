'use client';

import moment from 'moment';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { validateBook } from '../../../book-2.0/agent-source/string_book';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { string_date_iso8601 } from '../../../types/typeAliases';
import { Color } from '../../../utils/color/Color';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
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
import type { AgentProfileData } from '../utils/loadAgentProfile';
import { loadAgentProfile, resolveAgentProfileFallback, resolvePreferredAgentLabel } from '../utils/loadAgentProfile';
import { collectTeamToolCallSummary, type TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import { buildToolCallChipText, getToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import {
    extractSearchResults,
    getToolCallResultDate,
    getToolCallTimestamp,
    parseTeamToolResult,
    parseToolCallArguments,
    parseToolCallResult,
} from '../utils/toolCallParsing';
import styles from './Chat.module.css';
import { ClockIcon } from './ClockIcon';
import { buildSelfLearningSummary } from './ChatSelfLearningSummary';
import { SelfLearningAvatar, TeamHeaderProfile } from './ChatToolCallModalComponents';

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
};

/**
 * Modal that renders rich tool call details for chat chiplets.
 *
 * @private component of `<Chat/>`
 */
export function ChatToolCallModal(props: ChatToolCallModalProps) {
    const { isOpen, toolCall, onClose, toolTitles, agentParticipant, buttonColor } = props;
    const [teamProfiles, setTeamProfiles] = useState<Record<string, AgentProfileData>>({});
    const [selectedTeamToolCall, setSelectedTeamToolCall] = useState<TransitiveToolCall | null>(null);

    const resultRaw = useMemo(() => (toolCall ? parseToolCallResult(toolCall.result) : null), [toolCall]);
    const teamResult = useMemo(() => parseTeamToolResult(resultRaw), [resultRaw]);
    const toolCallDate = useMemo(() => (toolCall ? getToolCallTimestamp(toolCall) : null), [toolCall]);
    const teamToolCallSummary = useMemo(() => collectTeamToolCallSummary(toolCall ? [toolCall] : []), [toolCall]);

    useEffect(() => {
        if (!isOpen || !toolCall) {
            return;
        }

        const teammateUrl = teamResult?.teammate?.url;

        if (!teammateUrl || teammateUrl === 'VOID') {
            return;
        }

        const fallbackProfile = resolveAgentProfileFallback({
            url: teammateUrl,
            label: teamResult.teammate?.label,
        });

        setTeamProfiles((previous) => {
            if (previous[teammateUrl]) {
                return previous;
            }
            return { ...previous, [teammateUrl]: fallbackProfile };
        });

        let isMounted = true;

        loadAgentProfile({ url: teammateUrl, label: teamResult.teammate?.label }).then((profile) => {
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
        });

        return () => {
            isMounted = false;
        };
    }, [isOpen, toolCall, teamResult]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTeamToolCall(null);
            return;
        }

        setSelectedTeamToolCall(null);
    }, [isOpen, toolCall]);

    if (!isOpen || !toolCall) {
        return null;
    }

    const modalContent = teamResult?.teammate
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
                  teamResult.conversation?.find((entry) => entry.sender === 'AGENT' || entry.role === 'AGENT')?.name ||
                  'Agent';

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

              const resolvedAgentLabel = resolvePreferredAgentLabel([agentParticipant?.fullname, agentName], agentName);
              const resolvedAgentAvatar = agentParticipant?.avatarSrc || null;
              const resolvedAgentHeaderColor = agentParticipant?.color
                  ? Color.fromSafe(agentParticipant.color).toHex()
                  : '#64748b';

              const resolvedTeammateLabel = resolvePreferredAgentLabel(
                  [teammateConversationName, teammateProfile?.label, teammateFallbackProfile.label],
                  teammateFallbackProfile.label,
              );
              const resolvedTeammateAvatar = teammateProfile?.imageUrl || teammateFallbackProfile.imageUrl || null;
              const teammateLink = teammateUrl && teammateUrl !== 'VOID' ? teammateUrl : undefined;

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
                                          <div className={styles.teamToolCallHeading}>Tool calls</div>
                                          <div className={styles.teamToolCallChips}>
                                              {teamToolCalls.map((toolCallEntry, index) => {
                                                  const chipletInfo = getToolCallChipletInfo(toolCallEntry.toolCall);
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
                                                  Tool call details
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
            </div>
        </div>
    );
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
 * Renders the detail view for a single tool call.
 *
 * @param options - Rendering options for the tool call.
 */
function renderToolCallDetails(options: ToolCallDetailsOptions): ReactElement {
    const { toolCall, toolTitles, agentParticipant, buttonColor } = options;
    const resultRaw = parseToolCallResult(toolCall.result);
    const args = parseToolCallArguments(toolCall);
    const toolCallDate = getToolCallTimestamp(toolCall);

    const isSearch =
        toolCall.name === 'web_search' || toolCall.name === 'useSearchEngine' || toolCall.name === 'search';
    const isTime = toolCall.name === 'get_current_time' || toolCall.name === 'useTime';
    const isEmail = toolCall.name === 'send_email' || toolCall.name === 'useEmail';
    const isSelfLearning = toolCall.name === 'self-learning';

    const { results, rawText } = extractSearchResults(resultRaw);
    const hasResults = results.length > 0;
    const hasRawText = !hasResults && !!rawText && rawText.trim().length > 0;

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
        const sentAt = toolCallDate ? toolCallDate.toLocaleString() : null;
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
                            {sentAt && (
                                <div className={styles.emailField}>
                                    <strong>Sent:</strong>
                                    <span>{sentAt}</span>
                                </div>
                            )}
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
                    <div className={styles.toolCallDetails}>
                        <p>
                            <strong>Result:</strong>
                        </p>
                        <div className={styles.toolCallDataContainer}>
                            <pre className={styles.toolCallData}>
                                {typeof resultRaw === 'object' ? JSON.stringify(resultRaw, null, 2) : String(resultRaw)}
                            </pre>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <h3>Tool Call: {toolTitles?.[toolCall.name] || toolCall.name}</h3>
            <div className={styles.toolCallDetails}>
                <p>
                    <strong>Arguments:</strong>
                </p>
                <div className={styles.toolCallDataContainer}>
                    {args && typeof args === 'object' ? (
                        <ul className={styles.toolCallArgsList}>
                            {Object.entries(args).map(([key, value]) => (
                                <li key={key}>
                                    <strong>{key}:</strong>{' '}
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <pre className={styles.toolCallData}>{String(args)}</pre>
                    )}
                </div>
                <p>
                    <strong>Result:</strong>
                </p>
                <div className={styles.toolCallDataContainer}>
                    <pre className={styles.toolCallData}>
                        {typeof resultRaw === 'object' ? JSON.stringify(resultRaw, null, 4) : String(resultRaw)}
                    </pre>
                </div>
            </div>
        </>
    );
}
