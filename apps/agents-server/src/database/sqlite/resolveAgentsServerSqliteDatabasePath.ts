import { isAbsolute, join, resolve } from 'path';
import { AGENTS_SERVER_SQLITE_PATH_ENV_NAME } from '../agentsServerDatabaseMode';

/**
 * Resolves the SQLite database path used by the standalone backend.
 */
export function resolveAgentsServerSqliteDatabasePath(
    options: { readonly projectPath?: string; readonly environment?: NodeJS.ProcessEnv } = {},
): string {
    const projectPath = options.projectPath ?? process.cwd();
    const configuredPath = (options.environment ?? process.env)[AGENTS_SERVER_SQLITE_PATH_ENV_NAME]?.trim();
    const fallbackPath = join(projectPath, '.promptbook', 'agents-server.sqlite');
    const databasePath = configuredPath || fallbackPath;

    return isAbsolute(databasePath) ? databasePath : resolve(projectPath, databasePath);
}
