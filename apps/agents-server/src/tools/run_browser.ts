import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { join, relative } from 'path';
import { fetchUrlContent } from '../../../../src/commitments/USE_BROWSER/fetchUrlContent';
import { KnowledgeScrapeError } from '../../../../src/errors/KnowledgeScrapeError';
import { ParseError } from '../../../../src/errors/ParseError';
import type { Page, Response as PlaywrightResponse } from 'playwright';
import { spaceTrim } from 'spacetrim';
import { REMOTE_BROWSER_URL } from '../../config';
import { $provideBrowserForServer } from './$provideBrowserForServer';
import {
    getErrorMessage,
    getErrorStack,
    isRemoteBrowserUnavailableError,
    REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE,
    type RunBrowserToolError,
    sanitizeRemoteBrowserEndpoint,
} from './runBrowserErrors';

/**
 * Default browser session prefix used by the `run_browser` tool.
 */
const RUN_BROWSER_SESSION_PREFIX = 'agents-server-run-browser';

/**
 * Directory where browser snapshot artifacts are stored.
 */
const RUN_BROWSER_SNAPSHOT_DIRECTORY = '.playwright-cli';

/**
 * Schema marker embedded into `run_browser` successful payloads.
 */
const RUN_BROWSER_RESULT_SCHEMA = 'promptbook/run-browser@1';

/**
 * Default wait duration in milliseconds for `wait` actions.
 */
const DEFAULT_WAIT_MS = 1000;

/**
 * Maximum allowed wait duration in milliseconds.
 */
const MAX_WAIT_MS = 60000;

/**
 * Default scroll distance in pixels.
 */
const DEFAULT_SCROLL_PIXELS = 800;

/**
 * Default page navigation timeout in milliseconds.
 */
const DEFAULT_NAVIGATION_TIMEOUT_MS = 20000;

/**
 * Default action timeout in milliseconds.
 */
const DEFAULT_ACTION_TIMEOUT_MS = 15000;

/**
 * Structured warning used when fallback scraping is applied.
 */
const FALLBACK_DYNAMIC_CONTENT_WARNING =
    'Remote browser is unavailable. Fallback scraping was used and dynamic content may be missing.';

/**
 * Error code used for invalid `run_browser` action input payloads.
 */
const RUN_BROWSER_VALIDATION_ERROR_CODE = 'RUN_BROWSER_VALIDATION_ERROR';

/**
 * Error code used for page navigation failures.
 */
const RUN_BROWSER_NAVIGATION_FAILED_ERROR_CODE = 'RUN_BROWSER_NAVIGATION_FAILED';

/**
 * Error code used for non-navigation action failures.
 */
const RUN_BROWSER_ACTION_FAILED_ERROR_CODE = 'RUN_BROWSER_ACTION_FAILED';

/**
 * Error code used for aborted browser runs.
 */
const RUN_BROWSER_CANCELLED_ERROR_CODE = 'RUN_BROWSER_CANCELLED';

/**
 * Error code used for uncategorized browser tool failures.
 */
const RUN_BROWSER_UNKNOWN_ERROR_CODE = 'RUN_BROWSER_UNKNOWN_ERROR';

/**
 * In-memory observability counters for browser tool execution.
 */
const RUN_BROWSER_OBSERVABILITY = {
    totalRuns: 0,
    fallbackRuns: 0,
    errorCodeCounts: {} as Record<string, number>,
};

/**
 * Supported action names for the `run_browser` tool.
 */
export type RunBrowserActionType = 'navigate' | 'click' | 'scroll' | 'type' | 'wait';

/**
 * Action payload accepted by the `run_browser` tool.
 */
export type RunBrowserAction = {
    /**
     * Action discriminator.
     */
    readonly type: RunBrowserActionType;

    /**
     * CSS selector for actions that target a DOM element.
     */
    readonly selector?: string;

    /**
     * Action-specific value:
     * - navigate: destination URL
     * - type: text
     * - wait: milliseconds
     * - scroll: pixel delta
     */
    readonly value?: string | number;
};

/**
 * Arguments accepted by the `run_browser` tool.
 */
export type RunBrowserArgs = {
    /**
     * Initial URL that the browser should open.
     */
    readonly url: string;

    /**
     * Optional list of browser actions.
     */
    readonly actions?: Array<RunBrowserAction>;

    /**
     * Optional timeout overrides for this run.
     */
    readonly timeouts?: {
        /**
         * Navigation timeout in milliseconds.
         */
        readonly navigationMs?: number;
        /**
         * Per-action timeout in milliseconds.
         */
        readonly actionMs?: number;
    };
};

/**
 * Optional runtime options used internally by the server.
 */
type RunBrowserInternalOptions = {
    /**
     * Optional cancellation signal propagated from higher-level request handling.
     */
    readonly signal?: AbortSignal;
};

/**
 * Internal normalized action representation with validated fields.
 */
type NormalizedRunBrowserAction =
    | { readonly type: 'navigate'; readonly url: string }
    | { readonly type: 'click'; readonly selector: string }
    | { readonly type: 'scroll'; readonly selector: string | null; readonly pixels: number }
    | { readonly type: 'type'; readonly selector: string; readonly text: string }
    | { readonly type: 'wait'; readonly milliseconds: number };

/**
 * Execution mode used by the browser tool.
 */
type RunBrowserExecutionMode = 'local' | 'remote';

/**
 * Mode actually used by one run result.
 */
type RunBrowserModeUsed = 'remote-browser' | 'fallback';

/**
 * Browser artifact kind captured during one run.
 */
type RunBrowserArtifactKind = 'screenshot' | 'video';

/**
 * One captured visual artifact with context for replay in UI.
 */
type RunBrowserArtifact = {
    readonly kind: RunBrowserArtifactKind;
    readonly label: string;
    readonly path: string;
    readonly capturedAt: string;
    readonly url: string | null;
    readonly title: string | null;
    readonly actionIndex?: number;
    readonly actionSummary?: string;
};

/**
 * Structured playback payload embedded in successful tool result markdown.
 */
type RunBrowserResultPayload = {
    readonly schema: typeof RUN_BROWSER_RESULT_SCHEMA;
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
    readonly modeUsed: RunBrowserModeUsed;
    readonly initialUrl: string;
    readonly finalUrl: string | null;
    readonly finalTitle: string | null;
    readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
    readonly artifacts: ReadonlyArray<RunBrowserArtifact>;
    readonly warning: string | null;
    readonly error: RunBrowserToolError | null;
    readonly fallback: {
        readonly scraper: 'fetch_url_content';
        readonly contentPreview: string;
    } | null;
    readonly timing: {
        readonly connectDurationMs: number | null;
        readonly initialNavigationDurationMs: number | null;
        readonly timeToFirstByteMs: number | null;
        readonly totalDurationMs: number;
    };
};

/**
 * Metadata collected while opening the initial page.
 */
type OpenPageWithUrlResult = {
    readonly page: Page;
    readonly connectDurationMs: number;
    readonly initialNavigationDurationMs: number;
    readonly timeToFirstByteMs: number | null;
};

/**
 * Timeout values resolved for one run_browser execution.
 */
type RunBrowserTimeoutConfiguration = {
    readonly navigationTimeoutMs: number;
    readonly actionTimeoutMs: number;
};

/**
 * Shared structure of tagged run_browser internal errors.
 */
type TaggedRunBrowserError = Error & {
    runBrowserCode: string;
    isRetryable: boolean;
    suggestedNextSteps: ReadonlyArray<string>;
    debug: Record<string, unknown>;
};

/**
 * Options for capturing one screenshot artifact.
 */
type CaptureSnapshotArtifactOptions = {
    readonly page: Page;
    readonly sessionId: string;
    readonly label: string;
    readonly fileSuffix?: string;
    readonly actionIndex?: number;
    readonly action?: NormalizedRunBrowserAction;
};

/**
 * Matches unsupported characters in snapshot file suffixes.
 */
const SNAPSHOT_FILE_SUFFIX_UNSAFE_CHARACTER_PATTERN = /[^a-z0-9-]/g;

/**
 * Creates a dedicated session id for one tool invocation.
 */
function createRunBrowserSessionId(): string {
    return `${RUN_BROWSER_SESSION_PREFIX}-${randomUUID()}`;
}

/**
 * Determines whether the browser tool is running in local or remote mode.
 */
function resolveExecutionMode(): RunBrowserExecutionMode {
    return REMOTE_BROWSER_URL && REMOTE_BROWSER_URL.trim().length > 0 ? 'remote' : 'local';
}

/**
 * Converts the execution mode into a human-readable label.
 */
function formatExecutionMode(mode: RunBrowserExecutionMode): string {
    return mode === 'remote' ? 'remote-browser' : 'local-browser';
}

/**
 * Returns a POSIX-compatible relative path.
 */
function toPosixPath(pathname: string): string {
    return pathname.split('\\').join('/');
}

/**
 * Reads a positive integer value from environment variables.
 */
function resolvePositiveIntFromEnv(variableName: string, defaultValue: number): number {
    const rawValue = process.env[variableName];
    if (!rawValue || !rawValue.trim()) {
        return defaultValue;
    }

    const parsed = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Resolves timeout configuration from env defaults and optional call overrides.
 */
function resolveTimeoutConfiguration(
    overrides: RunBrowserArgs['timeouts'] | undefined,
): RunBrowserTimeoutConfiguration {
    const envNavigationTimeoutMs = resolvePositiveIntFromEnv(
        'RUN_BROWSER_NAVIGATION_TIMEOUT_MS',
        DEFAULT_NAVIGATION_TIMEOUT_MS,
    );
    const envActionTimeoutMs = resolvePositiveIntFromEnv('RUN_BROWSER_ACTION_TIMEOUT_MS', DEFAULT_ACTION_TIMEOUT_MS);

    const navigationTimeoutMs =
        overrides?.navigationMs && Number.isFinite(overrides.navigationMs) && overrides.navigationMs > 0
            ? Math.floor(overrides.navigationMs)
            : envNavigationTimeoutMs;
    const actionTimeoutMs =
        overrides?.actionMs && Number.isFinite(overrides.actionMs) && overrides.actionMs > 0
            ? Math.floor(overrides.actionMs)
            : envActionTimeoutMs;

    return {
        navigationTimeoutMs,
        actionTimeoutMs,
    };
}

/**
 * Creates one tagged ParseError used for deterministic input validation failures.
 */
function createRunBrowserValidationError(options: {
    readonly message: string;
    readonly debug: Record<string, unknown>;
}): TaggedRunBrowserError {
    const error = new ParseError(options.message) as TaggedRunBrowserError;
    error.name = 'RunBrowserValidationError';
    (error as TaggedRunBrowserError).runBrowserCode = RUN_BROWSER_VALIDATION_ERROR_CODE;
    (error as TaggedRunBrowserError).isRetryable = false;
    (error as TaggedRunBrowserError).suggestedNextSteps = [
        'Fix the action payload to match the run_browser schema.',
        'Check selectors and required action fields before retrying.',
    ];
    (error as TaggedRunBrowserError).debug = options.debug;
    return error;
}

/**
 * Creates one tagged KnowledgeScrapeError used for navigation failures.
 */
function createRunBrowserNavigationError(options: {
    readonly message: string;
    readonly debug: Record<string, unknown>;
    readonly cause?: unknown;
}): TaggedRunBrowserError {
    const error = new KnowledgeScrapeError(options.message) as TaggedRunBrowserError;
    error.name = 'RunBrowserNavigationError';
    (error as TaggedRunBrowserError).runBrowserCode = RUN_BROWSER_NAVIGATION_FAILED_ERROR_CODE;
    (error as TaggedRunBrowserError).isRetryable = false;
    (error as TaggedRunBrowserError).suggestedNextSteps = [
        'Verify the URL is reachable and not blocked.',
        'Retry with a simpler action sequence.',
    ];
    (error as TaggedRunBrowserError).debug = options.debug;
    (error as Error & { cause?: unknown }).cause = options.cause;
    return error;
}

/**
 * Creates one tagged KnowledgeScrapeError used for action failures.
 */
function createRunBrowserActionError(options: {
    readonly message: string;
    readonly debug: Record<string, unknown>;
    readonly cause?: unknown;
}): TaggedRunBrowserError {
    const error = new KnowledgeScrapeError(options.message) as TaggedRunBrowserError;
    error.name = 'RunBrowserActionError';
    (error as TaggedRunBrowserError).runBrowserCode = RUN_BROWSER_ACTION_FAILED_ERROR_CODE;
    (error as TaggedRunBrowserError).isRetryable = false;
    (error as TaggedRunBrowserError).suggestedNextSteps = [
        'Verify selectors and action values.',
        'Reduce the action sequence to isolate the failing step.',
    ];
    (error as TaggedRunBrowserError).debug = options.debug;
    (error as Error & { cause?: unknown }).cause = options.cause;
    return error;
}

/**
 * Creates one tagged KnowledgeScrapeError used for cancellation.
 */
function createRunBrowserCancelledError(options: {
    readonly message: string;
    readonly debug: Record<string, unknown>;
    readonly cause?: unknown;
}): TaggedRunBrowserError {
    const error = new KnowledgeScrapeError(options.message) as TaggedRunBrowserError;
    error.name = 'RunBrowserCancelledError';
    (error as TaggedRunBrowserError).runBrowserCode = RUN_BROWSER_CANCELLED_ERROR_CODE;
    (error as TaggedRunBrowserError).isRetryable = true;
    (error as TaggedRunBrowserError).suggestedNextSteps = [
        'Retry while request context is still active.',
        'Increase timeout if operation is expected to run longer.',
    ];
    (error as TaggedRunBrowserError).debug = options.debug;
    (error as Error & { cause?: unknown }).cause = options.cause;
    return error;
}

/**
 * Checks whether an unknown error carries run_browser classification tags.
 */
function isTaggedRunBrowserError(error: unknown): error is TaggedRunBrowserError {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const candidate = error as Partial<TaggedRunBrowserError>;
    return (
        typeof candidate.runBrowserCode === 'string' &&
        typeof candidate.isRetryable === 'boolean' &&
        Array.isArray(candidate.suggestedNextSteps) &&
        typeof candidate.debug === 'object' &&
        candidate.debug !== null
    );
}

/**
 * Converts unknown errors into structured tool error payloads.
 */
function classifyRunBrowserToolError(options: {
    readonly error: unknown;
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
}): RunBrowserToolError {
    if (isRemoteBrowserUnavailableError(options.error)) {
        return {
            code: options.error.code,
            message: options.error.message,
            isRetryable: options.error.isRetryable,
            suggestedNextSteps: options.error.suggestedNextSteps,
            debug: {
                ...options.error.debug,
                sessionId: options.sessionId,
                mode: formatExecutionMode(options.mode),
            },
        };
    }

    if (isTaggedRunBrowserError(options.error)) {
        return {
            code: options.error.runBrowserCode,
            message: options.error.message,
            isRetryable: options.error.isRetryable,
            suggestedNextSteps: options.error.suggestedNextSteps,
            debug: {
                ...options.error.debug,
                sessionId: options.sessionId,
                mode: formatExecutionMode(options.mode),
            },
        };
    }

    const remoteBrowserEndpoint =
        REMOTE_BROWSER_URL && REMOTE_BROWSER_URL.trim().length > 0
            ? sanitizeRemoteBrowserEndpoint(REMOTE_BROWSER_URL.trim())
            : null;
    const message = getErrorMessage(options.error);

    return {
        code: RUN_BROWSER_UNKNOWN_ERROR_CODE,
        message,
        isRetryable: false,
        suggestedNextSteps: [
            'Inspect debug details to identify the failing phase.',
            'Retry with fewer actions.',
        ],
        debug: {
            sessionId: options.sessionId,
            mode: formatExecutionMode(options.mode),
            remoteBrowserEndpoint,
            message,
            stack: getErrorStack(options.error),
        },
    };
}

/**
 * Increments one error-code counter and returns the updated value.
 */
function incrementRunBrowserErrorCodeCounter(code: string): number {
    const currentValue = RUN_BROWSER_OBSERVABILITY.errorCodeCounts[code] || 0;
    const nextValue = currentValue + 1;
    RUN_BROWSER_OBSERVABILITY.errorCodeCounts[code] = nextValue;
    return nextValue;
}

/**
 * Writes one structured metric line for browser-tool observability.
 */
function logRunBrowserMetric(options: {
    readonly event: string;
    readonly sessionId: string;
    readonly mode: RunBrowserModeUsed;
    readonly payload?: Record<string, unknown>;
}): void {
    console.info('[run_browser][metric]', {
        tool: 'run_browser',
        mode: options.mode,
        sessionId: options.sessionId,
        event: options.event,
        ...(options.payload || {}),
    });
}

/**
 * Asserts that the run was not aborted.
 */
function assertNotAborted(signal: AbortSignal | undefined, sessionId: string): void {
    if (!signal?.aborted) {
        return;
    }

    throw createRunBrowserCancelledError({
        message: 'run_browser execution was cancelled.',
        debug: { sessionId },
    });
}

/**
 * Computes one compact preview of a fallback scrape payload.
 */
function createContentPreview(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 280) {
        return normalized;
    }
    return `${normalized.slice(0, 277)}...`;
}

/**
 * Attempts to compute time-to-first-byte from Playwright response timing.
 */
function resolveTimeToFirstByteMs(response: PlaywrightResponse | null): number | null {
    if (!response) {
        return null;
    }

    try {
        const timing = response.request().timing();
        if (
            typeof timing?.responseStart === 'number' &&
            typeof timing?.startTime === 'number' &&
            timing.responseStart >= timing.startTime
        ) {
            return Math.round(timing.responseStart - timing.startTime);
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * Creates one filesystem-safe optional filename suffix for a snapshot.
 */
function createSnapshotFileSuffix(rawSuffix?: string): string {
    if (!rawSuffix) {
        return '';
    }

    const normalized = rawSuffix
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(SNAPSHOT_FILE_SUFFIX_UNSAFE_CHARACTER_PATTERN, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return normalized;
}

/**
 * Resolves snapshot filename for one session and optional stage suffix.
 */
function resolveSnapshotFilename(sessionId: string, fileSuffix?: string): string {
    const safeSuffix = createSnapshotFileSuffix(fileSuffix);
    return safeSuffix ? `${sessionId}-${safeSuffix}.png` : `${sessionId}.png`;
}

/**
 * Opens a new browser page and navigates to the requested URL.
 */
async function openPageWithUrl(options: {
    readonly url: string;
    readonly sessionId: string;
    readonly navigationTimeoutMs: number;
    readonly actionTimeoutMs: number;
    readonly signal?: AbortSignal;
}): Promise<OpenPageWithUrlResult> {
    assertNotAborted(options.signal, options.sessionId);

    const connectStartedAt = Date.now();
    const browserContext = await $provideBrowserForServer({
        signal: options.signal,
        sessionId: options.sessionId,
    });
    const connectDurationMs = Date.now() - connectStartedAt;
    const page = await browserContext.newPage();
    page.setDefaultNavigationTimeout(options.navigationTimeoutMs);
    page.setDefaultTimeout(options.actionTimeoutMs);

    const navigationStartedAt = Date.now();
    try {
        const navigationResponse = await page.goto(options.url, {
            waitUntil: 'domcontentloaded',
            timeout: options.navigationTimeoutMs,
        });

        return {
            page,
            connectDurationMs,
            initialNavigationDurationMs: Date.now() - navigationStartedAt,
            timeToFirstByteMs: resolveTimeToFirstByteMs(navigationResponse),
        };
    } catch (error) {
        throw createRunBrowserNavigationError({
            message: `Failed to navigate to \`${options.url}\`.`,
            debug: {
                phase: 'initial-navigation',
                url: options.url,
                navigationTimeoutMs: options.navigationTimeoutMs,
            },
            cause: error,
        });
    }
}

/**
 * Validates and normalizes browser actions received from the model.
 */
function normalizeActions(actions: ReadonlyArray<RunBrowserAction> | undefined): Array<NormalizedRunBrowserAction> {
    if (!actions || actions.length === 0) {
        return [];
    }

    return actions.map((action, index) => normalizeAction(action, index));
}

/**
 * Validates and normalizes a single action.
 */
function normalizeAction(action: RunBrowserAction, index: number): NormalizedRunBrowserAction {
    switch (action.type) {
        case 'navigate': {
            const url = String(action.value || '').trim();
            if (!url) {
                throw createRunBrowserValidationError({
                    message: spaceTrim(`Action ${index + 1}: \`navigate\` requires non-empty \`value\` URL.`),
                    debug: {
                        actionIndex: index + 1,
                        actionType: action.type,
                    },
                });
            }
            return { type: 'navigate', url };
        }

        case 'click': {
            const selector = String(action.selector || '').trim();
            if (!selector) {
                throw createRunBrowserValidationError({
                    message: spaceTrim(`Action ${index + 1}: \`click\` requires non-empty \`selector\`.`),
                    debug: {
                        actionIndex: index + 1,
                        actionType: action.type,
                    },
                });
            }
            return { type: 'click', selector };
        }

        case 'type': {
            const selector = String(action.selector || '').trim();
            if (!selector) {
                throw createRunBrowserValidationError({
                    message: spaceTrim(`Action ${index + 1}: \`type\` requires non-empty \`selector\`.`),
                    debug: {
                        actionIndex: index + 1,
                        actionType: action.type,
                    },
                });
            }
            const text = String(action.value ?? '');
            return { type: 'type', selector, text };
        }

        case 'wait': {
            const requestedValue = Number.parseInt(String(action.value ?? DEFAULT_WAIT_MS), 10);
            const milliseconds = Number.isFinite(requestedValue)
                ? Math.min(Math.max(requestedValue, 1), MAX_WAIT_MS)
                : DEFAULT_WAIT_MS;
            return { type: 'wait', milliseconds };
        }

        case 'scroll': {
            const requestedValue = Number.parseInt(String(action.value ?? DEFAULT_SCROLL_PIXELS), 10);
            const pixels = Number.isFinite(requestedValue) ? requestedValue : DEFAULT_SCROLL_PIXELS;
            const rawSelector = String(action.selector || '').trim();
            return { type: 'scroll', selector: rawSelector || null, pixels };
        }
    }
}

/**
 * Executes one normalized browser action on a Playwright page.
 */
async function executeAction(options: {
    readonly page: Page;
    readonly action: NormalizedRunBrowserAction;
    readonly actionIndex: number;
    readonly navigationTimeoutMs: number;
    readonly actionTimeoutMs: number;
    readonly signal?: AbortSignal;
}): Promise<void> {
    const { page, action, actionIndex, navigationTimeoutMs, actionTimeoutMs, signal } = options;
    assertNotAborted(signal, `action-${actionIndex}`);

    try {
        switch (action.type) {
            case 'navigate':
                await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs });
                return;

            case 'click':
                await page.locator(action.selector).first().click({ timeout: actionTimeoutMs });
                return;

            case 'type':
                await page.locator(action.selector).first().fill(action.text, { timeout: actionTimeoutMs });
                return;

            case 'wait':
                if (action.milliseconds > actionTimeoutMs) {
                    throw createRunBrowserActionError({
                        message: `Action ${actionIndex}: \`wait\` exceeds action timeout (${actionTimeoutMs}ms).`,
                        debug: {
                            actionIndex,
                            action,
                            actionTimeoutMs,
                        },
                    });
                }
                await page.waitForTimeout(action.milliseconds);
                return;

            case 'scroll':
                if (action.selector) {
                    await page.locator(action.selector).first().scrollIntoViewIfNeeded({ timeout: actionTimeoutMs });
                }
                await page.mouse.wheel(0, action.pixels);
                return;
        }
    } catch (error) {
        if (isTaggedRunBrowserError(error)) {
            throw error;
        }

        if (action.type === 'navigate') {
            throw createRunBrowserNavigationError({
                message: `Action ${actionIndex}: failed to navigate to \`${action.url}\`.`,
                debug: {
                    actionIndex,
                    action,
                    navigationTimeoutMs,
                },
                cause: error,
            });
        }

        throw createRunBrowserActionError({
            message: `Action ${actionIndex}: failed to execute \`${action.type}\`.`,
            debug: {
                actionIndex,
                action,
                actionTimeoutMs,
            },
            cause: error,
        });
    }
}

/**
 * Captures a screenshot artifact for the current page and returns relative path.
 */
async function captureSnapshot(page: Page, sessionId: string, fileSuffix?: string): Promise<string | null> {
    const snapshotDirectoryPath = join(process.cwd(), RUN_BROWSER_SNAPSHOT_DIRECTORY);
    const snapshotPath = join(snapshotDirectoryPath, resolveSnapshotFilename(sessionId, fileSuffix));

    try {
        await mkdir(snapshotDirectoryPath, { recursive: true });
        await page.screenshot({ path: snapshotPath, fullPage: true });
        return toPosixPath(relative(process.cwd(), snapshotPath));
    } catch (error) {
        console.error('[run_browser] Failed to capture snapshot', {
            sessionId,
            error: getErrorMessage(error),
        });

        return null;
    }
}

/**
 * Creates one user-facing description for an executed browser action.
 */
function formatActionSummary(action: NormalizedRunBrowserAction): string {
    switch (action.type) {
        case 'navigate':
            return `Navigate to ${action.url}`;
        case 'click':
            return `Click ${action.selector}`;
        case 'type':
            return `Type into ${action.selector}`;
        case 'wait':
            return `Wait ${action.milliseconds}ms`;
        case 'scroll':
            return action.selector
                ? `Scroll ${action.pixels}px in ${action.selector}`
                : `Scroll ${action.pixels}px on page`;
    }
}

/**
 * Safely retrieves page title from current browser page.
 */
async function getPageTitle(page: Page): Promise<string | null> {
    try {
        return await page.title();
    } catch {
        return null;
    }
}

/**
 * Closes browser page and logs non-fatal cleanup errors.
 */
async function cleanupPage(page: Page | null, sessionId: string): Promise<void> {
    if (!page) {
        return;
    }

    try {
        await page.close();
    } catch (error) {
        console.error('[run_browser] Failed to cleanup browser page', {
            sessionId,
            error: getErrorMessage(error),
        });
    }
}

/**
 * Captures one screenshot artifact and enriches it with page metadata.
 */
async function captureSnapshotArtifact(options: CaptureSnapshotArtifactOptions): Promise<RunBrowserArtifact | null> {
    const { page, sessionId, label, fileSuffix, actionIndex, action } = options;
    const path = await captureSnapshot(page, sessionId, fileSuffix);
    if (!path) {
        return null;
    }

    const actionSummary = action ? formatActionSummary(action) : undefined;

    return {
        kind: 'screenshot',
        label,
        path,
        capturedAt: new Date().toISOString(),
        url: page.url(),
        title: await getPageTitle(page),
        actionIndex,
        actionSummary,
    };
}

/**
 * Produces one structured payload consumed by chat UI browser replay renderers.
 */
function createResultPayload(options: {
    readonly sessionId: string;
    readonly mode: RunBrowserExecutionMode;
    readonly modeUsed: RunBrowserModeUsed;
    readonly initialUrl: string;
    readonly finalUrl: string | null;
    readonly finalTitle: string | null;
    readonly executedActions: ReadonlyArray<NormalizedRunBrowserAction>;
    readonly artifacts: ReadonlyArray<RunBrowserArtifact>;
    readonly warning: string | null;
    readonly error: RunBrowserToolError | null;
    readonly fallbackContent: string | null;
    readonly timing: RunBrowserResultPayload['timing'];
}): RunBrowserResultPayload {
    return {
        schema: RUN_BROWSER_RESULT_SCHEMA,
        sessionId: options.sessionId,
        mode: options.mode,
        modeUsed: options.modeUsed,
        initialUrl: options.initialUrl,
        finalUrl: options.finalUrl,
        finalTitle: options.finalTitle,
        executedActions: options.executedActions,
        artifacts: options.artifacts,
        warning: options.warning,
        error: options.error,
        fallback:
            options.modeUsed === 'fallback' && options.fallbackContent !== null
                ? {
                      scraper: 'fetch_url_content',
                      contentPreview: createContentPreview(options.fallbackContent),
                  }
                : null,
        timing: options.timing,
    };
}

/**
 * Produces a model-friendly markdown summary from browser execution artifacts.
 */
function formatSuccessResult(options: {
    readonly payload: RunBrowserResultPayload;
    readonly snapshotPath: string | null;
}): string {
    const { payload, snapshotPath } = options;

    return spaceTrim(
        (block) => `
            # Browser run completed

            **Session:** ${payload.sessionId}
            **Mode requested:** ${formatExecutionMode(payload.mode)}
            **Mode used:** ${payload.modeUsed}
            **Initial URL:** ${payload.initialUrl}
            **Executed actions:** ${payload.executedActions.length}

            ## Final page

            - URL: ${payload.finalUrl || 'Unknown'}
            - Title: ${payload.finalTitle || 'Unknown'}

            ## Timings

            - Connect: ${payload.timing.connectDurationMs ?? 'Unknown'} ms
            - Initial navigation: ${payload.timing.initialNavigationDurationMs ?? 'Unknown'} ms
            - Time to first byte: ${payload.timing.timeToFirstByteMs ?? 'Unknown'} ms
            - Total: ${payload.timing.totalDurationMs} ms

            ${
                payload.artifacts.length === 0
                    ? ''
                    : `
                    ## Visual replay

                    ${payload.artifacts
                        .map((artifact, index) => {
                            const actionPart = artifact.actionSummary ? ` (${artifact.actionSummary})` : '';
                            return `- ${index + 1}. ${artifact.label}${actionPart}: ${artifact.path}`;
                        })
                        .join('\n')}
                `
            }

            ${
                !snapshotPath
                    ? ''
                    : `
                    ## Final snapshot

                    ${snapshotPath}
                `
            }

            ## Playback payload

            \`\`\`json
            ${JSON.stringify(payload, null, 2)}
            \`\`\`

            ${block(
                payload.executedActions.length === 0
                    ? ''
                    : `
                    ## Action log

                    ${payload.executedActions
                        .map((action, index) => `- ${index + 1}. ${JSON.stringify(action)}`)
                        .join('\n')}
                `,
            )}

            Note: Browser page has been automatically closed to free up resources.
        `,
    );
}

/**
 * Produces a model-friendly markdown payload when fallback scraping is used.
 */
function formatFallbackResult(options: {
    readonly payload: RunBrowserResultPayload;
    readonly fallbackContent: string;
    readonly requestedActions: number;
}): string {
    const { payload, fallbackContent, requestedActions } = options;

    return spaceTrim(`
        # Browser run completed with fallback

        **Session:** ${payload.sessionId}
        **Mode requested:** ${formatExecutionMode(payload.mode)}
        **Mode used:** ${payload.modeUsed}
        **Initial URL:** ${payload.initialUrl}
        **Requested actions:** ${requestedActions}
        **Executed actions:** ${payload.executedActions.length}
        **Warning:** ${payload.warning || FALLBACK_DYNAMIC_CONTENT_WARNING}

        ## Extracted content

        ${fallbackContent}

        ## Playback payload

        \`\`\`json
        ${JSON.stringify(payload, null, 2)}
        \`\`\`
    `);
}

/**
 * Produces a model-friendly markdown error payload from browser execution failures.
 */
function formatErrorResult(options: {
    readonly payload: RunBrowserResultPayload;
}): string {
    const { payload } = options;
    const toolError = payload.error;
    const suggestedNextSteps = toolError?.suggestedNextSteps || [];

    return spaceTrim(`
        # Browser run failed

        **Session:** ${payload.sessionId}
        **Mode requested:** ${formatExecutionMode(payload.mode)}
        **Mode used:** ${payload.modeUsed}
        **Initial URL:** ${payload.initialUrl}
        **Error code:** ${toolError?.code || RUN_BROWSER_UNKNOWN_ERROR_CODE}
        **Error:** ${toolError?.message || 'Unknown browser tool error'}

        ${
            suggestedNextSteps.length === 0
                ? ''
                : `
                ## Suggested next steps

                ${suggestedNextSteps.map((step) => `- ${step}`).join('\n')}
            `
        }

        ## Playback payload

        \`\`\`json
        ${JSON.stringify(payload, null, 2)}
        \`\`\`

        The browser tool could not complete the requested actions.
    `);
}

/**
 * Executes non-graphical fallback scraping.
 */
async function runFallbackScrape(url: string): Promise<string> {
    return await fetchUrlContent(url);
}

/**
 * Runs interactive browser automation through Playwright.
 *
 * @param args Tool arguments provided by the model.
 * @param internalOptions Optional runtime options for cancellation.
 * @returns Markdown summary with structured playback payload.
 */
export async function run_browser(
    args: RunBrowserArgs,
    internalOptions: RunBrowserInternalOptions = {},
): Promise<string> {
    RUN_BROWSER_OBSERVABILITY.totalRuns++;

    const startedAt = Date.now();
    const sessionId = createRunBrowserSessionId();
    const initialUrl = String(args.url || '').trim();
    const mode = resolveExecutionMode();
    const timeoutConfiguration = resolveTimeoutConfiguration(args.timeouts);

    let page: Page | null = null;
    let connectDurationMs: number | null = null;
    let initialNavigationDurationMs: number | null = null;
    let timeToFirstByteMs: number | null = null;

    try {
        if (!initialUrl) {
            throw createRunBrowserValidationError({
                message: 'Missing required `url` argument.',
                debug: {
                    field: 'url',
                },
            });
        }

        const normalizedActions = normalizeActions(args.actions);
        assertNotAborted(internalOptions.signal, sessionId);

        const openedPage = await openPageWithUrl({
            url: initialUrl,
            sessionId,
            navigationTimeoutMs: timeoutConfiguration.navigationTimeoutMs,
            actionTimeoutMs: timeoutConfiguration.actionTimeoutMs,
            signal: internalOptions.signal,
        });
        page = openedPage.page;
        connectDurationMs = openedPage.connectDurationMs;
        initialNavigationDurationMs = openedPage.initialNavigationDurationMs;
        timeToFirstByteMs = openedPage.timeToFirstByteMs;

        const artifacts: Array<RunBrowserArtifact> = [];

        const initialArtifact = await captureSnapshotArtifact({
            page,
            sessionId,
            label: 'Initial page',
            fileSuffix: 'initial',
        });
        if (initialArtifact) {
            artifacts.push(initialArtifact);
        }

        for (const [index, action] of normalizedActions.entries()) {
            assertNotAborted(internalOptions.signal, sessionId);
            await executeAction({
                page,
                action,
                actionIndex: index + 1,
                navigationTimeoutMs: timeoutConfiguration.navigationTimeoutMs,
                actionTimeoutMs: timeoutConfiguration.actionTimeoutMs,
                signal: internalOptions.signal,
            });

            const actionArtifact = await captureSnapshotArtifact({
                page,
                sessionId,
                label: `After action ${index + 1}`,
                fileSuffix: `action-${String(index + 1).padStart(3, '0')}-${action.type}`,
                actionIndex: index + 1,
                action,
            });
            if (actionArtifact) {
                artifacts.push(actionArtifact);
            }
        }

        const snapshotPath = await captureSnapshot(page, sessionId);
        const finalUrl = page.url();
        const finalTitle = await getPageTitle(page);
        if (snapshotPath) {
            artifacts.push({
                kind: 'screenshot',
                label: 'Final page',
                path: snapshotPath,
                capturedAt: new Date().toISOString(),
                url: finalUrl,
                title: finalTitle,
            });
        }

        const payload = createResultPayload({
            sessionId,
            mode,
            modeUsed: 'remote-browser',
            initialUrl,
            finalUrl,
            finalTitle,
            executedActions: normalizedActions,
            artifacts,
            warning: null,
            error: null,
            fallbackContent: null,
            timing: {
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
                totalDurationMs: Date.now() - startedAt,
            },
        });

        logRunBrowserMetric({
            event: 'run_browser_success',
            sessionId,
            mode: 'remote-browser',
            payload: {
                actions: normalizedActions.length,
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
            },
        });

        return formatSuccessResult({
            payload,
            snapshotPath,
        });
    } catch (error) {
        const toolError = classifyRunBrowserToolError({
            error,
            sessionId,
            mode,
        });
        const errorCodeCount = incrementRunBrowserErrorCodeCounter(toolError.code);

        if (toolError.code === REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE && initialUrl) {
            const fallbackContent = await runFallbackScrape(initialUrl);
            RUN_BROWSER_OBSERVABILITY.fallbackRuns++;
            const fallbackRate = RUN_BROWSER_OBSERVABILITY.fallbackRuns / RUN_BROWSER_OBSERVABILITY.totalRuns;

            const payload = createResultPayload({
                sessionId,
                mode,
                modeUsed: 'fallback',
                initialUrl,
                finalUrl: null,
                finalTitle: null,
                executedActions: [],
                artifacts: [],
                warning: FALLBACK_DYNAMIC_CONTENT_WARNING,
                error: toolError,
                fallbackContent,
                timing: {
                    connectDurationMs,
                    initialNavigationDurationMs,
                    timeToFirstByteMs,
                    totalDurationMs: Date.now() - startedAt,
                },
            });

            logRunBrowserMetric({
                event: 'run_browser_fallback_used',
                sessionId,
                mode: 'fallback',
                payload: {
                    errorCode: toolError.code,
                    errorCodeCount,
                    fallbackRuns: RUN_BROWSER_OBSERVABILITY.fallbackRuns,
                    totalRuns: RUN_BROWSER_OBSERVABILITY.totalRuns,
                    fallbackRate,
                },
            });

            return formatFallbackResult({
                payload,
                fallbackContent,
                requestedActions: Array.isArray(args.actions) ? args.actions.length : 0,
            });
        }

        const payload = createResultPayload({
            sessionId,
            mode,
            modeUsed: 'remote-browser',
            initialUrl,
            finalUrl: page ? page.url() : null,
            finalTitle: page ? await getPageTitle(page) : null,
            executedActions: [],
            artifacts: [],
            warning: null,
            error: toolError,
            fallbackContent: null,
            timing: {
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
                totalDurationMs: Date.now() - startedAt,
            },
        });

        logRunBrowserMetric({
            event: 'run_browser_failed',
            sessionId,
            mode: 'remote-browser',
            payload: {
                errorCode: toolError.code,
                errorCodeCount,
                connectDurationMs,
                initialNavigationDurationMs,
                timeToFirstByteMs,
            },
        });

        return formatErrorResult({
            payload,
        });
    } finally {
        await cleanupPage(page, sessionId);
    }
}
