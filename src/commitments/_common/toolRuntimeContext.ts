import { TODO_any } from '../../_packages/types.index';

/**
 * Prompt parameter key used to pass hidden runtime context to tool execution.
 *
 * @private internal runtime wiring for commitment tools
 */
export const TOOL_RUNTIME_CONTEXT_PARAMETER = 'promptbookToolRuntimeContext';

/**
 * Hidden argument key used to pass runtime context into individual tool calls.
 *
 * @private internal runtime wiring for commitment tools
 */
export const TOOL_RUNTIME_CONTEXT_ARGUMENT = '__promptbookToolRuntimeContext';

/**
 * Runtime context shape shared across commitment tools.
 *
 * @private internal runtime wiring for commitment tools
 */
export type ToolRuntimeContext = {
    memory?: {
        enabled?: boolean;
        userId?: number;
        username?: string;
        agentId?: string;
        agentName?: string;
        isTeamConversation?: boolean;
        isPrivateMode?: boolean;
    };
};

/**
 * Parses unknown runtime context payload into a normalized object.
 *
 * @private internal runtime wiring for commitment tools
 */
export function parseToolRuntimeContext(rawValue: unknown): ToolRuntimeContext | null {
    if (!rawValue) {
        return null;
    }

    let parsed: unknown = rawValue;

    if (typeof rawValue === 'string') {
        try {
            parsed = JSON.parse(rawValue);
        } catch {
            return null;
        }
    }

    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    return parsed as ToolRuntimeContext;
}

/**
 * Reads runtime context attached to tool call arguments.
 *
 * @private internal runtime wiring for commitment tools
 */
export function readToolRuntimeContextFromToolArgs(args: Record<string, TODO_any>): ToolRuntimeContext | null {
    return parseToolRuntimeContext(args[TOOL_RUNTIME_CONTEXT_ARGUMENT]);
}

/**
 * Serializes runtime context for prompt parameters.
 *
 * @private internal runtime wiring for commitment tools
 */
export function serializeToolRuntimeContext(context: ToolRuntimeContext): string {
    return JSON.stringify(context);
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
