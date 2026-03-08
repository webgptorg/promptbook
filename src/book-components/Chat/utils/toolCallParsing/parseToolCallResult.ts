import type { ToolCall } from '../../../../types/ToolCall';
import type { TODO_any } from '../../../../utils/organization/TODO_any';

/**
 * Parses one tool result payload while preserving non-JSON strings.
 *
 * @param result - Raw tool result payload.
 * @returns Parsed payload when possible, otherwise original value.
 * @private function of toolCallParsing
 */
export function parseToolCallResult(result: ToolCall['result']): TODO_any {
    if (typeof result !== 'string') {
        return result;
    }

    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}
