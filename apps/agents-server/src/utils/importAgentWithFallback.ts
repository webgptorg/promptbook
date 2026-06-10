import { padBook } from '../../../../src/book-2.0/agent-source/padBook';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_url } from '../../../../src/types/typeAliases';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    type FederatedAgentImportConfiguration,
} from '../constants/federatedAgentImport';
import { retryWithBackoff } from './retryWithBackoff';
import { importAgent, type ImportAgentOptions } from './importAgent';

/**
 * Cached failed-import fallback payload reused for a short time to avoid
 * retrying the same unavailable remote agent on every navigation.
 */
type FailedImportedAgentFallbackCacheRecord = {
    /**
     * Generated fallback book returned for the failed import.
     */
    readonly fallbackSource: string_book;
    /**
     * Fetch implementation that produced this failed-import fallback.
     */
    readonly fetchImplementation: typeof fetch;
    /**
     * Cache expiration timestamp in epoch milliseconds.
     */
    readonly expiresAt: number;
};

/**
 * Negative-cache lifetime for failed imported-agent fetches.
 */
const FAILED_IMPORTED_AGENT_FALLBACK_CACHE_TTL_MS = 60_000;

/**
 * Failed imported-agent fallback books keyed by canonical agent URL.
 */
const cachedFailedImportedAgentFallbackByKey = new Map<string, FailedImportedAgentFallbackCacheRecord>();

/**
 * In-flight import-with-fallback resolutions keyed by canonical agent URL.
 */
const pendingImportedAgentFallbackByKey = new Map<string, Promise<string_book>>();

/**
 * Collapses one thrown error into a single-line message suitable for `NOTE` commitments.
 *
 * @param agentUrl - Canonical imported agent URL.
 * @param error - Unknown error raised while loading the imported agent.
 * @returns Human-readable single-line failure reason.
 *
 * @private internal helper for imported-agent fallback books
 */
function normalizeImportFailureMessage(agentUrl: string_agent_url, error: unknown): string {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const normalizedMessage = rawMessage.replace(/\s+/g, ' ').trim();
    const prefix = `Failed to import agent from "${agentUrl}"`;

    if (normalizedMessage.startsWith(prefix)) {
        const suffix = normalizedMessage.slice(prefix.length).trim();
        if (suffix.length > 0) {
            return suffix.replace(/^[-:,\s]+/, '').trim() || 'unknown error';
        }
    }

    return normalizedMessage || 'unknown error';
}

/**
 * Creates the ad-hoc fallback source returned when a federated imported agent stays unavailable.
 *
 * @param agentUrl - Canonical imported agent URL.
 * @param attempts - Total number of attempts that were used.
 * @param error - Final error raised by the failed import attempts.
 * @returns Valid fallback book source.
 *
 * @private internal helper for imported-agent fallback books
 */
function createMissingImportedAgentFallback(
    agentUrl: string_agent_url,
    attempts: number,
    error: unknown,
): string_book {
    const failureMessage = normalizeImportFailureMessage(agentUrl, error);

    return padBook(
        validateBook(
            spaceTrim(
                `
                    Not found agent

                    NOTE This agent was supposed to be imported from ${agentUrl}, but it can not be loaded after ${attempts} attempts because of ${failureMessage}
                    CLOSED
                `,
            ),
        ),
    );
}

/**
 * Builds the stable cache key used for import-with-fallback memoization.
 *
 * @param agentUrl - Canonical imported agent URL.
 * @returns Stable cache key without trailing slashes.
 */
function createImportedAgentFallbackCacheKey(agentUrl: string_agent_url): string {
    return agentUrl.replace(/\/+$/g, '');
}

/**
 * Reads one cached failed-import fallback while it is still fresh.
 *
 * @param cacheKey - Canonical failed-import cache key.
 * @returns Cached fallback source or `null` when unavailable.
 */
function readCachedFailedImportedAgentFallback(cacheKey: string): string_book | null {
    const cachedFallback = cachedFailedImportedAgentFallbackByKey.get(cacheKey);
    if (!cachedFallback) {
        return null;
    }

    if (cachedFallback.expiresAt <= Date.now()) {
        cachedFailedImportedAgentFallbackByKey.delete(cacheKey);
        return null;
    }

    if (cachedFallback.fetchImplementation !== globalThis.fetch) {
        cachedFailedImportedAgentFallbackByKey.delete(cacheKey);
        return null;
    }

    return cachedFallback.fallbackSource;
}

/**
 * Stores one generated fallback source for short-lived reuse after repeated import failures.
 *
 * @param cacheKey - Canonical failed-import cache key.
 * @param fallbackSource - Generated fallback source.
 */
function writeCachedFailedImportedAgentFallback(cacheKey: string, fallbackSource: string_book): void {
    cachedFailedImportedAgentFallbackByKey.set(cacheKey, {
        fallbackSource,
        fetchImplementation: globalThis.fetch,
        expiresAt: Date.now() + FAILED_IMPORTED_AGENT_FALLBACK_CACHE_TTL_MS,
    });
}

/**
 * Loads one imported agent with bounded retries and falls back to a valid book when loading fails.
 *
 * @param agentUrl - Canonical imported agent URL.
 * @param options - Import options forwarded to the strict importer.
 * @param configuration - Retry configuration for federated agent imports.
 * @returns Imported source or the ad-hoc fallback book.
 *
 * @private internal helper for Agents Server inherited/imported agent resolution
 */
export async function importAgentWithFallback(
    agentUrl: string_agent_url,
    options: ImportAgentOptions,
    configuration: FederatedAgentImportConfiguration = DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
): Promise<string_book> {
    const cacheKey = createImportedAgentFallbackCacheKey(agentUrl);
    const cachedFailedFallback = readCachedFailedImportedAgentFallback(cacheKey);
    if (cachedFailedFallback) {
        return cachedFailedFallback;
    }

    const pendingImport = pendingImportedAgentFallbackByKey.get(cacheKey);
    if (pendingImport) {
        return pendingImport;
    }

    const nextPendingImport = (async (): Promise<string_book> => {
        try {
            const result = await retryWithBackoff(
                () => importAgent(agentUrl, options),
                {
                    retries: Math.max(0, configuration.maxAttempts - 1),
                    initialDelayMs: configuration.retryDelayMs,
                    maxDelayMs: configuration.retryDelayMs,
                    backoffFactor: 1,
                    jitterRatio: 0,
                },
            );

            cachedFailedImportedAgentFallbackByKey.delete(cacheKey);
            return result.value;
        } catch (error) {
            console.warn(
                `[importAgentWithFallback] Falling back for "${agentUrl}" after ${configuration.maxAttempts} attempts:`,
                error,
            );

            const fallbackSource = createMissingImportedAgentFallback(agentUrl, configuration.maxAttempts, error);
            writeCachedFailedImportedAgentFallback(cacheKey, fallbackSource);
            return fallbackSource;
        } finally {
            pendingImportedAgentFallbackByKey.delete(cacheKey);
        }
    })();

    pendingImportedAgentFallbackByKey.set(cacheKey, nextPendingImport);
    return nextPendingImport;
}
