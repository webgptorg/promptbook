import { padBook } from '../../../../src/book-2.0/agent-source/padBook';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_url } from '../../../../src/types/typeAliases';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';

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
 * Creates the ad-hoc fallback source returned when a referenced agent stays unavailable.
 *
 * @param agentUrl - Canonical imported agent URL.
 * @param attempts - Total number of attempts that were used.
 * @param error - Final error raised by the failed import attempts.
 * @returns Valid fallback book source.
 *
 * @private internal helper for imported-agent fallback books
 */
export function createMissingImportedAgentFallback(
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
