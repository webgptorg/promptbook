import type { TODO_any } from '../../../../utils/organization/TODO_any';
import type {
    RunBrowserToolAction,
    RunBrowserToolArtifact,
    RunBrowserToolError,
    RunBrowserToolResult,
} from './RunBrowserToolResult';

/**
 * Schema marker emitted by successful `run_browser` payloads.
 *
 * @private function of parseRunBrowserToolResult
 */
const RUN_BROWSER_RESULT_SCHEMA = 'promptbook/run-browser@1';

/**
 * Matches JSON fenced blocks in markdown result payloads.
 *
 * @private function of parseRunBrowserToolResult
 */
const JSON_FENCED_BLOCK_PATTERN = /```json\s*([\s\S]*?)```/gi;

/**
 * Matches artifact-like local paths emitted by legacy `run_browser` markdown output.
 *
 * @private function of parseRunBrowserToolResult
 */
const RUN_BROWSER_ARTIFACT_PATH_PATTERN = /\.playwright-cli\/[^\s)\]]+\.(png|jpg|jpeg|webm|mp4)/gi;

/**
 * Summarizes one normalized browser action in user-facing language.
 *
 * @param action - Raw action payload.
 * @returns Human-readable action summary.
 * @private function of parseRunBrowserToolResult
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
 * @param path - Artifact path or URL-like value.
 * @returns Artifact kind.
 * @private function of parseRunBrowserToolResult
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
 * @param rawArtifact - Raw artifact payload.
 * @param index - Artifact index for fallback labels.
 * @returns Normalized artifact or `null` when path is missing.
 * @private function of parseRunBrowserToolResult
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
 * Parses structured browser error payload.
 *
 * @param payloadRecord - Browser payload object.
 * @returns Normalized browser error.
 * @private function of parseRunBrowserToolResult
 */
function parseRunBrowserError(payloadRecord: Record<string, TODO_any>): RunBrowserToolError | null {
    const errorRecord =
        payloadRecord.error && typeof payloadRecord.error === 'object' && !Array.isArray(payloadRecord.error)
            ? (payloadRecord.error as Record<string, TODO_any>)
            : null;
    if (!errorRecord) {
        return null;
    }

    return {
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
    };
}

/**
 * Attempts to normalize one parsed JSON object into browser replay metadata.
 *
 * @param payload - Candidate browser payload object.
 * @returns Normalized browser payload or `null`.
 * @private function of parseRunBrowserToolResult
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

    return {
        sessionId: typeof payloadRecord.sessionId === 'string' ? payloadRecord.sessionId : null,
        mode: typeof payloadRecord.mode === 'string' ? payloadRecord.mode : null,
        modeUsed: typeof payloadRecord.modeUsed === 'string' ? payloadRecord.modeUsed : null,
        initialUrl: typeof payloadRecord.initialUrl === 'string' ? payloadRecord.initialUrl : null,
        finalUrl: typeof payloadRecord.finalUrl === 'string' ? payloadRecord.finalUrl : null,
        finalTitle: typeof payloadRecord.finalTitle === 'string' ? payloadRecord.finalTitle : null,
        warning: typeof payloadRecord.warning === 'string' ? payloadRecord.warning : null,
        fallbackContent: null,
        error: parseRunBrowserError(payloadRecord),
        artifacts,
        actions,
    };
}

/**
 * Parses one markdown line using a capture expression and returns the captured value.
 *
 * @param normalized - Normalized markdown text.
 * @param pattern - Capture pattern to apply.
 * @returns Captured value or `null`.
 * @private function of parseRunBrowserToolResult
 */
function readRunBrowserLineValue(normalized: string, pattern: RegExp): string | null {
    const match = normalized.match(pattern);
    return match?.[1]?.trim() || null;
}

/**
 * Parses browser artifacts from legacy markdown-formatted `run_browser` output.
 *
 * @param markdown - Legacy markdown payload.
 * @returns Parsed browser payload or `null`.
 * @private function of parseRunBrowserToolResult
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

    const sessionId = readRunBrowserLineValue(normalized, /\*\*Session:\*\*\s*(.+)/i);
    const mode = readRunBrowserLineValue(normalized, /\*\*Mode:\*\*\s*(.+)/i);
    const modeUsed = readRunBrowserLineValue(normalized, /\*\*Mode used:\*\*\s*(.+)/i);
    const initialUrl = readRunBrowserLineValue(normalized, /\*\*Initial URL:\*\*\s*(.+)/i);
    const finalUrl = readRunBrowserLineValue(normalized, /- URL:\s*(.+)/i);
    const finalTitle = readRunBrowserLineValue(normalized, /- Title:\s*(.+)/i);
    const warning = readRunBrowserLineValue(normalized, /\*\*Warning:\*\*\s*(.+)/i);
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
 * @param primary - Structured payload.
 * @param secondary - Legacy markdown payload.
 * @returns Merged payload.
 * @private function of parseRunBrowserToolResult
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
 * @param markdown - Markdown payload with potential JSON fences.
 * @returns Parsed structured browser payload or `null`.
 * @private function of parseRunBrowserToolResult
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
 * @param resultRaw - Raw tool result payload.
 * @returns Normalized browser payload or `null`.
 * @private function of toolCallParsing
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

