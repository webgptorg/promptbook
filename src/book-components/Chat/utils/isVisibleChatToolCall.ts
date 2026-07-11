import type { ToolCall } from '../../../types/ToolCall';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../types/ToolCall';

/**
 * Tool calls that stay available in message data but should not be surfaced as user-facing chat progress.
 *
 * @private internal utility of `<Chat/>`
 */
const HIDDEN_CHAT_TOOL_CALL_NAMES: ReadonlySet<string> = new Set([
    ASSISTANT_PREPARATION_TOOL_CALL_NAME,
    'agent_progress',
]);

/**
 * Returns true when one tool call represents a user-facing action.
 *
 * @param toolCall - Tool call candidate.
 * @returns Whether the tool call should be visible in chat progress and chips.
 *
 * @private internal utility of `<Chat/>`
 */
export function isVisibleChatToolCall(toolCall: Pick<ToolCall, 'name'>): boolean {
    return !HIDDEN_CHAT_TOOL_CALL_NAMES.has(toolCall.name);
}
