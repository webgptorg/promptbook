/**
 * Metadata key storing the delay between retry attempts when importing federated agent books.
 *
 * @private internal Agents Server constant
 */
export const FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY = 'FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS' as const;

/**
 * Total number of attempts used when loading a federated imported agent before falling back.
 *
 * @private internal Agents Server constant
 */
export const FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS = 3 as const;

/**
 * Default delay in milliseconds between federated imported-agent retry attempts.
 *
 * @private internal Agents Server constant
 */
export const DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS = 500;

/**
 * Runtime configuration applied to federated imported-agent retries.
 *
 * @private internal Agents Server type
 */
export type FederatedAgentImportConfiguration = {
    /**
     * Total number of attempts used before returning the fallback book.
     */
    readonly maxAttempts: number;
    /**
     * Delay in milliseconds between retry attempts.
     */
    readonly retryDelayMs: number;
};

/**
 * Default retry configuration for federated imported-agent loading.
 *
 * @private internal Agents Server constant
 */
export const DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION = Object.freeze({
    maxAttempts: FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
    retryDelayMs: DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
}) satisfies FederatedAgentImportConfiguration;
