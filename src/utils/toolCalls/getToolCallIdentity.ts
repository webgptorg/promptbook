import type { ToolCall } from '../../types/ToolCall';

/**
 * Builds a stable identity string for tool calls across partial updates.
 *
 * @param toolCall - Tool call entry to identify.
 * @returns Stable identity string for deduplication.
 */
export function getToolCallIdentity(toolCall: ToolCall): string {
    const rawToolCall = toolCall.rawToolCall as
        | {
              id?: string;
              callId?: string;
              call_id?: string;
          }
        | undefined;
    const rawId = rawToolCall?.id || rawToolCall?.callId || rawToolCall?.call_id;

    if (rawId) {
        return `id:${rawId}`;
    }

    if (toolCall.createdAt) {
        return `time:${toolCall.createdAt}:${toolCall.name}`;
    }

    const argsKey = (() => {
        if (typeof toolCall.arguments === 'string') {
            return toolCall.arguments;
        }

        if (!toolCall.arguments) {
            return '';
        }

        try {
            return JSON.stringify(toolCall.arguments);
        } catch {
            return '';
        }
    })();

    return `fallback:${toolCall.name}:${argsKey}`;
}
