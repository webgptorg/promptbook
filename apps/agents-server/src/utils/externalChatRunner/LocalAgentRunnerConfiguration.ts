/**
 * Environment variable carrying the local runner root used by self-hosted Agents Server sessions.
 */
export const PTBK_AGENTS_SERVER_AGENT_REPOSITORIES_DIRECTORY_ENV =
    'PTBK_AGENTS_SERVER_AGENT_REPOSITORIES_DIRECTORY';

/**
 * Local filesystem configuration for the self-hosted chat runner bridge.
 */
export type LocalAgentRunnerConfiguration = {
    agentRepositoriesDirectoryPath: string;
};

/**
 * Loads local runner configuration from the foreground `ptbk agents-server start` process.
 */
export function loadLocalAgentRunnerConfiguration(): LocalAgentRunnerConfiguration | null {
    const agentRepositoriesDirectoryPath =
        process.env[PTBK_AGENTS_SERVER_AGENT_REPOSITORIES_DIRECTORY_ENV]?.trim() || '';

    if (!agentRepositoriesDirectoryPath) {
        return null;
    }

    return { agentRepositoriesDirectoryPath };
}
