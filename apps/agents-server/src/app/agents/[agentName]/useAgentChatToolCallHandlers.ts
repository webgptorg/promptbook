import {
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ToolCall } from '@promptbook-local/types';
import { useCallback } from 'react';
import type { ServerTranslationKey } from '../../../languages/ServerTranslationKeys';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';
import { useAgentChatBrowserLocation } from './useAgentChatBrowserLocation';
import { useAgentChatPrivateModeConfirmation } from './useAgentChatPrivateModeConfirmation';
import {
    type PendingPseudoUserInteraction,
    useAgentChatPseudoUserInteraction,
} from './useAgentChatPseudoUserInteraction';
import { useAgentChatWalletRequest } from './useAgentChatWalletRequest';
import { useHandleToolCallOnce } from './useHandleToolCallOnce';

/**
 * Lightweight agent shape consumed by the tool-call handlers hook.
 *
 * @private function of useAgentChatToolInteractions
 */
type AgentChatToolCallHandlersAgent = {
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
 * Input options consumed by `useAgentChatToolCallHandlers`.
 *
 * @private function of useAgentChatToolInteractions
 */
type UseAgentChatToolCallHandlersProps = {
    /**
     * Current connected agent.
     */
    readonly agent: AgentChatToolCallHandlersAgent | null | undefined;
    /**
     * Function used to send one message into chat.
     */
    readonly sendMessage: (message: string) => void;
    /**
     * Currently resolved permanent id of the active agent.
     */
    readonly currentAgentPermanentId: string | undefined;
    /**
     * Current private-mode state.
     */
    readonly isPrivateModeEnabled: boolean;
    /**
     * Private-mode setter from preferences.
     */
    readonly setIsPrivateModeEnabled: (isPrivateModeEnabled: boolean) => void;
    /**
     * Localization formatter used by the privacy-confirmation dialog.
     */
    readonly t: (key: ServerTranslationKey) => string;
};

/**
 * Result object returned by `useAgentChatToolCallHandlers`.
 *
 * @private function of useAgentChatToolInteractions
 */
type UseAgentChatToolCallHandlersResult = {
    /**
     * User-location prompt parameter shared with the chat prompt.
     */
    readonly userLocationPromptParameter: UserLocationPromptParameter | null;
    /**
     * Pending pseudo-user interaction payload.
     */
    readonly pendingPseudoUserInteraction: PendingPseudoUserInteraction | null;
    /**
     * Pending wallet request payload.
     */
    readonly pendingWalletRequest: PendingWalletRecordRequest | null;
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
    /**
     * Submits pseudo-user reply.
     */
    readonly handlePseudoUserReplySubmit: (reply: string) => Promise<void>;
    /**
     * Closes pseudo-user dialog.
     */
    readonly handlePseudoUserReplyClose: () => void;
    /**
     * Persists wallet record and resumes chat.
     */
    readonly handleWalletRequestSubmit: (payload: WalletRecordDialogSubmitPayload) => Promise<void>;
    /**
     * Closes wallet request dialog.
     */
    readonly handleWalletRequestClose: () => void;
};

/**
 * Composes the per-tool interaction handlers used by `useAgentChatToolInteractions`.
 *
 * @private function of useAgentChatToolInteractions
 */
export function useAgentChatToolCallHandlers({
    agent,
    sendMessage,
    currentAgentPermanentId,
    isPrivateModeEnabled,
    setIsPrivateModeEnabled,
    t,
}: UseAgentChatToolCallHandlersProps): UseAgentChatToolCallHandlersResult {
    const { userLocationPromptParameter, requestBrowserUserLocation } = useAgentChatBrowserLocation();
    const { requestPrivateModeEnableConfirmation } = useAgentChatPrivateModeConfirmation({
        isPrivateModeEnabled,
        setIsPrivateModeEnabled,
        t,
    });
    const {
        pendingPseudoUserInteraction,
        openPendingPseudoUserInteraction,
        handlePseudoUserReplySubmit,
        handlePseudoUserReplyClose,
    } = useAgentChatPseudoUserInteraction({
        agent,
        sendMessage,
    });
    const {
        pendingWalletRequest,
        openPendingWalletRequest,
        handleWalletRequestSubmit,
        handleWalletRequestClose,
    } = useAgentChatWalletRequest({
        currentAgentPermanentId,
        sendMessage,
    });

    const handleLocationToolCall = useHandleToolCallOnce(
        useCallback(() => {
            if (userLocationPromptParameter?.permission) {
                return;
            }

            void requestBrowserUserLocation();
        }, [requestBrowserUserLocation, userLocationPromptParameter?.permission]),
    );

    const handlePrivacyToolCall = useHandleToolCallOnce(
        useCallback(() => {
            void requestPrivateModeEnableConfirmation();
        }, [requestPrivateModeEnableConfirmation]),
    );

    const handlePseudoUserToolCall = useHandleToolCallOnce(openPendingPseudoUserInteraction);
    const handleWalletToolCall = useHandleToolCallOnce(openPendingWalletRequest);

    return {
        userLocationPromptParameter,
        pendingPseudoUserInteraction,
        pendingWalletRequest,
        handleLocationToolCall,
        handlePrivacyToolCall,
        handlePseudoUserToolCall,
        handleWalletToolCall,
        handlePseudoUserReplySubmit,
        handlePseudoUserReplyClose,
        handleWalletRequestSubmit,
        handleWalletRequestClose,
    };
}
