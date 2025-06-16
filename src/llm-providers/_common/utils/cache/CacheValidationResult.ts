import type { ExpectError } from '../../../../errors/ExpectError';

/**
 * Represents the result of cache validation, including whether the result should be cached
 * and any expectation errors that occurred during validation.
 *
 * @private internal type for cache validation
 */
export type CacheValidationResult = {
    /**
     * Whether the result should be cached.
     * False if the result doesn't meet expectations or has other validation issues.
     */
    shouldCache: boolean;

    /**
     * The expectation error that occurred during validation, if any.
     * This is used to determine if caching should be suppressed.
     */
    expectationError?: ExpectError;

    /**
     * Additional context about why caching was suppressed, for debugging purposes.
     */
    suppressionReason?: string;
};
