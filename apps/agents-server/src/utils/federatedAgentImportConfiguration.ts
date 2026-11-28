import { cache } from 'react';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
    type FederatedAgentImportConfiguration,
} from '../constants/federatedAgentImport';
import { getFederatedAgentImportRetryDelayMs } from './serverLimits';

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
        retryDelayMs: await getFederatedAgentImportRetryDelayMs(),
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
