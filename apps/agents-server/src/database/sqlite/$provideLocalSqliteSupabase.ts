import type { SupabaseClient } from '@supabase/supabase-js';
import { $resetAgentsServerSqliteDatabaseForTests } from './$provideAgentsServerSqliteDatabase';
import { ensureTable } from './localSqliteSupabase/ensureTable';
import { resolveReadIndexColumns, resolveTableBaseName } from './localSqliteSupabase/localSqliteTableSchema';
import { LocalSqliteSupabaseClient } from './localSqliteSupabase/LocalSqliteSupabaseClient';
import { resolveLocalSqliteTableLocation } from './resolveLocalSqliteTableLocation';
import { invalidateStandaloneServerRegistryCache } from './standaloneServerRegistryStore';

/**
 * Cached Supabase-shaped local client.
 */
let localSqliteSupabase: SupabaseClient | null = null;

/**
 * Provides a Supabase-shaped client backed by isolated local SQLite databases.
 *
 * Table names are routed per query: VPS-level tables go to the VPS registry
 * database while server-prefixed tables go to the isolated database file of
 * the owning server, so servers cannot leak data into each other.
 */
export function $provideLocalSqliteSupabase(): SupabaseClient {
    if (localSqliteSupabase) {
        return localSqliteSupabase;
    }

    localSqliteSupabase = new LocalSqliteSupabaseClient(resolveLocalSqliteTableLocation) as unknown as SupabaseClient;
    return localSqliteSupabase;
}

/**
 * Closes all cached SQLite connections and resets adapter state for isolated tests.
 */
export function $resetLocalSqliteSupabaseForTests(): void {
    $resetAgentsServerSqliteDatabaseForTests();
    invalidateStandaloneServerRegistryCache();
    localSqliteSupabase = null;
}

/**
 * Ensures read indexes for a table that is queried through direct SQLite SQL.
 *
 * @param tableName - Logical table name, including any server prefix.
 *
 * @private internal SQLite utility of Agents Server
 */
export function ensureLocalSqliteTableReadIndexes(tableName: string): void {
    const { database, localTableName } = resolveLocalSqliteTableLocation(tableName);
    const tableBaseName = resolveTableBaseName(localTableName);

    ensureTable(database, localTableName, resolveReadIndexColumns(tableBaseName));
}
