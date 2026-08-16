import { spaceTrim } from 'spacetrim';
import { parseDuration } from '../../../../scripts/run-codex-prompts/common/parseDuration';
import { NotAllowed } from '../../../errors/NotAllowed';

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

/**
 * Parses an optional Commander period duration string and returns the resolved milliseconds.
 *
 * Returns `undefined` when the flag was not provided or was provided without a non-empty value,
 * which means the command runs only once instead of repeating itself.
 *
 * @throws {NotAllowed} When the duration is not a positive one, because a non-positive period
 *                      would repeat the command without ever pausing between two rounds
 *
 * @private internal utility of `ptbk coder` wait handling
 */
export function parseOptionalPeriodDuration(optionName: string, value: string | undefined): number | undefined {
    if (typeof value !== 'string' || value === '') {
        return undefined;
    }

    const periodMs = parseDuration(value);

    if (periodMs <= 0) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid value for \`${optionName}\`: \`${value}\`.

                Use a **positive** duration like \`5h\`, \`30m\` or \`1h30m\`.
            `),
        );
    }

    return periodMs;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
