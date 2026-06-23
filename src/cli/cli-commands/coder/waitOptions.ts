import { parseDuration } from '../../../../scripts/run-codex-prompts/common/parseDuration';

/**
 * Default wait duration applied before retrying a prompt round after an error (10 minutes).
 *
 * @private internal constant of `ptbk coder` wait handling
 */
export const DEFAULT_WAIT_AFTER_ERROR_MS = 10 * 60 * 1000;

/**
 * Parses an optional Commander duration string and returns the resolved milliseconds.
 *
 * Returns `defaultMs` when the flag was not provided or was provided without a non-empty value.
 *
 * @private internal utility of `ptbk coder` wait handling
 */
export function parseOptionalWaitDuration(value: string | undefined, defaultMs: number): number {
    if (typeof value !== 'string' || value === '') {
        return defaultMs;
    }
    return parseDuration(value);
}

// Note: [💞] Ignore a discrepancy between file name and entity name
