import type { Pool } from 'pg';
import {
    DEFAULT_AGENT_VISIBILITY,
    DEFAULT_VISIBILITY_METADATA_KEY,
    LEGACY_DEFAULT_VISIBILITY_METADATA_KEY,
    parseAgentVisibility,
    type AgentVisibility,
} from '../agentVisibility';
import { quoteIdentifier } from './quoteIdentifier';

/**
 * Metadata key storing the canonical Core server URL.
 */
const CORE_SERVER_METADATA_KEY = 'CORE_SERVER';

/**
 * Loads the small metadata subset needed by the sync logic.
 *
 * @param pool - Shared PostgreSQL pool.
 * @param tablePrefix - Current server table prefix.
 * @returns Core server URL and effective default visibility.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function loadDefaultFederatedAgentSyncMetadata(
    pool: Pool,
    tablePrefix: string,
): Promise<{ coreServerUrl: string | null; defaultVisibility: AgentVisibility }> {
    const metadataTableName = quoteIdentifier(`${tablePrefix}Metadata`);
    const result = await pool.query<{ key: string; value: string | null }>(
        `
            SELECT "key", "value"
            FROM ${metadataTableName}
            WHERE "key" = ANY($1)
        `,
        [[CORE_SERVER_METADATA_KEY, DEFAULT_VISIBILITY_METADATA_KEY, LEGACY_DEFAULT_VISIBILITY_METADATA_KEY]],
    );

    const metadataByKey = new Map<string, string | null>();
    for (const row of result.rows) {
        metadataByKey.set(row.key, row.value);
    }

    return {
        coreServerUrl: normalizeOptionalServerUrl(metadataByKey.get(CORE_SERVER_METADATA_KEY) || null),
        defaultVisibility: parseAgentVisibility(
            metadataByKey.get(DEFAULT_VISIBILITY_METADATA_KEY) || metadataByKey.get(LEGACY_DEFAULT_VISIBILITY_METADATA_KEY),
            DEFAULT_AGENT_VISIBILITY,
        ),
    };
}

/**
 * Normalizes an optional server URL so equality checks ignore trailing slashes.
 *
 * @param value - Raw server URL.
 * @returns Normalized URL or `null`.
 */
function normalizeOptionalServerUrl(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue === '' ? null : ensureTrailingSlash(normalizedValue);
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
