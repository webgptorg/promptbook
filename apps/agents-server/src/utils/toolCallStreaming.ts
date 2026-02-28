import type { ToolCall } from '@promptbook-local/types';
import { resolveToolCallIdempotencyKey } from '../../../../src/utils/toolCalls/resolveToolCallIdempotencyKey';

/**
 * Ensures a streaming slice of a tool call carries a stable idempotency key.
 *
 * @param toolCall - Tool call payload from the model.
 * @returns Tool call copy with an idempotency key attached when missing.
 *
 * @private internal helper for the agents server streaming layer
 */
export function ensureToolCallHasIdempotency(toolCall: ToolCall): ToolCall {
    if (toolCall.idempotencyKey) {
        return toolCall;
    }

    return {
        ...toolCall,
        idempotencyKey: resolveToolCallIdempotencyKey(toolCall),
    };
}

/**
 * Prepares a batch of tool calls for streaming to the client.
 *
 * @param toolCalls - Tool calls observed at some point during generation.
 * @returns New array where each tool call has an idempotency key.
 *
 * @private internal helper for the agents server streaming layer
 */
export function prepareToolCallsForStreaming(toolCalls: ReadonlyArray<ToolCall>): Array<ToolCall> {
    return toolCalls.map(ensureToolCallHasIdempotency);
}
