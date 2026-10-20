import { join, resolve, sep } from 'node:path';
import { canonicalPath } from './workspace.js';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, hashFileIfExists, isDirectory, isPathInside, writeFileAtomic } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { runProcess, type ProcessResult } from '../common/process.js';
import { normalizeAgentName } from '../book/references.js';
import { rm } from 'node:fs/promises';

/**
 * Prefix of every commit created by Promptbook.
 *
 * @private Git persistence
 */
export const COMMIT_PREFIX = 'PTBK: ';

/**
 * Applies the commit prefix exactly once.
 *
 * @private Git persistence
 */
export function prefixedSubject(subject: string): string {
    const trimmed = subject.trim().replace(/\s+/g, ' ');
    return trimmed.startsWith(COMMIT_PREFIX) ? trimmed : `${COMMIT_PREFIX}${trimmed}`;
}

/**
 * Environment forcing literal pathspecs and non-interactive Git.
 */
function gitEnvironment(extra: NodeJS.ProcessEnv = {}, literal = false): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', ...extra };
    if (literal) env.GIT_LITERAL_PATHSPECS = '1';
    else delete env.GIT_LITERAL_PATHSPECS;
    return env;
}

/**
 * Runs Git in a directory.
 *
 * @private Git persistence
 */
export async function git(cwd: string, args: readonly string[], options: { input?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number; literal?: boolean } = {}): Promise<ProcessResult> {
    return await runProcess('git', args, { cwd, env: gitEnvironment(options.env, options.literal), input: options.input, timeoutMs: options.timeoutMs ?? 120_000 });
}

/**
 * Runs Git and throws a persistence error on failure.
 *
 * @private Git persistence
 */
export async function gitOrThrow(cwd: string, args: readonly string[], options: { input?: string; env?: NodeJS.ProcessEnv; phase?: string; literal?: boolean } = {}): Promise<string> {
    const result = await git(cwd, args, options);
    if (result.exitCode !== 0) {
        throw new PtbkError(`git ${args[0]} failed.`, {
            kind: 'persistence',
            phase: options.phase ?? `git ${args[0]}`,
            project: cwd,
            reason: (result.spawnError ?? result.stderr.trim()) || result.stdout.trim() || `exit code ${String(result.exitCode)}`,
        });
    }
    return result.stdout;
}

/**
 * Repository facts relevant to a project directory.
 *
 * @private Git persistence
 */
export type GitInfo =
    | { readonly state: 'missing-git'; readonly reason: string }
    | { readonly state: 'not-repository' }
    | { readonly state: 'bare'; readonly gitDir: string }
    | { readonly state: 'damaged'; readonly reason: string }
    | {
          readonly state: 'repository';
          /** Working tree root. */
          readonly root: string;
          /** Git directory (may be outside the tree for worktrees). */
          readonly gitDir: string;
          /** Current branch, undefined for detached HEAD. */
          readonly branch?: string;
          /** HEAD commit, undefined before the first commit. */
          readonly head?: string;
          /** `.git` is a file (linked worktree or submodule). */
          readonly linkedWorktree: boolean;
      };

/**
 * Inspects the repository containing a directory.
 *
 * @private Git persistence
 */
export async function inspectGit(path: string): Promise<GitInfo> {
    // A destination that does not exist yet belongs to the repository of its nearest existing ancestor.
    let directory = resolve(path);
    while (!(await isDirectory(directory))) {
        const parent = resolve(directory, '..');
        if (parent === directory) break;
        directory = parent;
    }
    const probe = await git(directory, ['rev-parse', '--is-bare-repository', '--is-inside-work-tree', '--show-toplevel', '--absolute-git-dir']);
    if (probe.spawnError) return { state: 'missing-git', reason: probe.spawnError };
    if (probe.exitCode !== 0) {
        if (/not a git repository/i.test(probe.stderr)) return { state: 'not-repository' };
        return { state: 'damaged', reason: probe.stderr.trim() || `git rev-parse exited with ${String(probe.exitCode)}` };
    }
    const [bare, inside, top, gitDir] = probe.stdout.split(/\r?\n/);
    if (bare === 'true') return { state: 'bare', gitDir: gitDir ?? '' };
    if (inside !== 'true') {
        // e.g. inside the .git directory
        return { state: 'not-repository' };
    }
    const root = canonicalPath(resolve(top!));
    const branch = (await git(directory, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim() || undefined;
    const headResult = await git(directory, ['rev-parse', '--verify', '--quiet', 'HEAD']);
    const head = headResult.exitCode === 0 ? headResult.stdout.trim() : undefined;
    const dotGit = await git(directory, ['rev-parse', '--git-common-dir']);
    const linkedWorktree = resolve(root, dotGit.stdout.trim()) !== resolve(gitDir!) || !(await isGitDirectoryInTree(root));
    return { state: 'repository', root, gitDir: resolve(gitDir!), branch, head, linkedWorktree };
}

/**
 * Checks whether `<root>/.git` is a directory (rather than a gitfile of a worktree/submodule).
 */
async function isGitDirectoryInTree(root: string): Promise<boolean> {
    const { stat } = await import('node:fs/promises');
    try {
        return (await stat(join(root, '.git'))).isDirectory();
    } catch {
        return false;
    }
}

/**
 * One porcelain status entry.
 *
 * @private Git persistence
 */
export type StatusEntry = {
    /** Absolute path. */
    readonly path: string;
    /** Original absolute path of a rename/copy. */
    readonly originalPath?: string;
    /** Index status letter. */
    readonly index: string;
    /** Work-tree status letter. */
    readonly worktree: string;
};

/**
 * Lists changed and untracked (non-ignored) paths of the project directory, as absolute paths.
 *
 * @private Git persistence
 */
export async function gitStatus(projectRoot: string, repositoryRoot: string): Promise<StatusEntry[]> {
    const output = await gitOrThrow(projectRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames', '--', '.'], { phase: 'git status' });
    const entries: StatusEntry[] = [];
    const fields = output.split('\0');
    for (let index = 0; index < fields.length; index++) {
        const field = fields[index]!;
        if (field.length < 4) continue;
        const indexStatus = field[0]!;
        const worktreeStatus = field[1]!;
        const path = resolve(repositoryRoot, field.slice(3));
        let originalPath: string | undefined;
        if (indexStatus === 'R' || indexStatus === 'C') originalPath = resolve(repositoryRoot, fields[++index] ?? '');
        entries.push({ path, originalPath, index: indexStatus, worktree: worktreeStatus });
    }
    return entries;
}

/**
 * Content fingerprints of dirty paths: absolute path → SHA-256 (or `null` for a deleted file).
 *
 * @private Git persistence
 */
export type DirtySnapshot = Readonly<Record<string, string | null>>;

/**
 * Captures the project's uncommitted paths with content fingerprints.
 *
 * @private Git persistence
 */
export async function snapshotDirty(projectRoot: string, repositoryRoot: string, exclude: (path: string) => boolean = () => false): Promise<Record<string, string | null>> {
    const snapshot: Record<string, string | null> = {};
    for (const entry of await gitStatus(projectRoot, repositoryRoot)) {
        if (exclude(entry.path)) continue;
        snapshot[entry.path] = (await hashFileIfExists(entry.path)) ?? null;
    }
    return snapshot;
}

/**
 * Paths whose content differs between two snapshots (including paths that became clean).
 *
 * @private Git persistence
 */
export function changedSince(before: DirtySnapshot, after: DirtySnapshot): string[] {
    const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...paths].filter((path) => before[path] !== after[path]).sort();
}

/**
 * Commit identity and signing derived from the coding-agent environment variables.
 *
 * @private Git persistence
 */
export type CommitIdentity = {
    /** `-c` configuration arguments. */
    readonly configArgs: readonly string[];
    /** Human description of the effective identity. */
    readonly description: string;
};

/**
 * Resolves commit identity: `CODING_AGENT_GIT_NAME/EMAIL/SIGNING_KEY` and `CODING_AGENT_GPG_KEY_ID`, otherwise Git configuration.
 *
 * @private Git persistence
 */
export async function resolveCommitIdentity(cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<CommitIdentity> {
    const configArgs: string[] = [];
    const name = env.CODING_AGENT_GIT_NAME;
    const email = env.CODING_AGENT_GIT_EMAIL;
    const signingKey = env.CODING_AGENT_GIT_SIGNING_KEY || env.CODING_AGENT_GPG_KEY_ID;
    if (name) configArgs.push('-c', `user.name=${name}`);
    if (email) configArgs.push('-c', `user.email=${email}`);
    if (signingKey) configArgs.push('-c', `user.signingkey=${signingKey}`, '-c', 'commit.gpgsign=true');
    const effectiveName = name || (await git(cwd, ['config', 'user.name'])).stdout.trim();
    const effectiveEmail = email || (await git(cwd, ['config', 'user.email'])).stdout.trim();
    const description = `${effectiveName || '(no user.name)'} <${effectiveEmail || 'no user.email'}>${name || email ? '' : ' from Git configuration'}${signingKey ? ', signed' : ''}`;
    return { configArgs, description };
}

/**
 * Outcome of a scoped commit.
 *
 * @private Git persistence
 */
export type CommitOutcome = { readonly committed: true; readonly sha: string; readonly paths: readonly string[] } | { readonly committed: false; readonly reason: 'no-changes' };

/**
 * Commits exactly the given paths with a `PTBK: ` subject, preserving every other staged/unstaged change.
 *
 * Hooks and signing are respected. Paths must be inside the project.
 *
 * @private Git persistence
 */
export async function commitPaths(options: {
    readonly projectRoot: string;
    readonly repositoryRoot: string;
    readonly paths: readonly string[];
    readonly subject: string;
    readonly body?: string;
    /** Message trailers; a list repeats the trailer (e.g. several `Task-ID` values). */
    readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>>;
    readonly temporaryDirectory: string;
    readonly env?: NodeJS.ProcessEnv;
}): Promise<CommitOutcome> {
    const { projectRoot, repositoryRoot } = options;
    const paths = [...new Set(options.paths.map((path) => resolve(path)))].filter((path) => isPathInside(projectRoot, path));
    if (!paths.length) return { committed: false, reason: 'no-changes' };
    const relative = paths.map((path) => path.slice(repositoryRoot.length + (repositoryRoot.endsWith(sep) ? 0 : 1)).split(sep).join('/'));
    const pathspec = `${relative.join('\0')}\0`;
    await gitOrThrow(repositoryRoot, ['add', '--all', '--pathspec-from-file=-', '--pathspec-file-nul'], { input: pathspec, phase: 'staging', literal: true });
    const staged = await gitOrThrow(repositoryRoot, ['diff', '--cached', '--name-only', '-z', '--no-renames'], { phase: 'staging' });
    const stagedPaths = new Set(staged.split('\0').filter(Boolean));
    if (!relative.some((path) => stagedPaths.has(path))) return { committed: false, reason: 'no-changes' };
    const identity = await resolveCommitIdentity(repositoryRoot, options.env);
    const trailers = Object.entries(options.trailers ?? {}).flatMap(([key, value]) => [...new Set(value === undefined ? [] : typeof value === 'string' ? [value] : value)].map((item) => `${key}: ${item.replace(/\s+/g, ' ')}`));
    const message = [prefixedSubject(options.subject), options.body?.trim() ? `\n${options.body.trim()}` : '', trailers.length ? `\n${trailers.join('\n')}` : '']
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd();
    await ensureDirectory(options.temporaryDirectory);
    const messageFile = join(options.temporaryDirectory, `commit-message-${shortId()}.txt`);
    await writeFileAtomic(messageFile, `${message}\n`);
    try {
        // `--only` commits exactly these paths and keeps other staged content staged (also on an unborn branch).
        const commitArgs = [...identity.configArgs, 'commit', '--quiet', '--cleanup=verbatim', '-F', messageFile, '--only', '--pathspec-from-file=-', '--pathspec-file-nul'];
        const result = await git(repositoryRoot, commitArgs, { input: pathspec, env: options.env, literal: true });
        if (result.exitCode !== 0) {
            throw new PtbkError('The commit failed.', {
                kind: 'persistence',
                phase: 'commit',
                project: projectRoot,
                reason: [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n') || `git commit exited with ${String(result.exitCode)}`,
                effect: 'The changes remain in the working tree as pending persistence.',
                preserved: 'All file changes were preserved; nothing was discarded.',
                next: ['Fix the hook/signing/identity problem, then let ptbk resume persistence (or run `ptbk recover`).'],
            });
        }
    } finally {
        await rm(messageFile, { force: true });
    }
    const sha = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'commit' })).trim();
    return { committed: true, sha, paths };
}

/**
 * Checks which of the given absolute paths are ignored by Git.
 *
 * @private Git persistence
 */
export async function ignoredPaths(projectRoot: string, paths: readonly string[]): Promise<Set<string>> {
    if (!paths.length) return new Set();
    const result = await git(projectRoot, ['check-ignore', '-z', '--stdin', '--no-index'], { input: `${paths.join('\0')}\0` });
    const ignored = new Set<string>();
    for (const path of result.stdout.split('\0')) if (path) ignored.add(resolve(projectRoot, path));
    return ignored;
}

/**
 * Lists tracked and untracked non-ignored files under the project (absolute paths).
 *
 * @private Git persistence
 */
export async function listProjectFiles(projectRoot: string): Promise<string[]> {
    const output = await gitOrThrow(projectRoot, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.'], { phase: 'git ls-files' });
    return [...new Set(output.split('\0').filter(Boolean).map((path) => resolve(projectRoot, path)))];
}

/**
 * Lists ignored files and directories under the project (absolute paths; directories end without separator).
 *
 * @private Git persistence
 */
export async function listIgnoredEntries(projectRoot: string): Promise<string[]> {
    const output = await gitOrThrow(projectRoot, ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory', '--', '.'], { phase: 'git ls-files' });
    return output
        .split('\0')
        .filter(Boolean)
        .map((path) => resolve(projectRoot, path.replace(/\/$/, '')));
}

/**
 * Reads a file's content at HEAD (undefined when absent).
 *
 * @private Git persistence
 */
export async function readAtHead(repositoryRoot: string, absolutePath: string): Promise<string | undefined> {
    const relativePath = absolutePath.slice(repositoryRoot.length + 1).split(sep).join('/');
    const result = await git(repositoryRoot, ['show', `HEAD:${relativePath}`]);
    return result.exitCode === 0 ? result.stdout : undefined;
}

/**
 * Commits carrying a task's name (`Task-Name`, `Created-Task-Name` or `Related-Task-Name` trailer, compared by
 * normalized name), newest first; legacy `Task-ID` trailers match the task's historical ID.
 *
 * Commit SHAs are resolved from Git and the readable name rather than stored in the committed tree.
 *
 * @private Git persistence
 */
export async function commitsOfTask(repositoryRoot: string, taskName: string, legacyId?: string, maxCount = 2000): Promise<Array<{ sha: string; subject: string; date: string; role: 'task' | 'created' | 'related' }>> {
    const result = await git(repositoryRoot, ['log', `--max-count=${maxCount}`, '--format=%H%x00%cI%x00%s%x00%B%x01']);
    if (result.exitCode !== 0) return [];
    const key = normalizeAgentName(taskName);
    const found: Array<{ sha: string; subject: string; date: string; role: 'task' | 'created' | 'related' }> = [];
    for (const record of result.stdout.split('\x01')) {
        const [sha, date, subject, body] = record.split('\0');
        if (!sha?.trim() || !body) continue;
        const roles = new Set<string>();
        for (const line of body.split('\n')) {
            const match = /^(Task|Created-Task|Related-Task)-(Name|ID):\s*(.+)$/.exec(line.trim());
            if (!match) continue;
            const matches = match[2] === 'Name' ? normalizeAgentName(match[3]!) === key : Boolean(legacyId) && match[3]!.trim() === legacyId;
            if (matches) roles.add(match[1]!);
        }
        const role = roles.has('Task') ? 'task' : roles.has('Created-Task') ? 'created' : roles.has('Related-Task') ? 'related' : undefined;
        if (role) found.push({ sha: sha.trim(), subject: subject ?? '', date: date ?? '', role });
    }
    return found;
}

/**
 * Lists changed or untracked, non-ignored files below a project-relative directory (absolute paths).
 *
 * Ignored evidence is never returned, so it is never force-added.
 *
 * @private Git persistence
 */
export async function stageableFiles(projectRoot: string, relativeDirectory: string): Promise<string[]> {
    const result = await git(projectRoot, ['ls-files', '-z', '--modified', '--others', '--exclude-standard', '--', relativeDirectory]);
    if (result.exitCode !== 0) return [];
    return [...new Set(result.stdout.split('\0').filter(Boolean).map((path) => resolve(projectRoot, path)))];
}

/**
 * Finds the most recent commit carrying a trailer value (used to reconcile interrupted persistence).
 *
 * @private Git persistence
 */
export async function findCommitWithTrailer(repositoryRoot: string, trailer: string, value: string, maxCount = 200): Promise<string | undefined> {
    const result = await git(repositoryRoot, ['log', `--max-count=${maxCount}`, '--format=%H%x00%B%x01']);
    if (result.exitCode !== 0) return undefined;
    for (const record of result.stdout.split('\x01')) {
        const [sha, body] = record.split('\0');
        if (sha && body && body.split('\n').some((line) => line.trim() === `${trailer}: ${value}`)) return sha.trim();
    }
    return undefined;
}

/**
 * Repository-relative POSIX path of an absolute path.
 */
function repositoryRelative(repositoryRoot: string, absolutePath: string): string {
    return absolutePath.slice(repositoryRoot.length + (repositoryRoot.endsWith(sep) ? 0 : 1)).split(sep).join('/');
}

/**
 * Whether a file differs from HEAD in the working tree or index (untracked counts as dirty).
 *
 * @private Git persistence
 */
export async function isPathDirty(repositoryRoot: string, absolutePath: string): Promise<boolean> {
    const result = await git(repositoryRoot, ['status', '--porcelain=v1', '--untracked-files=all', '--', repositoryRelative(repositoryRoot, absolutePath)], { literal: true });
    return result.exitCode !== 0 || result.stdout.trim() !== '';
}

/**
 * Commits explicit contents of the given files on top of HEAD without reading or touching their working-tree
 * versions and without disturbing other index entries (scoped reconciliation of a same-file concurrent edit: the
 * operation's own change is committed while someone else's uncommitted edit of the same file stays in the working
 * tree). Hooks and signing apply as for any commit. Paths whose index entry still matched HEAD are updated to the
 * committed blob; a different staged version is preserved.
 *
 * @private Git persistence
 */
export async function commitFileContents(options: {
    readonly projectRoot: string;
    readonly repositoryRoot: string;
    readonly files: ReadonlyArray<{ readonly path: string; readonly content: string }>;
    readonly subject: string;
    readonly body?: string;
    readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>>;
    readonly temporaryDirectory: string;
    readonly env?: NodeJS.ProcessEnv;
}): Promise<CommitOutcome> {
    const { repositoryRoot } = options;
    const files = options.files.filter((file) => isPathInside(options.projectRoot, resolve(file.path)));
    if (!files.length) return { committed: false, reason: 'no-changes' };
    await ensureDirectory(options.temporaryDirectory);
    const indexFile = join(options.temporaryDirectory, `index-${shortId()}`);
    const messageFile = join(options.temporaryDirectory, `commit-message-${shortId()}.txt`);
    const indexEnv = { ...options.env, GIT_INDEX_FILE: indexFile };
    const head = (await git(repositoryRoot, ['rev-parse', '--verify', '--quiet', 'HEAD'])).stdout.trim() || undefined;
    try {
        if (head) await gitOrThrow(repositoryRoot, ['read-tree', 'HEAD'], { env: indexEnv, phase: 'staging' });
        const updates: Array<{ relative: string; blob: string; previous?: string; mode: string }> = [];
        for (const file of files) {
            const relative = repositoryRelative(repositoryRoot, resolve(file.path));
            const blob = (await gitOrThrow(repositoryRoot, ['hash-object', '-w', '--stdin'], { input: file.content, phase: 'staging' })).trim();
            const tree = head ? (await git(repositoryRoot, ['ls-tree', 'HEAD', '--', relative], { literal: true })).stdout.trim() : '';
            const [mode, , previous] = tree ? tree.split(/\s+/) : [];
            updates.push({ relative, blob, previous, mode: mode ?? '100644' });
            await gitOrThrow(repositoryRoot, ['update-index', '--add', '--cacheinfo', `${mode ?? '100644'},${blob},${relative}`], { env: indexEnv, phase: 'staging', literal: true });
        }
        if (updates.every((update) => update.previous === update.blob)) return { committed: false, reason: 'no-changes' };
        const identity = await resolveCommitIdentity(repositoryRoot, options.env);
        const trailers = Object.entries(options.trailers ?? {}).flatMap(([key, value]) => [...new Set(value === undefined ? [] : typeof value === 'string' ? [value] : value)].map((item) => `${key}: ${item.replace(/\s+/g, ' ')}`));
        const message = [prefixedSubject(options.subject), options.body?.trim() ? `\n${options.body.trim()}` : '', trailers.length ? `\n${trailers.join('\n')}` : '']
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trimEnd();
        await writeFileAtomic(messageFile, `${message}\n`);
        const result = await git(repositoryRoot, [...identity.configArgs, 'commit', '--quiet', '--cleanup=verbatim', '-F', messageFile], { env: indexEnv });
        if (result.exitCode !== 0) {
            throw new PtbkError('The commit failed.', {
                kind: 'persistence',
                phase: 'commit',
                project: options.projectRoot,
                reason: [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n') || `git commit exited with ${String(result.exitCode)}`,
                effect: 'Nothing was committed and no file was changed.',
                next: ['Fix the hook/signing/identity problem, then retry.'],
            });
        }
        // The real index follows HEAD only where it still matched the previous HEAD (a different staged version is kept).
        for (const update of updates) {
            const staged = (await git(repositoryRoot, ['ls-files', '--stage', '--', update.relative], { literal: true })).stdout.trim().split(/\s+/)[1];
            if (staged === undefined || staged === update.previous) {
                await git(repositoryRoot, ['update-index', '--add', '--cacheinfo', `${update.mode},${update.blob},${update.relative}`], { literal: true });
            }
        }
    } finally {
        await rm(indexFile, { force: true });
        await rm(messageFile, { force: true });
    }
    const sha = (await gitOrThrow(repositoryRoot, ['rev-parse', 'HEAD'], { phase: 'commit' })).trim();
    return { committed: true, sha, paths: files.map((file) => resolve(file.path)) };
}
