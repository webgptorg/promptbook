import {
    $provideServerSqliteDatabase,
    $provideVpsRegistrySqliteDatabase,
    type AgentsServerSqliteDatabase,
} from './$provideAgentsServerSqliteDatabase';
import { listStandaloneServerTablePrefixes } from './standaloneServerRegistryStore';

/**
 * Physical location of one logical (possibly prefixed) table name.
 *
 * @private internal SQLite utility of Agents Server
 */
export type LocalSqliteTableLocation = {
    /**
     * SQLite database holding the table.
     */
    readonly database: AgentsServerSqliteDatabase;

    /**
     * Table name inside the resolved database (without any server prefix).
     */
    readonly localTableName: string;
};

/**
 * Routes one logical table name to its isolated SQLite database.
 *
 * This is the single choke point implementing standalone server isolation:
 * - VPS-level tables (names starting with `_`, such as `_Server`) live in the VPS registry database.
 * - Tables prefixed with a registered server prefix (such as `server_ClientA_Agent`) live in that
 *   server's own database file under the unprefixed base name (such as `Agent`).
 * - Everything else (for example localhost development without registered servers) lives in the
 *   shared `default` server database under its unchanged name.
 *
 * @param tableName - Logical table name as produced by `$getTableName`.
 * @returns Database connection and the table name valid inside it.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function resolveLocalSqliteTableLocation(tableName: string): LocalSqliteTableLocation {
    if (tableName.startsWith('_')) {
        return {
            database: $provideVpsRegistrySqliteDatabase(),
            localTableName: tableName,
        };
    }

    const serverTablePrefix = resolveLongestMatchingServerTablePrefix(tableName);
    if (serverTablePrefix !== null) {
        return {
            database: $provideServerSqliteDatabase(serverTablePrefix),
            localTableName: tableName.slice(serverTablePrefix.length),
        };
    }

    return {
        database: $provideServerSqliteDatabase(''),
        localTableName: tableName,
    };
}

/**
 * Resolves the isolated SQLite database used by one server table prefix.
 *
 * Uses the same longest-prefix matching as `resolveLocalSqliteTableLocation`,
 * so raw-SQL callers and the Supabase-shaped adapter always agree on which
 * database file one server namespace lives in.
 *
 * @param tablePrefix - Server table prefix as resolved by `$provideServer`.
 * @returns Isolated per-server database, or the default server database for unregistered prefixes.
 *
 * @private exported from Agents Server SQLite utilities
 */
export function resolveServerSqliteDatabaseForTablePrefix(tablePrefix: string): AgentsServerSqliteDatabase {
    const serverTablePrefix = resolveLongestMatchingServerTablePrefix(tablePrefix);
    return $provideServerSqliteDatabase(serverTablePrefix ?? '');
}

/**
 * Finds the longest registered server prefix that starts the given table name.
 *
 * The longest match wins so a server prefix which is itself a prefix of another
 * server prefix can never capture the other server's tables.
 *
 * @param tableName - Logical table name.
 * @returns Matching server prefix or `null`.
 *
 * @private function of `resolveLocalSqliteTableLocation`
 */
function resolveLongestMatchingServerTablePrefix(tableName: string): string | null {
    let longestMatchingPrefix: string | null = null;

    for (const tablePrefix of listStandaloneServerTablePrefixes()) {
        if (!tableName.startsWith(tablePrefix)) {
            continue;
        }

        if (longestMatchingPrefix === null || tablePrefix.length > longestMatchingPrefix.length) {
            longestMatchingPrefix = tablePrefix;
        }
    }

    return longestMatchingPrefix;
}
