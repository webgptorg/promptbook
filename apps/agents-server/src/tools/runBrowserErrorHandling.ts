import { KnowledgeScrapeError } from '../../../../src/errors/KnowledgeScrapeError';
import { ParseError } from '../../../../src/errors/ParseError';
import type { RunBrowserExecutionMode, TaggedRunBrowserError } from './RunBrowserArgs';
import {
    getErrorMessage,
    getErrorStack,
    isRemoteBrowserUnavailableError,
    REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE,
    type RunBrowserToolError,
    sanitizeRemoteBrowserEndpoint,
} from './runBrowserErrors';
import { runBrowserConstants } from './runBrowserConstants';
import { runBrowserRuntime } from './runBrowserRuntime';
import { REMOTE_BROWSER_URL } from '../../config';

/**
 * Error classification and cancellation helpers used by `run_browser`.
 *
 * @private function of `run_browser`
 */
export const runBrowserErrorHandling = {
    /**
     * Creates one tagged ParseError used for deterministic input validation failures.
     */
    createRunBrowserValidationError(options: {
        readonly message: string;
        readonly debug: Record<string, unknown>;
    }): TaggedRunBrowserError {
        const error = new ParseError(options.message) as TaggedRunBrowserError;
        error.name = 'RunBrowserValidationError';
        (error as TaggedRunBrowserError).runBrowserCode = runBrowserConstants.validationErrorCode;
        (error as TaggedRunBrowserError).isRetryable = false;
        (error as TaggedRunBrowserError).suggestedNextSteps = [
            'Fix the action payload to match the run_browser schema.',
            'Check selectors and required action fields before retrying.',
        ];
        (error as TaggedRunBrowserError).debug = options.debug;
        return error;
    },

    /**
     * Creates one tagged KnowledgeScrapeError used for navigation failures.
     */
    createRunBrowserNavigationError(options: {
        readonly message: string;
        readonly debug: Record<string, unknown>;
        readonly cause?: unknown;
    }): TaggedRunBrowserError {
        const error = new KnowledgeScrapeError(options.message) as TaggedRunBrowserError;
        error.name = 'RunBrowserNavigationError';
        (error as TaggedRunBrowserError).runBrowserCode = runBrowserConstants.navigationFailedErrorCode;
        (error as TaggedRunBrowserError).isRetryable = false;
        (error as TaggedRunBrowserError).suggestedNextSteps = [
            'Verify the URL is reachable and not blocked.',
            'Retry with a simpler action sequence.',
        ];
        (error as TaggedRunBrowserError).debug = options.debug;
        (error as Error & { cause?: unknown }).cause = options.cause;
        return error;
    },

    /**
     * Creates one tagged KnowledgeScrapeError used for action failures.
     */
    createRunBrowserActionError(options: {
        readonly message: string;
        readonly debug: Record<string, unknown>;
        readonly cause?: unknown;
    }): TaggedRunBrowserError {
        const error = new KnowledgeScrapeError(options.message) as TaggedRunBrowserError;
        error.name = 'RunBrowserActionError';
        (error as TaggedRunBrowserError).runBrowserCode = runBrowserConstants.actionFailedErrorCode;
        (error as TaggedRunBrowserError).isRetryable = false;
        (error as TaggedRunBrowserError).suggestedNextSteps = [
            'Verify selectors and action values.',
            'Reduce the action sequence to isolate the failing step.',
        ];
        (error as TaggedRunBrowserError).debug = options.debug;
        (error as Error & { cause?: unknown }).cause = options.cause;
        return error;
    },

    /**
     * Creates one tagged KnowledgeScrapeError used for cancellation.
     */
    createRunBrowserCancelledError(options: {
        readonly message: string;
        readonly debug: Record<string, unknown>;
        readonly cause?: unknown;
    }): TaggedRunBrowserError {
        const error = new KnowledgeScrapeError(options.message) as TaggedRunBrowserError;
        error.name = 'RunBrowserCancelledError';
        (error as TaggedRunBrowserError).runBrowserCode = runBrowserConstants.cancelledErrorCode;
        (error as TaggedRunBrowserError).isRetryable = true;
        (error as TaggedRunBrowserError).suggestedNextSteps = [
            'Retry while request context is still active.',
            'Increase timeout if operation is expected to run longer.',
        ];
        (error as TaggedRunBrowserError).debug = options.debug;
        (error as Error & { cause?: unknown }).cause = options.cause;
        return error;
    },

    /**
     * Checks whether an unknown error carries run_browser classification tags.
     */
    isTaggedRunBrowserError(error: unknown): error is TaggedRunBrowserError {
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
    },

    /**
     * Converts unknown errors into structured tool error payloads.
     */
    classifyRunBrowserToolError(options: {
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
                    mode: runBrowserRuntime.formatExecutionMode(options.mode),
                },
            };
        }

        if (this.isTaggedRunBrowserError(options.error)) {
            return {
                code: options.error.runBrowserCode,
                message: options.error.message,
                isRetryable: options.error.isRetryable,
                suggestedNextSteps: options.error.suggestedNextSteps,
                debug: {
                    ...options.error.debug,
                    sessionId: options.sessionId,
                    mode: runBrowserRuntime.formatExecutionMode(options.mode),
                },
            };
        }

        const remoteBrowserEndpoint =
            REMOTE_BROWSER_URL && REMOTE_BROWSER_URL.trim().length > 0
                ? sanitizeRemoteBrowserEndpoint(REMOTE_BROWSER_URL.trim())
                : null;
        const message = getErrorMessage(options.error);

        return {
            code: runBrowserConstants.unknownErrorCode,
            message,
            isRetryable: false,
            suggestedNextSteps: ['Inspect debug details to identify the failing phase.', 'Retry with fewer actions.'],
            debug: {
                sessionId: options.sessionId,
                mode: runBrowserRuntime.formatExecutionMode(options.mode),
                remoteBrowserEndpoint,
                message,
                stack: getErrorStack(options.error),
            },
        };
    },

    /**
     * Asserts that the run was not aborted.
     */
    assertNotAborted(signal: AbortSignal | undefined, sessionId: string): void {
        if (!signal?.aborted) {
            return;
        }

        throw this.createRunBrowserCancelledError({
            message: 'run_browser execution was cancelled.',
            debug: { sessionId },
        });
    },

    /**
     * Returns true when the tool error represents remote browser unavailability.
     */
    isRemoteBrowserUnavailableCode(code: string): boolean {
        return code === REMOTE_BROWSER_UNAVAILABLE_ERROR_CODE;
    },
};
