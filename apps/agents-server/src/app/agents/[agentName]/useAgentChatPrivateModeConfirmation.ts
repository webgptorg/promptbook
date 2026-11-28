import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useRef } from 'react';
import { confirmPrivateModeEnable } from '../../../components/PrivateModePreferences/confirmPrivateModeEnable';
import type { ServerTranslationKey } from '../../../languages/ServerTranslationKeys';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * Tool function name used by USE PRIVACY.
 *
 * @private function of AgentChatWrapper
 */
const TURN_PRIVACY_ON_TOOL_NAME = 'turn_privacy_on';

/**
 * Privacy-tool status that means UI confirmation is required.
 *
 * @private function of AgentChatWrapper
 */
const PRIVACY_CONFIRMATION_REQUIRED_STATUS = 'confirmation-required';

/**
 * Privacy tool result payload shape.
 *
 * @private function of AgentChatWrapper
 */
type PrivacyToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
};

/**
 * Input options consumed by `useAgentChatPrivateModeConfirmation`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatPrivateModeConfirmationProps = {
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
 * Result object returned by `useAgentChatPrivateModeConfirmation`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatPrivateModeConfirmationResult = {
    /**
     * Asks the user to enable private mode when the tool requests it.
     */
    readonly requestPrivateModeEnableConfirmation: () => Promise<void>;
};

/**
 * Parses privacy tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parsePrivacyToolResult(result: unknown): PrivacyToolResult | null {
    return parseToolResultObject(result) as PrivacyToolResult | null;
}

/**
 * Returns true when this tool call should trigger private mode confirmation in UI.
 *
 * @private function of AgentChatWrapper
 */
export function shouldRequestPrivateModeEnable(toolCall: ToolCall): boolean {
    if (toolCall.name !== TURN_PRIVACY_ON_TOOL_NAME) {
        return false;
    }

    const parsedResult = parsePrivacyToolResult(toolCall.result);
    return parsedResult?.status === PRIVACY_CONFIRMATION_REQUIRED_STATUS;
}

/**
 * Manages the private-mode confirmation flow initiated by chat tool calls.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatPrivateModeConfirmation({
    isPrivateModeEnabled,
    setIsPrivateModeEnabled,
    t,
}: UseAgentChatPrivateModeConfirmationProps): UseAgentChatPrivateModeConfirmationResult {
    const isPrivacyConfirmationInFlightRef = useRef(false);

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

    return {
        requestPrivateModeEnableConfirmation,
    };
}
