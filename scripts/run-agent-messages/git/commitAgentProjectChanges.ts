import type { AgentMessageProjectChange } from '../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import { ensureAgentProjectGitRepository } from './ensureAgentProjectGitRepository';
import { readAgentProjectCommitChange } from './readAgentProjectCommitChange';
import { runAgentProjectGitCommand } from './runAgentProjectGitCommand';

/**
 * Commits everything one answered message changed inside one agent project.
 *
 * The project is turned into a git repository first when it is not one yet, so the work of every
 * answer stays recoverable and reviewable as a normal commit history.
 *
 * @param options - Project identity and the commit message describing the answered message.
 * @returns What was committed, or `null` when the project changed nothing or cannot be committed.
 */
export async function commitAgentProjectChanges(options: {
    readonly projectPath: string;
    readonly projectName: string;
    readonly commitMessage: string;
}): Promise<AgentMessageProjectChange | null> {
    const { projectPath, projectName, commitMessage } = options;

    if ((await ensureAgentProjectGitRepository(projectPath)) !== 'own-repository') {
        return null;
    }

    const stageResult = await runAgentProjectGitCommand({ projectPath, args: ['add', '--all', '--', '.'] });
    if (!stageResult.isSuccessful) {
        return null;
    }

    if (!(await hasStagedAgentProjectChanges(projectPath))) {
        return null;
    }

    const commitResult = await runAgentProjectGitCommand({
        projectPath,
        args: ['commit', '--message', commitMessage],
    });
    if (!commitResult.isSuccessful) {
        return null;
    }

    return await readAgentProjectCommitChange({ projectPath, projectName });
}

/**
 * Checks whether the project index holds anything to commit.
 *
 * @param projectPath - Absolute path of the project directory.
 * @returns `true` when committing would create a non-empty commit.
 *
 * @private helper of `commitAgentProjectChanges`
 */
async function hasStagedAgentProjectChanges(projectPath: string): Promise<boolean> {
    // Note: `--quiet` makes git answer through its exit code — success means nothing is staged
    const stagedChangesResult = await runAgentProjectGitCommand({
        projectPath,
        args: ['diff', '--cached', '--quiet'],
    });

    return !stagedChangesResult.isSuccessful;
}
