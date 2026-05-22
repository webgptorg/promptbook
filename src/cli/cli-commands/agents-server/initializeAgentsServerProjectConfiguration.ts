import type { ProjectInitializationStatus } from '../common/projectInitialization';
import { ensureAgentsServerEnvFile } from './ensureAgentsServerEnvFile';
import { ensureAgentsServerGitignoreFile } from './ensureAgentsServerGitignoreFile';

/**
 * Result summary returned after Agents Server configuration initialization.
 *
 * @private internal utility of `ptbk agents-server init`
 */
export type AgentsServerInitializationSummary = {
    readonly envFileStatus: ProjectInitializationStatus;
    readonly gitignoreFileStatus: ProjectInitializationStatus;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
};

/**
 * Creates or updates local Agents Server configuration files in the current project.
 *
 * @private internal utility of `ptbk agents-server init`
 */
export async function initializeAgentsServerProjectConfiguration(
    projectPath: string,
): Promise<AgentsServerInitializationSummary> {
    const { envFileStatus, initializedEnvVariableNames } = await ensureAgentsServerEnvFile(projectPath);
    const gitignoreFileStatus = await ensureAgentsServerGitignoreFile(projectPath);

    return {
        envFileStatus,
        gitignoreFileStatus,
        initializedEnvVariableNames,
    };
}

// Note: [🟡] Code for Agents Server init project bootstrapping [initializeAgentsServerProjectConfiguration](src/cli/cli-commands/agents-server/initializeAgentsServerProjectConfiguration.ts) should never be published outside of `@promptbook/cli`
