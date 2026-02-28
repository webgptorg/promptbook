import type { ToolCall } from '../../types/ToolCall';
import { resolveToolCallIdempotencyKey } from './resolveToolCallIdempotencyKey';

/**
 * Builds a stable identity string for tool calls across partial updates.
 *
 * @param toolCall - Tool call entry to identify.
 * @returns Stable identity string for deduplication.
 *
 * @private function of `<Chat/>`
 */
export function getToolCallIdentity(toolCall: ToolCall): string {
    const idempotencyKey = resolveToolCallIdempotencyKey(toolCall);
    return `idempotency:${idempotencyKey}`;
}
