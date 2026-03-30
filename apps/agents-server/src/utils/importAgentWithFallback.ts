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

        return result.value;
    } catch (error) {
        console.warn(
            `[importAgentWithFallback] Falling back for "${agentUrl}" after ${configuration.maxAttempts} attempts:`,
            error,
        );

        return createMissingImportedAgentFallback(agentUrl, configuration.maxAttempts, error);
    }
}
