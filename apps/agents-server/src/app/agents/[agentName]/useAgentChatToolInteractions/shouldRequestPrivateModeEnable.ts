import type { ToolCall } from '@promptbook-local/types';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * Tool function name used by USE PRIVACY.
 */
const TURN_PRIVACY_ON_TOOL_NAME = 'turn_privacy_on';

/**
 * Privacy-tool status that means UI confirmation is required.
 */
const PRIVACY_CONFIRMATION_REQUIRED_STATUS = 'confirmation-required';

/**
 * Privacy tool result payload shape.
 */
type PrivacyToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
};

/**
 * Parses privacy tool result into structured object.
 */
function parsePrivacyToolResult(result: unknown): PrivacyToolResult | null {
    return parseToolResultObject(result) as PrivacyToolResult | null;
}

/**
 * Returns true when this tool call should trigger private mode confirmation in UI.
 *
 * @private function of useAgentChatToolInteractions
 */
export function shouldRequestPrivateModeEnable(toolCall: ToolCall): boolean {
    if (toolCall.name !== TURN_PRIVACY_ON_TOOL_NAME) {
        return false;
    }

    const parsedResult = parsePrivacyToolResult(toolCall.result);
    return parsedResult?.status === PRIVACY_CONFIRMATION_REQUIRED_STATUS;
}
