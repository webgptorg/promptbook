import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { runGitCommand } from '../git/runGitCommand';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/**
 * Outcome of merging one isolated task back into the branch the coder runs on.
 */
export type CoderIsolationMergeResult =
    | {
          readonly isMerged: true;
      }
    | {
          readonly isMerged: false;

          /**
           * Raw git output explaining why the merge could not be completed.
           */
          readonly failureDetails: string;
      };

/**
 * Merges the isolated task back into the branch the coder runs on.
 *
 * The merge is squashed so that the isolated task produces exactly one commit on the original branch,
 * exactly like a task processed without `--isolate`. The changes are only staged here; the caller
 * creates the commit so that the prompt status update becomes part of the very same commit.
 *
 * A failed merge never leaves the original working tree in a conflicted state and is reported back
 * instead of thrown, because a merge failure must not stop the coder from processing the next task.
 */
export async function mergeCoderIsolationWorktree(
    worktree: CoderIsolationWorktree,
): Promise<CoderIsolationMergeResult> {
    try {
        await runGitCommand({
            command: `git merge --squash "${worktree.branchName}"`,
            cwd: worktree.projectPath,
        });

        return { isMerged: true };
    } catch (error) {
        await abortSquashMerge(worktree);

        return { isMerged: false, failureDetails: formatUnknownErrorMessage(error) };
    }
}

/**
 * Restores the original working tree after a failed squash merge.
 *
 * `git merge --abort` cannot be used because a squash merge does not record `MERGE_HEAD`.
 * `git reset --merge` resets the conflicted paths back to `HEAD` while keeping unstaged changes
 * of untouched files (most importantly the prompt file which still has to be marked as failed).
 */
async function abortSquashMerge(worktree: CoderIsolationWorktree): Promise<void> {
    await runGitCommand({
        command: 'git reset --merge',
        cwd: worktree.projectPath,
        isVerbose: false,
    }).catch(() => undefined);
}
