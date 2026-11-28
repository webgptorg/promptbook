import type { ChatMessage } from '@promptbook-local/components';
import type { ToolCall } from '@promptbook-local/types';
import { shouldRequestBrowserUserLocation } from './useAgentChatBrowserLocation';
import { shouldRequestPrivateModeEnable } from './useAgentChatPrivateModeConfirmation';
import { shouldRequestPseudoUserReply } from './useAgentChatPseudoUserInteraction';
import { shouldRequestWalletInteraction } from './useAgentChatWalletRequest';

/**
 * Newest actionable tool calls extracted from one chat transcript.
 *
 * @private function of AgentChatWrapper
 */
export type AgentChatActionableToolCalls = {
    /**
     * Newest location tool call that requires browser geolocation.
     */
    readonly locationToolCall: ToolCall | null;
    /**
     * Newest privacy tool call that requires user confirmation.
     */
    readonly privacyToolCall: ToolCall | null;
    /**
     * Newest TEAM tool call that requires one real-user reply.
     */
    readonly pseudoUserToolCall: ToolCall | null;
    /**
     * Newest wallet-related tool call that requires credentials.
     */
    readonly walletToolCall: ToolCall | null;
};

/**
 * Finds the newest actionable tool calls currently present in the transcript.
 *
 * @private function of AgentChatWrapper
 */
export function findAgentChatActionableToolCalls(
    messages: ReadonlyArray<ChatMessage>,
): AgentChatActionableToolCalls {
    let locationToolCall: ToolCall | null = null;
    let privacyToolCall: ToolCall | null = null;
    let pseudoUserToolCall: ToolCall | null = null;
    let walletToolCall: ToolCall | null = null;

    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
        const message = messages[messageIndex];
        if (!message) {
            continue;
        }

        const toolCalls = message.toolCalls || message.completedToolCalls;
        if (!toolCalls || toolCalls.length === 0) {
            continue;
        }

        for (const toolCall of toolCalls) {
            if (!locationToolCall && shouldRequestBrowserUserLocation(toolCall)) {
                locationToolCall = toolCall;
            }

            if (!privacyToolCall && shouldRequestPrivateModeEnable(toolCall)) {
                privacyToolCall = toolCall;
            }

            if (!pseudoUserToolCall && shouldRequestPseudoUserReply(toolCall)) {
                pseudoUserToolCall = toolCall;
            }

            if (!walletToolCall && shouldRequestWalletInteraction(toolCall)) {
                walletToolCall = toolCall;
            }

            if (locationToolCall && privacyToolCall && pseudoUserToolCall && walletToolCall) {
                return {
                    locationToolCall,
                    privacyToolCall,
                    pseudoUserToolCall,
                    walletToolCall,
                };
            }
        }
    }

    return {
        locationToolCall,
        privacyToolCall,
        pseudoUserToolCall,
        walletToolCall,
    };
}
