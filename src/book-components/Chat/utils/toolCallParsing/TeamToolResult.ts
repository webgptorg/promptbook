import type { ToolCall } from '../../../../types/ToolCall';

/**
 * Structured payload emitted by TEAM tool calls.
 */
export type TeamToolResult = {
    teammate?: {
        url?: string;
        label?: string;
        instructions?: string;
        toolName?: string;
        pseudoAgentKind?: 'USER' | 'VOID';
    };
    request?: string;
    response?: string;
    interaction?: {
        kind?: string;
        prompt?: string;
    };
    /**
     * Tool calls executed by the teammate while answering.
     */
    toolCalls?: ReadonlyArray<ToolCall>;
    error?: string | null;
    conversation?: Array<{
        sender?: string;
        name?: string;
        role?: string;
        content?: string;
    }>;
};
