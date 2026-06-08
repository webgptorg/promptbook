import * as dotenv from 'dotenv';

/**
 * Environment variable pointing to the installed Agents Server `.env` file.
 *
 * @private utility of standalone database scripts
 */
export const AGENTS_SERVER_ENV_FILE_ENV_NAME = 'PTBK_AGENTS_SERVER_ENV_FILE';

/**
 * Loads Agents Server environment variables for standalone database scripts.
 *
 * The installer passes an explicit `.env` file from the installation directory. That file must override ambient
 * `PTBK_*` values because these scripts often run from the repository checkout while the server runs from the
 * installation directory, so a stale relative SQLite path would point at a different database.
 *
 * @private utility of standalone database scripts
 */
export function loadAgentsServerEnvFile(): void {
    const explicitEnvFilePath = process.env[AGENTS_SERVER_ENV_FILE_ENV_NAME]?.trim();
    if (explicitEnvFilePath) {
        const explicitLoadResult = dotenv.config({ path: explicitEnvFilePath, override: true });
        if (!explicitLoadResult.error) {
            return;
        }
    }

    dotenv.config();
}
