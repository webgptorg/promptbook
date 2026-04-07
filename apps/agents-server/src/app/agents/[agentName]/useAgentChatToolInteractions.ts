import type {
    PendingWalletRecordRequest,
    WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ChatMessage } from '@promptbook-local/components';
import { useCallback, useRef, useState } from 'react';
import { confirmPrivateModeEnable } from '../../../components/PrivateModePreferences/confirmPrivateModeEnable';
import type { ServerTranslationKey } from '../../../languages/ServerTranslationKeys';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';
import {
    buildPendingWalletRequest,
    shouldRequestWalletCredential,
    shouldRequestWalletRecord,
} from './useAgentChatToolInteractions/buildPendingWalletRequest';
import {
    createPendingPseudoUserInteraction,
    type PendingPseudoUserInteraction,
} from './useAgentChatToolInteractions/createPendingPseudoUserInteraction';
import { createToolCallMarker } from './useAgentChatToolInteractions/createToolCallMarker';
import { findNewestMatchingToolCall } from './useAgentChatToolInteractions/findNewestMatchingToolCall';
import { persistWalletRecord } from './useAgentChatToolInteractions/persistWalletRecord';
import { requestBrowserUserLocationPromptParameter } from './useAgentChatToolInteractions/requestBrowserUserLocationPromptParameter';
import { shouldRequestBrowserUserLocation } from './useAgentChatToolInteractions/shouldRequestBrowserUserLocation';
import { shouldRequestPrivateModeEnable } from './useAgentChatToolInteractions/shouldRequestPrivateModeEnable';
import { shouldRequestPseudoUserReply } from './useAgentChatToolInteractions/createPendingPseudoUserInteraction';

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
    const [userLocationPromptParameter, setUserLocationPromptParameter] = useState<UserLocationPromptParameter | null>(
        null,
    );
    const isLocationRequestInFlightRef = useRef(false);
    const isPrivacyConfirmationInFlightRef = useRef(false);
    const handledLocationToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPrivacyToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPseudoUserToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledWalletToolCallMarkersRef = useRef<Set<string>>(new Set());
    const [pendingPseudoUserInteraction, setPendingPseudoUserInteraction] =
        useState<PendingPseudoUserInteraction | null>(null);
    const [pendingWalletRequest, setPendingWalletRequest] = useState<PendingWalletRecordRequest | null>(null);

    /**
     * Requests geolocation from browser and stores it for next prompt calls.
     *
     * @private function of AgentChatWrapper
     */
    const requestBrowserUserLocation = useCallback(async () => {
        if (isLocationRequestInFlightRef.current) {
            return;
        }

        isLocationRequestInFlightRef.current = true;

        try {
            setUserLocationPromptParameter(await requestBrowserUserLocationPromptParameter());
        } finally {
            isLocationRequestInFlightRef.current = false;
        }
    }, []);

    /**
     * Asks the user to confirm enabling private mode and enables it on confirmation.
     *
     * @private function of AgentChatWrapper
     */
    const requestPrivateModeEnableConfirmation = useCallback(async () => {
        if (isPrivateModeEnabled || isPrivacyConfirmationInFlightRef.current) {
            return;
        }

        isPrivacyConfirmationInFlightRef.current = true;

        try {
            const isConfirmed = await confirmPrivateModeEnable(t);
            if (!isConfirmed) {
                return;
            }

            setIsPrivateModeEnabled(true);
        } finally {
            isPrivacyConfirmationInFlightRef.current = false;
        }
    }, [isPrivateModeEnabled, setIsPrivateModeEnabled, t]);

    /**
     * Handles chat message updates and reacts to actionable tool calls.
     *
     * @private function of AgentChatWrapper
     */
    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            onMessagesChange?.(messages);

            const locationToolCall = findNewestMatchingToolCall(messages, shouldRequestBrowserUserLocation);
            if (locationToolCall) {
                const locationMarker = createToolCallMarker(locationToolCall);
                if (!handledLocationToolCallMarkersRef.current.has(locationMarker)) {
                    handledLocationToolCallMarkersRef.current.add(locationMarker);

                    if (!userLocationPromptParameter?.permission) {
                        void requestBrowserUserLocation();
                    }
                }
            }

            const privacyToolCall = findNewestMatchingToolCall(messages, shouldRequestPrivateModeEnable);
            if (privacyToolCall) {
                const privacyMarker = createToolCallMarker(privacyToolCall);
                if (!handledPrivacyToolCallMarkersRef.current.has(privacyMarker)) {
                    handledPrivacyToolCallMarkersRef.current.add(privacyMarker);
                    void requestPrivateModeEnableConfirmation();
                }
            }

            const pseudoUserToolCall = findNewestMatchingToolCall(messages, shouldRequestPseudoUserReply);
            if (!pseudoUserToolCall) {
                const walletToolCall = findNewestMatchingToolCall(
                    messages,
                    (toolCall) => shouldRequestWalletRecord(toolCall) || shouldRequestWalletCredential(toolCall),
                );
                if (!walletToolCall) {
                    return;
                }

                const walletMarker = createToolCallMarker(walletToolCall);
                if (handledWalletToolCallMarkersRef.current.has(walletMarker)) {
                    return;
                }

                handledWalletToolCallMarkersRef.current.add(walletMarker);
                setPendingWalletRequest(buildPendingWalletRequest(walletToolCall));
                return;
            }

            const pseudoUserMarker = createToolCallMarker(pseudoUserToolCall);
            if (handledPseudoUserToolCallMarkersRef.current.has(pseudoUserMarker)) {
                return;
            }
            handledPseudoUserToolCallMarkersRef.current.add(pseudoUserMarker);

            setPendingPseudoUserInteraction(
                createPendingPseudoUserInteraction(
                    pseudoUserToolCall,
                    agent?.meta?.fullname || agent?.agentName || 'Agent',
                ),
            );
        },
        [
            agent?.agentName,
            agent?.meta?.fullname,
            onMessagesChange,
            requestBrowserUserLocation,
            requestPrivateModeEnableConfirmation,
            userLocationPromptParameter,
        ],
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

    /**
     * Stores one wallet credential submitted from the popup and asks agent to continue.
     *
     * @private function of AgentChatWrapper
     */
    const handleWalletRequestSubmit = useCallback(
        async (payload: WalletRecordDialogSubmitPayload) => {
            await persistWalletRecord(payload, currentAgentPermanentId);
            setPendingWalletRequest(null);
            sendMessage('Wallet credential saved. Continue with the previous task.');
        },
        [currentAgentPermanentId, sendMessage],
    );

    /**
     * Dismisses wallet request popup without saving.
     *
     * @private function of AgentChatWrapper
     */
    const handleWalletRequestClose = useCallback(() => {
        setPendingWalletRequest(null);
    }, []);

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
