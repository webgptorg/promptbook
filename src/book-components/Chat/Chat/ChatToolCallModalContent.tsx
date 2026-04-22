import { type ReactElement } from 'react';
import { Color } from '../../../utils/color/Color';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { type TeamToolCallSummary, type TransitiveToolCall } from '../utils/collectTeamToolCallSummary';
import type { AgentProfileData } from '../utils/loadAgentProfile';
import type { TeamToolResult } from '../utils/toolCallParsing';
import type { ChatUiTranslations } from './ChatProps';
import { renderAdvancedToolCallDetails } from './renderAdvancedToolCallDetails';
import { renderToolCallDetails } from './renderToolCallDetails';
import { TeamToolCallModalContent } from './TeamToolCallModalContent';

/**
 * Tool-call snapshot rendered by the modal body.
 *
 * @private function of `ChatToolCallModalContent`
 */
type ToolCallModalToolCall = NonNullable<ChatMessage['toolCalls']>[number];

/**
 * Props consumed by `<ChatToolCallModalContent/>`.
 *
 * @private function of `ChatToolCallModalContent`
 */
type ChatToolCallModalContentProps = {
    readonly agentParticipant?: ChatParticipant;
    readonly availableTools?: ChatMessage['availableTools'];
    readonly buttonColor: WithTake<Color>;
    readonly chatUiTranslations?: ChatUiTranslations;
    readonly focusedToolCall: ToolCallModalToolCall;
    readonly isAdvancedView: boolean;
    readonly locale?: string;
    readonly mode: 'LIGHT' | 'DARK';
    readonly onClearSelectedTeamToolCall: () => void;
    readonly onRequestAdvancedView: () => void;
    readonly onSelectTeamToolCall: (toolCall: TransitiveToolCall) => void;
    readonly selectedTeamToolCall: TransitiveToolCall | null;
    readonly teamProfiles: Record<string, AgentProfileData>;
    readonly teamResult: TeamToolResult | null;
    readonly teamToolCallSummary: TeamToolCallSummary;
    readonly toolCall: ToolCallModalToolCall;
    readonly toolCallDate: Date | null;
    readonly toolTitles?: Record<string, string>;
};

/**
 * Renders the simple TEAM view, the simple single-tool view, or the advanced raw-payload view.
 *
 * @private component of `ChatToolCallModal`
 */
export function ChatToolCallModalContent({
    agentParticipant,
    availableTools,
    buttonColor,
    chatUiTranslations,
    focusedToolCall,
    isAdvancedView,
    locale,
    mode,
    onClearSelectedTeamToolCall,
    onRequestAdvancedView,
    onSelectTeamToolCall,
    selectedTeamToolCall,
    teamProfiles,
    teamResult,
    teamToolCallSummary,
    toolCall,
    toolCallDate,
    toolTitles,
}: ChatToolCallModalContentProps): ReactElement {
    if (isAdvancedView) {
        return renderAdvancedToolCallDetails({
            toolCall: focusedToolCall,
            toolTitles,
            availableTools,
            mode,
        });
    }

    if (teamResult?.teammate) {
        return (
            <TeamToolCallModalContent
                teamResult={teamResult}
                toolCallDate={toolCallDate}
                teamToolCallSummary={teamToolCallSummary}
                selectedTeamToolCall={selectedTeamToolCall}
                onSelectTeamToolCall={onSelectTeamToolCall}
                onClearSelectedTeamToolCall={onClearSelectedTeamToolCall}
                teamProfiles={teamProfiles}
                toolTitles={toolTitles}
                agentParticipant={agentParticipant}
                buttonColor={buttonColor}
            />
        );
    }

    return renderToolCallDetails({
        toolCall,
        toolTitles,
        agentParticipant,
        buttonColor,
        onRequestAdvancedView,
        locale,
        chatUiTranslations,
    });
}
