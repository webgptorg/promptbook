import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { runProcess } from '../common/process.js';
import { createRedactor } from '../common/redact.js';
import { redactUrl } from '../engine/sync.js';
import { git } from './git.js';
import type { Project } from './workspace.js';

/**
 * The explicit synchronization destination chosen during initialization.
 *
 * @private initialization synchronization setup
 */
export type PublicationChoice =
    /** Reuse the repository's already configured origin and tracking destination. */
    | { readonly kind: 'existing' }
    /** Create and publish a GitHub repository (private unless public was chosen explicitly). */
    | { readonly kind: 'github'; readonly owner?: string; readonly name: string; readonly visibility: 'private' | 'public' }
    /** A user-supplied Git remote URL (ordinary Git transport and authentication). */
    | { readonly kind: 'origin'; readonly url: string };

/**
 * Observed outcome of the remote setup (separate from local initialization).
 *
 * @private initialization synchronization setup
 */
export type PublicationOutcome = { readonly ok: boolean; readonly message: string; readonly destination?: string };

/**
 * Last lines of a Git error kept in a (redacted) diagnostic.
 */
const DIAGNOSTIC_LINES = 2;

/**
 * Record of a repository this setup created (a retry reuses it instead of creating a duplicate).
 */
type PublicationRecord = { readonly version: 1; readonly provider: 'github'; readonly repository: string; readonly visibility: string; readonly createdAt: string };

/**
 * The repository's configured origin URL, if any.
 *
 * @private initialization synchronization setup
 */
export async function existingOrigin(root: string): Promise<string | undefined> {
    const result = await git(root, ['remote', 'get-url', 'origin']);
    return result.exitCode === 0 && result.stdout.trim() ? result.stdout.trim() : undefined;
}

/**
 * The GitHub login available through the user's own GitHub CLI authentication (never a new credential store).
 *
 * @private initialization synchronization setup
 */
export async function githubLogin(env: NodeJS.ProcessEnv): Promise<{ readonly login?: string; readonly problem?: string }> {
    const result = await runProcess('gh', ['api', 'user', '--jq', '.login'], { cwd: process.cwd(), env, timeoutMs: 20_000 });
    if (result.spawnError) return { problem: 'The GitHub CLI (gh) is not installed; install it from https://cli.github.com and run `gh auth login`.' };
    if (result.exitCode !== 0) return { problem: `GitHub authentication is not available (${result.stderr.trim().split('\n').pop() || 'gh api user failed'}); run \`gh auth login\`.` };
    return { login: result.stdout.trim() || undefined };
}

/**
 * Pushes the branch to origin and records its tracking destination.
 */
async function pushBranch(root: string, branch: string, env: NodeJS.ProcessEnv): Promise<PublicationOutcome> {
    const push = await git(root, ['push', '--quiet', '--set-upstream', 'origin', `refs/heads/${branch}:refs/heads/${branch}`], { env, timeoutMs: 120_000 });
    const redact = createRedactor();
    if (push.exitCode !== 0) return { ok: false, message: `Publishing ${branch} to origin failed: ${redact((push.spawnError ?? push.stderr.trim()) || `exit ${String(push.exitCode)}`).split('\n').slice(-DIAGNOSTIC_LINES).join(' ')}` };
    return { ok: true, message: `Published ${branch} to origin.` };
}

/**
 * Performs the explicitly authorized remote setup after the local setup commit: create the private-by-default GitHub
 * repository (or use the supplied/existing origin), configure origin and the tracking destination of the initialized
 * branch, and publish. Failures are reported honestly and never undo or block the ready local project; a retry reuses
 * a repository this setup already created.
 *
 * @private initialization synchronization setup
 */
export async function publishProject(project: Project, repositoryRoot: string, choice: PublicationChoice, env: NodeJS.ProcessEnv): Promise<PublicationOutcome> {
    try {
        const branch = (await git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim();
        if (!branch) return { ok: false, message: 'HEAD is detached; synchronization needs a branch.' };
        if ((await git(repositoryRoot, ['rev-parse', '--verify', '--quiet', 'HEAD'])).exitCode !== 0) return { ok: false, message: 'Nothing is committed yet, so there is nothing to publish.' };
        const origin = await existingOrigin(repositoryRoot);
        if (choice.kind === 'existing') {
            if (!origin) return { ok: false, message: 'No origin remote is configured.' };
            const upstream = (await git(repositoryRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).stdout.trim();
            if (upstream) return { ok: true, message: `Reusing origin ${redactUrl(origin)} (${upstream}).`, destination: redactUrl(origin) };
            const pushed = await pushBranch(repositoryRoot, branch, env);
            return { ...pushed, destination: redactUrl(origin) };
        }
        if (choice.kind === 'origin') {
            if (origin && origin !== choice.url) return { ok: false, message: `origin already points to ${redactUrl(origin)}; it was not replaced. Change it explicitly with \`git remote set-url origin <url>\`.` };
            if (!origin) {
                const added = await git(repositoryRoot, ['remote', 'add', 'origin', choice.url]);
                if (added.exitCode !== 0) return { ok: false, message: `Could not add origin: ${added.stderr.trim()}` };
            }
            const pushed = await pushBranch(repositoryRoot, branch, env);
            return { ...pushed, destination: redactUrl(choice.url) };
        }
        const account = await githubLogin(env);
        const owner = choice.owner ?? account.login;
        if (!owner) return { ok: false, message: account.problem ?? 'The GitHub owner is unknown; pass --github-repository <owner>/<name>.' };
        const repository = `${owner}/${choice.name}`;
        const recordPath = join(project.runtime.state, 'publication.json');
        const record = await readJsonIfExists<PublicationRecord>(recordPath).catch(() => undefined);
        const view = await runProcess('gh', ['repo', 'view', repository, '--json', 'url'], { cwd: repositoryRoot, env, timeoutMs: 30_000 });
        if (view.spawnError) return { ok: false, message: account.problem ?? 'The GitHub CLI (gh) is not installed.' };
        const exists = view.exitCode === 0;
        if (exists && record?.repository !== repository) {
            return { ok: false, message: `github.com/${repository} already exists and was not created by this setup; it is not reused implicitly. Choose another name, or supply it explicitly as another origin.` };
        }
        if (!exists) {
            if (account.problem) return { ok: false, message: account.problem };
            const created = await runProcess('gh', ['repo', 'create', repository, `--${choice.visibility}`], { cwd: repositoryRoot, env, timeoutMs: 60_000 });
            if (created.exitCode !== 0) return { ok: false, message: `Creating github.com/${repository} failed: ${(created.stderr.trim() || created.stdout.trim()).split('\n').pop() ?? ''}` };
            await writeJsonAtomic(recordPath, { version: 1, provider: 'github', repository, visibility: choice.visibility, createdAt: new Date().toISOString() } satisfies PublicationRecord);
        }
        const url = `https://github.com/${repository}.git`;
        if (origin && origin !== url && origin !== `git@github.com:${repository}.git`) return { ok: false, message: `origin already points to ${redactUrl(origin)}; it was not replaced.` };
        if (!origin) {
            const added = await git(repositoryRoot, ['remote', 'add', 'origin', url]);
            if (added.exitCode !== 0) return { ok: false, message: `Could not add origin: ${added.stderr.trim()}` };
        }
        const pushed = await pushBranch(repositoryRoot, branch, env);
        return { ...pushed, message: pushed.ok ? `${exists ? 'Reused' : 'Created'} the ${record?.visibility ?? choice.visibility} repository github.com/${repository} and published ${branch}.` : pushed.message, destination: `github.com/${repository}` };
    } catch (error) {
        return { ok: false, message: errorMessage(error) };
    }
}
