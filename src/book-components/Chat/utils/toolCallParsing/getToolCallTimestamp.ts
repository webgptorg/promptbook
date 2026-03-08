import type { ToolCall } from '../../../../types/ToolCall';

/**
 * Parses tool call creation timestamp into a valid date.
 *
 * @param toolCall - Tool call carrying `createdAt`.
 * @returns Parsed date or `null` when timestamp is missing/invalid.
 * @private function of toolCallParsing
 */
export function getToolCallTimestamp(toolCall: Pick<ToolCall, 'createdAt'>): Date | null {
    if (!toolCall.createdAt) {
        return null;
    }

    const date = new Date(toolCall.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
}
