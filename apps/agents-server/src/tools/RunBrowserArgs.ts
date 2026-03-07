import type { Page } from 'playwright';
import type { RunBrowserToolError } from './runBrowserErrors';

/**
 * Supported action names for the `run_browser` tool.
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserActionType = 'navigate' | 'click' | 'scroll' | 'type' | 'wait';

/**
 * Action payload accepted by the `run_browser` tool.
 *
 * @private internal type of `run_browser`
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
 *
 * @private internal type of `run_browser`
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
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserInternalOptions = {
    /**
     * Optional cancellation signal propagated from higher-level request handling.
     */
    readonly signal?: AbortSignal;
};

/**
 * Internal normalized action representation with validated fields.
 *
 * @private internal type of `run_browser`
 */
export type NormalizedRunBrowserAction =
    | { readonly type: 'navigate'; readonly url: string }
    | { readonly type: 'click'; readonly selector: string }
    | { readonly type: 'scroll'; readonly selector: string | null; readonly pixels: number }
    | { readonly type: 'type'; readonly selector: string; readonly text: string }
    | { readonly type: 'wait'; readonly milliseconds: number };

/**
 * Execution mode used by the browser tool.
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserExecutionMode = 'local' | 'remote';

/**
 * Mode actually used by one run result.
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserModeUsed = 'remote-browser' | 'fallback';

/**
 * Browser artifact kind captured during one run.
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserArtifactKind = 'screenshot' | 'video';

/**
 * One captured visual artifact with context for replay in UI.
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserArtifact = {
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
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserResultPayload = {
    readonly schema: 'promptbook/run-browser@1';
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
 *
 * @private internal type of `run_browser`
 */
export type OpenPageWithUrlResult = {
    readonly page: Page;
    readonly connectDurationMs: number;
    readonly initialNavigationDurationMs: number;
    readonly timeToFirstByteMs: number | null;
};

/**
 * Timeout values resolved for one run_browser execution.
 *
 * @private internal type of `run_browser`
 */
export type RunBrowserTimeoutConfiguration = {
    readonly navigationTimeoutMs: number;
    readonly actionTimeoutMs: number;
};

/**
 * Shared structure of tagged run_browser internal errors.
 *
 * @private internal type of `run_browser`
 */
export type TaggedRunBrowserError = Error & {
    runBrowserCode: string;
    isRetryable: boolean;
    suggestedNextSteps: ReadonlyArray<string>;
    debug: Record<string, unknown>;
};

/**
 * Options for capturing one screenshot artifact.
 *
 * @private internal type of `run_browser`
 */
export type CaptureSnapshotArtifactOptions = {
    readonly page: Page;
    readonly sessionId: string;
    readonly label: string;
    readonly fileSuffix?: string;
    readonly actionIndex?: number;
    readonly action?: NormalizedRunBrowserAction;
};
