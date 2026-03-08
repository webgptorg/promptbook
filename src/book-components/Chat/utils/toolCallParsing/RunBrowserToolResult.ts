import type { TODO_any } from '../../../../utils/organization/TODO_any';

/**
 * Structured browser artifact metadata extracted from `run_browser` tool result.
 *
 * @private type of toolCallParsing
 */
export type RunBrowserToolArtifact = {
    kind: 'screenshot' | 'video';
    path: string;
    label: string;
    actionSummary?: string;
};

/**
 * Structured browser action summary extracted from `run_browser` tool result.
 *
 * @private type of toolCallParsing
 */
export type RunBrowserToolAction = {
    summary: string;
};

/**
 * Structured browser error metadata extracted from `run_browser` payload.
 *
 * @private type of toolCallParsing
 */
export type RunBrowserToolError = {
    code: string;
    message: string;
    isRetryable: boolean;
    suggestedNextSteps: Array<string>;
    debug: Record<string, TODO_any> | null;
};

/**
 * Parsed `run_browser` tool result normalized for modal rendering.
 *
 * @private type of toolCallParsing
 */
export type RunBrowserToolResult = {
    sessionId: string | null;
    mode: string | null;
    modeUsed: string | null;
    initialUrl: string | null;
    finalUrl: string | null;
    finalTitle: string | null;
    warning: string | null;
    fallbackContent: string | null;
    error: RunBrowserToolError | null;
    artifacts: Array<RunBrowserToolArtifact>;
    actions: Array<RunBrowserToolAction>;
};

