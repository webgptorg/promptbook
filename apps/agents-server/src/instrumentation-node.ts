import { ensureAutomaticDatabaseMigrations } from './database/ensureAutomaticDatabaseMigrations';

/**
 * Runs Node.js-only startup hooks for the Agents Server runtime.
 *
 * @returns Promise that resolves after all startup hooks finish.
 * @private internal startup hook for Agents Server runtime
 */
export async function registerNodeRuntimeInstrumentation(): Promise<void> {
    await ensureAutomaticDatabaseMigrations();
}
