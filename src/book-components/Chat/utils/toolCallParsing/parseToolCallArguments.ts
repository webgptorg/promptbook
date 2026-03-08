import type { ToolCall } from '../../../../types/ToolCall';
import type { TODO_any } from '../../../../utils/organization/TODO_any';

/**
 * Parses tool call arguments into an object for UI rendering.
 *
 * @param toolCall - Tool call carrying raw arguments.
 * @returns Parsed argument map or an empty object.
 * @private function of toolCallParsing
 */
export function parseToolCallArguments(toolCall: Pick<ToolCall, 'arguments'>): Record<string, TODO_any> {
    if (!toolCall.arguments) {
        return {};
    }

    if (typeof toolCall.arguments === 'string') {
        try {
            const parsed = JSON.parse(toolCall.arguments);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch {
            return {};
        }
    }

    return toolCall.arguments;
}
