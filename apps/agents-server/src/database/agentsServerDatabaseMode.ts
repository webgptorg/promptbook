/**
 * Environment variable selecting the Agents Server database backend.
 */
export const AGENTS_SERVER_DATABASE_ENV_NAME = 'PTBK_AGENTS_SERVER_DATABASE';

/**
 * Environment variable pointing to the standalone SQLite database file.
 */
export const AGENTS_SERVER_SQLITE_PATH_ENV_NAME = 'PTBK_AGENTS_SERVER_SQLITE_PATH';

/**
 * Supported Agents Server database backends.
 */
export type AgentsServerDatabaseMode = 'supabase' | 'sqlite' | 'postgres';

/**
 * Resolves the configured Agents Server database backend.
 */
export function resolveAgentsServerDatabaseMode(): AgentsServerDatabaseMode {
    const rawMode = process.env[AGENTS_SERVER_DATABASE_ENV_NAME]?.trim().toLowerCase();

    if (rawMode === 'sqlite' || rawMode === 'local') {
        return 'sqlite';
    }

    if (rawMode === 'postgres' || rawMode === 'postgresql') {
        return 'postgres';
    }

    return 'supabase';
}

/**
 * Returns whether the Agents Server is using the local SQLite backend.
 */
export function isAgentsServerSqliteMode(): boolean {
    return resolveAgentsServerDatabaseMode() === 'sqlite';
}

/**
 * Returns whether the Agents Server is using the direct PostgreSQL backend.
 */
export function isAgentsServerPostgresMode(): boolean {
    return resolveAgentsServerDatabaseMode() === 'postgres';
}

/**
 * Returns whether the Agents Server is using one of the standalone self-hosted database backends.
 */
export function isAgentsServerStandaloneMode(): boolean {
    const databaseMode = resolveAgentsServerDatabaseMode();

    return databaseMode === 'sqlite' || databaseMode === 'postgres';
}
