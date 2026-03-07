import type { ToolCall } from '../../../types/ToolCall';
import type { TODO_any } from '../../../utils/organization/TODO_any';

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function parseToolCallArguments(toolCall: Pick<ToolCall, 'arguments'>): Record<string, TODO_any> {
    if (!toolCall.arguments) {
        return {};
    }

    if (typeof toolCall.arguments === 'string') {
        try {
            const parsed = JSON.parse(toolCall.arguments);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch {
            return {};
        }
    }

    return toolCall.arguments;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function parseToolCallResult(result: ToolCall['result']): TODO_any {
    if (typeof result !== 'string') {
        return result;
    }

    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}

type SearchResultsExtraction = {
    results: Array<TODO_any>;
    rawText: string | null;
};

/**
 * Structured browser artifact metadata extracted from `run_browser` tool result.
 *
 * @private utility of `<Chat/>` component
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
 * @private utility of `<Chat/>` component
 */
export type RunBrowserToolAction = {
    summary: string;
};

/**
 * Structured browser error metadata extracted from `run_browser` payload.
 *
 * @private utility of `<Chat/>` component
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
 * @private utility of `<Chat/>` component
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

/**
 * Schema marker emitted by successful `run_browser` payloads.
 *
 * @private utility of `<Chat/>` component
 */
const RUN_BROWSER_RESULT_SCHEMA = 'promptbook/run-browser@1';

/**
 * Matches JSON fenced blocks in markdown result payloads.
 *
 * @private utility of `<Chat/>` component
 */
const JSON_FENCED_BLOCK_PATTERN = /```json\s*([\s\S]*?)```/gi;

/**
 * Matches artifact-like local paths emitted by legacy `run_browser` markdown output.
 *
 * @private utility of `<Chat/>` component
 */
const RUN_BROWSER_ARTIFACT_PATH_PATTERN = /\.playwright-cli\/[^\s)\]]+\.(png|jpg|jpeg|webm|mp4)/gi;

/**
 * Checks whether a path-like value is already an absolute URL.
 *
 * @private utility of `<Chat/>` component
 */
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

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

function parseSearchResultsFromText(text: string): Array<TODO_any> {
    const results: Array<TODO_any> = [];
    const normalized = text.replace(/\r\n/g, '\n');
    const lines = normalized.split(/\r?\n/);
    const urlPattern = /(https?:\/\/[^\s]+)/i;
    let current: { title?: string; url?: string; snippetParts: string[] } | null = null;

    const flush = () => {
        if (!current || !current.title) {
            current = null;
            return;
        }
        const snippet = current.snippetParts
            .map((part) => part.trim())
            .filter(Boolean)
            .join(' ');
        results.push({
            title: current.title,
            url: current.url,
            snippet,
        });
        current = null;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        const titleMatch = trimmed.match(/^- \*\*(.+?)\*\*$/);
        if (titleMatch) {
            flush();
            current = { title: titleMatch[1]?.trim(), snippetParts: [] };
            continue;
        }

        if (!current) {
            continue;
        }

        if (!current.url) {
            const urlMatch = trimmed.match(urlPattern);
            if (urlMatch) {
                current.url = urlMatch[1];
                const remainder = trimmed.replace(urlMatch[0], '').trim();
                if (remainder) {
                    current.snippetParts.push(remainder);
                }
                continue;
            }
        }

        current.snippetParts.push(trimmed);
    }

    flush();

    return results;
}

function parseSearchResultsFromJson(text: string): Array<TODO_any> | null {
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.results)) {
            return parsed.results;
        }
    } catch {
        return null;
    }

    return null;
}

function getResultsFromObject(resultRaw: Record<string, TODO_any>): Array<TODO_any> {
    if (Array.isArray(resultRaw.results)) {
        return resultRaw.results;
    }
    if (resultRaw.result) {
        const subResult = resultRaw.result;
        if (Array.isArray(subResult)) {
            return subResult;
        }
        if (subResult && typeof subResult === 'object' && Array.isArray(subResult.results)) {
            return subResult.results;
        }
        if (typeof subResult === 'string') {
            const parsed = parseSearchResultsFromJson(subResult);
            if (parsed) {
                return parsed;
            }
        }
    }
    if (Array.isArray(resultRaw.data)) {
        return resultRaw.data;
    }
    if (Array.isArray(resultRaw.items)) {
        return resultRaw.items;
    }

    return [];
}

function getRawSearchText(resultRaw: Record<string, TODO_any>): string | null {
    const candidates = [
        resultRaw.result,
        resultRaw.results,
        resultRaw.data,
        resultRaw.items,
        resultRaw.content,
        resultRaw.text,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }

    return null;
}

/**
 * Summarizes one normalized browser action in user-facing language.
 *
 * @private utility of `<Chat/>` component
 */
function formatRunBrowserActionSummary(action: Record<string, TODO_any>): string {
    const type = typeof action.type === 'string' ? action.type : '';

    if (type === 'navigate') {
        const url = typeof action.url === 'string' ? action.url : '';
        return url ? `Navigate to ${url}` : 'Navigate';
    }

    if (type === 'click') {
        const selector = typeof action.selector === 'string' ? action.selector : '';
        return selector ? `Click ${selector}` : 'Click';
    }

    if (type === 'type') {
        const selector = typeof action.selector === 'string' ? action.selector : '';
        return selector ? `Type into ${selector}` : 'Type text';
    }

    if (type === 'wait') {
        const milliseconds = action.milliseconds;
        return typeof milliseconds === 'number' ? `Wait ${milliseconds}ms` : 'Wait';
    }

    if (type === 'scroll') {
        const pixels = typeof action.pixels === 'number' ? action.pixels : null;
        const selector = typeof action.selector === 'string' ? action.selector : '';
        if (pixels !== null && selector) {
            return `Scroll ${pixels}px in ${selector}`;
        }
        if (pixels !== null) {
            return `Scroll ${pixels}px on page`;
        }
        return selector ? `Scroll in ${selector}` : 'Scroll';
    }

    return typeof type === 'string' && type.trim() ? type : 'Browser action';
}

/**
 * Resolves browser artifact kind from a path-like value.
 *
 * @private utility of `<Chat/>` component
 */
function resolveRunBrowserArtifactKind(path: string): RunBrowserToolArtifact['kind'] {
    if (path.endsWith('.webm') || path.endsWith('.mp4')) {
        return 'video';
    }

    return 'screenshot';
}

/**
 * Extracts and normalizes browser artifact metadata from arbitrary payload objects.
 *
 * @private utility of `<Chat/>` component
 */
function normalizeRunBrowserArtifact(
    rawArtifact: Record<string, TODO_any>,
    index: number,
): RunBrowserToolArtifact | null {
    const path = typeof rawArtifact.path === 'string' ? rawArtifact.path.trim() : '';
    if (!path) {
        return null;
    }

    const kind =
        rawArtifact.kind === 'video' || rawArtifact.kind === 'screenshot'
            ? rawArtifact.kind
            : resolveRunBrowserArtifactKind(path.toLowerCase());
    const label =
        typeof rawArtifact.label === 'string' && rawArtifact.label.trim()
            ? rawArtifact.label.trim()
            : `Step ${index + 1}`;
    const actionSummary =
        typeof rawArtifact.actionSummary === 'string' && rawArtifact.actionSummary.trim()
            ? rawArtifact.actionSummary.trim()
            : undefined;

    return {
        kind,
        path,
        label,
        actionSummary,
    };
}

/**
 * Attempts to normalize one parsed JSON object into browser replay metadata.
 *
 * @private utility of `<Chat/>` component
 */
function parseRunBrowserPayloadObject(payload: TODO_any): RunBrowserToolResult | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    const payloadRecord = payload as Record<string, TODO_any>;
    const hasSchema = payloadRecord.schema === RUN_BROWSER_RESULT_SCHEMA;
    const hasArtifacts = Array.isArray(payloadRecord.artifacts);
    const hasExecutedActions = Array.isArray(payloadRecord.executedActions);
    if (!hasSchema && !hasArtifacts && !hasExecutedActions) {
        return null;
    }

    const artifacts = Array.isArray(payloadRecord.artifacts)
        ? payloadRecord.artifacts
              .map((artifact, index) =>
                  artifact && typeof artifact === 'object'
                      ? normalizeRunBrowserArtifact(artifact as Record<string, TODO_any>, index)
                      : null,
              )
              .filter((artifact): artifact is RunBrowserToolArtifact => artifact !== null)
        : [];
    const actions = Array.isArray(payloadRecord.executedActions)
        ? payloadRecord.executedActions
              .map((action): RunBrowserToolAction | null => {
                  if (!action || typeof action !== 'object') {
                      return null;
                  }

                  return {
                      summary: formatRunBrowserActionSummary(action as Record<string, TODO_any>),
                  };
              })
              .filter((action): action is RunBrowserToolAction => action !== null)
        : [];

    const errorRecord =
        payloadRecord.error && typeof payloadRecord.error === 'object' && !Array.isArray(payloadRecord.error)
            ? (payloadRecord.error as Record<string, TODO_any>)
            : null;
    const parsedError: RunBrowserToolError | null = errorRecord
        ? {
              code: typeof errorRecord.code === 'string' ? errorRecord.code : 'RUN_BROWSER_UNKNOWN_ERROR',
              message: typeof errorRecord.message === 'string' ? errorRecord.message : 'Unknown browser tool error',
              isRetryable: errorRecord.isRetryable === true,
              suggestedNextSteps: Array.isArray(errorRecord.suggestedNextSteps)
                  ? errorRecord.suggestedNextSteps
                        .filter((step): step is string => typeof step === 'string')
                        .map((step) => step.trim())
                        .filter(Boolean)
                  : [],
              debug:
                  errorRecord.debug && typeof errorRecord.debug === 'object' && !Array.isArray(errorRecord.debug)
                      ? (errorRecord.debug as Record<string, TODO_any>)
                      : null,
          }
        : null;

    return {
        sessionId: typeof payloadRecord.sessionId === 'string' ? payloadRecord.sessionId : null,
        mode: typeof payloadRecord.mode === 'string' ? payloadRecord.mode : null,
        modeUsed: typeof payloadRecord.modeUsed === 'string' ? payloadRecord.modeUsed : null,
        initialUrl: typeof payloadRecord.initialUrl === 'string' ? payloadRecord.initialUrl : null,
        finalUrl: typeof payloadRecord.finalUrl === 'string' ? payloadRecord.finalUrl : null,
        finalTitle: typeof payloadRecord.finalTitle === 'string' ? payloadRecord.finalTitle : null,
        warning: typeof payloadRecord.warning === 'string' ? payloadRecord.warning : null,
        fallbackContent: null,
        error: parsedError,
        artifacts,
        actions,
    };
}

/**
 * Parses browser artifacts from legacy markdown-formatted `run_browser` output.
 *
 * @private utility of `<Chat/>` component
 */
function parseRunBrowserLegacyMarkdown(markdown: string): RunBrowserToolResult | null {
    const normalized = markdown.replace(/\r\n/g, '\n');
    const pathMatches = Array.from(normalized.matchAll(RUN_BROWSER_ARTIFACT_PATH_PATTERN))
        .map((match) => match[0])
        .filter(Boolean);
    const uniquePaths = Array.from(new Set(pathMatches));
    const artifacts = uniquePaths.map((path, index): RunBrowserToolArtifact => {
        const normalizedPath = path.trim();
        const suffix = normalizedPath.toLowerCase();
        const isFinalSnapshot =
            suffix.endsWith('.png') && !suffix.includes('-initial.') && !suffix.includes('-action-');

        return {
            kind: resolveRunBrowserArtifactKind(suffix),
            path: normalizedPath,
            label: isFinalSnapshot ? 'Final page' : `Step ${index + 1}`,
        };
    });

    const actionLogMatch = normalized.match(/## Action log([\s\S]*?)(?:\n## |\nNote:|$)/i);
    const actionLogSection = actionLogMatch?.[1] || '';
    const actionLines = Array.from(actionLogSection.matchAll(/^- \d+\.\s*(.+)$/gm)).map(
        (match) => match[1]?.trim() || '',
    );
    const actions = actionLines
        .map((line): RunBrowserToolAction | null => {
            if (!line) {
                return null;
            }

            try {
                const parsed = JSON.parse(line) as Record<string, TODO_any>;
                return { summary: formatRunBrowserActionSummary(parsed) };
            } catch {
                return { summary: line };
            }
        })
        .filter((action): action is RunBrowserToolAction => action !== null);

    const readLineValue = (pattern: RegExp): string | null => {
        const match = normalized.match(pattern);
        return match?.[1]?.trim() || null;
    };

    const sessionId = readLineValue(/\*\*Session:\*\*\s*(.+)/i);
    const mode = readLineValue(/\*\*Mode:\*\*\s*(.+)/i);
    const modeUsed = readLineValue(/\*\*Mode used:\*\*\s*(.+)/i);
    const initialUrl = readLineValue(/\*\*Initial URL:\*\*\s*(.+)/i);
    const finalUrl = readLineValue(/- URL:\s*(.+)/i);
    const finalTitle = readLineValue(/- Title:\s*(.+)/i);
    const warning = readLineValue(/\*\*Warning:\*\*\s*(.+)/i);
    const fallbackContentMatch = normalized.match(/## Extracted content\s*([\s\S]*?)(?:\n## |\n```json|\nNote:|$)/i);
    const fallbackContent = fallbackContentMatch?.[1]?.trim() || null;
    const isLikelyBrowserResult =
        normalized.includes('# Browser run completed') || normalized.includes('# Browser run failed');

    if (!isLikelyBrowserResult && artifacts.length === 0 && actions.length === 0) {
        return null;
    }

    return {
        sessionId,
        mode,
        modeUsed,
        initialUrl,
        finalUrl,
        finalTitle,
        warning,
        fallbackContent,
        error: null,
        artifacts,
        actions,
    };
}

/**
 * Merges structured JSON payload with markdown-only data such as fallback content.
 *
 * @private utility of `<Chat/>` component
 */
function mergeRunBrowserToolResult(
    primary: RunBrowserToolResult,
    secondary: RunBrowserToolResult | null,
): RunBrowserToolResult {
    if (!secondary) {
        return primary;
    }

    return {
        sessionId: primary.sessionId || secondary.sessionId,
        mode: primary.mode || secondary.mode,
        modeUsed: primary.modeUsed || secondary.modeUsed,
        initialUrl: primary.initialUrl || secondary.initialUrl,
        finalUrl: primary.finalUrl || secondary.finalUrl,
        finalTitle: primary.finalTitle || secondary.finalTitle,
        warning: primary.warning || secondary.warning,
        fallbackContent: primary.fallbackContent || secondary.fallbackContent,
        error: primary.error || secondary.error,
        artifacts: primary.artifacts.length > 0 ? primary.artifacts : secondary.artifacts,
        actions: primary.actions.length > 0 ? primary.actions : secondary.actions,
    };
}

/**
 * Attempts to extract browser replay payload from a markdown string that embeds JSON.
 *
 * @private utility of `<Chat/>` component
 */
function parseRunBrowserEmbeddedJson(markdown: string): RunBrowserToolResult | null {
    const matches = Array.from(markdown.matchAll(JSON_FENCED_BLOCK_PATTERN));

    for (const match of matches) {
        const jsonText = match[1];
        if (!jsonText) {
            continue;
        }

        try {
            const parsed = JSON.parse(jsonText);
            const parsedRunBrowserPayload = parseRunBrowserPayloadObject(parsed);
            if (parsedRunBrowserPayload) {
                return parsedRunBrowserPayload;
            }
        } catch {
            // Ignore non-JSON fenced blocks and continue scanning.
        }
    }

    return null;
}

/**
 * Parses and normalizes one `run_browser` tool result payload.
 *
 * @private utility of `<Chat/>` component
 */
export function parseRunBrowserToolResult(resultRaw: TODO_any): RunBrowserToolResult | null {
    const parsedObjectPayload = parseRunBrowserPayloadObject(resultRaw);
    if (parsedObjectPayload) {
        return parsedObjectPayload;
    }

    if (typeof resultRaw !== 'string') {
        return null;
    }

    const embeddedJsonPayload = parseRunBrowserEmbeddedJson(resultRaw);
    const legacyPayload = parseRunBrowserLegacyMarkdown(resultRaw);

    if (embeddedJsonPayload) {
        return mergeRunBrowserToolResult(embeddedJsonPayload, legacyPayload);
    }

    return legacyPayload;
}

/**
 * Resolves a browser artifact path from tool payload into a browser-viewable URL.
 *
 * @private utility of `<Chat/>` component
 */
export function resolveRunBrowserArtifactUrl(pathOrUrl: string): string {
    const normalizedPath = pathOrUrl.replace(/\\/g, '/').trim();
    if (!normalizedPath) {
        return '';
    }

    if (ABSOLUTE_URL_PATTERN.test(normalizedPath) || normalizedPath.startsWith('/')) {
        return normalizedPath;
    }

    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const filename = pathSegments[pathSegments.length - 1];
    if (!filename) {
        return normalizedPath;
    }

    if (normalizedPath.includes('.playwright-cli/')) {
        return `/api/browser-artifacts/${encodeURIComponent(filename)}`;
    }

    return normalizedPath;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function extractSearchResults(resultRaw: TODO_any): SearchResultsExtraction {
    if (Array.isArray(resultRaw)) {
        return { results: resultRaw, rawText: null };
    }

    if (typeof resultRaw === 'string') {
        return { results: parseSearchResultsFromText(resultRaw), rawText: resultRaw };
    }

    if (resultRaw && typeof resultRaw === 'object') {
        const results = getResultsFromObject(resultRaw);
        const rawText = getRawSearchText(resultRaw);

        if (results.length > 0) {
            return { results, rawText };
        }

        if (rawText) {
            const parsedFromText = parseSearchResultsFromText(rawText);
            return { results: parsedFromText, rawText };
        }

        return { results, rawText };
    }

    return { results: [], rawText: null };
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function parseTeamToolResult(resultRaw: TODO_any): TeamToolResult | null {
    if (!resultRaw || typeof resultRaw !== 'object') {
        return null;
    }

    const teammate = (resultRaw as TeamToolResult).teammate;
    if (!teammate || typeof teammate !== 'object') {
        return null;
    }

    return resultRaw as TeamToolResult;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function getToolCallTimestamp(toolCall: Pick<ToolCall, 'createdAt'>): Date | null {
    if (!toolCall.createdAt) {
        return null;
    }

    const date = new Date(toolCall.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @@@
 *
 * @private utility of `<Chat/>` component
 */
export function getToolCallResultDate(result: ToolCall['result']): Date | null {
    if (result === null || result === undefined) {
        return null;
    }

    if (typeof result === 'string' || typeof result === 'number') {
        const date = new Date(result);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof result === 'object') {
        const candidate =
            (result as Record<string, TODO_any>).time ??
            (result as Record<string, TODO_any>).timestamp ??
            (result as Record<string, TODO_any>).now;
        if (candidate) {
            return getToolCallResultDate(candidate);
        }
    }

    return null;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 *         <- TODO: But maybe split into multiple files later?
 */
