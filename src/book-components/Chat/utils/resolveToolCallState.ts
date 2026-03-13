import type { ToolCall, ToolCallState } from '../../../types/ToolCall';

/**
 * Resolves one explicit or inferred lifecycle state for a tool call snapshot.
 *
 * @param toolCall - Tool call snapshot to inspect.
 * @returns Resolved lifecycle state.
 *
 * @private internal helper for chat tool-call rendering
 */
export function resolveToolCallState(toolCall: ToolCall): ToolCallState {
    if (toolCall.state) {
        return toolCall.state;
    }

    if (Array.isArray(toolCall.errors) && toolCall.errors.length > 0) {
        return 'ERROR';
    }

    if (toolCall.result !== undefined && toolCall.result !== '') {
        return 'COMPLETE';
    }

    if (Array.isArray(toolCall.logs) && toolCall.logs.length > 0) {
        return 'PARTIAL';
    }

    return 'PENDING';
}
