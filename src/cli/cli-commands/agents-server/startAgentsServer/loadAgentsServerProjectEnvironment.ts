import * as dotenv from 'dotenv';
import { join } from 'path';

/**
 * Project environment file read from the Agents Server launch directory.
 *
 * @private internal constant of `startAgentsServer`
 */
const AGENTS_SERVER_PROJECT_ENV_FILE_NAME = '.env';

/**
 * Loads launch-directory `.env` values without overriding explicit process environment.
 *
 * @private internal utility of `startAgentsServer`
 */
export function loadAgentsServerProjectEnvironment(launchWorkingDirectory: string): void {
    dotenv.config({ path: join(launchWorkingDirectory, AGENTS_SERVER_PROJECT_ENV_FILE_NAME) });
}
