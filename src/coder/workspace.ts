import { realpath, stat, readFile, lstat, readlink, readdir } from 'node:fs/promises';
import { resolve, relative, dirname, join, isAbsolute, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Workspace } from './domain.js';

/** Runs Git without interpolating project paths into a shell. */
const EXEC_FILE = promisify(execFile);

/** Identifies user input errors for the CLI exit contract.
 * @private Internal CLI error.
 */
export class InputError extends Error {
    readonly exitCode = 2;
}

/** Resolves even missing descendants through their existing real parent.
 * @private Internal workspace confinement.
 */
export async function realTarget(path: string, seen = new Set<string>()): Promise<string> {
    path = resolve(path);
    if (seen.has(path)) throw new InputError(`Symbolic link cycle: ${path}`);
    seen.add(path);
    try { return await realpath(path); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        try {
            if ((await lstat(path)).isSymbolicLink()) return realTarget(resolve(dirname(path), await readlink(path)), seen);
        } catch (linkError) { if ((linkError as NodeJS.ErrnoException).code !== 'ENOENT') throw linkError; }
        const parent = dirname(path);
        if (parent === path) throw error;
        return join(await realTarget(parent, seen), relative(parent, path));
    }
}

/** Rejects paths and symlinks outside the selected project.
 * @private Internal mutation guard.
 */
export async function confinePath(projectPath: string, target: string): Promise<string> {
    const canonical = await realTarget(target);
    const distance = relative(await realpath(projectPath), canonical);
    if (distance === '..' || distance.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(distance)) {
        throw new InputError(`Path escapes the selected project: ${target}`);
    }
    return canonical;
}

/** Captures all workspace paths without changing process.cwd or creating files.
 * @private Internal CLI configuration.
 */
export async function resolveWorkspace(options: { path?: string; tasks?: string }, allowMissingTasks = false): Promise<Workspace> {
    const invocationPath = process.cwd();
    let projectPath: string;
    try { projectPath = await realpath(resolve(invocationPath, options.path || '.')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new InputError(`Project directory does not exist: ${resolve(invocationPath, options.path || '.')}`); throw error; }
    if (!(await stat(projectPath)).isDirectory()) throw new InputError(`Project is not a directory: ${projectPath}`);
    const tasksPath = await confinePath(projectPath, resolve(projectPath, options.tasks ?? 'tasks'));
    const legacyPath = await confinePath(projectPath, join(projectPath, 'prompts'));
    if (options.tasks !== undefined && !allowMissingTasks) {
        try { if (!(await stat(tasksPath)).isDirectory()) throw new Error('not a directory'); }
        catch { throw new InputError(`Explicit task source is missing or invalid: ${tasksPath}`); }
    }
    const gitRoot = await findGitRoot(projectPath);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) throw new InputError('System timezone is unavailable; configure a local IANA timezone.');
    // Occurrence journals are project-local; the execution lease separately coordinates the checkout.
    const statePath = await confinePath(projectPath, join(projectPath, '.promptbook', 'ptbk-coder'));
    return { projectPath, tasksPath, legacyPath, gitRoot, statePath, timezone };
}

/** Find checkout boundaries without turning a damaged repository into a new one. */
async function findGitRoot(projectPath: string): Promise<string | undefined> {
    try {
        const { stdout: bare } = await EXEC_FILE('git', ['-C', projectPath, 'rev-parse', '--is-bare-repository']);
        if (bare.trim() === 'true') throw new InputError('Bare repositories cannot be used as coder projects. Choose a working-tree checkout.');
        const { stdout } = await EXEC_FILE('git', ['-C', projectPath, 'rev-parse', '--show-toplevel']);
        return await realpath(stdout.trim());
    } catch (error) {
        if (error instanceof InputError) throw error;
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new InputError('Git executable is missing. Install Git before using ptbk.');
        const message = String((error as { stderr?: string }).stderr || error);
        if (!message.includes('not a git repository')) throw new InputError(`Git repository cannot be read: ${message}`);
        let directory = projectPath;
        for (;;) {
            try {
                await lstat(join(directory, '.git'));
                throw new InputError(`Git metadata at ${join(directory, '.git')} is damaged or unreadable: ${message.trim()}. Repair it before running ptbk; no new repository was initialized.`);
            } catch (metadataError) { if ((metadataError as NodeJS.ErrnoException).code !== 'ENOENT') throw metadataError; }
            const parent = dirname(directory);
            if (parent === directory) break;
            directory = parent;
        }
        return undefined;
    }
}

/** Requires Git before an authoring action or paid execution can start.
 * @private Internal Git preflight.
 */
export async function requireGit(workspace: Workspace, initialize = false): Promise<void> {
    if (workspace.gitRoot) return;
    const existing = await findGitRoot(workspace.projectPath);
    if (existing) { workspace.gitRoot = existing; return; }
    if (!initialize) throw new InputError(`No Git repository at ${workspace.projectPath}. Run ptbk init --path ${JSON.stringify(workspace.projectPath)} first.`);
    await EXEC_FILE('git', ['-C', workspace.projectPath, 'init']);
    workspace.gitRoot = workspace.projectPath;
}

/** Resolve local identities or validate a remote reference without inheritance or network I/O.
 * @private Internal read-only agent routing.
 */
export async function resolveAgentSelection(workspace: Workspace, reference: string): Promise<{ path: string; aliases: string[] }> {
    if (/^https?:/i.test(reference)) {
        let url: URL;
        try { url = new URL(reference); }
        catch { throw new InputError('Remote agent reference is not a valid URL.'); }
        if (url.protocol !== 'https:' || url.username || url.password) throw new InputError('Remote agents require HTTPS without embedded credentials.');
        return { path: url.href, aliases: [...new Set([url.href, basename(url.pathname, '.book')])] };
    }
    const explicit = isAbsolute(reference) || /[\\/]/.test(reference) || reference.endsWith('.book');
    /** Read the identity only; a task declaration cannot be selected as an agent. */
    async function identity(file: string): Promise<{ path: string; title: string }> {
        const target = await confinePath(workspace.projectPath, file);
        let text: string;
        try { text = await readFile(target, 'utf8'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new InputError(`Agent Book does not exist: ${file}. Run ptbk init for missing default roles.`); throw error; }
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
        if (!lines.length || /^TASK(?:\s|$)/.test(lines[0]!) || /^TASK(?:\s|$)/.test(lines[1] ?? '')) throw new InputError(`Invalid agent Book: ${file}; task Books cannot be selected as agents.`);
        return { path: target, title: lines[0]!.trim() };
    }
    let selected: { path: string; title: string };
    if (explicit) selected = await identity(resolve(workspace.projectPath, reference));
    else {
        const matches = new Map<string, { path: string; title: string }>();
        const visited = new Set<string>();
        /** Walk local role Books while deduplicating directory and file symlink aliases. */
        async function walk(directory: string): Promise<void> {
            const safe = await confinePath(workspace.projectPath, directory);
            if (visited.has(safe)) return;
            visited.add(safe);
            let entries;
            try { entries = await readdir(safe, { withFileTypes: true }); }
            catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
            for (const entry of entries) {
                const file = await confinePath(workspace.projectPath, join(safe, entry.name));
                const attributes = entry.isSymbolicLink() ? await stat(file) : undefined;
                if (entry.isDirectory() || attributes?.isDirectory()) await walk(file);
                else if (entry.name.endsWith('.book')) {
                    const role = await identity(file);
                    if (role.title === reference || basename(role.path, '.book') === reference) matches.set(role.path, role);
                }
            }
        }
        await walk(join(workspace.projectPath, 'agents'));
        if (matches.size !== 1) throw new InputError(`Agent ${reference} is ${matches.size ? 'ambiguous' : 'missing'}${matches.size ? `: ${[...matches.keys()].join(', ')}` : '; run ptbk init or provide an explicit Book path'}.`);
        selected = [...matches.values()][0]!;
    }
    return { path: selected.path, aliases: [...new Set([reference, selected.title, basename(selected.path, '.book'), selected.path])] };
}

/** Reads explicit context or the project instructions without hidden fallback.
 * @private Internal context resolution.
 */
export async function readContext(workspace: Workspace, context?: string): Promise<string> {
    if (context === '') return '';
    if (context !== undefined) {
        const candidate = resolve(workspace.projectPath, context);
        try { if ((await stat(candidate)).isFile()) return await readFile(candidate, 'utf8'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        return context;
    }
    try { return await readFile(join(workspace.projectPath, 'AGENTS.md'), 'utf8'); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        process.stderr.write(`No project context at ${join(workspace.projectPath, 'AGENTS.md')}.\n`);
        return '';
    }
}
