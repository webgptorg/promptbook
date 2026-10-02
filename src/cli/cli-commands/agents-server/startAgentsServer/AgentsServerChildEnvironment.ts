import { randomBytes } from 'crypto';
import { join } from 'path';
import {
    PTBK_AGENTS_SERVER_URL_ENV,
    PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV,
} from '../../../../../apps/agents-server/src/utils/agentProjects/agentProjectRuntimeConstants';
import type { number_port } from '../../../../types/number_positive';

/**
 * Public local agent-root environment name consumed by the Agents Server app.
 *
 * @private internal constant of `startAgentsServer`
 */
const PTBK_AGENTS_SERVER_AGENT_ROOT_ENV = 'PTBK_AGENTS_SERVER_AGENT_ROOT';

/**
 * Public database mode environment name consumed by the Agents Server app.
 *
 * @private internal constant of `startAgentsServer`
 */
const PTBK_AGENTS_SERVER_DATABASE_ENV = 'PTBK_AGENTS_SERVER_DATABASE';

/**
 * Local SQLite file environment name consumed by the Agents Server app.
 *
 * @private internal constant of `startAgentsServer`
 */
const PTBK_AGENTS_SERVER_SQLITE_PATH_ENV = 'PTBK_AGENTS_SERVER_SQLITE_PATH';

/**
 * Entropy size for the local-only token shared by the CLI pump and the Next app.
 *
 * @private internal constant of `startAgentsServer`
 */
const LOCAL_USER_CHAT_WORKER_TOKEN_BYTE_LENGTH = 32;

/**
 * Subprocess environment carrying the explicit local worker credential.
 *
 * @private internal type of `startAgentsServer`
 */
export type AgentsServerChildEnvironment = NodeJS.ProcessEnv & {
    readonly PTBK_AGENTS_SERVER_URL: string;
    readonly PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN: string;
};

/**
 * Creates the subprocess environment for Next and its internal local runner bridge.
 *
 * @private internal utility of `startAgentsServer`
 */
export function createAgentsServerChildEnvironment(
    port: number_port,
    agentRootPath: string,
): AgentsServerChildEnvironment {
    const launchWorkingDirectory = process.cwd();
    const localAgentsServerUrl = `http://localhost:${port}`;
    const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || localAgentsServerUrl;

    return {
        ...process.env,
        PORT: String(port),
        NEXT_PUBLIC_SITE_URL: publicSiteUrl,
        [PTBK_AGENTS_SERVER_URL_ENV]: localAgentsServerUrl,
        [PTBK_AGENTS_SERVER_AGENT_ROOT_ENV]: agentRootPath,
        [PTBK_AGENTS_SERVER_SQLITE_PATH_ENV]:
            process.env[PTBK_AGENTS_SERVER_SQLITE_PATH_ENV] ||
            join(launchWorkingDirectory, '.promptbook', 'agents-server.sqlite'),
        [PTBK_AGENTS_SERVER_DATABASE_ENV]: process.env[PTBK_AGENTS_SERVER_DATABASE_ENV] || 'supabase',
        // Next loads app-local `.env` values after the CLI has prepared this bridge environment.
        [PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV]:
            process.env[PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN_ENV] ||
            randomBytes(LOCAL_USER_CHAT_WORKER_TOKEN_BYTE_LENGTH).toString('hex'),
    };
}
