import type { TODO_any } from '../../_packages/types.index';

/**
 * Marker property stored inside serialized tool-execution envelopes.
 *
 * @private internal tool-execution transport
 */
const TOOL_EXECUTION_ENVELOPE_MARKER = '__promptbookToolExecutionEnvelope';

/**
 * Serialized tool payload carrying separate assistant-visible text and persisted result data.
 *
 * @private internal tool-execution transport
 */
type ToolExecutionEnvelope = {
    [TOOL_EXECUTION_ENVELOPE_MARKER]: true;
    assistantMessage: string;
    toolResult: TODO_any;
};

/**
 * Creates one serialized tool-execution envelope.
 *
 * @private internal tool-execution transport
 */
export function createToolExecutionEnvelope(options: {
    readonly assistantMessage: string;
    readonly toolResult: TODO_any;
}): string {
    const envelope: ToolExecutionEnvelope = {
        [TOOL_EXECUTION_ENVELOPE_MARKER]: true,
        assistantMessage: options.assistantMessage,
        toolResult: options.toolResult,
    };

    return JSON.stringify(envelope);
}

/**
 * Parses one serialized tool-execution envelope when present.
 *
 * @private internal tool-execution transport
 */
export function parseToolExecutionEnvelope(rawValue: unknown): {
    assistantMessage: string;
    toolResult: TODO_any;
} | null {
    if (typeof rawValue !== 'string') {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as Partial<ToolExecutionEnvelope> | null;

        if (
            !parsedValue ||
            typeof parsedValue !== 'object' ||
            parsedValue[TOOL_EXECUTION_ENVELOPE_MARKER] !== true ||
            typeof parsedValue.assistantMessage !== 'string'
        ) {
            return null;
        }

        return {
            assistantMessage: parsedValue.assistantMessage,
            toolResult: parsedValue.toolResult,
        };
    } catch {
        return null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
