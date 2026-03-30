import { cache } from 'react';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
    FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
    FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY,
    type FederatedAgentImportConfiguration,
} from '../constants/federatedAgentImport';
import { getMetadataMap } from '../database/getMetadata';

/**
 * Parses one metadata value into a safe non-negative integer.
 *
 * @param rawValue - Stored metadata value.
 * @param fallback - Default value used when parsing fails.
 * @returns Parsed non-negative integer.
 *
 * @private internal helper for federated import configuration loading
 */
function parseNonNegativeIntegerMetadata(rawValue: string | null | undefined, fallback: number): number {
    if (typeof rawValue !== 'string') {
        return fallback;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return fallback;
    }

    return parsedValue;
}

/**
 * Cached federated imported-agent retry configuration shared across one request/runtime tick.
 *
 * @returns Normalized retry configuration.
 *
 * @private internal helper for Agents Server imported-agent resolution
 */
const loadFederatedAgentImportConfigurationCached = cache(async (): Promise<FederatedAgentImportConfiguration> => {
    const metadata = await getMetadataMap([FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY]);

    return {
        maxAttempts: FEDERATED_AGENT_IMPORT_MAX_ATTEMPTS,
        retryDelayMs: parseNonNegativeIntegerMetadata(
            metadata[FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY],
            DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
        ),
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
