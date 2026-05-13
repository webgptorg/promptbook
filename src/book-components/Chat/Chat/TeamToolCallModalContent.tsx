import { type ReactElement } from 'react';
import { isPseudoAgentUrl } from '../../../book-2.0/agent-source/pseudoAgentReferences';
import type { string_date_iso8601 } from '../../../types/string_token';
import { Color } from '../../../utils/color/Color';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { FAST_FLOW } from '../MockedChat/constants';
import { MockedChat } from '../MockedChat/MockedChat';
import { SourceChip } from '../SourceChip/SourceChip';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { TeamToolCallSummary, TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import { buildToolCallChipText, getToolCallChipletInfo } from '../utils/getToolCallChipletInfo';
import type { AgentProfileData } from '../utils/loadAgentProfile';
import { resolveAgentProfileFallback, resolvePreferredAgentLabel } from '../utils/loadAgentProfile';
import type { TeamToolResult } from '../utils/toolCallParsing/TeamToolResult';
import styles from './Chat.module.css';
import { TeamHeaderProfile } from './ChatToolCallModalComponents';
import { renderToolCallDetails } from './renderToolCallDetails';

/**
 * Default label used when the agent name is unavailable.
 *
 * @private function of ChatToolCallModal
 */
const DEFAULT_AGENT_LABEL = 'Agent';

/**
 * Default label used when the teammate name is unavailable.
 *
 * @private function of ChatToolCallModal
 */
const DEFAULT_TEAMMATE_LABEL = 'Teammate';

/**
 * Default header color used when the agent does not define one.
 *
 * @private function of ChatToolCallModal
 */
const DEFAULT_AGENT_HEADER_COLOR = '#64748b';

/**
 * Default teammate accent color used across the TEAM modal.
 *
 * @private function of ChatToolCallModal
 */
const DEFAULT_TEAMMATE_COLOR = '#0ea5e9';

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
 * Message rendered inside the TEAM conversation preview.
 *
 * @private function of ChatToolCallModal
 */
type TeamConversationMessage = {
    readonly id: string;
    readonly createdAt: string_date_iso8601;
    readonly sender: 'AGENT' | 'TEAMMATE';
    readonly content: string;
    readonly isComplete: true;
};

/**
 * Header and participant data derived for the TEAM conversation UI.
 *
 * @private function of ChatToolCallModal
 */
type TeamConversationViewModel = {
    readonly agentHeader: {
        readonly label: string;
        readonly avatarSrc: string | null;
        readonly avatarDefinition?: ChatParticipant['avatarDefinition'];
        readonly avatarVisualId?: ChatParticipant['avatarVisualId'];
        readonly fallbackColor: string;
    };
    readonly teammateHeader: {
        readonly label: string;
        readonly avatarSrc: string | null;
        readonly fallbackColor: string;
        readonly href?: string;
    };
    readonly participants: ReadonlyArray<ChatParticipant>;
};

/**
 * Options used to resolve TEAM conversation view data.
 *
 * @private function of ChatToolCallModal
 */
type CreateTeamConversationViewModelOptions = {
    readonly agentParticipant?: ChatParticipant;
    readonly teamProfiles: Record<string, AgentProfileData>;
    readonly teamResult: TeamToolResult;
};

/**
 * Returns whether one TEAM conversation entry has renderable content.
 *
 * @private function of ChatToolCallModal
 */
function hasTeamConversationContent(
    entry: NonNullable<TeamToolResult['conversation']>[number] | undefined,
): entry is NonNullable<TeamToolResult['conversation']>[number] & { content: string } {
    return Boolean(entry && entry.content);
}

/**
 * Resolves which side of the TEAM conversation one entry belongs to.
 *
 * @private function of ChatToolCallModal
 */
function resolveTeamConversationSender(
    entry: NonNullable<TeamToolResult['conversation']>[number],
): TeamConversationMessage['sender'] {
    return entry.sender === 'TEAMMATE' || entry.role === 'TEAMMATE' ? 'TEAMMATE' : 'AGENT';
}

/**
 * Creates one conversation message for the TEAM preview chat.
 *
 * @private function of ChatToolCallModal
 */
function createTeamConversationMessage(
    entry: NonNullable<TeamToolResult['conversation']>[number] & { content: string },
    index: number,
    baseTime: number,
): TeamConversationMessage {
    return {
        id: `team-${index}`,
        createdAt: new Date(baseTime + index * 1000).toISOString() as string_date_iso8601,
        sender: resolveTeamConversationSender(entry),
        content: entry.content,
        isComplete: true,
    };
}

/**
 * Appends the request/response fallback pair when no structured conversation is available.
 *
 * @private function of ChatToolCallModal
 */
function appendFallbackConversationMessages(
    messages: TeamConversationMessage[],
    teamResult: TeamToolResult,
    baseTime: number,
): void {
    if (messages.length > 0) {
        return;
    }

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

/**
 * Builds the conversation transcript shown in the TEAM modal.
 *
 * @private function of ChatToolCallModal
 */
function createTeamConversationMessages(teamResult: TeamToolResult, baseTime: number): TeamConversationMessage[] {
    const messages = (teamResult.conversation || [])
        .filter(hasTeamConversationContent)
        .map((entry, index) => createTeamConversationMessage(entry, index, baseTime));

    appendFallbackConversationMessages(messages, teamResult, baseTime);

    return messages;
}

/**
 * Finds the first conversation name used by a specific sender.
 *
 * @private function of ChatToolCallModal
 */
function resolveConversationName(
    teamResult: TeamToolResult,
    sender: TeamConversationMessage['sender'],
    fallbackName: string,
): string {
    return (
        teamResult.conversation?.find((entry) => resolveTeamConversationSender(entry) === sender)?.name || fallbackName
    );
}

/**
 * Resolves the public teammate link when it points to a real agent.
 *
 * @private function of ChatToolCallModal
 */
function resolveTeammateLink(teammateUrl: string): string | undefined {
    return teammateUrl && teammateUrl !== 'VOID' && !isPseudoAgentUrl(teammateUrl) ? teammateUrl : undefined;
}

/**
 * Builds the TEAM modal header data and chat participants.
 *
 * @private function of ChatToolCallModal
 */
function createTeamConversationViewModel({
    agentParticipant,
    teamProfiles,
    teamResult,
}: CreateTeamConversationViewModelOptions): TeamConversationViewModel {
    const teammateUrl = teamResult.teammate?.url || '';
    const teammateProfile = teammateUrl ? teamProfiles[teammateUrl] : undefined;
    const teammateFallbackProfile = teammateUrl
        ? resolveAgentProfileFallback({
              url: teammateUrl,
              label: teamResult.teammate?.label,
          })
        : { label: DEFAULT_TEAMMATE_LABEL, imageUrl: null };

    const agentName = resolveConversationName(teamResult, 'AGENT', DEFAULT_AGENT_LABEL);
    const teammateConversationName = resolveConversationName(teamResult, 'TEAMMATE', '');

    const resolvedAgentLabel = resolvePreferredAgentLabel([agentParticipant?.fullname, agentName], agentName);
    const resolvedTeammateLabel = resolvePreferredAgentLabel(
        [teammateConversationName, teammateProfile?.label, teammateFallbackProfile.label],
        teammateFallbackProfile.label,
    );

    const agentHeader = {
        label: resolvedAgentLabel,
        avatarSrc: agentParticipant?.avatarSrc || null,
        avatarDefinition: agentParticipant?.avatarDefinition,
        avatarVisualId: agentParticipant?.avatarVisualId,
        fallbackColor: agentParticipant?.color
            ? Color.fromSafe(agentParticipant.color).toHex()
            : DEFAULT_AGENT_HEADER_COLOR,
    };
    const teammateHeader = {
        label: resolvedTeammateLabel,
        avatarSrc: teammateProfile?.imageUrl || teammateFallbackProfile.imageUrl || null,
        fallbackColor: DEFAULT_TEAMMATE_COLOR,
        href: resolveTeammateLink(teammateUrl),
    };

    return {
        agentHeader,
        teammateHeader,
        participants: [
            {
                name: 'AGENT',
                fullname: agentHeader.label,
                color: agentParticipant?.color || DEFAULT_AGENT_HEADER_COLOR,
                avatarSrc: agentHeader.avatarSrc || undefined,
                avatarDefinition: agentHeader.avatarDefinition,
                avatarVisualId: agentHeader.avatarVisualId,
                isMe: true,
            },
            {
                name: 'TEAMMATE',
                fullname: teammateHeader.label,
                color: DEFAULT_TEAMMATE_COLOR,
                avatarSrc: teammateHeader.avatarSrc || undefined,
            },
        ] satisfies Array<ChatParticipant>,
    };
}

/**
 * Renders the TEAM conversation header profiles.
 *
 * @private component of ChatToolCallModal
 */
function TeamConversationHeader(props: Pick<TeamConversationViewModel, 'agentHeader' | 'teammateHeader'>) {
    const { agentHeader, teammateHeader } = props;

    return (
        <div className={classNames(styles.searchModalHeader, styles.teamModalHeader)}>
            <div className={styles.teamHeaderParticipants}>
                <TeamHeaderProfile
                    label={agentHeader.label}
                    avatarSrc={agentHeader.avatarSrc}
                    avatarDefinition={agentHeader.avatarDefinition}
                    avatarVisualId={agentHeader.avatarVisualId}
                    fallbackColor={agentHeader.fallbackColor}
                />
                <span className={styles.teamHeaderDivider}>talking with</span>
                <TeamHeaderProfile
                    label={teammateHeader.label}
                    avatarSrc={teammateHeader.avatarSrc}
                    fallbackColor={teammateHeader.fallbackColor}
                    href={teammateHeader.href}
                />
            </div>
        </div>
    );
}

/**
 * Renders the TEAM conversation transcript or the empty-state fallback.
 *
 * @private component of ChatToolCallModal
 */
function TeamConversationSection(props: {
    readonly agentLabel: string;
    readonly teammateLabel: string;
    readonly messages: ReadonlyArray<TeamConversationMessage>;
    readonly participants: ReadonlyArray<ChatParticipant>;
}) {
    const { agentLabel, teammateLabel, messages, participants } = props;

    if (messages.length === 0) {
        return <div className={styles.noResults}>No teammate conversation available.</div>;
    }

    return (
        <div className={styles.teamChatContainer}>
            <MockedChat
                title={`Chat between ${agentLabel} and ${teammateLabel}`}
                messages={messages}
                participants={participants}
                isResettable={false}
                isPausable={false}
                isSaveButtonEnabled={false}
                isCopyButtonEnabled={false}
                layout="STANDALONE"
                delayConfig={{
                    // Note+TODO: For some strange reason, <MockedChat/> is not running and stays static on the initial frame, so doing this hack to force it to show the entire chat at once. Need to investigate why the animation is not running as expected and then just use `delayConfig={FAST_FLOW}`
                    ...FAST_FLOW,
                    beforeFirstMessage: 0,
                    showIntermediateMessages: messages.length,
                }}
                visualMode="BUBBLE_MODE"
            />
        </div>
    );
}

/**
 * Renders action chips for teammate-executed tool calls.
 *
 * @private component of ChatToolCallModal
 */
function TeamToolCallActionsGroup(props: {
    readonly onSelectTeamToolCall: (toolCall: TransitiveToolCall) => void;
    readonly teamToolCalls: ReadonlyArray<TransitiveToolCall>;
    readonly toolTitles?: Record<string, string>;
}) {
    const { onSelectTeamToolCall, teamToolCalls, toolTitles } = props;

    if (teamToolCalls.length === 0) {
        return null;
    }

    return (
        <div className={styles.teamToolCallGroup}>
            <div className={styles.teamToolCallHeading}>Actions</div>
            <div className={styles.teamToolCallChips}>
                {teamToolCalls.map((toolCallEntry, index) => {
                    const chipletInfo = getToolCallChipletInfo(toolCallEntry.toolCall, undefined, toolTitles);
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
    );
}

/**
 * Renders citations surfaced from the teammate exchange.
 *
 * @private component of ChatToolCallModal
 */
function TeamToolCallSourcesGroup(props: { readonly teamCitations: TeamToolCallSummary['citations'] }) {
    const { teamCitations } = props;

    if (teamCitations.length === 0) {
        return null;
    }

    return (
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
    );
}

/**
 * Renders the nested action details for the selected teammate tool call.
 *
 * @private component of ChatToolCallModal
 */
function TeamToolCallDetailsPanel(props: {
    readonly agentParticipant?: ChatParticipant;
    readonly buttonColor: WithTake<Color>;
    readonly onClearSelectedTeamToolCall: () => void;
    readonly selectedTeamToolCall: TransitiveToolCall | null;
    readonly toolTitles?: Record<string, string>;
}) {
    const { agentParticipant, buttonColor, onClearSelectedTeamToolCall, selectedTeamToolCall, toolTitles } = props;

    if (!selectedTeamToolCall) {
        return null;
    }

    return (
        <div className={styles.teamToolCallDetails}>
            <div className={styles.teamToolCallDetailsHeader}>
                <span className={styles.teamToolCallDetailsTitle}>
                    Action details
                    <span className={styles.toolCallOrigin}>by {selectedTeamToolCall.origin.label}</span>
                </span>
                <button type="button" className={styles.teamToolCallDetailsClear} onClick={onClearSelectedTeamToolCall}>
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
    );
}

/**
 * Renders the nested tool-call and citation summary below the TEAM transcript.
 *
 * @private component of ChatToolCallModal
 */
function TeamToolCallSummarySection(props: {
    readonly agentParticipant?: ChatParticipant;
    readonly buttonColor: WithTake<Color>;
    readonly onClearSelectedTeamToolCall: () => void;
    readonly onSelectTeamToolCall: (toolCall: TransitiveToolCall) => void;
    readonly selectedTeamToolCall: TransitiveToolCall | null;
    readonly teamToolCallSummary: TeamToolCallSummary;
    readonly toolTitles?: Record<string, string>;
}) {
    const {
        agentParticipant,
        buttonColor,
        onClearSelectedTeamToolCall,
        onSelectTeamToolCall,
        selectedTeamToolCall,
        teamToolCallSummary,
        toolTitles,
    } = props;
    const hasSummaryContent = teamToolCallSummary.toolCalls.length > 0 || teamToolCallSummary.citations.length > 0;

    if (!hasSummaryContent) {
        return null;
    }

    return (
        <div className={styles.teamToolCallSection}>
            <TeamToolCallActionsGroup
                teamToolCalls={teamToolCallSummary.toolCalls}
                onSelectTeamToolCall={onSelectTeamToolCall}
                toolTitles={toolTitles}
            />
            <TeamToolCallSourcesGroup teamCitations={teamToolCallSummary.citations} />
            <TeamToolCallDetailsPanel
                selectedTeamToolCall={selectedTeamToolCall}
                onClearSelectedTeamToolCall={onClearSelectedTeamToolCall}
                toolTitles={toolTitles}
                agentParticipant={agentParticipant}
                buttonColor={buttonColor}
            />
        </div>
    );
}

/**
 * Renders TEAM conversation details, nested actions, and citations.
 *
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
    const baseTime = toolCallDate ? toolCallDate.getTime() : Date.now();
    const messages = createTeamConversationMessages(teamResult, baseTime);
    const { agentHeader, teammateHeader, participants } = createTeamConversationViewModel({
        teamResult,
        teamProfiles,
        agentParticipant,
    });

    return (
        <>
            <TeamConversationHeader agentHeader={agentHeader} teammateHeader={teammateHeader} />

            <div className={styles.searchModalContent}>
                <TeamConversationSection
                    agentLabel={agentHeader.label}
                    teammateLabel={teammateHeader.label}
                    messages={messages}
                    participants={participants}
                />
                <TeamToolCallSummarySection
                    teamToolCallSummary={teamToolCallSummary}
                    selectedTeamToolCall={selectedTeamToolCall}
                    onSelectTeamToolCall={onSelectTeamToolCall}
                    onClearSelectedTeamToolCall={onClearSelectedTeamToolCall}
                    toolTitles={toolTitles}
                    agentParticipant={agentParticipant}
                    buttonColor={buttonColor}
                />
            </div>
        </>
    );
}
