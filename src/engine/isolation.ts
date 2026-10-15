import { symlink } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { git, gitOrThrow } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { runCheck } from '../project/checks.js';

/**
 * An isolated worktree prepared for one task.
 *
 * @private task isolation
 */
export type IsolatedWorktree = {
    /** Worktree root. */
    readonly root: string;
    /** Project directory inside the worktree. */
    readonly projectRoot: string;
    /** Temporary branch. */
    readonly branch: string;
    /** Branch of the main checkout that receives the result. */
    readonly targetBranch: string;
    /** Commit the worktree started from. */
    readonly base: string;
};

/**
 * Creates (or reuses) the worktree of a run under `.ptbk/worktrees/`, mapping dependencies into it.
 *
 * @private task isolation
 */
export async function prepareWorktree(project: Project, repositoryRoot: string, runId: string): Promise<IsolatedWorktree> {
    const targetBranch = (await git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim();
    if (!targetBranch) throw new PtbkError('Isolation needs a named branch (HEAD is detached).', { kind: 'setup', next: ['Check out a branch, or run without --isolate.'] });
    const base = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'isolation' })).trim();
    const root = join(project.runtime.worktrees, runId);
    const branch = `ptbk/${runId}`;
    if (!(await pathExists(root))) {
        await ensureDirectory(project.runtime.worktrees);
        await gitOrThrow(repositoryRoot, ['worktree', 'add', '--quiet', '-b', branch, root, base], { phase: 'isolation worktree' });
    }
    const projectRoot = resolve(root, relative(repositoryRoot, project.root));
    const dependencies = join(project.root, 'node_modules');
    if ((await pathExists(dependencies)) && !(await pathExists(join(projectRoot, 'node_modules')))) {
        await symlink(dependencies, join(projectRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir').catch(() => undefined);
    }
    return { root, projectRoot, branch, targetBranch, base };
}

/**
 * Integrates the verified result into the original branch by fast-forward only.
 *
 * When the original branch moved, the single result commit is rebased in the worktree and re-checked first;
 * conflicts preserve both versions and leave a recoverable, unintegrated result.
 *
 * @private task isolation
 */
export async function integrateWorktree(repositoryRoot: string, worktree: IsolatedWorktree, check: string | undefined, env: NodeJS.ProcessEnv): Promise<{ sha: string }> {
    const current = (await git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim();
    if (current !== worktree.targetBranch) {
        throw new PtbkError(`The main checkout switched from ${worktree.targetBranch} to ${current || 'a detached HEAD'}.`, { kind: 'conflict', preserved: `The result stays on branch ${worktree.branch}.`, next: ['Switch back and run `ptbk recover`.'] });
    }
    const head = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'integration' })).trim();
    if (head !== worktree.base) {
        const rebase = await git(worktree.root, ['rebase', '--quiet', head]);
        if (rebase.exitCode !== 0) {
            await git(worktree.root, ['rebase', '--abort']);
            throw new PtbkError('The task result conflicts with newer commits on the original branch.', {
                kind: 'conflict',
                reason: rebase.stderr.trim(),
                preserved: `Both versions are preserved; the result stays on branch ${worktree.branch} in ${worktree.root}.`,
                next: ['Resolve the conflict manually, then run `ptbk recover`.'],
            });
        }
        if (check) {
            const result = await runCheck(worktree.projectRoot, check, { env });
            if (!result.passed) {
                throw new PtbkError('The rebased result no longer passes the project check.', { kind: 'conflict', reason: result.output.slice(-1500), preserved: `The result stays on branch ${worktree.branch}.`, next: ['Inspect the branch and run `ptbk recover`.'] });
            }
        }
    }
    const merge = await git(repositoryRoot, ['merge', '--ff-only', '--quiet', worktree.branch]);
    if (merge.exitCode !== 0) {
        throw new PtbkError('The verified result could not be fast-forwarded into the original branch.', {
            kind: 'conflict',
            reason: merge.stderr.trim(),
            preserved: `The result stays on branch ${worktree.branch}; local changes were not overwritten.`,
            next: ['Commit or move conflicting local changes, then run `ptbk recover`.'],
        });
    }
    const sha = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'integration' })).trim();
    await git(repositoryRoot, ['worktree', 'remove', '--force', worktree.root]);
    await git(repositoryRoot, ['branch', '-d', worktree.branch]);
    return { sha };
}
