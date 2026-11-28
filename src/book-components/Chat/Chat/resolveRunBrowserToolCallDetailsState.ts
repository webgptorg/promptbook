import type { ToolCallLogEntry, ToolCallState } from '../../../types/ToolCall';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { ChatMessage } from '../types/ChatMessage';
import { resolveToolCallState } from '../utils/resolveToolCallState';
import { parseRunBrowserToolResult } from '../utils/toolCallParsing/parseRunBrowserToolResult';
import type { RunBrowserToolArtifact, RunBrowserToolError } from '../utils/toolCallParsing/RunBrowserToolResult';

/**
 * One browser tool call rendered in the replay modal.
 *
 * @private type of resolveRunBrowserToolCallDetailsState
 */
type RunBrowserToolCall = NonNullable<ChatMessage['toolCalls']>[number];

/**
 * Rendering options needed to derive browser replay state.
 *
 * @private type of resolveRunBrowserToolCallDetailsState
 */
type ResolveRunBrowserToolCallDetailsStateOptions = {
    /**
     * Tool call being rendered.
     */
    toolCall: RunBrowserToolCall;
    /**
     * Parsed tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
};

/**
 * Current visual state rendered for one browser action row in the modal.
 *
 * @private type of resolveRunBrowserToolCallDetailsState
 */
type BrowserActionRowState = 'pending' | 'running' | 'complete' | 'error';

/**
 * One browser action row rendered in the simple browser-tool view.
 *
 * @private type of resolveRunBrowserToolCallDetailsState
 */
type BrowserActionRow = {
    /**
     * Stable row key.
     */
    key: string;
    /**
     * Human-readable action summary.
     */
    label: string;
    /**
     * Current action state.
     */
    state: BrowserActionRowState;
};

/**
 * One metadata row rendered in the browser replay summary block.
 *
 * @private type of resolveRunBrowserToolCallDetailsState
 */
type RunBrowserMetaItem = {
    /**
     * Stable key for React rendering.
     */
    key: string;
    /**
     * User-facing row label.
     */
    label: string;
    /**
     * User-facing row value.
     */
    value: string;
    /**
     * Optional link target when the value is a URL.
     */
    href?: string;
};

/**
 * Fully derived browser replay state consumed by render helpers.
 *
 * @private type of resolveRunBrowserToolCallDetailsState
 */
type RunBrowserToolCallDetailsState = {
    /**
     * Original tool call currently being rendered.
     */
    toolCall: RunBrowserToolCall;
    /**
     * Resolved lifecycle state of the tool call snapshot.
     */
    toolCallState: ToolCallState;
    /**
     * Metadata rows shown at the top of the replay UI.
     */
    metaItems: Array<RunBrowserMetaItem>;
    /**
     * Browser-session log entry surfaced as a status banner.
     */
    browserReadyLog: ToolCallLogEntry | null;
    /**
     * Parsed browser warning message, when present.
     */
    warning: string | null;
    /**
     * Parsed fallback extracted content, when present.
     */
    fallbackContent: string | null;
    /**
     * Parsed browser error, when present.
     */
    runBrowserError: RunBrowserToolError | null;
    /**
     * Visual artifacts captured during the browser session.
     */
    artifacts: Array<RunBrowserToolArtifact>;
    /**
     * Ordered action rows combining requested actions, streamed logs, and final summaries.
     */
    actionRows: Array<BrowserActionRow>;
    /**
     * Indicates that the visual replay placeholder should be shown.
     */
    isVisualReplayPending: boolean;
    /**
     * Indicates that the empty visual replay state should be shown.
     */
    isVisualReplayEmpty: boolean;
    /**
     * Indicates that the action-plan placeholder should be shown.
     */
    isActionPlanPending: boolean;
    /**
     * Indicates that a streaming issue notice should be shown below the sections.
     */
    isStreamingErrorNoticeVisible: boolean;
};

/**
 * Resolves all derived state needed by `renderRunBrowserToolCallDetails`.
 *
 * @param options - Raw browser tool-call data.
 * @returns Derived state ready for focused render helpers.
 *
 * @private function of renderRunBrowserToolCallDetails
 */
export function resolveRunBrowserToolCallDetailsState(
    options: ResolveRunBrowserToolCallDetailsStateOptions,
): RunBrowserToolCallDetailsState {
    const { toolCall, args, resultRaw } = options;
    const parsedResult = parseRunBrowserToolResult(resultRaw);
    const toolCallState = resolveToolCallState(toolCall);
    const initialUrl = parsedResult?.initialUrl || (typeof args.url === 'string' ? args.url : null);
    const finalUrl = parsedResult?.finalUrl || null;
    const finalTitle = parsedResult?.finalTitle || null;
    const mode = parsedResult?.mode || null;
    const modeUsed = parsedResult?.modeUsed || null;
    const warning = parsedResult?.warning || null;
    const fallbackContent = parsedResult?.fallbackContent || null;
    const runBrowserError = parsedResult?.error || null;
    const artifacts = parsedResult?.artifacts || [];
    const actionRows = buildRunBrowserActionRows({
        args,
        toolCall,
        toolCallState,
        parsedActionSummaries: (parsedResult?.actions || []).map((action) => action.summary),
    });
    const isVisualReplayPending =
        toolCallState !== 'COMPLETE' && !runBrowserError && artifacts.length === 0 && !fallbackContent;

    return {
        toolCall,
        toolCallState,
        metaItems: buildRunBrowserMetaItems({
            initialUrl,
            finalUrl,
            finalTitle,
            mode,
            modeUsed,
        }),
        browserReadyLog: findRunBrowserSessionLog(toolCall.logs || []),
        warning,
        fallbackContent,
        runBrowserError,
        artifacts,
        actionRows,
        isVisualReplayPending,
        isVisualReplayEmpty: artifacts.length === 0 && !isVisualReplayPending && !fallbackContent,
        isActionPlanPending: toolCallState !== 'COMPLETE' && actionRows.length === 0,
        isStreamingErrorNoticeVisible: !!runBrowserError && toolCallState !== 'ERROR',
    };
}

/**
 * Builds the browser replay metadata rows shown above the replay content.
 *
 * @param values - Raw browser replay metadata values.
 * @returns Ordered metadata rows with optional links.
 *
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function buildRunBrowserMetaItems(values: {
    initialUrl: string | null;
    finalUrl: string | null;
    finalTitle: string | null;
    mode: string | null;
    modeUsed: string | null;
}): Array<RunBrowserMetaItem> {
    const metaItems: Array<RunBrowserMetaItem> = [];

    if (values.initialUrl) {
        metaItems.push({
            key: 'started-at',
            label: 'Started at',
            value: values.initialUrl,
            href: values.initialUrl,
        });
    }

    if (values.finalUrl) {
        metaItems.push({
            key: 'ended-at',
            label: 'Ended at',
            value: values.finalUrl,
            href: values.finalUrl,
        });
    }

    if (values.finalTitle) {
        metaItems.push({
            key: 'final-page',
            label: 'Final page',
            value: values.finalTitle,
        });
    }

    if (values.mode) {
        metaItems.push({
            key: 'mode-requested',
            label: 'Mode requested',
            value: values.mode,
        });
    }

    if (values.modeUsed) {
        metaItems.push({
            key: 'mode-used',
            label: 'Mode used',
            value: values.modeUsed,
        });
    }

    return metaItems;
}

/**
 * Builds browser action rows from requested args, streamed browser logs, and parsed result summaries.
 *
 * @param options - Raw action inputs and browser logs.
 * @returns Ordered browser action rows.
 *
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function buildRunBrowserActionRows(options: {
    args: Record<string, TODO_any>;
    toolCall: RunBrowserToolCall;
    toolCallState: ToolCallState;
    parsedActionSummaries: ReadonlyArray<string>;
}): Array<BrowserActionRow> {
    const { args, toolCall, toolCallState, parsedActionSummaries } = options;
    const requestedActions = Array.isArray(args.actions) ? args.actions : [];
    const actionRows =
        requestedActions.length > 0
            ? requestedActions.map((action, index) => createRequestedRunBrowserActionRow(action, index))
            : parsedActionSummaries.map((actionSummary, index) => ({
                  key: `parsed-${index + 1}`,
                  label: actionSummary,
                  state: 'complete' as BrowserActionRowState,
              }));

    applyRunBrowserActionLogs({
        actionRows,
        logs: toolCall.logs || [],
    });

    appendCompletedRunBrowserActionRows({
        actionRows,
        parsedActionSummaries,
        toolCallState,
    });

    return actionRows;
}

/**
 * Creates one initial action row from the requested browser actions.
 *
 * @param action - Raw action object from the tool arguments.
 * @param index - Zero-based action index.
 * @returns Initial pending action row.
 *
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function createRequestedRunBrowserActionRow(action: TODO_any, index: number): BrowserActionRow {
    return {
        key: `requested-${index + 1}`,
        label:
            action && typeof action === 'object'
                ? formatRequestedBrowserActionSummary(action as Record<string, TODO_any>, index + 1)
                : `Action ${index + 1}`,
        state: 'pending',
    };
}

/**
 * Applies streamed browser-action log entries on top of the initial action rows.
 *
 * @param options - Mutable action row list with the streamed browser logs.
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function applyRunBrowserActionLogs(options: {
    actionRows: Array<BrowserActionRow>;
    logs: ReadonlyArray<ToolCallLogEntry>;
}): void {
    const { actionRows, logs } = options;

    for (const logEntry of logs) {
        if (logEntry.kind !== 'browser-action') {
            continue;
        }

        const { actionIndex, state } = readRunBrowserActionLogState(logEntry);

        if (actionIndex >= 0 && actionRows[actionIndex]) {
            actionRows[actionIndex] = {
                ...actionRows[actionIndex]!,
                label: logEntry.message || actionRows[actionIndex]!.label,
                state,
            };
            continue;
        }

        actionRows.push({
            key: `logged-${actionRows.length + 1}`,
            label: logEntry.message || logEntry.title || `Action ${actionRows.length + 1}`,
            state,
        });
    }
}

/**
 * Reads the streamed action index and state from one browser-action log entry.
 *
 * @param logEntry - Browser-action log entry.
 * @returns Zero-based action index together with the next row state.
 *
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function readRunBrowserActionLogState(logEntry: ToolCallLogEntry): {
    actionIndex: number;
    state: BrowserActionRowState;
} {
    const payload =
        logEntry.payload && typeof logEntry.payload === 'object' && !Array.isArray(logEntry.payload)
            ? (logEntry.payload as Record<string, TODO_any>)
            : null;
    const actionIndex =
        payload && typeof payload.actionIndex === 'number' && payload.actionIndex > 0 ? payload.actionIndex - 1 : -1;
    const phase = typeof payload?.phase === 'string' ? payload.phase : null;

    return {
        actionIndex,
        state: phase === 'error' ? 'error' : phase === 'complete' ? 'complete' : 'running',
    };
}

/**
 * Appends final parsed actions that were not already represented in the action rows.
 *
 * @param options - Existing action rows, parsed actions, and tool-call state.
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function appendCompletedRunBrowserActionRows(options: {
    actionRows: Array<BrowserActionRow>;
    parsedActionSummaries: ReadonlyArray<string>;
    toolCallState: ToolCallState;
}): void {
    const { actionRows, parsedActionSummaries, toolCallState } = options;
    if (toolCallState !== 'COMPLETE' || parsedActionSummaries.length <= actionRows.length) {
        return;
    }

    const firstMissingIndex = actionRows.length;
    parsedActionSummaries.slice(firstMissingIndex).forEach((actionSummary, index) => {
        actionRows.push({
            key: `completed-${firstMissingIndex + index + 1}`,
            label: actionSummary,
            state: 'complete',
        });
    });
}

/**
 * Finds the browser-session log entry shown as the browser readiness banner.
 *
 * @param logs - Streamed tool-call logs.
 * @returns First browser-session log entry or `null`.
 *
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function findRunBrowserSessionLog(logs: ReadonlyArray<ToolCallLogEntry>): ToolCallLogEntry | null {
    return logs.find((logEntry) => logEntry.kind === 'browser-session') || null;
}

/**
 * Creates a human-readable summary for one requested browser action.
 *
 * @param action - Raw action object from the tool arguments.
 * @param fallbackIndex - Fallback action index for unknown actions.
 * @returns Human-friendly summary of the action.
 *
 * @private function of resolveRunBrowserToolCallDetailsState
 */
function formatRequestedBrowserActionSummary(action: Record<string, TODO_any>, fallbackIndex: number): string {
    const actionType = typeof action.type === 'string' ? action.type : '';

    switch (actionType) {
        case 'navigate':
            return typeof action.value === 'string' && action.value.trim()
                ? `Navigate to ${action.value.trim()}`
                : 'Navigate';
        case 'click':
            return typeof action.selector === 'string' && action.selector.trim()
                ? `Click ${action.selector.trim()}`
                : 'Click';
        case 'type':
            return typeof action.selector === 'string' && action.selector.trim()
                ? `Type into ${action.selector.trim()}`
                : 'Type text';
        case 'wait':
            return typeof action.value === 'number' || typeof action.value === 'string'
                ? `Wait ${String(action.value)}ms`
                : 'Wait';
        case 'scroll':
            return typeof action.selector === 'string' && action.selector.trim()
                ? `Scroll ${String(action.value ?? '')} in ${action.selector.trim()}`.trim()
                : `Scroll ${String(action.value ?? '')}`.trim() || 'Scroll';
        default:
            return `Action ${fallbackIndex}`;
    }
}
