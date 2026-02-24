import type { string_markdown, string_url } from '../types/typeAliases';

/**
 * Result of a file security check.
 *
 * @public exported from `@promptbook/core`
 */
export type FileSecurityCheckResult = {
    /**
     * Whether the file is considered safe
     */
    readonly isSafe: boolean;

    /**
     * Status of the check
     */
    readonly status: 'SAFE' | 'MALICIOUS' | 'SUSPICIOUS' | 'UNKNOWN' | 'ERROR';

    /**
     * Confidence of the result (0-1)
     */
    readonly confidence: number;

    /**
     * Human-readable message with more details about the result
     */
    readonly message: string_markdown;

    /**
     * URL to the full report on the provider's website
     */
    readonly reportUrl?: string_url;

    /**
     * Raw response from the provider (useful for debugging)
     */
    readonly rawResponse?: unknown;
};
