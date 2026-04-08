import { type Pool, type PoolClient } from 'pg';
import { prepareAgentSourceForPersistence } from '../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/prepareAgentSourceForPersistence';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';
import { ZERO_USAGE } from '../../../../../src/execution/utils/usage-constants';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import type { AgentVisibility } from '../agentVisibility';
import type { DefaultFederatedAgentCandidate } from './selectDefaultFederatedAgentsFromOrganizationPayload';
import { quoteIdentifier } from './quoteIdentifier';

/**
 * Table basename storing per-server sync state and locking rows.
 */
const DEFAULT_FEDERATED_AGENT_TABLE_BASENAME = 'DefaultFederatedAgent';

/**
 * Length of generated local permanent ids for cloned default agents.
 */
const DEFAULT_FEDERATED_AGENT_PERMANENT_ID_LENGTH = 14;

/**
 * Ensures one Core default agent exists locally while serializing writes through a DB row lock.
 *
 * @param options - Current sync inputs.
 * @returns Existing or newly created local permanent id.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function ensureDefaultFederatedAgentExists(options: {
    readonly pool: Pool;
    readonly tablePrefix: string;
    readonly defaultVisibility: AgentVisibility;
    readonly candidate: DefaultFederatedAgentCandidate;
    readonly remoteAgentSource: string_book;
}): Promise<string> {
    const client = await options.pool.connect();

    try {
        await client.query('BEGIN');
        await upsertDefaultFederatedAgentSyncRow(client, options.tablePrefix, options.candidate);
        await lockAgentWrites(client, options.tablePrefix);

        const existingPermanentId = await findActiveLocalPermanentIdByNormalizedName(
            client,
            options.tablePrefix,
            options.candidate.normalizedName,
        );

        if (existingPermanentId) {
            await updateDefaultFederatedAgentLocalPermanentId(
                client,
                options.tablePrefix,
                options.candidate.normalizedName,
                existingPermanentId,
            );
            await client.query('COMMIT');
            return existingPermanentId;
        }

        const newPermanentId = await insertClonedDefaultFederatedAgent(client, {
            tablePrefix: options.tablePrefix,
            defaultVisibility: options.defaultVisibility,
            remoteAgentSource: options.remoteAgentSource,
        });

        await updateDefaultFederatedAgentLocalPermanentId(
            client,
            options.tablePrefix,
            options.candidate.normalizedName,
            newPermanentId,
        );

        await client.query('COMMIT');
        return newPermanentId;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Keep the original error visible.
        }
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Inserts or updates the sync-state row for one normalized default agent name.
 *
 * The `ON CONFLICT ... DO UPDATE` path keeps the row locked for the current transaction.
 *
 * @param client - Transaction-bound PostgreSQL client.
 * @param tablePrefix - Current server table prefix.
 * @param candidate - Candidate being synchronized.
 */
async function upsertDefaultFederatedAgentSyncRow(
    client: PoolClient,
    tablePrefix: string,
    candidate: DefaultFederatedAgentCandidate,
): Promise<void> {
    const syncTableName = quoteIdentifier(`${tablePrefix}${DEFAULT_FEDERATED_AGENT_TABLE_BASENAME}`);

    await client.query(
        `
            INSERT INTO ${syncTableName} (
                "normalizedName",
                "sourceServerUrl",
                "sourceAgentIdentifier",
                "updatedAt"
            )
            VALUES ($1, $2, $3, now())
            ON CONFLICT ("normalizedName")
            DO UPDATE
            SET
                "sourceServerUrl" = EXCLUDED."sourceServerUrl",
                "sourceAgentIdentifier" = EXCLUDED."sourceAgentIdentifier",
                "updatedAt" = now()
        `,
        [candidate.normalizedName, new URL(candidate.sourceAgentUrl).origin, candidate.sourceAgentIdentifier],
    );
}

/**
 * Blocks concurrent writes to the current server's agent table during the critical recheck/create section.
 *
 * @param client - Transaction-bound PostgreSQL client.
 * @param tablePrefix - Current server table prefix.
 */
async function lockAgentWrites(client: PoolClient, tablePrefix: string): Promise<void> {
    const agentTableName = quoteIdentifier(`${tablePrefix}Agent`);
    await client.query(`LOCK TABLE ${agentTableName} IN SHARE ROW EXCLUSIVE MODE`);
}

/**
 * Finds the oldest active local agent whose normalized name matches the requested value.
 *
 * @param client - Transaction-bound PostgreSQL client.
 * @param tablePrefix - Current server table prefix.
 * @param normalizedName - Stable normalized lookup key.
 * @returns Matching permanent id or `null`.
 */
async function findActiveLocalPermanentIdByNormalizedName(
    client: PoolClient,
    tablePrefix: string,
    normalizedName: string,
): Promise<string | null> {
    const agentTableName = quoteIdentifier(`${tablePrefix}Agent`);
    const result = await client.query<{ agentName: string; permanentId: string | null }>(
        `
            SELECT "agentName", "permanentId"
            FROM ${agentTableName}
            WHERE "deletedAt" IS NULL
            ORDER BY "createdAt" ASC
        `,
    );

    for (const row of result.rows) {
        if (!row.permanentId) {
            continue;
        }

        if (normalizeAgentName(row.agentName) === normalizedName) {
            return row.permanentId;
        }
    }

    return null;
}

/**
 * Persists a freshly cloned default agent together with its initial history snapshot.
 *
 * @param client - Transaction-bound PostgreSQL client.
 * @param options - Insert inputs.
 * @returns Permanent id of the stored local agent.
 */
async function insertClonedDefaultFederatedAgent(
    client: PoolClient,
    options: {
        readonly tablePrefix: string;
        readonly defaultVisibility: AgentVisibility;
        readonly remoteAgentSource: string_book;
    },
): Promise<string> {
    const preparedAgentSource = prepareAgentSourceForPersistence(options.remoteAgentSource);
    const permanentId = preparedAgentSource.permanentId || $randomBase58(DEFAULT_FEDERATED_AGENT_PERMANENT_ID_LENGTH);
    const createdAt = new Date().toISOString();
    const agentTableName = quoteIdentifier(`${options.tablePrefix}Agent`);
    const agentHistoryTableName = quoteIdentifier(`${options.tablePrefix}AgentHistory`);

    await client.query(
        `
            INSERT INTO ${agentTableName} (
                "agentName",
                "createdAt",
                "updatedAt",
                "permanentId",
                "agentHash",
                "agentSource",
                "agentProfile",
                "promptbookEngineVersion",
                "usage",
                "visibility"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10)
        `,
        [
            preparedAgentSource.agentProfile.agentName,
            createdAt,
            null,
            permanentId,
            preparedAgentSource.agentProfile.agentHash,
            preparedAgentSource.agentSource,
            JSON.stringify(preparedAgentSource.agentProfile),
            PROMPTBOOK_ENGINE_VERSION,
            JSON.stringify(ZERO_USAGE),
            options.defaultVisibility,
        ],
    );

    await client.query(
        `
            INSERT INTO ${agentHistoryTableName} (
                "createdAt",
                "agentName",
                "permanentId",
                "agentHash",
                "previousAgentHash",
                "agentSource",
                "promptbookEngineVersion",
                "versionName"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
            createdAt,
            preparedAgentSource.agentProfile.agentName,
            permanentId,
            preparedAgentSource.agentProfile.agentHash,
            null,
            preparedAgentSource.agentSource,
            PROMPTBOOK_ENGINE_VERSION,
            null,
        ],
    );

    return permanentId;
}

/**
 * Stores the resolved local permanent id back into the sync-state table.
 *
 * @param client - Transaction-bound PostgreSQL client.
 * @param tablePrefix - Current server table prefix.
 * @param normalizedName - Stable normalized lookup key.
 * @param localPermanentId - Local permanent id to store.
 */
async function updateDefaultFederatedAgentLocalPermanentId(
    client: PoolClient,
    tablePrefix: string,
    normalizedName: string,
    localPermanentId: string,
): Promise<void> {
    const syncTableName = quoteIdentifier(`${tablePrefix}${DEFAULT_FEDERATED_AGENT_TABLE_BASENAME}`);

    await client.query(
        `
            UPDATE ${syncTableName}
            SET
                "localPermanentId" = $2,
                "updatedAt" = now()
            WHERE "normalizedName" = $1
        `,
        [normalizedName, localPermanentId],
    );
}
