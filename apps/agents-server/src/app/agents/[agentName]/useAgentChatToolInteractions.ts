import {
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ChatMessage } from '@promptbook-local/components';
import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useRef, type MutableRefObject } from 'react';
import type { ServerTranslationKey } from '../../../languages/ServerTranslationKeys';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';
import { createToolCallMarker } from './createToolCallMarker';
import { findAgentChatActionableToolCalls } from './findAgentChatActionableToolCalls';
import { useAgentChatBrowserLocation } from './useAgentChatBrowserLocation';
import { useAgentChatPrivateModeConfirmation } from './useAgentChatPrivateModeConfirmation';
import {
    type PendingPseudoUserInteraction,
    useAgentChatPseudoUserInteraction,
} from './useAgentChatPseudoUserInteraction';
import { useAgentChatWalletRequest } from './useAgentChatWalletRequest';

/**
 * Lightweight agent shape consumed by the hook.
 *
 * @private function of AgentChatWrapper
 */
type AgentChatToolInteractionAgent = {
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
 * Input options consumed by `useAgentChatToolInteractions`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatToolInteractionsProps = {
    /**
     * Current connected agent.
     */
    readonly agent: AgentChatToolInteractionAgent | null | undefined;
    /**
     * Existing chat on-change callback from parent.
     */
    readonly onMessagesChange?: (messages: ReadonlyArray<ChatMessage>) => void;
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
 * Result object returned by `useAgentChatToolInteractions`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatToolInteractionsResult = {
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
     * Chat on-change callback that triggers tool side effects.
     */
    readonly handleMessagesChange: (messages: ReadonlyArray<ChatMessage>) => void;
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
 * Returns true when the tool call marker is newly registered.
 *
 * @private function of AgentChatWrapper
 */
function registerUnhandledToolCallMarker(
    handledToolCallMarkersRef: MutableRefObject<Set<string>>,
    toolCall: ToolCall,
): string | null {
    const marker = createToolCallMarker(toolCall);
    if (handledToolCallMarkersRef.current.has(marker)) {
        return null;
    }

    handledToolCallMarkersRef.current.add(marker);
    return marker;
}

/**
 * Handles chat tool-call side effects (location, privacy, pseudo-user, wallet) for `AgentChatWrapper`.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatToolInteractions({
    agent,
    onMessagesChange,
    sendMessage,
    currentAgentPermanentId,
    isPrivateModeEnabled,
    setIsPrivateModeEnabled,
    t,
}: UseAgentChatToolInteractionsProps): UseAgentChatToolInteractionsResult {
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
    const handledLocationToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPrivacyToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPseudoUserToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledWalletToolCallMarkersRef = useRef<Set<string>>(new Set());

    /**
     * Handles one location tool call if it has not been processed yet.
     *
     * @private function of AgentChatWrapper
     */
    const handleLocationToolCall = useCallback(
        (toolCall: ToolCall | null) => {
            if (!toolCall) {
                return;
            }

            const locationMarker = registerUnhandledToolCallMarker(handledLocationToolCallMarkersRef, toolCall);
            if (!locationMarker) {
                return;
            }

            if (!userLocationPromptParameter?.permission) {
                void requestBrowserUserLocation();
            }
        },
        [requestBrowserUserLocation, userLocationPromptParameter],
    );

    /**
     * Handles one privacy tool call if it has not been processed yet.
     *
     * @private function of AgentChatWrapper
     */
    const handlePrivacyToolCall = useCallback(
        (toolCall: ToolCall | null) => {
            if (!toolCall) {
                return;
            }

            const privacyMarker = registerUnhandledToolCallMarker(handledPrivacyToolCallMarkersRef, toolCall);
            if (!privacyMarker) {
                return;
            }

            void requestPrivateModeEnableConfirmation();
        },
        [requestPrivateModeEnableConfirmation],
    );

    /**
     * Handles one TEAM pseudo-user tool call if it has not been processed yet.
     *
     * @private function of AgentChatWrapper
     */
    const handlePseudoUserToolCall = useCallback(
        (toolCall: ToolCall | null) => {
            if (!toolCall) {
                return;
            }

            const pseudoUserMarker = registerUnhandledToolCallMarker(handledPseudoUserToolCallMarkersRef, toolCall);
            if (!pseudoUserMarker) {
                return;
            }

            openPendingPseudoUserInteraction(toolCall, pseudoUserMarker);
        },
        [openPendingPseudoUserInteraction],
    );

    /**
     * Handles one wallet tool call if it has not been processed yet.
     *
     * @private function of AgentChatWrapper
     */
    const handleWalletToolCall = useCallback(
        (toolCall: ToolCall | null) => {
            if (!toolCall) {
                return;
            }

            const walletMarker = registerUnhandledToolCallMarker(handledWalletToolCallMarkersRef, toolCall);
            if (!walletMarker) {
                return;
            }

            openPendingWalletRequest(toolCall);
        },
        [openPendingWalletRequest],
    );

    /**
     * Handles chat message updates and reacts to actionable tool calls.
     *
     * @private function of AgentChatWrapper
     */
    const handleMessagesChange = useCallback(
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

    return {
        userLocationPromptParameter,
        pendingPseudoUserInteraction,
        pendingWalletRequest,
        handleMessagesChange,
        handlePseudoUserReplySubmit,
        handlePseudoUserReplyClose,
        handleWalletRequestSubmit,
        handleWalletRequestClose,
    };
}
