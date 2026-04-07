import type { ToolCall } from '@promptbook-local/types';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * Tool function name used by USE USER LOCATION.
 */
const USER_LOCATION_TOOL_NAME = 'get_user_location';

/**
 * Location-tool status that means browser should request geolocation.
 */
const USER_LOCATION_UNAVAILABLE_STATUS = 'unavailable';

/**
 * Location tool result payload shape.
 */
type UserLocationToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
};

/**
 * Parses location tool result into structured object.
 */
function parseUserLocationToolResult(result: unknown): UserLocationToolResult | null {
    return parseToolResultObject(result) as UserLocationToolResult | null;
}

/**
 * Returns true when this tool call should trigger browser geolocation request.
 *
 * @private function of useAgentChatToolInteractions
 */
export function shouldRequestBrowserUserLocation(toolCall: ToolCall): boolean {
    if (toolCall.name !== USER_LOCATION_TOOL_NAME) {
        return false;
    }

    const parsedResult = parseUserLocationToolResult(toolCall.result);
    return parsedResult?.status === USER_LOCATION_UNAVAILABLE_STATUS;
}
