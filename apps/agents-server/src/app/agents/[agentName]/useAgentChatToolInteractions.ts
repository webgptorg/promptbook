import {
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ChatMessage } from '@promptbook-local/components';
import type { ServerTranslationKey } from '../../../languages/ServerTranslationKeys';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';
import {
    type PendingPseudoUserInteraction,
} from './useAgentChatPseudoUserInteraction';
import { useAgentChatToolCallHandlers } from './useAgentChatToolCallHandlers';
import { useAgentChatToolInteractionMessagesChange } from './useAgentChatToolInteractionMessagesChange';

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
    const {
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
    } = useAgentChatToolCallHandlers({
        agent,
        sendMessage,
        currentAgentPermanentId,
        isPrivateModeEnabled,
        setIsPrivateModeEnabled,
        t,
    });
    const handleMessagesChange = useAgentChatToolInteractionMessagesChange({
        onMessagesChange,
        handleLocationToolCall,
        handlePrivacyToolCall,
        handlePseudoUserToolCall,
        handleWalletToolCall,
    });

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
