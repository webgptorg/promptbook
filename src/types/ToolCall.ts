import type { string_date_iso8601 } from './typeAliases';
import type { TODO_any } from '../utils/organization/TODO_any';

/**
 * Represents a single tool call with its inputs, outputs, and timing.
 *
 * Note: This is fully serializable as JSON.
 */
export type ToolCall = {
    /**
     * Name of the tool.
     */
    readonly name: string;

    /**
     * Arguments for the tool call.
     */
    readonly arguments?: string | Record<string, TODO_any>;

    /**
     * Result of the tool call.
     */
    readonly result?: TODO_any;

    /**
     * Raw tool call payload from the model.
     */
    readonly rawToolCall?: TODO_any;

    /**
     * Timestamp when the tool call was initiated.
     */
    readonly createdAt?: string_date_iso8601;

    /**
     * Errors thrown during tool execution.
     */
    readonly errors?: ReadonlyArray<TODO_any>;

    /**
     * Warnings reported during tool execution.
     */
    readonly warnings?: ReadonlyArray<TODO_any>;
};

/**
 * Tool call name emitted while preparing a GPT assistant for an agent.
 */
export const ASSISTANT_PREPARATION_TOOL_CALL_NAME = 'assistant_preparation';

/**
 * Checks whether a tool call is the assistant preparation marker.
 */
export function isAssistantPreparationToolCall(toolCall: ToolCall): boolean {
    return toolCall.name === ASSISTANT_PREPARATION_TOOL_CALL_NAME;
}
