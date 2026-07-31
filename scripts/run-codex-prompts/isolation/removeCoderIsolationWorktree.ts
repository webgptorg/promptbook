import colors from 'colors';
import { rm, stat } from 'fs/promises';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { hasLocalBranch } from '../git/gitBranchContext';
import { runGitCommand } from '../git/runGitCommand';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

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
 * Removes the worktree directory through git and falls back to a plain filesystem removal.
 */
async function removeWorktreeDirectory(worktree: CoderIsolationWorktree): Promise<boolean> {
    if (!(await isExistingDirectory(worktree.worktreePath))) {
        await pruneStaleWorktreeRegistrations(worktree);
        return false;
    }

    try {
        await runGitCommand({
            command: `git worktree remove --force "${worktree.worktreePath}"`,
            cwd: worktree.projectPath,
            isVerbose: false,
        });
    } catch {
        // Note: The directory can be left behind by an interrupted run without being a registered worktree anymore
        await rm(worktree.worktreePath, { recursive: true, force: true });
    }

    await pruneStaleWorktreeRegistrations(worktree);
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
        // Note: `-D` is required because the isolated work is squash-merged, so git does not see the branch as merged
        await runGitCommand({
            command: `git branch -D "${worktree.branchName}"`,
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
 * Drops worktree registrations whose directory no longer exists so the same path can be reused.
 */
async function pruneStaleWorktreeRegistrations(worktree: CoderIsolationWorktree): Promise<void> {
    await runGitCommand({
        command: 'git worktree prune',
        cwd: worktree.projectPath,
        isVerbose: false,
    }).catch(() => undefined);
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
