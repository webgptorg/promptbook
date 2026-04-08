import type { Pool } from 'pg';
import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';
import { quoteIdentifier } from './quoteIdentifier';

/**
 * Loads active local agents and indexes them by normalized name.
 *
 * @param pool - Shared PostgreSQL pool.
 * @param tablePrefix - Current server table prefix.
 * @returns Normalized-name lookup of active local permanent ids.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function loadActiveLocalAgentIdsByNormalizedName(
    pool: Pool,
    tablePrefix: string,
): Promise<Map<string, string>> {
    const agentTableName = quoteIdentifier(`${tablePrefix}Agent`);
    const result = await pool.query<{ agentName: string; permanentId: string | null }>(
        `
            SELECT "agentName", "permanentId"
            FROM ${agentTableName}
            WHERE "deletedAt" IS NULL
            ORDER BY "createdAt" ASC
        `,
    );

    const activeAgentsByNormalizedName = new Map<string, string>();
    for (const row of result.rows) {
        if (!row.permanentId) {
            continue;
        }

        const normalizedName = normalizeAgentName(row.agentName);
        if (!activeAgentsByNormalizedName.has(normalizedName)) {
            activeAgentsByNormalizedName.set(normalizedName, row.permanentId);
        }
    }

    return activeAgentsByNormalizedName;
}
