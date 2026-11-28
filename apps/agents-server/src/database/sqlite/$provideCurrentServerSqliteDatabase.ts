import { $provideServer } from '../../tools/$provideServer';
import type { AgentsServerSqliteDatabase } from './$provideAgentsServerSqliteDatabase';
import { resolveServerSqliteDatabaseForTablePrefix } from './resolveLocalSqliteTableLocation';

/**
 * Opens the isolated SQLite database of the server handling the current request.
 *
 * Used by raw-SQL features (for example the embedded database admin) so every
 * server administrator only ever sees the data of their own server.
 *
 * @returns Isolated SQLite database of the current server.
 *
 * @private exported from Agents Server SQLite utilities
 */
export async function $provideCurrentServerSqliteDatabase(): Promise<AgentsServerSqliteDatabase> {
    const { tablePrefix } = await $provideServer();
    return resolveServerSqliteDatabaseForTablePrefix(tablePrefix);
}
