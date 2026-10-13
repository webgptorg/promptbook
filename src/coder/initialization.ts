import { readFile, readdir, mkdir, stat, realpath, writeFile, rename, unlink, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute, delimiter } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Workspace } from './domain.js';
import { confinePath, InputError, inspectGitRoot, realTarget, requireGit } from './workspace.js';
import { git, readHead, captureSnapshot } from './git.js';
import { runProcess, type ProcessOptions } from './harness.js';
import { discoverAgents } from './agents.js';
import { readProjectConfiguration } from './configuration.js';
import { inspectProjectCheck } from './check-setup.js';

/** Explicitly authorized versioning boundaries for a newly selected child project. @private */
export type NestedProjectStrategy = 'back' | 'ignored' | 'submodule';

/** Read-only destination inspection used before the initialization wizard writes anything. @private */
export interface InitializationDestination {
    destination: string; exists: boolean; empty: boolean; fresh: boolean; nested: boolean;
    parentGitRoot?: string; resumable?: boolean;
}

/** Shared artifact readiness separates missing initialization from deferred execution prerequisites. @private */
export interface ProjectReadiness { ready: boolean; missing: string[]; execution: string[] }

/** Generated support edits awaiting review are owned runtime state, never a reason to commit user changes. */
interface InitializationPending { version: 1; paths: string[] }

/** Read confined pending artifact paths without clearing recovery evidence during inspection. */
async function readInitializationPending(workspace: Workspace): Promise<{ file: string; text?: string; paths: string[] }> {
    const file = await confinePath(workspace.projectPath, join(workspace.statePath, 'initialization-pending.json'));
    let text: string;
    try { text = await readFile(file, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { file, paths: [] }; throw error; }
    let record: InitializationPending;
    try { record = JSON.parse(text) as InitializationPending; }
    catch { throw new InputError(`${file}: invalid initialization pending record; inspect it before continuing setup.`); }
    if (record?.version !== 1 || !Array.isArray(record.paths) || record.paths.some(path => typeof path !== 'string' || !path || isAbsolute(path))) throw new InputError(`${file}: invalid pending artifact paths; inspect the preserved record.`);
    const paths: string[] = [];
    for (const path of record.paths) paths.push(await confinePath(workspace.projectPath, resolve(workspace.projectPath, path)));
    return { file, text, paths: [...new Set(paths)] };
}

/** Retain only pending artifacts whose generated edits still lack a clean, tracked Git baseline. */
async function activeInitializationPending(workspace: Workspace, paths: string[]): Promise<string[]> {
    if (!paths.length) return [];
    const root = await inspectGitRoot(workspace.projectPath);
    if (!root) return paths;
    const snapshot = await captureSnapshot(root);
    const dirty = new Set(snapshot.dirtyPaths);
    const tracked = new Set(snapshot.index.split('\0').filter(Boolean).map(entry => entry.slice(entry.indexOf('\t') + 1)));
    return paths.filter(path => {
        const name = relative(root, path).split('\\').join('/');
        return !tracked.has(name) || dirty.has(name);
    });
}

/** Record generated edits that overlap owner work, clearing resolved records only during authorized init. @private */
export async function persistInitializationPending(workspace: Workspace, paths: string[]): Promise<void> {
    const previous = await readInitializationPending(workspace);
    const merged = new Set(previous.paths);
    for (const path of paths) merged.add(await confinePath(workspace.projectPath, resolve(workspace.projectPath, path)));
    const pending = await activeInitializationPending(workspace, [...merged]);
    if (!pending.length) {
        if (previous.text !== undefined) {
            if (await readFile(previous.file, 'utf8') !== previous.text) throw new InputError(`${previous.file}: pending initialization changed concurrently; its new evidence was preserved.`);
            await unlink(previous.file);
        }
        return;
    }
    const record: InitializationPending = { version: 1, paths: pending.map(path => relative(workspace.projectPath, path).split('\\').join('/')).sort() };
    const updated = `${JSON.stringify(record, null, 4)}\n`;
    if (previous.text === updated) return;
    await mkdir(dirname(previous.file), { recursive: true });
    const temporary = `${previous.file}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, updated, { flag: 'wx' });
        const current = await readFile(previous.file, 'utf8').catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; });
        if (current !== previous.text) throw new InputError(`${previous.file}: pending initialization changed concurrently; its new evidence was preserved.`);
        await rename(temporary, previous.file);
    } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
}

/** Inspect setup without changing files, installing tools, committing or calling a model. @private */
export async function inspectProjectReadiness(workspace: Workspace, options: { check?: string } = {}): Promise<ProjectReadiness> {
    const missing: string[] = []; const execution: string[] = [];
    const root = await inspectGitRoot(workspace.projectPath);
    if (!root) missing.push('Git working tree');
    const configuration = await readProjectConfiguration(workspace.projectPath);
    if (!configuration.exists) missing.push('ptbk.json');
    /** Validate existing path boundaries and classify absent files or directories individually. */
    const required = async (target: string, label: string, directory = false): Promise<boolean> => {
        const path = await confinePath(workspace.projectPath, target);
        try {
            const attributes = await stat(path);
            if (directory ? !attributes.isDirectory() : !attributes.isFile()) throw new InputError(`Required ${label} has the wrong file type: ${path}`);
            return true;
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; missing.push(label); return false; }
    };
    await required(workspace.tasksPath, 'task directory', true);
    await required(join(workspace.tasksPath, 'templates', 'task.book'), 'task template');
    if (await required(join(workspace.projectPath, 'AGENTS.md'), 'project instructions') && !(await readFile(join(workspace.projectPath, 'AGENTS.md'), 'utf8')).trim()) execution.push('Add readable project instructions to AGENTS.md.');
    for (const role of ['adam', 'manager', 'teacher']) await required(join(workspace.projectPath, 'agents', '.core', `${role}.book`), `core agent ${role}`);
    const agents = await discoverAgents(workspace.projectPath);
    for (const role of ['adam', 'manager', 'teacher']) {
        const path = await confinePath(workspace.projectPath, join(workspace.projectPath, 'agents', '.core', `${role}.book`));
        const definition = agents.find(agent => agent.path === path);
        if (definition && definition.normalizedName !== role) throw new InputError(`${path}: required core Book must be named ${role}; existing customization was preserved.`);
    }
    for (const role of ['developer', 'planner', 'lawyer', 'copywriter']) if (!agents.some(agent => agent.normalizedName === role)) missing.push(`project agent ${role}`);
    const manifest = await packageMetadata(join(workspace.projectPath, 'package.json'));
    if (!manifest) missing.push('package.json');
    const validation = await inspectProjectCheck(workspace, options.check);
    if (validation.diagnostic) execution.push(`Configure a real project check command before executing tasks. Set ptbk.json execution.check or use ptbk init --check COMMAND. ${validation.diagnostic}`);
    if (root) {
        const runtime = relative(root, join(workspace.projectPath, '.ptbk', 'readiness')).split('\\').join('/');
        if (!(await git(root, ['check-ignore', '--no-index', '--', runtime], { allowFailure: true })).trim()) missing.push('.ptbk/ runtime ignore rule');
        if (!await readHead(root)) execution.push('Commit the setup baseline before unattended execution.');
    }
    const installation = await inspectLocalInstallation(workspace.projectPath);
    if (installation.declared && !installation.usable) execution.push(`Repair the declared local ptbk installation (${installation.requestedVersion}).`);
    const pending = await activeInitializationPending(workspace, (await readInitializationPending(workspace)).paths);
    if (pending.length) execution.push(`Review and commit generated setup edits that overlap existing work: ${pending.map(path => relative(workspace.projectPath, path)).join(', ')}. Unrelated staged and unstaged changes were preserved.`);
    return { ready: !missing.length, missing, execution };
}

/** An initialized child boundary, whose parent metadata remains uncommitted. @private */
export interface PreparedInitializationDestination extends InitializationDestination {
    cancelled: boolean; parentChanges: string[]; nestedStrategy?: NestedProjectStrategy; submoduleSource?: string;
}

/** Durable ownership information permits resuming our own partial nested initialization. */
interface InitializationBoundary {
    version: 1; strategy: 'ignored' | 'submodule'; parentGitRoot: string; destination: string; source?: string;
}

/** Walk to an existing directory without creating destination ancestors. */
async function existingDirectory(path: string): Promise<string> {
    for (;;) {
        try {
            if (!(await stat(path)).isDirectory()) throw new InputError(`Initialization parent is not a directory: ${path}`);
            return await realpath(path);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            const parent = dirname(path);
            if (parent === path) throw error;
            path = parent;
        }
    }
}

/** Load only a matching initialization ownership record; arbitrary embedded repositories remain invalid. */
async function readBoundary(destination: string, parentGitRoot?: string): Promise<InitializationBoundary | undefined> {
    try {
        const path = await confinePath(destination, join(destination, '.ptbk', 'initialization-boundary.json'));
        const value = JSON.parse(await readFile(path, 'utf8')) as InitializationBoundary;
        if (value.version !== 1 || !['ignored', 'submodule'].includes(value.strategy) || value.destination !== destination || value.parentGitRoot !== parentGitRoot) return undefined;
        return value;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return undefined;
        throw error;
    }
}

/** Inspect the actual selected destination, including enclosing worktrees and partial owned setup. @private */
export async function inspectInitializationDestination(destination: string, options: { newProject?: boolean } = {}): Promise<InitializationDestination> {
    destination = await realTarget(resolve(destination));
    let exists = true; let empty = true;
    try {
        if (!(await stat(destination)).isDirectory()) throw new InputError(`Initialization destination is not a directory: ${destination}`);
        empty = (await readdir(destination)).length === 0;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; exists = false; }
    const parentDirectory = await existingDirectory(dirname(destination));
    const parentGitRoot = await inspectGitRoot(parentDirectory);
    const ownGitRoot = exists ? await inspectGitRoot(destination) : undefined;
    const nested = !!options.newProject && !!parentGitRoot && parentGitRoot !== destination;
    const boundary = exists && nested ? await readBoundary(destination, parentGitRoot) : undefined;
    const resumable = !!boundary && ownGitRoot === destination;
    if (options.newProject && exists && !empty && !resumable) throw new InputError(`New project destination is not empty: ${destination}. Select an empty folder or initialize this existing project in place.`);
    return { destination, exists, empty, fresh: empty && (!ownGitRoot || nested), nested, ...(parentGitRoot ? { parentGitRoot } : {}), ...(resumable ? { resumable: true } : {}) };
}

/** Escape a literal directory path for a root-anchored Git ignore rule. */
function ignoredDirectoryRule(path: string): string {
    return `/${path.replace(/\\/g, '\\\\').replace(/[?*\[\]]/g, '\\$&').replace(/ +$/g, spaces => spaces.replace(/ /g, '\\ '))}/`;
}

/** Append a root ignore entry without changing staged bytes or replacing concurrent edits. */
async function ignoreChild(parentGitRoot: string, destination: string): Promise<string[]> {
    const child = relative(parentGitRoot, destination).split('\\').join('/');
    const ignored = (await git(parentGitRoot, ['check-ignore', '--verbose', '--stdin', '-z', '--no-index'], { input: `${child}\0`, allowFailure: true })).split('\0');
    const source = ignored[0]; const pattern = ignored[2];
    if (source && pattern && !pattern.startsWith('!') && /(?:^|[\\/])\.gitignore$/.test(source)) {
        const distance = relative(parentGitRoot, await realTarget(resolve(parentGitRoot, source)));
        if (distance !== '..' && !distance.startsWith('../') && !distance.startsWith('..\\') && !isAbsolute(distance)) return [];
    }
    const target = await confinePath(parentGitRoot, join(parentGitRoot, '.gitignore'));
    let previous = ''; let exists = true;
    try { previous = await readFile(target, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; exists = false; }
    const line = ignoredDirectoryRule(child);
    if (previous.split(/\r?\n/).includes(line)) return [];
    const updated = `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}${line}\n`;
    if (!exists) await writeFile(target, updated, { flag: 'wx' });
    else {
        const temporary = `${target}.${randomUUID()}.tmp`;
        try {
            await writeFile(temporary, updated, { flag: 'wx', mode: (await stat(target)).mode });
            if (await readFile(target, 'utf8') !== previous) throw new InputError(`Parent ignore file changed concurrently: ${target}; retry initialization.`);
            await rename(temporary, target);
        } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
    }
    return [target];
}

/** Establish Git before project artifacts or installations, requiring an explicit nested boundary. @private */
export async function prepareInitializationDestination(options: {
    destination: string; newProject?: boolean; nestedStrategy?: NestedProjectStrategy; submoduleSource?: string; signal?: AbortSignal;
}): Promise<PreparedInitializationDestination> {
    const inspected = await inspectInitializationDestination(options.destination, { newProject: options.newProject });
    if (options.nestedStrategy === 'back') return { ...inspected, cancelled: true, parentChanges: [], nestedStrategy: 'back' };
    if (inspected.exists) await readProjectConfiguration(inspected.destination);
    if (inspected.nested && !options.nestedStrategy) throw new InputError(`New project ${inspected.destination} is inside ${inspected.parentGitRoot}. Choose --nested-strategy ignored or --nested-strategy submodule before initialization.`);
    if (!inspected.nested && options.nestedStrategy) throw new InputError('A nested-project strategy applies only to a new child project inside an enclosing Git repository.');
    const previous = inspected.resumable ? await readBoundary(inspected.destination, inspected.parentGitRoot) : undefined;
    if (previous && previous.strategy !== options.nestedStrategy) throw new InputError('Partial child initialization uses a different versioning boundary. Resolve that existing setup before changing choices.');
    const suppliedSource = options.submoduleSource ?? previous?.source;
    const source = suppliedSource && !/^(?:[a-z][a-z0-9+.-]*:\/\/|[^/\\]+@[^:]+:)/i.test(suppliedSource) ? resolve(suppliedSource) : suppliedSource;
    if (previous && previous.source !== source) throw new InputError('Partial child initialization uses a different submodule source. Resolve that existing setup before changing choices.');
    if (options.nestedStrategy === 'submodule' && !source?.trim()) throw new InputError('Git submodule initialization requires --submodule-source with a usable repository source for later checkout. No parent or child files were changed.');
    if (source && /^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
        let url: URL;
        try { url = new URL(source); }
        catch { throw new InputError('Submodule source is not a valid URL. No parent or child files were changed.'); }
        if (url.password || /^https?:$/.test(url.protocol) && url.username) throw new InputError('Submodule sources cannot embed credentials in versioned parent metadata. Use the Git credential helper instead.');
    }
    if (inspected.parentGitRoot && inspected.nested) {
        const child = relative(inspected.parentGitRoot, inspected.destination).split('\\').join('/');
        if (/\r|\n/.test(child) || child.startsWith('../') || isAbsolute(child)) throw new InputError('Nested project paths must be inside the parent repository and cannot contain newlines.');
        const tracked = await git(inspected.parentGitRoot, ['ls-files', '-z', '--', child]);
        if (tracked && !previous) throw new InputError(`Parent repository already tracks ${child}. Resolve the tracked content explicitly before creating a child project.`);
        if (tracked && previous?.strategy === 'ignored') throw new InputError(`Parent repository now tracks ${child}. Resolve the tracked content explicitly before continuing.`);
        if (tracked && previous?.strategy === 'submodule') {
            const entry = await git(inspected.parentGitRoot, ['ls-files', '--stage', '-z', '--', child]);
            if (!/^160000 [a-f0-9]+ 0\t[^\0]+\0$/.test(entry)) throw new InputError(`Parent repository tracks content inside ${child}; no entries were removed.`);
        }
    }
    const parentChanges = inspected.nested && options.nestedStrategy === 'ignored' ? await ignoreChild(inspected.parentGitRoot!, inspected.destination) : [];
    if (!previous) {
        try {
            if (options.nestedStrategy === 'submodule') {
                const parent = await existingDirectory(dirname(inspected.destination));
                await mkdir(dirname(inspected.destination), { recursive: true });
                try { await git(parent, ['clone', '--', source!, inspected.destination], { signal: options.signal }); }
                catch (error) { throw new InputError(`Submodule source could not be prepared: ${(error as Error).message}. Parent submodule metadata was not registered; inspect any partial child files before retrying.`); }
            } else {
                await mkdir(inspected.destination, { recursive: true });
                if (!await inspectGitRoot(inspected.destination) || inspected.nested) await git(inspected.destination, ['init'], { signal: options.signal });
            }
            if (inspected.nested) {
                const runtime = await confinePath(inspected.destination, join(inspected.destination, '.ptbk'));
                await mkdir(runtime, { recursive: true });
                const boundary: InitializationBoundary = { version: 1, strategy: options.nestedStrategy as 'ignored' | 'submodule', parentGitRoot: inspected.parentGitRoot!, destination: inspected.destination, ...(source ? { source } : {}) };
                await writeFile(join(runtime, 'initialization-boundary.json'), `${JSON.stringify(boundary, null, 2)}\n`, { flag: 'wx' });
            }
        } catch (error) {
            throw new InputError(`Initialization boundary is incomplete: ${(error as Error).message}${parentChanges.length ? ` Parent ignore change was preserved at ${parentChanges.join(', ')}; it was not committed.` : ''} Inspect preserved child files before retrying; no unrelated files were removed.`);
        }
    }
    return { ...inspected, cancelled: false, parentChanges, ...(options.nestedStrategy ? { nestedStrategy: options.nestedStrategy } : {}), ...(source ? { submoduleSource: source } : {}) };
}

/** Register a committed child as a real submodule while preserving unrelated parent index entries. @private */
export async function finalizeInitializationDestination(prepared: PreparedInitializationDestination, options: { signal?: AbortSignal } = {}): Promise<string[]> {
    if (prepared.cancelled || prepared.nestedStrategy !== 'submodule') return [];
    const root = prepared.parentGitRoot!;
    const child = relative(root, prepared.destination).split('\\').join('/');
    const head = await readHead(prepared.destination);
    if (!head) throw new InputError('Submodule setup is incomplete: commit the child baseline before registering the parent reference. Parent changes remain uncommitted.');
    const metadata = await confinePath(root, join(root, '.gitmodules'));
    const previous = await readFile(metadata, 'utf8').catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return ''; throw error; });
    const registered = (await git(root, ['config', '--file', metadata, '--get', `submodule.${child}.path`], { allowFailure: true })).trim();
    if (registered && registered !== child) throw new InputError(`Existing submodule registration conflicts with ${child}; inspect ${metadata}.`);
    const indexDirectory = await confinePath(prepared.destination, join(prepared.destination, '.ptbk', 'indexes'));
    await mkdir(indexDirectory, { recursive: true });
    const index = join(indexDirectory, `${randomUUID()}.index`);
    const env = { GIT_INDEX_FILE: index };
    const beforeReference = await git(root, ['ls-files', '--stage', '-z', '--', child]);
    try {
        // Git submodule add stages its metadata. Use a private index so existing parent staging is preserved.
        await git(root, ['read-tree', (await readHead(root)) ?? '--empty'], { env, signal: options.signal });
        if (!registered) await git(root, ['submodule', 'add', '--force', '--', prepared.submoduleSource!, child], { env, signal: options.signal });
        else {
            const existingSource = (await git(root, ['config', '--file', metadata, '--get', `submodule.${child}.url`])).trim();
            if (existingSource !== prepared.submoduleSource) throw new InputError(`Existing submodule source differs for ${child}; preserve it or explicitly resolve the registration.`);
            await git(root, ['update-index', '--add', '--cacheinfo', `160000,${head},${child}`], { env, signal: options.signal });
            await git(root, ['submodule', 'init', '--', child], { env, signal: options.signal });
        }
        await git(root, ['submodule', 'absorbgitdirs', '--', child], { env, signal: options.signal });
        // Only the new gitlink belongs to this explicit boundary decision; other staged content remains untouched.
        if (await git(root, ['ls-files', '--stage', '-z', '--', child]) !== beforeReference) throw new InputError(`Parent reference for ${child} changed concurrently; its new value was preserved.`);
        if (beforeReference !== `160000 ${head} 0\t${child}\0`) await git(root, ['update-index', '--add', '--cacheinfo', `160000,${head},${child}`], { signal: options.signal });
    } catch (error) { throw new InputError(`Submodule registration is incomplete: ${(error as Error).message}. The child baseline and completed parent metadata were preserved; parent changes were not committed.`); }
    finally { await unlink(index).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
    const current = await readFile(metadata, 'utf8');
    return [...(current !== previous ? [metadata] : []), ...(beforeReference !== `160000 ${head} 0\t${child}\0` ? [prepared.destination] : [])];
}

/** Declared destination-local installation, separate from any parent project's executable. @private */
export interface LocalEngineInstallation {
    declared: boolean; usable: boolean; version?: string; requestedVersion?: string; section?: 'dependencies' | 'devDependencies';
}

/** Parse project metadata with a specific diagnostic instead of silently treating invalid JSON as absence. */
async function packageMetadata(path: string): Promise<Record<string, unknown> | undefined> {
    try {
        const value: unknown = JSON.parse(await readFile(path, 'utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError(`Invalid package metadata at ${path}: expected an object.`);
        return value as Record<string, unknown>;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        if (error instanceof SyntaxError) throw new InputError(`Invalid package metadata at ${path}: ${error.message}`);
        throw error;
    }
}

/** Check the package and executable from this exact node_modules directory. */
async function installedEngine(packageDirectory: string, executable?: string): Promise<{ usable: boolean; version?: string }> {
    const metadata = await packageMetadata(join(packageDirectory, 'package.json'));
    if (!metadata || metadata.name !== 'ptbk' || typeof metadata.version !== 'string') return { usable: false };
    const bin = typeof metadata.bin === 'string' ? metadata.bin : (metadata.bin as Record<string, unknown> | undefined)?.ptbk;
    if (typeof bin !== 'string') return { usable: false, version: metadata.version };
    try {
        if (!(await stat(resolve(packageDirectory, bin))).isFile()) return { usable: false, version: metadata.version };
        if (executable && !(await stat(executable)).isFile()) return { usable: false, version: metadata.version };
        return { usable: true, version: metadata.version };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return { usable: false, version: metadata.version }; }
}

/** A global package is available only when PATH resolves its global executable, not a parent-local copy. */
async function globalEngineOnPath(packageDirectory: string): Promise<boolean> {
    const metadata = await packageMetadata(join(packageDirectory, 'package.json'));
    const bin = typeof metadata?.bin === 'string' ? metadata.bin : (metadata?.bin as Record<string, unknown> | undefined)?.ptbk;
    if (typeof bin !== 'string') return false;
    const expected = await realpath(resolve(packageDirectory, bin));
    for (const directory of (process.env.PATH || process.env.Path || '').split(delimiter).filter(Boolean)) {
        for (const name of process.platform === 'win32' ? ['ptbk.exe', 'ptbk.cmd', 'ptbk'] : ['ptbk']) {
            const candidate = join(directory, name);
            try {
                await access(candidate, constants.X_OK);
                const canonical = await realpath(candidate);
                if (canonical === expected || process.platform === 'win32' && canonical.toLowerCase() === resolve(dirname(dirname(packageDirectory)), name).toLowerCase()) return true;
                // PATH chooses its first executable; do not describe a later global copy as the selected command.
                return false;
            } catch (error) { if (!['ENOENT', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error; }
        }
    }
    return false;
}

/** Inspect dependencies and devDependencies without inheriting an ancestor's installation. @private */
export async function inspectLocalInstallation(projectPath: string): Promise<LocalEngineInstallation> {
    const metadata = await packageMetadata(join(projectPath, 'package.json'));
    const dependencies = metadata?.dependencies as Record<string, unknown> | undefined;
    const devDependencies = metadata?.devDependencies as Record<string, unknown> | undefined;
    const section = dependencies?.ptbk !== undefined ? 'dependencies' : devDependencies?.ptbk !== undefined ? 'devDependencies' : undefined;
    const requestedVersion = section ? (metadata?.[section] as Record<string, unknown>).ptbk : undefined;
    if (section && (typeof requestedVersion !== 'string' || !requestedVersion.trim())) throw new InputError(`Invalid ptbk declaration at ${join(projectPath, 'package.json')}:${section}.ptbk.`);
    const installed = section ? await installedEngine(join(projectPath, 'node_modules', 'ptbk'), join(projectPath, 'node_modules', '.bin', process.platform === 'win32' ? 'ptbk.cmd' : 'ptbk')) : { usable: false };
    return { declared: !!section, ...installed, ...(section ? { section, requestedVersion: requestedVersion as string } : {}) };
}

/** Authorized local installation choices and injectable process runner for deterministic tests. @private */
export interface InstallProjectEngineOptions {
    choice?: 'local' | 'global'; version?: string; signal?: AbortSignal;
    run?: (command: string, args: string[], options: ProcessOptions) => Promise<{ exitCode: number | null; output: string; spawnError?: string }>;
}

/** Truthful installation outcome; deferred global availability is an explicit unresolved requirement. @private */
export interface ProjectEngineInstallationResult {
    changed: string[]; alreadyReady: boolean; unresolved: string[]; version?: string; section?: 'dependencies' | 'devDependencies';
}

/** Select the existing project's package manager so its lockfile remains the applicable one. */
async function packageManager(projectPath: string, metadata?: Record<string, unknown>): Promise<'npm' | 'pnpm' | 'yarn' | 'bun'> {
    if (typeof metadata?.packageManager === 'string') {
        const manager = metadata.packageManager.split('@')[0];
        if (!['npm', 'pnpm', 'yarn', 'bun'].includes(manager!)) throw new InputError(`Unsupported package manager ${metadata.packageManager}; install the selected ptbk version with this project's package manager.`);
        return manager as 'npm' | 'pnpm' | 'yarn' | 'bun';
    }
    const files = await readdir(projectPath);
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('bun.lock') || files.includes('bun.lockb')) return 'bun';
    return 'npm';
}

/** Prevent package managers with shared workspace lockfiles from mutating an enclosing project. */
async function requireLocalPackageManagerBoundary(projectPath: string, manager: 'npm' | 'pnpm' | 'yarn' | 'bun'): Promise<void> {
    if (manager === 'npm') return;
    const local = await readdir(projectPath);
    if (manager === 'yarn' && local.includes('yarn.lock')) return;
    let directory = dirname(projectPath);
    for (;;) {
        const files = await readdir(directory);
        let workspace = manager === 'pnpm' && files.includes('pnpm-workspace.yaml') || manager === 'yarn' && files.includes('yarn.lock');
        if (manager !== 'pnpm' && files.includes('package.json')) {
            try {
                const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as { workspaces?: unknown };
                workspace ||= metadata?.workspaces !== undefined;
            } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
        }
        if (workspace) throw new InputError(`The ${manager} installation would use enclosing workspace metadata at ${directory}, outside the selected project. Initialize at that workspace root, or use the global CLI; no dependency installation was started.`);
        const parent = dirname(directory);
        if (parent === directory) return;
        directory = parent;
    }
}

/** Install only after a destination-specific choice, preserving existing declarations and exact engine version. @private */
export async function installProjectEngine(workspace: Workspace, options: InstallProjectEngineOptions = {}): Promise<ProjectEngineInstallationResult> {
    const existing = await inspectLocalInstallation(workspace.projectPath);
    if (existing.declared && existing.usable) return { changed: [], alreadyReady: true, unresolved: [], version: existing.version, section: existing.section };
    if (!existing.declared && !options.choice) throw new InputError('Choose a destination installation before setup: --installation local installs the running ptbk version, or --installation global uses an available global CLI.');
    const run = options.run ?? runProcess;
    if (!existing.declared && options.choice === 'global') {
        const probe = await run('npm', ['root', '--global'], { cwd: workspace.projectPath, signal: options.signal, timeoutMs: 10_000, maxOutputBytes: 32_000 });
        const location = probe.output.trim();
        const global = probe.exitCode === 0 && location && isAbsolute(location) ? await installedEngine(join(location, 'ptbk')) : { usable: false };
        const available = global.usable && await globalEngineOnPath(join(location, 'ptbk'));
        return { changed: [], alreadyReady: available, unresolved: available ? [] : [global.usable ? 'Global ptbk is installed, but PATH does not select its executable. Add the global npm bin directory to PATH, or choose the project local installation.' : 'Global ptbk is unavailable. Install it with npm install -g ptbk, or choose the project local installation.'], ...(global.version ? { version: global.version } : {}) };
    }
    await requireGit(workspace);
    const manifestPath = await confinePath(workspace.projectPath, join(workspace.projectPath, 'package.json'));
    const metadata = await packageMetadata(manifestPath);
    const manager = await packageManager(workspace.projectPath, metadata);
    await requireLocalPackageManagerBoundary(workspace.projectPath, manager);
    const version = options.version ?? (JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version;
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new InputError(`Running engine version is invalid: ${version}; no dependency was installed.`);
    const names = ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'];
    const before = new Map<string, Buffer | undefined>();
    for (const name of names) {
        const path = await confinePath(workspace.projectPath, join(workspace.projectPath, name));
        before.set(name, await readFile(path).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; }));
    }
    await confinePath(workspace.projectPath, join(workspace.projectPath, 'node_modules'));
    const destinationArgs = manager === 'npm' ? ['--prefix', workspace.projectPath, '--workspaces=false'] : [];
    const args = existing.declared ? ['install', ...destinationArgs] : manager === 'npm' ? ['install', ...destinationArgs, '--save-prod', '--save-exact', `ptbk@${version}`] : ['add', manager === 'pnpm' ? '--save-exact' : '--exact', `ptbk@${version}`];
    const result = await run(manager, args, { cwd: workspace.projectPath, signal: options.signal, timeoutMs: 300_000, maxOutputBytes: 1024 * 1024 });
    if (result.exitCode !== 0 || result.spawnError) throw new InputError(`Local Promptbook installation failed for ${existing.requestedVersion ?? version}: ${result.spawnError || result.output.trim() || 'package manager exited unsuccessfully'}. No replacement version was selected; inspect any package metadata changes before retrying.`);
    const installed = await inspectLocalInstallation(workspace.projectPath);
    if (!installed.usable || !installed.declared) throw new InputError('The package manager completed, but the selected destination has no usable local ptbk executable. Setup remains incomplete.');
    if (existing.declared && (installed.section !== existing.section || installed.requestedVersion !== existing.requestedVersion)) throw new InputError('The package manager changed the existing ptbk declaration. Restore its requested version and dependency section; setup remains incomplete.');
    if (!existing.declared && (installed.section !== 'dependencies' || installed.requestedVersion !== version || installed.version !== version)) throw new InputError(`Local installation did not retain the exact running engine version ${version} in dependencies; setup remains incomplete.`);
    const afterMetadata = await packageMetadata(manifestPath);
    for (const section of ['scripts', 'dependencies', 'devDependencies']) {
        const original = { ...(metadata?.[section] as Record<string, unknown> | undefined) };
        const updated = { ...(afterMetadata?.[section] as Record<string, unknown> | undefined) };
        if (section !== 'scripts') { delete original.ptbk; delete updated.ptbk; }
        const names = [...new Set([...Object.keys(original), ...Object.keys(updated)])];
        if (names.some(name => original[name] !== updated[name])) throw new InputError(`The package manager changed unrelated ${section} in ${manifestPath}. Inspect the preserved metadata before completing setup.`);
    }
    const changed: string[] = [];
    for (const name of names) {
        const path = await confinePath(workspace.projectPath, join(workspace.projectPath, name));
        const after = await readFile(path).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; });
        const previous = before.get(name);
        if (!previous || !after ? previous !== after : !previous.equals(after)) changed.push(path);
    }
    return { changed, alreadyReady: false, unresolved: [], version: installed.version, section: installed.section };
}
