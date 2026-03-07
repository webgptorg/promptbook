/**
 * Shared constants used by the `run_browser` tool.
 *
 * @private internal constants of `run_browser`
 */
export const runBrowserConstants = {
    sessionPrefix: 'agents-server-run-browser',
    snapshotDirectory: '.playwright-cli',
    resultSchema: 'promptbook/run-browser@1',
    defaultWaitMs: 1000,
    maxWaitMs: 60000,
    defaultScrollPixels: 800,
    defaultNavigationTimeoutMs: 20000,
    defaultActionTimeoutMs: 15000,
    fallbackDynamicContentWarning:
        'Remote browser is unavailable. Fallback scraping was used and dynamic content may be missing.',
    validationErrorCode: 'RUN_BROWSER_VALIDATION_ERROR',
    navigationFailedErrorCode: 'RUN_BROWSER_NAVIGATION_FAILED',
    actionFailedErrorCode: 'RUN_BROWSER_ACTION_FAILED',
    cancelledErrorCode: 'RUN_BROWSER_CANCELLED',
    unknownErrorCode: 'RUN_BROWSER_UNKNOWN_ERROR',
} as const;
