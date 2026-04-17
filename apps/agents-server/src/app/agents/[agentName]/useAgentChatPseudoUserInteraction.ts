import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useState } from 'react';
import {
    PSEUDO_AGENT_USER_URL,
    resolvePseudoAgentKindFromUrl,
} from '../../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { createToolCallMarker } from './createToolCallMarker';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * TEAM pseudo-user interaction marker emitted by TEAM commitment tools.
 *
 * @private function of AgentChatWrapper
 */
const PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND = 'PSEUDO_USER_SINGLE_MESSAGE';

/**
 * Lightweight agent shape consumed by the pseudo-user interaction hook.
 *
 * @private function of AgentChatWrapper
 */
type AgentChatPseudoUserInteractionAgent = {
    /**
     * Agent canonical name.
     */
    readonly agentName?: string;
    /**
     * Agent metadata.
     */
    readonly meta?: {
        /**
         * Agent display name.
         */
        readonly fullname?: string;
    };
};

/**
 * TEAM tool payload shape used to detect pseudo-user prompts.
 *
 * @private function of AgentChatWrapper
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
 * Pending pseudo-user interaction extracted from TEAM tool result.
 *
 * @private function of AgentChatWrapper
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
 * Input options consumed by `useAgentChatPseudoUserInteraction`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatPseudoUserInteractionProps = {
    /**
     * Current connected agent.
     */
    readonly agent: AgentChatPseudoUserInteractionAgent | null | undefined;
    /**
     * Function used to send one message into chat.
     */
    readonly sendMessage: (message: string) => void;
};

/**
 * Result object returned by `useAgentChatPseudoUserInteraction`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatPseudoUserInteractionResult = {
    /**
     * Pending pseudo-user interaction payload.
     */
    readonly pendingPseudoUserInteraction: PendingPseudoUserInteraction | null;
    /**
     * Opens the pseudo-user interaction dialog for the supplied tool call.
     */
    readonly openPendingPseudoUserInteraction: (toolCall: ToolCall) => void;
    /**
     * Submits pseudo-user reply.
     */
    readonly handlePseudoUserReplySubmit: (reply: string) => Promise<void>;
    /**
     * Closes pseudo-user dialog.
     */
    readonly handlePseudoUserReplyClose: () => void;
};

/**
 * Parses TEAM tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parseTeamToolResult(result: unknown): TeamToolResult | null {
    return parseToolResultObject(result) as TeamToolResult | null;
}

/**
 * Returns true when this tool call asks the real user for one pseudo-team reply.
 *
 * @private function of AgentChatWrapper
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
 * Extracts pseudo-user prompt text from TEAM tool result.
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
 */
function getPseudoUserLabel(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    return parsedResult?.teammate?.label?.trim() || 'User';
}

/**
 * Manages the TEAM pseudo-user dialog state and reply actions.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatPseudoUserInteraction({
    agent,
    sendMessage,
}: UseAgentChatPseudoUserInteractionProps): UseAgentChatPseudoUserInteractionResult {
    const [pendingPseudoUserInteraction, setPendingPseudoUserInteraction] = useState<PendingPseudoUserInteraction | null>(
        null,
    );

    /**
     * Opens the pseudo-user interaction dialog for one actionable TEAM tool call.
     *
     * @private function of AgentChatWrapper
     */
    const openPendingPseudoUserInteraction = useCallback(
        (toolCall: ToolCall) => {
            setPendingPseudoUserInteraction({
                marker: createToolCallMarker(toolCall),
                prompt: getPseudoUserPromptText(toolCall),
                agentName: agent?.meta?.fullname || agent?.agentName || 'Agent',
                teammateLabel: getPseudoUserLabel(toolCall),
            });
        },
        [agent?.agentName, agent?.meta?.fullname],
    );

    /**
     * Sends one pseudo-user reply back to the main chat and closes the modal.
     *
     * @private function of AgentChatWrapper
     */
    const handlePseudoUserReplySubmit = useCallback(
        async (reply: string) => {
            setPendingPseudoUserInteraction(null);
            sendMessage(reply);
        },
        [sendMessage],
    );

    /**
     * Dismisses the pseudo-user reply modal without sending a message.
     *
     * @private function of AgentChatWrapper
     */
    const handlePseudoUserReplyClose = useCallback(() => {
        setPendingPseudoUserInteraction(null);
    }, []);

    return {
        pendingPseudoUserInteraction,
        openPendingPseudoUserInteraction,
        handlePseudoUserReplySubmit,
        handlePseudoUserReplyClose,
    };
}
