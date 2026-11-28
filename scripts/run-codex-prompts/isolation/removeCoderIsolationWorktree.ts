import colors from 'colors';
import { stat } from 'fs/promises';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { hasLocalBranch } from '../git/gitBranchContext';
import { runGitCommand } from '../git/runGitCommand';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';
import { CoderGitOperationError } from '../git/CoderGitOperationError';

/**
 * Removes one isolation worktree together with its temporary branch.
 *
 * Returns `true` when the worktree directory or the temporary branch still existed and was removed,
 * which lets callers report that leftovers of an earlier run were cleaned up.
 */
export async function removeCoderIsolationWorktree(worktree: CoderIsolationWorktree): Promise<boolean> {
    const isWorktreeDirectoryRemoved = await removeWorktreeDirectory(worktree);
    const isBranchRemoved = await removeWorktreeBranch(worktree);

    return isWorktreeDirectoryRemoved || isBranchRemoved;
}

/**
 * Removes only a clean integrated worktree. Unexpected edits are retained and reported.
 */
async function removeWorktreeDirectory(worktree: CoderIsolationWorktree): Promise<boolean> {
    if (!(await isExistingDirectory(worktree.worktreePath))) {
        return false;
    }

    try {
        await runGitCommand({
            command: `git worktree remove "${worktree.worktreePath}"`,
            cwd: worktree.projectPath,
            isVerbose: false,
        });
    } catch (error) {
        throw new CoderGitOperationError(
            'record',
            `The integrated worktree \`${
                worktree.worktreePath
            }\` could not be safely removed and was kept: ${formatUnknownErrorMessage(error)}`,
        );
    }

    return true;
}

/**
 * Deletes the temporary isolation branch when it still exists.
 */
async function removeWorktreeBranch(worktree: CoderIsolationWorktree): Promise<boolean> {
    if (!(await hasLocalBranch(worktree.branchName, worktree.projectPath))) {
        return false;
    }

    try {
        // Fast-forward integration makes this branch merged; refuse to delete any divergent recovery history.
        await runGitCommand({
            command: `git branch -d "${worktree.branchName}"`,
            cwd: worktree.projectPath,
            isVerbose: false,
        });

        return true;
    } catch (error) {
        console.warn(
            colors.yellow(
                `Could not delete the isolation branch \`${worktree.branchName}\`: ${formatUnknownErrorMessage(error)}`,
            ),
        );

        return false;
    }
}

/**
 * Checks whether one path exists and is a directory.
 */
async function isExistingDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}
