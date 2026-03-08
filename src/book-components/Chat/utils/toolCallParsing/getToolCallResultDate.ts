import type { ToolCall } from '../../../../types/ToolCall';
import type { TODO_any } from '../../../../utils/organization/TODO_any';

/**
 * Extracts date-like values from tool result payloads.
 *
 * @param result - Tool result to inspect.
 * @returns Parsed date or `null` when no valid timestamp is found.
 * @private function of toolCallParsing
 */
export function getToolCallResultDate(result: ToolCall['result']): Date | null {
    if (result === null || result === undefined) {
        return null;
    }

    if (typeof result === 'string' || typeof result === 'number') {
        const date = new Date(result);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof result === 'object') {
        const candidate =
            (result as Record<string, TODO_any>).time ??
            (result as Record<string, TODO_any>).timestamp ??
            (result as Record<string, TODO_any>).now;

        if (candidate) {
            return getToolCallResultDate(candidate);
        }
    }

    return null;
}

