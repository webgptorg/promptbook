import type { SpeechRecognitionErrorCode } from '../../../../../src/types/SpeechRecognition';
import type { SpeechToTextProviderError } from './SpeechToTextProvider';

/**
 * String literals used to identify browser permission-denied failures.
 */
const PERMISSION_ERROR_TOKENS: ReadonlyArray<string> = ['notallowederror', 'permission denied', 'not-allowed'];

/**
 * String literals used to identify microphone hardware failures.
 */
const MICROPHONE_ERROR_TOKENS: ReadonlyArray<string> = ['audio-capture', 'microphone', 'notfounderror'];

/**
 * String literals used to identify no-speech failures.
 */
const NO_SPEECH_ERROR_TOKENS: ReadonlyArray<string> = ['no-speech', 'no speech'];

/**
 * String literals used to identify user-aborted sessions.
 */
const ABORTED_ERROR_TOKENS: ReadonlyArray<string> = ['aborted'];

/**
 * Normalizes provider errors into one consistent error payload.
 */
export function normalizeSpeechToTextProviderError(input: {
    message: string;
    code?: string;
    cause?: unknown;
}): SpeechToTextProviderError {
    const normalizedCode = resolveSpeechRecognitionErrorCode(input.code, input.message);

    return {
        code: normalizedCode,
        message: input.message,
        isRetryable: normalizedCode !== 'permission-denied' && normalizedCode !== 'unsupported-browser',
        cause: input.cause,
    };
}

/**
 * Maps browser/provider error details into a stable error code.
 */
function resolveSpeechRecognitionErrorCode(rawCode: string | undefined, message: string): SpeechRecognitionErrorCode {
    const normalizedCode = `${rawCode || ''}`.trim().toLowerCase();
    const normalizedMessage = `${message || ''}`.trim().toLowerCase();
    const haystack = `${normalizedCode} ${normalizedMessage}`;

    if (includesAnyToken(haystack, PERMISSION_ERROR_TOKENS)) {
        return 'permission-denied';
    }

    if (includesAnyToken(haystack, MICROPHONE_ERROR_TOKENS)) {
        return 'audio-capture';
    }

    if (includesAnyToken(haystack, NO_SPEECH_ERROR_TOKENS)) {
        return 'no-speech';
    }

    if (includesAnyToken(haystack, ABORTED_ERROR_TOKENS)) {
        return 'aborted';
    }

    if (haystack.includes('network')) {
        return 'network';
    }

    if (haystack.includes('not-supported') || haystack.includes('unsupported')) {
        return 'unsupported-browser';
    }

    return 'unknown';
}

/**
 * Checks whether any token exists in one normalized string.
 */
function includesAnyToken(haystack: string, tokens: ReadonlyArray<string>): boolean {
    return tokens.some((token) => haystack.includes(token));
}
