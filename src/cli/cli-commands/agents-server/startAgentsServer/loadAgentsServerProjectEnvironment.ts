import { parse } from 'dotenv';
import { readFileSync } from 'fs';
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
export function loadAgentsServerProjectEnvironment(launchWorkingDirectory: string): NodeJS.ProcessEnv {
    let variables: NodeJS.ProcessEnv = {};
    try {
        variables = parse(readFileSync(join(launchWorkingDirectory, AGENTS_SERVER_PROJECT_ENV_FILE_NAME)));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return { ...variables, ...process.env };
}
