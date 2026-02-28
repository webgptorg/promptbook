import type { ToolCall } from '../../types/ToolCall';

const RAW_TOOL_CALL_ID_FIELDS = ['id', 'callId', 'call_id'] as const;

/**
 * Builds a deterministic idempotency key for tool calls so the UI can track updates.
 *
 * @param toolCall - Tool call payload or snapshot.
 * @returns Stable key that identifies the same tool call instance.
 *
 * @private internal helper for tool call streaming
 */
export function resolveToolCallIdempotencyKey(toolCall: ToolCall): string {
    if (typeof toolCall.idempotencyKey === 'string' && toolCall.idempotencyKey.trim().length > 0) {
        return toolCall.idempotencyKey;
    }

    const rawToolCall = toolCall.rawToolCall as
        | {
              id?: string;
              callId?: string;
              call_id?: string;
          }
        | undefined;

    const rawId = RAW_TOOL_CALL_ID_FIELDS.reduce<string | undefined>((accumulator, key) => {
        if (accumulator) {
            return accumulator;
        }
        const value = rawToolCall?.[key];
        return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
    }, undefined);

    if (rawId) {
        return `raw:${rawId}`;
    }

    const argsKey = getArgumentsKey(toolCall.arguments);
    if (argsKey) {
        return `fallback:${toolCall.name}:${argsKey}`;
    }

    return `fallback:${toolCall.name}`;
}

function getArgumentsKey(value: string | Record<string, unknown> | undefined): string {
    if (typeof value === 'string') {
        return value;
    }

    if (!value) {
        return '';
    }

    try {
        return JSON.stringify(value);
    } catch {
        return '';
    }
}
