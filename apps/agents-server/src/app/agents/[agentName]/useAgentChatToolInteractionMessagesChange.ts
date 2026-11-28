import type { ChatMessage } from '@promptbook-local/components';
import type { ToolCall } from '@promptbook-local/types';
import { useCallback } from 'react';
import { findAgentChatActionableToolCalls } from './findAgentChatActionableToolCalls';

/**
 * Input options consumed by `useAgentChatToolInteractionMessagesChange`.
 *
 * @private function of useAgentChatToolInteractions
 */
type UseAgentChatToolInteractionMessagesChangeProps = {
    /**
     * Existing chat on-change callback from parent.
     */
    readonly onMessagesChange?: (messages: ReadonlyArray<ChatMessage>) => void;
    /**
     * Handles one location tool call if it has not been processed yet.
     */
    readonly handleLocationToolCall: (toolCall: ToolCall | null) => void;
    /**
     * Handles one privacy tool call if it has not been processed yet.
     */
    readonly handlePrivacyToolCall: (toolCall: ToolCall | null) => void;
    /**
     * Handles one TEAM pseudo-user tool call if it has not been processed yet.
     */
    readonly handlePseudoUserToolCall: (toolCall: ToolCall | null) => void;
    /**
     * Handles one wallet tool call if it has not been processed yet.
     */
    readonly handleWalletToolCall: (toolCall: ToolCall | null) => void;
};

/**
 * Builds the chat on-change callback that routes actionable tool calls.
 *
 * @private function of useAgentChatToolInteractions
 */
export function useAgentChatToolInteractionMessagesChange({
    onMessagesChange,
    handleLocationToolCall,
    handlePrivacyToolCall,
    handlePseudoUserToolCall,
    handleWalletToolCall,
}: UseAgentChatToolInteractionMessagesChangeProps): (messages: ReadonlyArray<ChatMessage>) => void {
    return useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            onMessagesChange?.(messages);

            const { locationToolCall, privacyToolCall, pseudoUserToolCall, walletToolCall } =
                findAgentChatActionableToolCalls(messages);

            handleLocationToolCall(locationToolCall);
            handlePrivacyToolCall(privacyToolCall);

            if (pseudoUserToolCall) {
                handlePseudoUserToolCall(pseudoUserToolCall);
                return;
            }

            handleWalletToolCall(walletToolCall);
        },
        [
            handleLocationToolCall,
            handlePrivacyToolCall,
            handlePseudoUserToolCall,
            handleWalletToolCall,
            onMessagesChange,
        ],
    );
}
