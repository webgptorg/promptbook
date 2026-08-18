import colors from 'colors';
import { join } from 'path';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/book-3.0/agentFolderPaths';
import type { AgentMessageProjectChange } from '../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import { listAgentProjectDirectoryNames } from '../messages/listAgentProjectDirectoryNames';
import { commitAgentProjectChanges } from './commitAgentProjectChanges';

/**
 * Commits what one answered message changed in every project of one agent.
 *
 * Every project of an agent is its own git repository, so each answer which modified one becomes a
 * commit there. The projects are committed one after another because they share the git executable
 * and because an agent works with a handful of projects at most.
 *
 * Committing is best-effort bookkeeping around an answer the agent already produced: a project
 * whose commit fails is reported to the console and skipped instead of failing the message.
 *
 * @param options - Agent folder and the commit message describing the answered message.
 * @returns What was committed, one entry per project the message really changed.
 */
export async function commitAnsweredMessageProjectChanges(options: {
    /**
     * Absolute path of the local agent folder owning the projects.
     */
    readonly agentFolderPath: string;

    /**
     * Commit message shared by every project commit of this message.
     */
    readonly commitMessage: string;
}): Promise<ReadonlyArray<AgentMessageProjectChange>> {
    const { agentFolderPath, commitMessage } = options;
    const projectNames = await listAgentProjectDirectoryNames(agentFolderPath);
    const projectChanges: Array<AgentMessageProjectChange> = [];

    for (const projectName of projectNames) {
        const projectChange = await commitAgentProjectChangesSafely({
            projectPath: join(agentFolderPath, AGENT_PROJECTS_DIRECTORY_PATH, projectName),
            projectName,
            commitMessage,
        });

        if (projectChange) {
            projectChanges.push(projectChange);
        }
    }

    return projectChanges;
}

/**
 * Commits one project without letting its failure reach the answered message.
 *
 * @param options - Project identity and commit message.
 * @returns What was committed, or `null` when nothing changed or committing failed.
 *
 * @private helper of `commitAnsweredMessageProjectChanges`
 */
async function commitAgentProjectChangesSafely(options: {
    readonly projectPath: string;
    readonly projectName: string;
    readonly commitMessage: string;
}): Promise<AgentMessageProjectChange | null> {
    try {
        return await commitAgentProjectChanges(options);
    } catch (error) {
        console.warn(colors.yellow(`Could not commit changes of project "${options.projectName}"`), error);
        return null;
    }
}
