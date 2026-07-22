import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { buildDomainTablePrefix } from '../../utils/buildDomainTablePrefix';
import {
    normalizeServerDomain,
    parseServerRecord,
    SERVER_ENVIRONMENT,
    type ServerEnvironment,
    type ServerRecord,
} from '../../utils/serverRegistry';
import { $provideVpsRegistrySqliteDatabase } from './$provideAgentsServerSqliteDatabase';
import { ensureTable } from './localSqliteSupabase/ensureTable';
import { resolveServerSqliteDatabaseKey } from './resolveServerSqliteDatabasePath';

/**
 * Name of the VPS-wide server registry table inside the VPS registry database.
 *
 * @private constant of the standalone server registry store
 */
const SERVER_REGISTRY_TABLE_NAME = '_Server';

/**
 * Columns stored for every `_Server` registry row.
 *
 * @private constant of the standalone server registry store
 */
const SERVER_REGISTRY_COLUMNS = ['name', 'environment', 'domain', 'tablePrefix', 'createdAt', 'updatedAt'] as const;

/**
 * How long the in-process registry row cache stays valid.
 *
 * @private constant of the standalone server registry store
 */
const SERVER_REGISTRY_ROWS_CACHE_TTL_MS = 5_000;

/**
 * Cached registry rows shared by hot per-query routing lookups.
 */
let cachedServerRegistryRows: {
    readonly loadedAt: number;
    readonly rows: ReadonlyArray<ServerRecord>;
} | null = null;

/**
 * `SERVERS` environment value that was last synchronized into the registry.
 */
let lastSyncedServersEnvironmentValue: string | null = null;

/**
 * Input accepted when registering one new standalone server.
 */
export type CreateStandaloneServerInput = {
    /**
     * Human-facing server name.
     */
    readonly name: string;

    /**
     * Environment group of the server.
     */
    readonly environment: ServerEnvironment;

    /**
     * Public domain of the server.
     */
    readonly domain: string;

    /**
     * Stable namespace key selecting the isolated per-server SQLite database.
     */
    readonly tablePrefix: string;
};

/**
 * Editable fields of one standalone server registration.
 */
export type UpdateStandaloneServerInput = {
    /**
     * Replacement public domain.
     */
    readonly domain?: string;

    /**
     * Replacement human-facing name.
     */
    readonly name?: string;
};

/**
 * Clears in-process registry caches so following reads hit the registry database.
 *
 * @private exported from the standalone server registry store
 */
export function invalidateStandaloneServerRegistryCache(): void {
    cachedServerRegistryRows = null;
    lastSyncedServersEnvironmentValue = null;
}

/**
 * Lists all servers registered in the VPS registry database.
 *
 * Domains configured in the `SERVERS` environment variable that are not yet
 * registered are automatically registered first, so a freshly installed VPS
 * bootstraps its registry from the installer-provided domain list.
 *
 * @returns Registered servers ordered by name.
 *
 * @private exported from the standalone server registry store
 */
export function listStandaloneRegisteredServers(): Array<ServerRecord> {
    ensureStandaloneServersSyncedFromEnvironment();
    return [...readStandaloneServerRegistryRows()];
}

/**
 * Lists the table prefixes of all registered servers using the short-lived cache.
 *
 * Used on the hot per-query path that routes prefixed table names to isolated
 * per-server SQLite database files. Missing `SERVERS` domains are registered
 * first (memoized on the raw environment value), so even standalone CLI
 * processes — for example the installer's default-agent seeding — route into
 * the correct per-server database before the web server ever booted.
 *
 * @returns Known non-empty server table prefixes.
 *
 * @private exported from the standalone server registry store
 */
export function listStandaloneServerTablePrefixes(): Array<string> {
    ensureStandaloneServersSyncedFromEnvironment();

    const isCacheValid =
        cachedServerRegistryRows !== null &&
        Date.now() - cachedServerRegistryRows.loadedAt < SERVER_REGISTRY_ROWS_CACHE_TTL_MS;

    if (!isCacheValid) {
        cachedServerRegistryRows = {
            loadedAt: Date.now(),
            rows: readStandaloneServerRegistryRows(),
        };
    }

    return cachedServerRegistryRows!.rows.map((server) => server.tablePrefix).filter((tablePrefix) => tablePrefix !== '');
}

/**
 * Finds one registered standalone server by its registry id.
 *
 * @param serverId - Registry row id.
 * @returns Matching server or `null`.
 *
 * @private exported from the standalone server registry store
 */
export function getStandaloneServerById(serverId: number): ServerRecord | null {
    return readStandaloneServerRegistryRows().find((server) => server.id === serverId) ?? null;
}

/**
 * Registers one new standalone server in the VPS registry database.
 *
 * @param input - New server registration values.
 * @returns Created registry row.
 *
 * @private exported from the standalone server registry store
 */
export function createStandaloneServer(input: CreateStandaloneServerInput): ServerRecord {
    const normalizedDomain = normalizeServerDomain(input.domain);
    if (!normalizedDomain) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot register the server because domain \`${input.domain}\` is not a valid domain.
            `),
        );
    }

    if (!input.name.trim()) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot register the server because its \`name\` is empty.
            `),
        );
    }

    if (!input.tablePrefix.trim()) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot register server \`${input.name}\` because its \`tablePrefix\` is empty.
            `),
        );
    }

    // Note: Throws a branded error when the prefix cannot become a per-server database file name.
    resolveServerSqliteDatabaseKey(input.tablePrefix);

    const normalizedName = input.name.trim();
    const existingServers = readStandaloneServerRegistryRows();
    assertStandaloneServerIsUnique(existingServers, {
        name: normalizedName,
        domain: normalizedDomain,
        tablePrefix: input.tablePrefix,
    });

    const database = provideServerRegistryTable();
    const now = new Date().toISOString();
    const { lastInsertRowid } = database
        .prepare(
            `INSERT INTO "${SERVER_REGISTRY_TABLE_NAME}" ("name", "environment", "domain", "tablePrefix", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(normalizedName, input.environment, normalizedDomain, input.tablePrefix, now, now);

    invalidateStandaloneServerRegistryCache();

    const createdServer = getStandaloneServerById(Number(lastInsertRowid));
    if (!createdServer) {
        throw new DatabaseError(
            spaceTrim(`
                The server \`${input.name}\` was not persisted into the VPS registry database.
            `),
        );
    }

    return createdServer;
}

/**
 * Updates the editable fields of one registered standalone server.
 *
 * The server keeps its id and table prefix, so its isolated per-server database
 * (agents, projects, metadata, users, ...) survives domain and name changes.
 *
 * @param serverId - Registry row id.
 * @param input - Replacement values.
 * @returns Updated registry row.
 *
 * @private exported from the standalone server registry store
 */
export function updateStandaloneServer(serverId: number, input: UpdateStandaloneServerInput): ServerRecord {
    const existingServer = getStandaloneServerById(serverId);
    if (!existingServer) {
        throw new DatabaseError(
            spaceTrim(`
                Standalone server \`${serverId}\` was not found in the VPS registry database.
            `),
        );
    }

    const nextName = input.name?.trim() || existingServer.name;
    let nextDomain = existingServer.domain;
    if (input.domain !== undefined) {
        const normalizedDomain = normalizeServerDomain(input.domain);
        if (!normalizedDomain) {
            throw new DatabaseError(
                spaceTrim(`
                    Cannot update the server because domain \`${input.domain}\` is not a valid domain.
                `),
            );
        }
        nextDomain = normalizedDomain;
    }

    const otherServers = readStandaloneServerRegistryRows().filter((server) => server.id !== serverId);
    assertStandaloneServerIsUnique(otherServers, {
        name: nextName,
        domain: nextDomain,
        tablePrefix: existingServer.tablePrefix,
    });

    const database = provideServerRegistryTable();
    database
        .prepare(`UPDATE "${SERVER_REGISTRY_TABLE_NAME}" SET "name" = ?, "domain" = ?, "updatedAt" = ? WHERE "id" = ?`)
        .run(nextName, nextDomain, new Date().toISOString(), serverId);

    invalidateStandaloneServerRegistryCache();

    const updatedServer = getStandaloneServerById(serverId);
    if (!updatedServer) {
        throw new DatabaseError(
            spaceTrim(`
                Standalone server \`${serverId}\` disappeared from the VPS registry database while updating it.
            `),
        );
    }

    return updatedServer;
}

/**
 * Removes one standalone server registration from the VPS registry database.
 *
 * Note: The isolated per-server SQLite database file is intentionally kept on
 * disk so deleting a registration never silently destroys server data.
 *
 * @param serverId - Registry row id.
 * @returns Removed registry row.
 *
 * @private exported from the standalone server registry store
 */
export function deleteStandaloneServer(serverId: number): ServerRecord {
    const existingServer = getStandaloneServerById(serverId);
    if (!existingServer) {
        throw new DatabaseError(
            spaceTrim(`
                Standalone server \`${serverId}\` was not found in the VPS registry database.
            `),
        );
    }

    const database = provideServerRegistryTable();
    database.prepare(`DELETE FROM "${SERVER_REGISTRY_TABLE_NAME}" WHERE "id" = ?`).run(serverId);

    invalidateStandaloneServerRegistryCache();

    return existingServer;
}

/**
 * Reads all `_Server` rows directly from the VPS registry database.
 *
 * @returns Registered servers ordered by name.
 *
 * @private function of the standalone server registry store
 */
function readStandaloneServerRegistryRows(): ReadonlyArray<ServerRecord> {
    const database = provideServerRegistryTable();
    const rows = database
        .prepare(
            `SELECT "id", ${SERVER_REGISTRY_COLUMNS.map((column) => `"${column}"`).join(
                ', ',
            )} FROM "${SERVER_REGISTRY_TABLE_NAME}" ORDER BY "name" ASC`,
        )
        .all();

    return rows.map((row, index) => parseServerRecord(row, `row ${index + 1}`));
}

/**
 * Registers domains from the `SERVERS` environment variable that are missing in the registry.
 *
 * The synchronization is memoized on the raw `SERVERS` value, so repeated reads
 * with an unchanged environment cost nothing.
 *
 * @private function of the standalone server registry store
 */
function ensureStandaloneServersSyncedFromEnvironment(): void {
    const rawServersValue = process.env.SERVERS ?? '';
    if (rawServersValue === lastSyncedServersEnvironmentValue) {
        return;
    }

    const environmentDomains = rawServersValue
        .split(',')
        .map((rawDomain) => normalizeServerDomain(rawDomain))
        .filter((domain): domain is string => Boolean(domain));

    if (environmentDomains.length > 0) {
        const registeredDomains = new Set(readStandaloneServerRegistryRows().map((server) => server.domain));

        for (const domain of environmentDomains) {
            if (registeredDomains.has(domain)) {
                continue;
            }

            registerStandaloneServerForEnvironmentDomain(domain);
            registeredDomains.add(domain);
        }
    }

    lastSyncedServersEnvironmentValue = rawServersValue;
}

/**
 * Registers one `SERVERS` domain with collision-free name and table prefix.
 *
 * @param domain - Normalized domain missing in the registry.
 *
 * @private function of the standalone server registry store
 */
function registerStandaloneServerForEnvironmentDomain(domain: string): void {
    const existingServers = readStandaloneServerRegistryRows();
    const existingNames = new Set(existingServers.map((server) => server.name.toLowerCase()));
    const existingTablePrefixes = new Set(existingServers.map((server) => server.tablePrefix.toLowerCase()));

    createStandaloneServer({
        name: resolveUniqueValue(domain, existingNames),
        environment: SERVER_ENVIRONMENT.PRODUCTION,
        domain,
        tablePrefix: resolveUniqueValue(buildDomainTablePrefix(domain), existingTablePrefixes, {
            isTrailingUnderscoreKept: true,
        }),
    });
}

/**
 * Ensures the `_Server` table exists and returns the VPS registry database.
 *
 * @returns VPS registry database with a prepared `_Server` table.
 *
 * @private function of the standalone server registry store
 */
function provideServerRegistryTable() {
    const database = $provideVpsRegistrySqliteDatabase();
    ensureTable(database, SERVER_REGISTRY_TABLE_NAME, [...SERVER_REGISTRY_COLUMNS]);
    return database;
}

/**
 * Validates that name, domain, and table prefix do not collide with existing rows.
 *
 * Table prefixes are compared case-insensitively because they double as
 * per-server database file names on case-insensitive filesystems.
 *
 * @param existingServers - Rows the candidate is checked against.
 * @param candidate - Candidate registration values.
 *
 * @private function of the standalone server registry store
 */
function assertStandaloneServerIsUnique(
    existingServers: ReadonlyArray<ServerRecord>,
    candidate: {
        readonly name: string;
        readonly domain: string;
        readonly tablePrefix: string;
    },
): void {
    for (const existingServer of existingServers) {
        if (existingServer.domain === candidate.domain) {
            throw new DatabaseError(
                spaceTrim(`
                    Domain \`${candidate.domain}\` is already used by server \`${existingServer.name}\`.
                `),
            );
        }

        if (existingServer.name.toLowerCase() === candidate.name.toLowerCase()) {
            throw new DatabaseError(
                spaceTrim(`
                    Server name \`${candidate.name}\` is already used by another server.
                `),
            );
        }

        if (existingServer.tablePrefix.toLowerCase() === candidate.tablePrefix.toLowerCase()) {
            throw new DatabaseError(
                spaceTrim(`
                    Server identifier prefix \`${candidate.tablePrefix}\` is already used by server \`${existingServer.name}\`.
                `),
            );
        }
    }
}

/**
 * Picks the first collision-free value by appending a numeric suffix when needed.
 *
 * @param preferredValue - Preferred candidate value.
 * @param takenValues - Lower-cased values that are already taken.
 * @param options - Whether a trailing underscore shape such as `server_x_` must be kept.
 * @returns Unique value.
 *
 * @private function of the standalone server registry store
 */
function resolveUniqueValue(
    preferredValue: string,
    takenValues: ReadonlySet<string>,
    options?: { readonly isTrailingUnderscoreKept?: boolean },
): string {
    if (!takenValues.has(preferredValue.toLowerCase())) {
        return preferredValue;
    }

    for (let suffixNumber = 2; ; suffixNumber++) {
        const candidate = options?.isTrailingUnderscoreKept
            ? `${preferredValue}${suffixNumber}_`
            : `${preferredValue} (${suffixNumber})`;

        if (!takenValues.has(candidate.toLowerCase())) {
            return candidate;
        }
    }
}
