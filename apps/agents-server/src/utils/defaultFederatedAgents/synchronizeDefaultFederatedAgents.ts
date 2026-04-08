import type { DefaultFederatedAgentsSyncOptions } from './DefaultFederatedAgentsSyncOptions';
import { ensureDefaultFederatedAgentExists } from './ensureDefaultFederatedAgentExists';
import { fetchCoreOrganizationPayload } from './fetchCoreOrganizationPayload';
import { fetchFederatedAgentBook } from './fetchFederatedAgentBook';
import { getDefaultFederatedAgentSyncPool } from './getDefaultFederatedAgentSyncPool';
import { loadActiveLocalAgentIdsByNormalizedName } from './loadActiveLocalAgentIdsByNormalizedName';
import { loadDefaultFederatedAgentSyncMetadata } from './loadDefaultFederatedAgentSyncMetadata';
import { selectDefaultFederatedAgentsFromOrganizationPayload } from './selectDefaultFederatedAgentsFromOrganizationPayload';

/**
 * Runs one synchronization pass for the given server prefix.
 *
 * @param options - Current server context.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function synchronizeDefaultFederatedAgents(
    options: DefaultFederatedAgentsSyncOptions,
): Promise<void> {
    const pool = getDefaultFederatedAgentSyncPool();
    const syncMetadata = await loadDefaultFederatedAgentSyncMetadata(pool, options.tablePrefix);
    const coreServerUrl = syncMetadata.coreServerUrl;

    if (!coreServerUrl) {
        return;
    }

    if (normalizeServerUrl(coreServerUrl) === normalizeServerUrl(options.localServerUrl)) {
        return;
    }

    const organizationPayload = await fetchCoreOrganizationPayload(coreServerUrl);
    const defaultAgentCandidates = selectDefaultFederatedAgentsFromOrganizationPayload(organizationPayload, coreServerUrl);
    if (defaultAgentCandidates.length === 0) {
        return;
    }

    const activeLocalAgentIdsByNormalizedName = await loadActiveLocalAgentIdsByNormalizedName(pool, options.tablePrefix);

    for (const candidate of defaultAgentCandidates) {
        if (activeLocalAgentIdsByNormalizedName.has(candidate.normalizedName)) {
            continue;
        }

        const remoteAgentSource = await fetchFederatedAgentBook(candidate.sourceAgentUrl);
        const createdAgentPermanentId = await ensureDefaultFederatedAgentExists({
            pool,
            tablePrefix: options.tablePrefix,
            defaultVisibility: syncMetadata.defaultVisibility,
            candidate,
            remoteAgentSource,
        });

        activeLocalAgentIdsByNormalizedName.set(candidate.normalizedName, createdAgentPermanentId);
    }
}

/**
 * Normalizes a server URL for equality checks.
 *
 * @param value - Raw server URL.
 * @returns Stable URL string without a trailing slash.
 */
function normalizeServerUrl(value: string): string {
    const parsedUrl = new URL(ensureTrailingSlash(value));
    return parsedUrl.href.replace(/\/+$/g, '');
}

/**
 * Ensures a server base URL always ends with a single slash.
 *
 * @param value - Raw server URL.
 * @returns Base URL with one trailing slash.
 */
function ensureTrailingSlash(value: string): string {
    return `${value.replace(/\/+$/g, '')}/`;
}
