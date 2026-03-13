import { spaceTrim } from '@promptbook-local/utils';
import { Pool, type PoolClient } from 'pg';
import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { ZERO_USAGE } from '../../../../../src/execution/utils/usage-constants';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import { prepareAgentSourceForPersistence } from '../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/prepareAgentSourceForPersistence';
import { resolveDatabaseMigrationConnectionStringFromEnvironment } from '../../database/runDatabaseMigrations';
import {
    DEFAULT_AGENT_VISIBILITY,
    DEFAULT_VISIBILITY_METADATA_KEY,
    LEGACY_DEFAULT_VISIBILITY_METADATA_KEY,
    parseAgentVisibility,
    type AgentVisibility,
} from '../agentVisibility';
import {
    selectDefaultFederatedAgentsFromOrganizationPayload,
    type DefaultFederatedAgentCandidate,
    type FederatedOrganizationPayload,
} from './selectDefaultFederatedAgentsFromOrganizationPayload';

/**
 * Metadata key storing the canonical Core server URL.
 */
const CORE_SERVER_METADATA_KEY = 'CORE_SERVER';

/**
 * Interval between best-effort background sync attempts for one server prefix.
 */
const DEFAULT_FEDERATED_AGENT_SYNC_INTERVAL_MS = 5 * 60_000;

/**
 * Timeout used for remote Core HTTP requests.
 */
const DEFAULT_FEDERATED_AGENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Table basename storing per-server sync state and locking rows.
 */
const DEFAULT_FEDERATED_AGENT_TABLE_BASENAME = 'DefaultFederatedAgent';

/**
 * Length of generated local permanent ids for cloned default agents.
 */
const DEFAULT_FEDERATED_AGENT_PERMANENT_ID_LENGTH = 14;

/**
 * In-memory scheduling state for one server prefix.
 */
type DefaultFederatedAgentSyncState = {
    /**
     * Currently running sync promise, if any.
     */
    runningPromise: Promise<void> | null;
    /**
     * Timestamp of the most recent sync attempt.
     */
    lastAttemptAt: number | null;
};

/**
 * Active best-effort sync scheduling state keyed by server table prefix.
 */
const defaultFederatedAgentSyncStateByTablePrefix = new Map<string, DefaultFederatedAgentSyncState>();

/**
 * Shared PostgreSQL pool reused by default-agent sync helpers.
 */
let defaultFederatedAgentSyncPool: Pool | null = null;

/**
 * Schedules a best-effort background synchronization of default Core boilerplate agents.
 *
 * The task is throttled per server prefix and intentionally never throws to callers.
 *
 * @param options - Current server context needed for background sync.
 */
export function scheduleDefaultFederatedAgentsSync(options: {
    readonly tablePrefix: string;
    readonly localServerUrl: string;
}): void {
    if (shouldDisableDefaultFederatedAgentsSync()) {
        return;
    }

    const state = getDefaultFederatedAgentSyncState(options.tablePrefix);
    if (state.runningPromise) {
        return;
    }

    if (state.lastAttemptAt !== null && Date.now() - state.lastAttemptAt < DEFAULT_FEDERATED_AGENT_SYNC_INTERVAL_MS) {
        return;
    }

    state.lastAttemptAt = Date.now();
    state.runningPromise = synchronizeDefaultFederatedAgents(options)
        .catch((error) => {
            console.error('[default-federated-agents] Sync failed:', error);
        })
        .finally(() => {
            state.runningPromise = null;
        });
}

/**
 * Runs one synchronization pass for the given server prefix.
 *
 * @param options - Current server context.
 */
async function synchronizeDefaultFederatedAgents(options: {
    readonly tablePrefix: string;
    readonly localServerUrl: string;
}): Promise<void> {
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
 * Loads the small metadata subset needed by the sync logic.
 *
 * @param pool - Shared PostgreSQL pool.
 * @param tablePrefix - Current server table prefix.
 * @returns Core server URL and effective default visibility.
 */
async function loadDefaultFederatedAgentSyncMetadata(
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
 * Loads active local agents and indexes them by normalized name.
 *
 * @param pool - Shared PostgreSQL pool.
 * @param tablePrefix - Current server table prefix.
 * @returns Normalized-name lookup of active local permanent ids.
 */
async function loadActiveLocalAgentIdsByNormalizedName(pool: Pool, tablePrefix: string): Promise<Map<string, string>> {
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

/**
 * Fetches the Core public organization snapshot.
 *
 * @param coreServerUrl - Base URL of the Core server.
 * @returns Parsed organization payload.
 */
async function fetchCoreOrganizationPayload(coreServerUrl: string): Promise<FederatedOrganizationPayload> {
    const endpoint = new URL('/api/agent-organization', ensureTrailingSlash(coreServerUrl)).href;
    return fetchJsonWithTimeout<FederatedOrganizationPayload>(endpoint);
}

/**
 * Fetches the effective book source of one remote public agent.
 *
 * @param agentRouteUrl - Canonical remote agent route.
 * @returns Remote book content as plain text.
 */
async function fetchFederatedAgentBook(agentRouteUrl: string): Promise<string_book> {
    const endpoint = buildFederatedAgentBookUrl(agentRouteUrl);
    return (await fetchTextWithTimeout(endpoint)) as string_book;
}

/**
 * Ensures one Core default agent exists locally while serializing writes through a DB row lock.
 *
 * @param options - Current sync inputs.
 * @returns Existing or newly created local permanent id.
 */
async function ensureDefaultFederatedAgentExists(options: {
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

/**
 * Fetches and validates one JSON response with a bounded timeout.
 *
 * @param url - Absolute request URL.
 * @returns Parsed JSON body.
 */
async function fetchJsonWithTimeout<TValue>(url: string): Promise<TValue> {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to fetch default federated agents metadata from \`${url}\`.

                Received \`${response.status} ${response.statusText}\`.
            `),
        );
    }

    return (await response.json()) as TValue;
}

/**
 * Fetches and validates one text response with a bounded timeout.
 *
 * @param url - Absolute request URL.
 * @returns Response body as text.
 */
async function fetchTextWithTimeout(url: string): Promise<string> {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to fetch default federated agent source from \`${url}\`.

                Received \`${response.status} ${response.statusText}\`.
            `),
        );
    }

    return await response.text();
}

/**
 * Executes one HTTP request with a fixed abort timeout.
 *
 * @param url - Absolute request URL.
 * @returns Successful or unsuccessful fetch response.
 */
async function fetchWithTimeout(url: string): Promise<Response> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), DEFAULT_FEDERATED_AGENT_FETCH_TIMEOUT_MS);

    try {
        return await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.1' },
            signal: abortController.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Builds the public book endpoint URL for one remote agent route.
 *
 * @param agentRouteUrl - Canonical remote agent route.
 * @returns Absolute remote `/api/book` URL.
 */
function buildFederatedAgentBookUrl(agentRouteUrl: string): string {
    const routeUrl = new URL(agentRouteUrl);
    routeUrl.search = '';
    routeUrl.hash = '';
    routeUrl.pathname = `${routeUrl.pathname.replace(/\/+$/g, '')}/api/book`;
    return routeUrl.href;
}

/**
 * Quotes one PostgreSQL identifier safely.
 *
 * @param identifier - Raw SQL identifier.
 * @returns Quoted identifier.
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Resolves the shared PostgreSQL pool used by this feature.
 *
 * @returns Shared PostgreSQL pool.
 */
function getDefaultFederatedAgentSyncPool(): Pool {
    if (defaultFederatedAgentSyncPool) {
        return defaultFederatedAgentSyncPool;
    }

    const connectionString = resolveDatabaseMigrationConnectionStringFromEnvironment();
    if (!connectionString) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot synchronize default federated agents because \`POSTGRES_URL\` or \`DATABASE_URL\` is missing.
            `),
        );
    }

    defaultFederatedAgentSyncPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    return defaultFederatedAgentSyncPool;
}

/**
 * Reads or creates the in-memory scheduling state for one server prefix.
 *
 * @param tablePrefix - Current server table prefix.
 * @returns Mutable scheduling state.
 */
function getDefaultFederatedAgentSyncState(tablePrefix: string): DefaultFederatedAgentSyncState {
    let state = defaultFederatedAgentSyncStateByTablePrefix.get(tablePrefix);

    if (!state) {
        state = {
            runningPromise: null,
            lastAttemptAt: null,
        };
        defaultFederatedAgentSyncStateByTablePrefix.set(tablePrefix, state);
    }

    return state;
}

/**
 * Returns `true` when background sync should stay disabled in the current runtime.
 *
 * @returns Whether background sync should be skipped.
 */
function shouldDisableDefaultFederatedAgentsSync(): boolean {
    return process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';
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
