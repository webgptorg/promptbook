import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { confinePath } from './workspace.js';

/** Captured filesystem content, including executable bits and symlink targets. @private */
export interface FileSnapshot { hash: string; mode: number; kind: 'file' | 'symlink'; content: string }
/** A checkout boundary used to reject concurrent writes and protect existing staged work. @private */
export interface GitSnapshot {
    root: string; head: string | null; index: string; indexFlags: string;
    files: Record<string, FileSnapshot>; dirtyPaths: string[];
}
/** Verified uncommitted bytes owned by one project supervisor, without embedding snapshot content. @private */
export interface UncommittedOwnership { version: 1; root: string; head: string | null; index: string; indexFlags: string; files: Record<string, Pick<FileSnapshot, 'hash' | 'kind' | 'mode'> | null> }

/** Remove only unchanged, previously attributable dirty paths from a task's protected baseline. @private */
export function protectUnrelatedChanges(snapshot: GitSnapshot, ownership?: UncommittedOwnership): GitSnapshot {
    if (!ownership) return snapshot;
    if (ownership.version !== 1 || ownership.root !== snapshot.root || ownership.head !== snapshot.head || ownership.index !== snapshot.index || ownership.indexFlags !== snapshot.indexFlags) throw new GitPersistenceError('Uncommitted ownership no longer matches the Git boundary; reconcile pending work before continuing.');
    for (const [name, file] of Object.entries(ownership.files)) {
        const current = snapshot.files[name];
        if (file ? !current || file.hash !== current.hash || file.kind !== current.kind || file.mode !== current.mode : current !== undefined) throw new GitPersistenceError(`Previously owned uncommitted content changed: ${name}. Review the concurrent edit before continuing.`);
    }
    return { ...snapshot, dirtyPaths: snapshot.dirtyPaths.filter(name => !(name in ownership.files)) };
}

/** Checkpoint signatures only for the supervisor's attributable pending paths. @private */
export function uncommittedOwnership(snapshot: GitSnapshot, paths: string[]): UncommittedOwnership {
    return { version: 1, root: snapshot.root, head: snapshot.head, index: snapshot.index, indexFlags: snapshot.indexFlags,
        files: Object.fromEntries([...new Set(paths)].map(name => { const file = snapshot.files[name]; return [name, file ? { hash: file.hash, kind: file.kind, mode: file.mode } : null]; })) };
}
/** Options for a scoped commit made using a private index. @private */
export interface ScopedCommitOptions { paths?: string[]; protectedPaths?: string[]; expected?: GitSnapshot; signal?: AbortSignal }
/** Actual per-command Git attribution and configured signing policy. @private */
export interface GitIdentity { name: string; email: string; signing: boolean; source: 'agent' | 'git'; signingKey?: string; signingFormat?: string }
/** A Git error that preserves the phase and any commit already created. @private */
export class GitPersistenceError extends Error {
    constructor(message: string, public readonly commit?: string) { super(message); this.name = 'GitPersistenceError'; }
}
/** Execute owned Git subprocesses with bounded output, cancellation and hook/signing lifetimes. @private */
export async function git(root: string, args: string[], options: { env?: NodeJS.ProcessEnv; input?: string | Buffer; allowFailure?: boolean; signal?: AbortSignal; timeoutMs?: number; maxOutputBytes?: number } = {}): Promise<string> {
    if (options.signal?.aborted) throw new GitPersistenceError(`Git ${args[0]} cancelled before execution; all work was preserved.`);
    return new Promise((resolve, reject) => {
        const network = ['push', 'pull', 'fetch', 'clone'].includes(args[0] ?? '');
        const child = spawn('git', ['-C', root, ...args], { env: { ...process.env, ...(network ? { GIT_TERMINAL_PROMPT: '0' } : {}), ...options.env }, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
        const out: Buffer[] = []; const err: Buffer[] = [];
        let size = 0; let stopped: string | undefined; let escalation: ReturnType<typeof setTimeout> | undefined;
        const maximum = options.maxOutputBytes ?? 16 * 1024 * 1024;
        /** Terminate only this Git invocation and the hook/helper descendants it owns. */
        const terminate = (force = false) => {
            if (!child.pid) return;
            if (process.platform === 'win32') {
                if (child.exitCode === null && child.signalCode === null) {
                    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
                    killer.on('error', () => child.kill('SIGKILL')); killer.unref();
                }
            } else {
                try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); }
                catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') child.kill(force ? 'SIGKILL' : 'SIGTERM'); }
            }
        };
        /** Record the first stop reason, preserving the result boundary for explicit recovery. */
        const stop = (reason: string) => {
            if (stopped) return;
            stopped = reason; terminate(); escalation = setTimeout(() => terminate(true), 1000); escalation.unref();
        };
        const abort = () => stop('cancelled');
        const timeout = setTimeout(() => stop(`timed out after ${options.timeoutMs ?? (network ? 300000 : 120000)} ms`), options.timeoutMs ?? (network ? 300000 : 120000)); timeout.unref();
        options.signal?.addEventListener('abort', abort, { once: true });
        /** Retain only the explicitly bounded stdout/stderr bytes. */
        const collect = (destination: Buffer[], chunk: Buffer) => {
            if (stopped) return;
            size += chunk.length;
            if (size > maximum) { stop(`output exceeded ${maximum} bytes`); return; }
            destination.push(chunk);
        };
        /** Release listeners and timers after the owned subprocess settles. */
        const cleanup = () => { clearTimeout(timeout); if (escalation) clearTimeout(escalation); options.signal?.removeEventListener('abort', abort); };
        child.stdout.on('data', (chunk: Buffer) => collect(out, chunk)); child.stderr.on('data', (chunk: Buffer) => collect(err, chunk));
        child.stdin.on('error', error => { if ((error as NodeJS.ErrnoException).code !== 'EPIPE') stop(`input failed: ${error.message}`); });
        child.on('error', error => { cleanup(); reject(new GitPersistenceError(`Git ${args[0]} could not start: ${error.message}. Work was preserved.`)); });
        child.on('close', code => {
            cleanup();
            if (stopped) { reject(new GitPersistenceError(`Git ${args[0]} ${stopped}; all work and commit intent were preserved.`)); return; }
            const output = Buffer.concat(out).toString();
            if (code === 0 || options.allowFailure) resolve(output);
            else reject(new GitPersistenceError(`Git ${args[0]} failed (${code}): ${Buffer.concat(err).toString().trim()}`));
        });
        child.stdin.end(options.input);
    });
}
/** Resolve an enclosing non-bare checkout, including linked worktrees. @private */
export async function discoverGit(projectPath: string): Promise<string | undefined> {
    try {
        if ((await git(projectPath, ['rev-parse', '--is-bare-repository'])).trim() === 'true') throw new GitPersistenceError('Bare Git repositories cannot be used as a ptbk workspace.');
        return (await git(projectPath, ['rev-parse', '--show-toplevel'])).replace(/\r?\n$/, '');
    } catch (error) {
        if (error instanceof GitPersistenceError && /not a git repository/i.test(error.message)) return undefined;
        throw error;
    }
}
/** Internal runtime files never become an eligible change, even before init adds gitignore. @private */
export function isRuntimePath(name: string): boolean {
    return /(^|\/)\.ptbk(\/|$)/.test(name) || /(^|\/)\.promptbook\/(ptbk-coder|coder-isolation-worktrees)(\/|$)/.test(name);
}
/** Hash bytes without converting binary files to text. @private */
function hash(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
/** Read a file without following a symlink outside the workspace. @private */
export async function readFileSnapshot(root: string, name: string): Promise<FileSnapshot | undefined> {
    try {
        const absolute = path.resolve(root, name);
        if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) throw new GitPersistenceError(`Path escapes checkout: ${name}`);
        let parent = path.dirname(absolute);
        while (parent !== path.resolve(root)) {
            try { if ((await fs.lstat(parent)).isSymbolicLink()) throw new GitPersistenceError(`Symlink parent escapes the captured filesystem boundary: ${name}`); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            parent = path.dirname(parent);
        }
        const stat = await fs.lstat(absolute);
        if (!stat.isFile() && !stat.isSymbolicLink()) return undefined;
        const kind = stat.isSymbolicLink() ? 'symlink' : 'file';
        const bytes = kind === 'symlink' ? Buffer.from(await fs.readlink(absolute)) : await fs.readFile(absolute);
        return { hash: hash(bytes), mode: stat.mode & 0o777, kind, content: bytes.toString('base64') };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') return undefined;
        throw error;
    }
}
/** Read the current commit without treating an unborn branch as a broken repository. @private */
export async function readHead(root: string): Promise<string | null> {
    return (await git(root, ['rev-parse', '--verify', 'HEAD'], { allowFailure: true })).trim() || null;
}
/** Capture tracked and eligible untracked files together with the real index. @private */
export async function captureSnapshot(root: string, includeIgnored = false): Promise<GitSnapshot> {
    root = (await discoverGit(root)) ?? root;
    const lists = await Promise.all([
        git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']),
        git(root, ['ls-files', '--stage', '-z']), git(root, ['ls-files', '-v', '-z']), readHead(root),
        git(root, ['diff', '--name-only', '-z']), git(root, ['diff', '--cached', '--name-only', '-z']),
        git(root, ['ls-files', '--others', '--exclude-standard', '-z']),
        includeIgnored ? git(root, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z']) : Promise.resolve(''),
    ]);
    const names = [...new Set(`${lists[0]}${lists[7]}`.split('\0').filter((name) => name && !isRuntimePath(name)))].sort();
    const files: Record<string, FileSnapshot> = {};
    for (const name of names) { const entry = await readFileSnapshot(root, name); if (entry) files[name] = entry; }
    const dirty = new Set(`${lists[4]}${lists[5]}${lists[6]}`.split('\0').filter((name) => name && !isRuntimePath(name)));
    // Git diff deliberately hides assume-unchanged/skip-worktree paths. They are still user-owned bytes.
    const stage = new Map<string, { mode: string; object: string }>();
    for (const record of (lists[1] as string).split('\0').filter(Boolean)) {
        const match = /^(\d+) ([a-f0-9]+) 0\t([\s\S]+)$/.exec(record);
        if (match) stage.set(match[3]!, { mode: match[1]!, object: match[2]! });
    }
    for (const record of (lists[2] as string).split('\0').filter(Boolean)) {
        const flag = record[0]!; const name = record.slice(2);
        if (isRuntimePath(name) || (flag === flag.toUpperCase() && flag !== 'S')) continue;
        const entry = files[name]; const staged = stage.get(name);
        if (!entry) { if (flag.toUpperCase() !== 'S') dirty.add(name); continue; }
        if (!staged) continue;
        const object = (await git(root, ['hash-object', ...(entry.kind === 'symlink' ? ['--no-filters'] : [`--path=${name}`]), '--stdin'], { input: Buffer.from(entry.content, 'base64') })).trim();
        if (object !== staged.object || (entry.kind === 'symlink') !== (staged.mode === '120000')) dirty.add(name);
    }
    return { root, head: lists[3] as string | null, index: lists[1] as string, indexFlags: lists[2] as string, files,
        dirtyPaths: [...dirty].sort() };
}
/** Compare exact content and type, while ignoring irrelevant timestamps. @private */
export function sameFile(a?: FileSnapshot, b?: FileSnapshot): boolean {
    return !a || !b ? a === b : a.hash === b.hash && a.mode === b.mode && a.kind === b.kind;
}
/** Return every path changed since a captured boundary. @private */
export async function changedPaths(snapshot: GitSnapshot, current?: GitSnapshot): Promise<string[]> {
    current ??= await captureSnapshot(snapshot.root);
    return [...new Set([...Object.keys(snapshot.files), ...Object.keys(current.files)])].filter((name) => !sameFile(snapshot.files[name], current!.files[name])).sort();
}
/** Reject changes to the source index/HEAD or to an expected live content boundary. @private */
export async function assertSnapshot(snapshot: GitSnapshot, options: { content?: boolean; ignored?: boolean } = {}): Promise<GitSnapshot> {
    const current = await captureSnapshot(snapshot.root, options.ignored);
    if (current.head !== snapshot.head || current.index !== snapshot.index || current.indexFlags !== snapshot.indexFlags) throw new GitPersistenceError('Git HEAD or index changed concurrently; all work is preserved. Inspect the checkout before recovery.');
    if (options.content !== false && (await changedPaths(snapshot, current)).length) throw new GitPersistenceError('Checkout content changed concurrently; the private result was not imported. Inspect both copies before recovery.');
    return current;
}
/** Restore/import an exact file entry without following a final symlink. @private */
export async function writeFileSnapshot(root: string, name: string, entry?: FileSnapshot): Promise<void> {
    const absolute = path.resolve(root, name);
    if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) throw new GitPersistenceError(`Path escapes checkout: ${name}`);
    let directory = path.dirname(absolute);
    while (directory !== path.resolve(root)) {
        try { if ((await fs.lstat(directory)).isSymbolicLink()) throw new GitPersistenceError(`Symlink parent prevents safe import: ${name}`); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        directory = path.dirname(directory);
    }
    await fs.rm(absolute, { force: true });
    if (!entry) return;
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    if (entry.kind === 'symlink') await fs.symlink(Buffer.from(entry.content, 'base64').toString(), absolute);
    else { await fs.writeFile(absolute, Buffer.from(entry.content, 'base64')); await fs.chmod(absolute, entry.mode); }
}
/** Per-command agent identity, falling back to the user's complete Git configuration. @private */
function identityArgs(): string[] {
    const name = process.env.CODING_AGENT_GIT_NAME; const email = process.env.CODING_AGENT_GIT_EMAIL;
    if (!name || !email) return [];
    const args = ['-c', `user.name=${name}`, '-c', `user.email=${email}`];
    const key = process.env.CODING_AGENT_GIT_SIGNING_KEY || process.env.CODING_AGENT_GPG_KEY_ID;
    if (key) args.push('-c', `user.signingkey=${key}`, '-c', 'commit.gpgsign=true');
    return args;
}
/** Complete agent identity applies only to the owned command, never global user configuration. @private */
function identityEnv(): NodeJS.ProcessEnv {
    const name = process.env.CODING_AGENT_GIT_NAME; const email = process.env.CODING_AGENT_GIT_EMAIL;
    return name && email ? { GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email } : {};
}
/** Report the same effective identity and signing settings the scoped commit will use. @private */
export async function commitIdentity(root: string): Promise<GitIdentity> {
    const args = identityArgs(); const env = identityEnv();
    const author = (await git(root, [...args, 'var', 'GIT_AUTHOR_IDENT'], { env })).trim();
    const match = /^(.+) <([^>]+)> \d+ [+-]\d+$/.exec(author);
    if (!match) throw new GitPersistenceError('Git commit identity is unavailable. Configure user.name and user.email before running ptbk.');
    const signing = (await git(root, [...args, 'config', '--bool', '--get', 'commit.gpgsign'], { env, allowFailure: true })).trim() === 'true';
    const signingKey = (await git(root, [...args, 'config', '--get', 'user.signingkey'], { env, allowFailure: true })).trim() || undefined;
    const signingFormat = (await git(root, [...args, 'config', '--get', 'gpg.format'], { env, allowFailure: true })).trim() || undefined;
    return { name: match[1]!, email: match[2]!, signing, source: Object.keys(env).length ? 'agent' : 'git', signingKey, signingFormat };
}
/** Align only committed owned paths in the real index after a private-index commit. @private */
export async function alignOwnedIndex(root: string, paths: string[]): Promise<void> {
    const flags = (await git(root, ['ls-files', '-v', '-z', '--', ...paths])).split('\0').filter(Boolean);
    const entries = await git(root, ['ls-tree', '-rz', 'HEAD', '--', ...paths]);
    const updates: string[] = []; const found = new Set<string>();
    for (const item of entries.split('\0').filter(Boolean)) {
        const match = /^(\d+) \w+ ([a-f0-9]+)\t([\s\S]+)$/.exec(item);
        if (match) { found.add(match[3]!); updates.push(`${match[1]} ${match[2]}\t${match[3]}\0`); }
    }
    const objectLength = (await git(root, ['rev-parse', 'HEAD'])).trim().length;
    for (const name of paths) if (!found.has(name)) updates.push(`0 ${'0'.repeat(objectLength)}\t${name}\0`);
    if (updates.length) await git(root, ['update-index', '-z', '--index-info'], { input: updates.join('') });
    for (const record of flags) {
        const flag = record[0]!; const name = record.slice(2);
        if (!found.has(name)) continue;
        if (flag !== flag.toUpperCase()) await git(root, ['update-index', '--assume-unchanged', '--', name]);
        if (flag.toUpperCase() === 'S') await git(root, ['update-index', '--skip-worktree', '--', name]);
    }
}
/** Commit only owned paths using a private index; existing staged/unstaged entries are untouched. @private */
export async function commitScoped(baseline: GitSnapshot, message: string, options: ScopedCommitOptions = {}): Promise<string | undefined> {
    const current = await assertSnapshot(baseline, { content: false });
    if (options.expected && (await changedPaths(options.expected, current)).length) throw new GitPersistenceError('Content changed after the commit intent was recorded; refusing ambiguous persistence.');
    const allChanges = await changedPaths(baseline, current);
    const paths = options.paths ? allChanges.filter((name) => options.paths!.includes(name)) : allChanges;
    const protectedPaths = options.protectedPaths ?? baseline.dirtyPaths;
    const overlap = paths.filter((name) => protectedPaths.includes(name));
    if (overlap.length) throw new GitPersistenceError(`Owned changes overlap existing user work: ${overlap.join(', ')}. Original bytes remain in the recovery snapshot.`);
    if (!paths.length) return undefined;
    const directory = await confinePath(baseline.root, path.join(baseline.root, '.ptbk', 'indexes'));
    await fs.mkdir(directory, { recursive: true });
    const index = path.join(directory, `${randomUUID()}.index`); const env = { GIT_INDEX_FILE: index };
    let commit: string | undefined;
    try {
        await git(baseline.root, ['read-tree', baseline.head ?? '--empty'], { env });
        await git(baseline.root, ['add', '--', ...paths], { env });
        const intendedTree = (await git(baseline.root, ['write-tree'], { env })).trim();
        const beforeTree = baseline.head ? (await git(baseline.root, ['rev-parse', `${baseline.head}^{tree}`])).trim() : null;
        if (intendedTree === beforeTree) return undefined;
        await assertSnapshot(current);
        const prefixedMessage = `PTBK: ${message.replace(/^(?:PTBK: )+/, '')}`;
        await git(baseline.root, [...identityArgs(), 'commit', '-m', prefixedMessage], { env: { ...env, ...identityEnv() }, signal: options.signal });
        commit = (await readHead(baseline.root)) ?? undefined;
        const committedTree = (await git(baseline.root, ['rev-parse', 'HEAD^{tree}'])).trim();
        const after = await captureSnapshot(baseline.root);
        if (committedTree !== intendedTree || (await changedPaths(current, after)).length || after.index !== baseline.index || after.indexFlags !== baseline.indexFlags) throw new GitPersistenceError('A Git hook changed captured content or index; the commit exists but completion requires verification.', commit);
        // Update only the owned entries in the real index. Foreign entries and their flags stay as captured.
        await alignOwnedIndex(baseline.root, paths);
        return commit;
    } catch (error) {
        if (commit && !(error instanceof GitPersistenceError && error.commit)) throw new GitPersistenceError(`${(error as Error).message} Local commit ${commit} was preserved; do not rerun the model.`, commit);
        throw error;
    } finally { await fs.rm(index, { force: true }); await fs.rm(`${index}.lock`, { force: true }); }
}
/** Normalize only newly owned textual changes and retain binary bytes verbatim. @private */
export async function normalizeOwned(snapshot: GitSnapshot, protectedPaths: string[] = snapshot.dirtyPaths): Promise<void> {
    const current = await captureSnapshot(snapshot.root);
    for (const name of await changedPaths(snapshot, current)) {
        if (protectedPaths.includes(name)) continue;
        const entry = current.files[name];
        if (!entry || entry.kind !== 'file') continue;
        const bytes = Buffer.from(entry.content, 'base64');
        if (bytes.includes(0) || !bytes.includes(Buffer.from('\r\n'))) continue;
        const text = bytes.toString('utf8');
        if (!Buffer.from(text).equals(bytes)) continue;
        await fs.writeFile(path.join(snapshot.root, name), text.replace(/\r\n/g, '\n'));
    }
}
