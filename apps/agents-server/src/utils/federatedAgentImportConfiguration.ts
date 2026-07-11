import { cache } from 'react';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
    type FederatedAgentImportConfiguration,
} from '../constants/federatedAgentImport';

/**
 * Loads the retry-delay limit while keeping this module Edge-runtime safe.
 *
 * The dedicated limits implementation depends on the server database layer,
 * including local SQLite helpers that import Node-only modules (`fs`, `path`).
 * Middleware runs in the Edge runtime, so this helper resolves the limit lazily
 * and falls back to defaults when the server-limits module is unavailable.
 *
 * @returns Configured retry delay in milliseconds.
 *
 * @private internal helper for Agents Server imported-agent resolution
 */
async function loadFederatedAgentImportRetryDelayMs(): Promise<number> {
    try {
        const { getFederatedAgentImportRetryDelayMs } = await import('./serverLimits');
        return await getFederatedAgentImportRetryDelayMs();
    } catch (error) {
        console.warn(
            '[loadFederatedAgentImportRetryDelayMs] Falling back to default retry delay from configuration constants:',
            error,
        );
        return DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION.retryDelayMs;
    }
}

/**
 * Cached federated imported-agent retry configuration shared across one request/runtime tick.
 *
 * @returns Normalized retry configuration.
 *
 * @private internal helper for Agents Server imported-agent resolution
 */
const loadFederatedAgentImportConfigurationCached = cache(async (): Promise<FederatedAgentImportConfiguration> => {
    return {
        maxAttempts: FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
        retryDelayMs: await loadFederatedAgentImportRetryDelayMs(),
    };
});

/**
 * Loads the retry configuration used when importing agent books from federated servers.
 *
 * Falls back to the repository defaults when metadata loading fails so local tests and
 * degraded environments still resolve agents predictably.
 *
 * @returns Federated imported-agent retry configuration.
 *
 * @private internal helper for Agents Server imported-agent resolution
 */
export async function loadFederatedAgentImportConfiguration(): Promise<FederatedAgentImportConfiguration> {
    try {
        return await loadFederatedAgentImportConfigurationCached();
    } catch (error) {
        console.warn('[loadFederatedAgentImportConfiguration] Falling back to default configuration:', error);
        return DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION;
    }
}
