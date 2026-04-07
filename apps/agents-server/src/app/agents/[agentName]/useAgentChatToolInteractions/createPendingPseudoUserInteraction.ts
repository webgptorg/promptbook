import type { ToolCall } from '@promptbook-local/types';
import {
    PSEUDO_AGENT_USER_URL,
    resolvePseudoAgentKindFromUrl,
} from '../../../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { createToolCallMarker } from './createToolCallMarker';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * TEAM pseudo-user interaction marker emitted by TEAM commitment tools.
 */
const PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND = 'PSEUDO_USER_SINGLE_MESSAGE';

/**
 * Pending pseudo-user interaction extracted from TEAM tool result.
 *
 * @private function of useAgentChatToolInteractions
 */
export type PendingPseudoUserInteraction = {
    /**
     * Stable tool-call marker used for deduplication.
     */
    readonly marker: string;
    /**
     * Prompt text shown inside the modal.
     */
    readonly prompt: string;
    /**
     * Display name of the speaking agent.
     */
    readonly agentName: string;
    /**
     * Display label of the pseudo teammate (`User`).
     */
    readonly teammateLabel: string;
};

/**
 * TEAM tool payload shape used to detect pseudo-user prompts.
 */
type TeamToolResult = {
    /**
     * Teammate metadata from tool response.
     */
    readonly teammate?: {
        /**
         * Teammate URL.
         */
        readonly url?: string;
        /**
         * Teammate label.
         */
        readonly label?: string;
    };
    /**
     * Fallback request prompt.
     */
    readonly request?: string;
    /**
     * Structured interaction request details.
     */
    readonly interaction?: {
        /**
         * Interaction kind.
         */
        readonly kind?: string;
        /**
         * Prompt text requested from user.
         */
        readonly prompt?: string;
    };
};

/**
 * Parses TEAM tool result into structured object.
 */
function parseTeamToolResult(result: unknown): TeamToolResult | null {
    return parseToolResultObject(result) as TeamToolResult | null;
}

/**
 * Extracts pseudo-user prompt text from TEAM tool result.
 */
function getPseudoUserPromptText(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    const interactionPrompt = parsedResult?.interaction?.prompt?.trim();
    if (interactionPrompt) {
        return interactionPrompt;
    }

    const requestPrompt = parsedResult?.request?.trim();
    if (requestPrompt) {
        return requestPrompt;
    }

    return 'The agent is asking for additional details.';
}

/**
 * Extracts pseudo-user teammate label from TEAM tool result.
 */
function getPseudoUserLabel(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    return parsedResult?.teammate?.label?.trim() || 'User';
}

/**
 * Returns true when this tool call asks the real user for one pseudo-team reply.
 *
 * @private function of useAgentChatToolInteractions
 */
export function shouldRequestPseudoUserReply(toolCall: ToolCall): boolean {
    if (!toolCall.name.startsWith('team_chat_')) {
        return false;
    }

    const parsedResult = parseTeamToolResult(toolCall.result);
    if (!parsedResult?.teammate?.url) {
        return false;
    }

    const pseudoAgentKind = resolvePseudoAgentKindFromUrl(parsedResult.teammate.url);
    if (pseudoAgentKind !== 'USER' && parsedResult.teammate.url !== PSEUDO_AGENT_USER_URL) {
        return false;
    }

    return parsedResult.interaction?.kind === PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND;
}

/**
 * Builds modal state for one pending pseudo-user reply request.
 *
 * @private function of useAgentChatToolInteractions
 */
export function createPendingPseudoUserInteraction(
    toolCall: ToolCall,
    agentName: string,
): PendingPseudoUserInteraction {
    return {
        marker: createToolCallMarker(toolCall),
        prompt: getPseudoUserPromptText(toolCall),
        agentName,
        teammateLabel: getPseudoUserLabel(toolCall),
    };
}
