import { appendFile, copyFile, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { git } from '../project/git.js';

/**
 * A task worktree left by an older engine (task worktrees were removed: tasks share the project's one working tree
 * with per-file ownership). Only recovery of such leftovers remains.
 *
 * @private legacy task worktrees
 */
export type LegacyWorktree = {
    /** Worktree root. */
    readonly root: string;
    /** Project directory inside the worktree. */
    readonly projectRoot: string;
    /** Temporary branch. */
    readonly branch: string;
};

/**
 * Whether a commit is already part of the current branch.
 *
 * @private legacy task worktrees
 */
export async function isIntegrated(repositoryRoot: string, commit: string): Promise<boolean> {
    return (await git(repositoryRoot, ['merge-base', '--is-ancestor', commit, 'HEAD'])).exitCode === 0;
}

/**
 * Removes a merged legacy worktree and its temporary branch after copying its local (untracked or ignored) evidence
 * into the main project's `traces/`: append-only logs are extended, other files are copied when absent.
 *
 * @private legacy task worktrees
 */
export async function finishWorktree(repositoryRoot: string, worktree: LegacyWorktree, mainProjectRoot: string): Promise<void> {
    if (await pathExists(worktree.root)) {
        const traces = toPosix(relative(worktree.root, join(worktree.projectRoot, 'traces'))) || 'traces';
        const listed = await git(worktree.root, ['ls-files', '-z', '--others', '--', traces]);
        for (const path of listed.stdout.split('\0').filter(Boolean)) {
            const source = join(worktree.root, path);
            const target = join(mainProjectRoot, relative(worktree.projectRoot, source));
            await ensureDirectory(dirname(target));
            if (!(await pathExists(target))) await copyFile(source, target);
            else if (/\.(?:jsonl|log)$/i.test(path)) await appendFile(target, await readFile(source));
        }
        await git(repositoryRoot, ['worktree', 'remove', '--force', worktree.root]);
    }
    await git(repositoryRoot, ['worktree', 'prune']);
    // `-d` only deletes a branch that is merged: unintegrated work is never deleted.
    await git(repositoryRoot, ['branch', '-d', worktree.branch]);
}

/**
 * Converts a relative path to forward slashes (Git pathspecs).
 */
function toPosix(path: string): string {
    return path.split('\\').join('/');
}
