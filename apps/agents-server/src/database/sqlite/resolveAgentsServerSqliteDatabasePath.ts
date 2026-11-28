import { isAbsolute, join, resolve } from 'path';
import { AGENTS_SERVER_SQLITE_PATH_ENV_NAME } from '../agentsServerDatabaseMode';

/**
 * Resolves the SQLite database path used by the standalone backend.
 */
export function resolveAgentsServerSqliteDatabasePath(): string {
    const configuredPath = process.env[AGENTS_SERVER_SQLITE_PATH_ENV_NAME]?.trim();
    const fallbackPath = join(process.cwd(), '.promptbook', 'agents-server.sqlite');
    const databasePath = configuredPath || fallbackPath;

    return isAbsolute(databasePath) ? databasePath : resolve(process.cwd(), databasePath);
}
