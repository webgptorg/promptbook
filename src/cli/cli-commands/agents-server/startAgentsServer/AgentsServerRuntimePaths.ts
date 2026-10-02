import { join } from 'path';
import { resolvePromptbookTemporaryPath } from '../../../../utils/filesystem/promptbookTemporaryPath';
import { resolveAgentsServerAppPath } from '../buildAgentsServer/resolveAgentsServerAppPath';

/**
 * Name of the local Agents Server log folder relative to the launch working directory.
 *
 * @private internal constant of `startAgentsServer`
 */
const AGENTS_SERVER_LOG_DIRECTORY_NAME = '.logs';

/**
 * Captures foreground file locations for one Agents Server launch.
 *
 * @private internal type of `startAgentsServer`
 */
export type AgentsServerRuntimePaths = {
    readonly launchWorkingDirectory: string;
    readonly appPath: string;
    readonly agentRootPath: string;
    readonly logDirectoryPath: string;
    readonly nextLogPath: string;
    readonly runnerLogPath: string;
};

/**
 * Resolves local app, agent-root, and log paths for one foreground launch.
 *
 * @private internal utility of `startAgentsServer`
 */
export async function resolveAgentsServerRuntimePaths(
    launchWorkingDirectory = process.cwd(),
    options: { readonly agentRootPath?: string; readonly logDirectoryPath?: string } = {},
): Promise<AgentsServerRuntimePaths> {
    const appPath = await resolveAgentsServerAppPath();
    const logDirectoryPath = options.logDirectoryPath ?? join(launchWorkingDirectory, AGENTS_SERVER_LOG_DIRECTORY_NAME);

    return {
        launchWorkingDirectory,
        appPath,
        agentRootPath:
            options.agentRootPath ?? resolvePromptbookTemporaryPath(launchWorkingDirectory, 'agents-server', 'agents'),
        logDirectoryPath,
        nextLogPath: join(logDirectoryPath, 'agents-server-next.log'),
        runnerLogPath: join(logDirectoryPath, 'agents-server-runner.log'),
    };
}
