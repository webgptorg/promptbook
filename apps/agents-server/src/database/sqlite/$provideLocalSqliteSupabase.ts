import type { SupabaseClient } from '@supabase/supabase-js';
import {
    $provideAgentsServerSqliteDatabase,
    $resetAgentsServerSqliteDatabaseForTests,
} from './$provideAgentsServerSqliteDatabase';
import { ensureTable } from './localSqliteSupabase/ensureTable';
import { resolveReadIndexColumns, resolveTableBaseName } from './localSqliteSupabase/localSqliteTableSchema';
import { LocalSqliteSupabaseClient } from './localSqliteSupabase/LocalSqliteSupabaseClient';

/**
 * Cached Supabase-shaped local client.
 */
let localSqliteSupabase: SupabaseClient | null = null;

/**
 * Provides a Supabase-shaped client backed by a local SQLite database.
 */
export function $provideLocalSqliteSupabase(): SupabaseClient {
    if (localSqliteSupabase) {
        return localSqliteSupabase;
    }

    localSqliteSupabase = new LocalSqliteSupabaseClient(
        $provideAgentsServerSqliteDatabase(),
    ) as unknown as SupabaseClient;
    return localSqliteSupabase;
}

/**
 * Closes the cached SQLite connection and resets adapter state for isolated tests.
 */
export function $resetLocalSqliteSupabaseForTests(): void {
    $resetAgentsServerSqliteDatabaseForTests();
    localSqliteSupabase = null;
}

/**
 * Ensures read indexes for a table that is queried through direct SQLite SQL.
 *
 * @param tableName - Actual table name, including any server prefix.
 *
 * @private internal SQLite utility of Agents Server
 */
export function ensureLocalSqliteTableReadIndexes(tableName: string): void {
    const database = $provideAgentsServerSqliteDatabase();
    const tableBaseName = resolveTableBaseName(tableName);

    ensureTable(database, tableName, resolveReadIndexColumns(tableBaseName));
}
