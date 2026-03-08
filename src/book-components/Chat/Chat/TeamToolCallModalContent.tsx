import { type ReactElement } from 'react';
import { isPseudoAgentUrl } from '../../../book-2.0/agent-source/pseudoAgentReferences';
import type { string_date_iso8601 } from '../../../types/typeAliases';
import { Color } from '../../../utils/color/Color';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { FAST_FLOW } from '../MockedChat/constants';
import { MockedChat } from '../MockedChat/MockedChat';
import { SourceChip } from '../SourceChip';
import type { ChatParticipant } from '../types/ChatParticipant';
import { type TeamToolCallSummary, type TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import { buildToolCallChipText, getToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import type { AgentProfileData } from '../utils/loadAgentProfile';
import { resolveAgentProfileFallback, resolvePreferredAgentLabel } from '../utils/loadAgentProfile';
import type { TeamToolResult } from '../utils/toolCallParsing';
import { TeamHeaderProfile } from './ChatToolCallModalComponents';
import { renderToolCallDetails } from './renderToolCallDetails';
import styles from './Chat.module.css';

/**
 * Rendering options for TEAM tool-call modal content.
 *
 * @private function of ChatToolCallModal
 */
type TeamToolCallModalContentOptions = {
    teamResult: TeamToolResult;
    toolCallDate: Date | null;
    teamToolCallSummary: TeamToolCallSummary;
    selectedTeamToolCall: TransitiveToolCall | null;
    onSelectTeamToolCall: (toolCall: TransitiveToolCall) => void;
    onClearSelectedTeamToolCall: () => void;
    teamProfiles: Record<string, AgentProfileData>;
    toolTitles?: Record<string, string>;
    agentParticipant?: ChatParticipant;
    buttonColor: WithTake<Color>;
};

/**
 * Renders TEAM conversation details, nested actions, and citations.
 *
 * @param options - TEAM modal rendering options.
 * @private function of ChatToolCallModal
 */
export function TeamToolCallModalContent(options: TeamToolCallModalContentOptions): ReactElement {
    const {
        teamResult,
        toolCallDate,
        teamToolCallSummary,
        selectedTeamToolCall,
        onSelectTeamToolCall,
        onClearSelectedTeamToolCall,
        teamProfiles,
        toolTitles,
        agentParticipant,
        buttonColor,
    } = options;
    const teammateUrl = teamResult.teammate?.url || '';
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
        teamResult.conversation?.find((entry) => entry.sender === 'AGENT' || entry.role === 'AGENT')?.name || 'Agent';

    const teammateConversationName =
        teamResult.conversation?.find((entry) => entry.sender === 'TEAMMATE' || entry.role === 'TEAMMATE')?.name || '';
    const teammateProfile = teammateUrl ? teamProfiles[teammateUrl] : undefined;
    const teammateFallbackProfile = teammateUrl
        ? resolveAgentProfileFallback({
              url: teammateUrl,
              label: teamResult.teammate?.label,
          })
        : { label: 'Teammate', imageUrl: null };

    const resolvedAgentLabel = resolvePreferredAgentLabel([agentParticipant?.fullname, agentName], agentName);
    const resolvedAgentAvatar = agentParticipant?.avatarSrc || null;
    const resolvedAgentHeaderColor = agentParticipant?.color ? Color.fromSafe(agentParticipant.color).toHex() : '#64748b';

    const resolvedTeammateLabel = resolvePreferredAgentLabel(
        [teammateConversationName, teammateProfile?.label, teammateFallbackProfile.label],
        teammateFallbackProfile.label,
    );
    const resolvedTeammateAvatar = teammateProfile?.imageUrl || teammateFallbackProfile.imageUrl || null;
    const teammateLink = teammateUrl && teammateUrl !== 'VOID' && !isPseudoAgentUrl(teammateUrl) ? teammateUrl : undefined;

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
                                        const chipletInfo = getToolCallChipletInfo(toolCallEntry.toolCall);
                                        const chipletText = buildToolCallChipText(chipletInfo);

                                        return (
                                            <button
                                                key={`team-tool-${index}`}
                                                className={styles.completedToolCall}
                                                onClick={() => {
                                                    onSelectTeamToolCall(toolCallEntry);
                                                }}
                                            >
                                                <span>{chipletText}</span>
                                                <span className={styles.toolCallOrigin}>by {toolCallEntry.origin.label}</span>
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
                                        <span className={styles.toolCallOrigin}>by {selectedTeamToolCall.origin.label}</span>
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.teamToolCallDetailsClear}
                                        onClick={onClearSelectedTeamToolCall}
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
}
