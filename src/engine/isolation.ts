import { appendFile, copyFile, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { git, gitOrThrow, prefixedSubject, resolveCommitIdentity } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { runCheck } from '../project/checks.js';
import { isCheckPlaceholder } from '../project/config.js';
import { isolationBranch } from './state.js';

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
 * What the integration merge commit records about the task.
 *
 * @private task isolation
 */
export type IntegrationMessage = {
    /** Declared task name (subject and `Task-Name` trailer). */
    readonly taskName: string;
    /** Run identifier of the integrated execution. */
    readonly runId: string;
};

/**
 * Creates (or reuses) the worktree of a run under `.ptbk/worktrees/`, mapping dependencies into it.
 *
 * @private task isolation
 */
export async function prepareWorktree(project: Project, repositoryRoot: string, runId: string): Promise<IsolatedWorktree> {
    const targetBranch = (await git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim();
    if (!targetBranch) throw new PtbkError('Isolation needs a named branch (HEAD is detached).', { kind: 'setup', next: ['Check out a branch, or run without --isolate.'] });
    const root = join(project.runtime.worktrees, runId);
    const branch = isolationBranch(runId);
    let base: string;
    if (!(await pathExists(root))) {
        base = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'isolation' })).trim();
        await ensureDirectory(project.runtime.worktrees);
        await gitOrThrow(repositoryRoot, ['worktree', 'add', '--quiet', '-b', branch, root, base], { phase: 'isolation worktree' });
    } else {
        // A resumed run keeps the commit it started from (the fork point), even after the project branch moved on.
        base = (await gitOrThrow(repositoryRoot, ['merge-base', branch, 'HEAD'], { phase: 'isolation' })).trim();
    }
    const projectRoot = resolve(root, relative(repositoryRoot, project.root));
    const dependencies = join(project.root, 'node_modules');
    if ((await pathExists(dependencies)) && !(await pathExists(join(projectRoot, 'node_modules')))) {
        await symlink(dependencies, join(projectRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir').catch(() => undefined);
    }
    return { root, projectRoot, branch, targetBranch, base };
}

/**
 * Whether `commit` is already part of the history of `HEAD` in the repository.
 *
 * @private task isolation
 */
export async function isIntegrated(repositoryRoot: string, commit: string): Promise<boolean> {
    return (await git(repositoryRoot, ['merge-base', '--is-ancestor', commit, 'HEAD'])).exitCode === 0;
}

/**
 * Restores the worktree to its own branch after an abandoned integration attempt (the result stays there).
 */
async function restoreWorktree(worktree: IsolatedWorktree): Promise<void> {
    if ((await git(worktree.root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])).exitCode === 0) await git(worktree.root, ['merge', '--abort']);
    await git(worktree.root, ['checkout', '--quiet', worktree.branch]);
}

/**
 * Integrates the verified result commit into the original branch with a visible **non-fast-forward merge** commit,
 * even when a fast-forward would be possible, preserving the original result commit and every intervening commit.
 *
 * The merge is prepared in the worktree (detached at the original branch's current tip), and the merged content is
 * re-checked when intervening commits changed it; only then does the original branch advance to that merge commit.
 * History is never rewritten (no rebase, amend or reset). A conflict or a failing recheck aborts cleanly: the main
 * checkout is untouched and the result stays on its temporary branch for the ordinary Fixer path. The worktree is
 * kept for its evidence; {@link finishWorktree} removes it after the work is recorded.
 *
 * @private task isolation
 */
export async function integrateWorktree(
    repositoryRoot: string,
    worktree: IsolatedWorktree,
    options: { readonly check: string | undefined; readonly env: NodeJS.ProcessEnv; readonly message: IntegrationMessage; readonly temporaryDirectory: string },
): Promise<{ sha: string }> {
    const current = (await git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim();
    if (current !== worktree.targetBranch) {
        throw new PtbkError(`The main checkout switched from ${worktree.targetBranch} to ${current || 'a detached HEAD'}.`, { kind: 'conflict', preserved: `The result stays on branch ${worktree.branch}.`, next: ['Switch back and run `ptbk recover`.'] });
    }
    const result = (await gitOrThrow(repositoryRoot, ['rev-parse', worktree.branch], { phase: 'integration' })).trim();
    // An interrupted earlier integration may already have advanced the branch: never merge twice.
    if (await isIntegrated(repositoryRoot, result)) return { sha: (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'integration' })).trim() };
    const head = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'integration' })).trim();
    const identity = await resolveCommitIdentity(repositoryRoot, options.env);
    await ensureDirectory(options.temporaryDirectory);
    const messageFile = join(options.temporaryDirectory, `merge-message-${shortId()}.txt`);
    const subject = prefixedSubject(`Merge the isolated result of ${options.message.taskName} into ${worktree.targetBranch}`);
    await writeFile(messageFile, `${subject}\n\nTask-Name: ${options.message.taskName.replace(/\s+/g, ' ')}\nPTBK-Run: ${options.message.runId}\n`);
    let merge: string;
    try {
        await restoreWorktree(worktree);
        await gitOrThrow(worktree.root, ['checkout', '--quiet', '--detach', head], { phase: 'integration' });
        const merged = await git(worktree.root, [...identity.configArgs, 'merge', '--no-ff', '--no-commit', '--quiet', result], { env: options.env });
        if (merged.exitCode !== 0) {
            const conflicted = (await git(worktree.root, ['diff', '--name-only', '--diff-filter=U'])).stdout.split('\n').filter(Boolean);
            await restoreWorktree(worktree);
            throw new PtbkError('The task result conflicts with newer commits on the original branch.', {
                kind: 'conflict',
                reason: conflicted.length ? `Both sides changed ${conflicted.join(', ')}.` : merged.stderr.trim() || merged.stdout.trim(),
                preserved: `Both versions are preserved: the original branch is unchanged and the result stays on branch ${worktree.branch} (${worktree.root}).`,
                next: [`Merge it with a visible merge commit (git merge --no-ff ${worktree.branch}), or let Fixer do it; then ptbk completes the task.`],
            });
        }
        // Intervening commits changed the merged content: validate exactly what the branch will receive.
        if (head !== worktree.base && options.check && !isCheckPlaceholder(options.check)) {
            const checked = await runCheck(worktree.projectRoot, options.check, { env: options.env });
            if (!checked.passed) {
                await restoreWorktree(worktree);
                throw new PtbkError('The merged result no longer passes the project check.', {
                    kind: 'conflict',
                    reason: checked.output.slice(-1500),
                    preserved: `The original branch is unchanged; the result stays on branch ${worktree.branch}.`,
                    next: [`Integrate ${worktree.branch} with a visible merge and repair the check, or let Fixer do it.`],
                });
            }
        }
        const committed = await git(worktree.root, [...identity.configArgs, 'commit', '--quiet', '--cleanup=verbatim', '-F', messageFile], { env: options.env });
        if (committed.exitCode !== 0) {
            await restoreWorktree(worktree);
            throw new PtbkError('The integration merge commit failed.', { kind: 'persistence', phase: 'integration', reason: committed.stderr.trim() || committed.stdout.trim(), preserved: `The result stays on branch ${worktree.branch}.`, next: ['Fix the hook/signing problem; ptbk retries the integration.'] });
        }
        merge = (await gitOrThrow(worktree.root, ['rev-parse', 'HEAD'], { phase: 'integration' })).trim();
    } finally {
        await rm(messageFile, { force: true });
    }
    // The merge commit's first parent is the branch tip, so advancing the branch to it keeps every commit and both parents.
    const advanced = await git(repositoryRoot, ['merge', '--ff-only', '--quiet', merge]);
    if (advanced.exitCode !== 0) {
        await restoreWorktree(worktree);
        throw new PtbkError('The verified merge could not be applied to the original branch.', {
            kind: 'conflict',
            reason: advanced.stderr.trim(),
            preserved: `The result stays on branch ${worktree.branch}; local changes were not overwritten.`,
            next: ['Commit or move conflicting local changes; ptbk retries the integration.'],
        });
    }
    return { sha: merge };
}

/**
 * Removes an integrated worktree and its temporary branch after copying its local (untracked or ignored) evidence
 * into the main project's `traces/`: append-only logs are extended, other files are copied when absent.
 *
 * @private task isolation
 */
export async function finishWorktree(repositoryRoot: string, worktree: Pick<IsolatedWorktree, 'root' | 'projectRoot' | 'branch'>, mainProjectRoot: string): Promise<void> {
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
