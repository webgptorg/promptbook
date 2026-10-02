import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { resolveAgentsServerSqliteDatabasePath } from './resolveAgentsServerSqliteDatabasePath';

/**
 * Database key used for requests that do not belong to any registered server,
 * for example localhost development traffic before any server is registered.
 *
 * @private internal SQLite utility of Agents Server
 */
export const DEFAULT_SERVER_SQLITE_DATABASE_KEY = 'default';

/**
 * Directory name (next to the VPS registry database) holding one SQLite file per registered server.
 *
 * @private internal SQLite utility of Agents Server
 */
const SERVER_SQLITE_DATABASES_DIRECTORY_NAME = 'servers';

/**
 * Pattern of characters allowed inside one per-server database key.
 *
 * @private internal SQLite utility of Agents Server
 */
const SERVER_SQLITE_DATABASE_KEY_PATTERN = /^[A-Za-z0-9_]+$/u;

/**
 * Resolves the isolated SQLite database file path for one server namespace.
 *
 * Each registered server has its own SQLite database file so servers on one VPS
 * cannot leak agents, projects, metadata or any other data into each other.
 *
 * @param tablePrefix - Stable server namespace key such as `server_ClientA_`, or an empty string for the default server.
 * @returns Absolute path of the per-server SQLite database file.
 *
 * @private internal SQLite utility of Agents Server
 */
export function resolveServerSqliteDatabasePath(tablePrefix: string): string {
    const registryDatabasePath = resolveAgentsServerSqliteDatabasePath();
    const databaseKey = resolveServerSqliteDatabaseKey(tablePrefix);

    return join(dirname(registryDatabasePath), SERVER_SQLITE_DATABASES_DIRECTORY_NAME, `${databaseKey}.sqlite`);
}

/**
 * Converts one server table prefix into a safe database file key.
 *
 * @param tablePrefix - Stable server namespace key, or an empty string for the default server.
 * @returns Validated file-name-safe database key.
 *
 * @private internal SQLite utility of Agents Server
 */
export function resolveServerSqliteDatabaseKey(tablePrefix: string): string {
    const normalizedTablePrefix = tablePrefix.trim().replace(/_+$/u, '');

    if (normalizedTablePrefix === '') {
        return DEFAULT_SERVER_SQLITE_DATABASE_KEY;
    }

    if (!SERVER_SQLITE_DATABASE_KEY_PATTERN.test(normalizedTablePrefix)) {
        throw new DatabaseError(
            spaceTrim(`
                Cannot resolve a per-server SQLite database file for table prefix \`${tablePrefix}\`.

                The prefix may contain only letters, numbers, and underscores.
            `),
        );
    }

    return normalizedTablePrefix;
}
