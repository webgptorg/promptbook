import { chmod, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, writeJsonAtomic } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { ENGINE_ROOT } from '../common/version.js';
import { canonicalPath, type Project } from '../project/workspace.js';

/**
 * Version of the durable known-project registry (kept interoperable across engine versions).
 *
 * @private known-project registry
 */
export const KNOWN_PROJECT_VERSION = 1;

/**
 * Permissions of the per-user registry directory (owner only).
 */
const REGISTRY_DIRECTORY_MODE = 0o700;

/**
 * Historical facts of an engine instance of a known project: live state always comes from verified discovery, never
 * from these fields.
 *
 * @private known-project registry
 */
export type KnownRun = {
    readonly instanceId: string;
    readonly pid: number;
    readonly mode: string;
    readonly engineVersion: string;
    readonly installation: string;
    readonly startedAt: string;
    /** When it ended, if it ended orderly or was force-stopped (absent after a crash or kill without cleanup). */
    readonly endedAt?: string;
    /** How it ended. */
    readonly outcome?: 'stopped' | 'force-stopped' | 'restarted' | 'ended';
};

/**
 * One project known to this OS user's host (`<app data>/projects/<hash>.json`): registered by successful init/start
 * and retained after stop, force stop, panic, process exit and reboot until the operator removes it.
 *
 * It holds only the canonical project path and non-secret launch context (installation and Node used to start it
 * again). It is not a task store, credential catalogue or execution queue, and removing it never touches the project.
 *
 * @private known-project registry
 */
export type KnownProject = {
    readonly version: typeof KNOWN_PROJECT_VERSION;
    /** Canonical project directory (equivalent path spellings are one project). */
    readonly projectRoot: string;
    readonly projectName: string;
    readonly registeredAt: string;
    readonly updatedAt: string;
    /** Installation of the most recent init/start, used by an explicit Start from the global dashboard. */
    readonly installation?: string;
    /** Node executable of the most recent init/start. */
    readonly nodePath?: string;
    /** The most recent engine instance (historical once it ended). */
    readonly lastRun?: KnownRun;
};

/**
 * Directory of the registry for the current OS user.
 *
 * @private known-project registry
 */
export function knownProjectsDirectory(env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'projects');
}

/**
 * The registry form of a project root: its canonical path, so one project has one entry however it was reached (a
 * symlinked launch directory, a relative path or another spelling).
 */
function registryRoot(projectRoot: string): string {
    return canonicalPath(projectRoot);
}

/**
 * File of one project's entry (one canonical project, one file).
 */
function entryPath(projectRoot: string, env: NodeJS.ProcessEnv): string {
    return join(knownProjectsDirectory(env), `${shortHash(registryRoot(projectRoot), 16)}.json`);
}

/**
 * Reads one project's entry.
 *
 * @private known-project registry
 */
export async function readKnownProject(projectRoot: string, env: NodeJS.ProcessEnv = process.env): Promise<KnownProject | undefined> {
    try {
        const entry = JSON.parse(await readFile(entryPath(projectRoot, env), 'utf8')) as KnownProject;
        return entry?.version === KNOWN_PROJECT_VERSION && entry.projectRoot === registryRoot(projectRoot) ? entry : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Registers (or refreshes) a known project after successful init/start; repeated registration keeps one entry.
 *
 * @private known-project registry
 */
export async function registerKnownProject(project: Project, details: { readonly lastRun?: KnownRun; readonly installation?: string; readonly nodePath?: string } = {}, env: NodeJS.ProcessEnv = process.env): Promise<KnownProject> {
    const directory = knownProjectsDirectory(env);
    await ensureDirectory(directory);
    await chmod(directory, REGISTRY_DIRECTORY_MODE).catch(() => undefined);
    const existing = await readKnownProject(project.root, env);
    const now = new Date().toISOString();
    const entry: KnownProject = {
        version: KNOWN_PROJECT_VERSION,
        projectRoot: registryRoot(project.root),
        projectName: project.name,
        registeredAt: existing?.registeredAt ?? now,
        updatedAt: now,
        installation: details.installation ?? details.lastRun?.installation ?? existing?.installation ?? ENGINE_ROOT,
        nodePath: details.nodePath ?? existing?.nodePath ?? process.execPath,
        lastRun: details.lastRun ?? existing?.lastRun,
    };
    await writeJsonAtomic(entryPath(project.root, env), entry, { mode: 0o600 });
    return entry;
}

/**
 * Records how an engine instance ended (only while the entry still describes that instance, never a successor).
 *
 * @private known-project registry
 */
export async function recordRunEnded(project: Project, instanceId: string, outcome: NonNullable<KnownRun['outcome']>, env: NodeJS.ProcessEnv = process.env): Promise<void> {
    const existing = await readKnownProject(project.root, env);
    if (!existing?.lastRun || existing.lastRun.instanceId !== instanceId) return;
    await writeJsonAtomic(entryPath(project.root, env), { ...existing, updatedAt: new Date().toISOString(), lastRun: { ...existing.lastRun, endedAt: new Date().toISOString(), outcome } }, { mode: 0o600 });
}

/**
 * Reads every known project of this OS user. A missing registry is an empty (successful) result; an unreadable one is
 * reported as a problem instead of being presented as zero projects.
 *
 * @private known-project registry
 */
export async function readKnownProjects(env: NodeJS.ProcessEnv = process.env): Promise<{ readonly entries: KnownProject[]; readonly problem?: string }> {
    const directory = knownProjectsDirectory(env);
    let names: string[];
    try {
        names = await readdir(directory);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { entries: [] };
        return { entries: [], problem: `The project registry ${directory} cannot be read: ${errorMessage(error)}` };
    }
    const entries: KnownProject[] = [];
    for (const name of names.filter((item) => item.endsWith('.json'))) {
        try {
            const entry = JSON.parse(await readFile(join(directory, name), 'utf8')) as KnownProject;
            if (entry?.version === KNOWN_PROJECT_VERSION && typeof entry.projectRoot === 'string' && name === `${shortHash(entry.projectRoot, 16)}.json`) entries.push(entry);
        } catch {
            // A torn or foreign file is not a project.
        }
    }
    return { entries: entries.sort((a, b) => a.projectName.localeCompare(b.projectName) || a.projectRoot.localeCompare(b.projectRoot)) };
}

/**
 * Registers a project (after init) and verifies that discovery, the global dashboard's own listing, finds it at its
 * actual initialized path wherever the command was launched from. A problem is returned, never silently ignored.
 *
 * @private known-project registry
 */
export async function ensureKnownProject(project: Project, env: NodeJS.ProcessEnv = process.env): Promise<{ readonly problem?: string }> {
    try {
        await registerKnownProject(project, {}, env);
        const listed = await readKnownProjects(env);
        const root = registryRoot(project.root);
        if (listed.entries.some((entry) => entry.projectRoot === root)) return {};
        return { problem: listed.problem ?? `${root} is not listed in ${knownProjectsDirectory(env)} after registration` };
    } catch (error) {
        return { problem: errorMessage(error) };
    }
}

/**
 * Forgets one known project: only its host-level entry; the project directory and all its data stay untouched. The
 * caller verifies that no engine owns it.
 *
 * @private known-project registry
 */
export async function forgetKnownProject(projectRoot: string, env: NodeJS.ProcessEnv = process.env): Promise<KnownProject | undefined> {
    const existing = await readKnownProject(projectRoot, env);
    await rm(entryPath(projectRoot, env), { force: true });
    return existing;
}

/**
 * Restores an entry that was forgotten while an engine started concurrently (a live registration is never erased).
 *
 * @private known-project registry
 */
export async function restoreKnownProject(entry: KnownProject, env: NodeJS.ProcessEnv = process.env): Promise<void> {
    if (await readKnownProject(entry.projectRoot, env)) return;
    await ensureDirectory(knownProjectsDirectory(env));
    await writeJsonAtomic(entryPath(entry.projectRoot, env), { ...entry, updatedAt: new Date().toISOString() }, { mode: 0o600 });
}
