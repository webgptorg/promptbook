import { randomUUID } from 'node:crypto';
import { chmod, cp, lstat, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { PtbkError } from '../common/errors.js';
import { pathExists } from '../common/fs.js';
import { sharedProjectsRoot } from '../common/user-home.js';
import { inspectGit } from '../project/git.js';
import { canonicalPath, projectAt, type Project } from '../project/workspace.js';
import { assertPrivate, createPrivateFile, ensurePrivateDirectory, readPrivateFile, syncDirectory, writePrivateFile } from './files.js';

/** The engine's durable bootstrap record. All paths are chosen by the host. @private project onboarding */
export type PendingProject = {
    readonly id: string;
    readonly projectsHome: string;
    readonly workspace: Project;
    readonly target?: string;
};

/** Private marker of a service that can start before it owns a project folder. */
const PENDING_FILE = 'pending-project.json';

/** A stable ID can also identify a retried unattended installation. */
const PENDING_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Name shown for a still-unnamed project in the local Dashboard. @private project onboarding */
export function pendingProjectName(id: string): string {
    return `Project setup (${id.slice(0, 8)})`;
}

/** Root of host-local initialization state, outside the projects and their Git repositories. */
function pendingRoot(env: NodeJS.ProcessEnv): string {
    return canonicalPath(resolve(promptbookAppData(env), 'initializations'));
}

/** Validates a stored bootstrap record before any project path can be used. @private project onboarding */
export async function readPendingProject(workspace: Project, env: NodeJS.ProcessEnv): Promise<PendingProject | undefined> {
    const id = basename(workspace.root);
    if (!PENDING_ID.test(id) || dirname(workspace.root) !== pendingRoot(env)) return undefined;
    const text = await readPrivateFile(workspace.root, PENDING_FILE);
    if (text === undefined) return undefined;
    const data = JSON.parse(text) as { id: string; projectsHome: string; target?: string };
    if (!data || data.id !== id || typeof data.projectsHome !== 'string' || resolve(data.projectsHome) !== data.projectsHome ||
        (data.target !== undefined && (typeof data.target !== 'string' || dirname(data.target) !== data.projectsHome))) {
        throw new PtbkError('The saved initialization record is invalid.', { kind: 'configuration' });
    }
    return { ...data, workspace };
}

/** Opens or creates an initialization under the local user's project-home policy. @private project onboarding */
export async function createPendingProject(env: NodeJS.ProcessEnv, id: string = randomUUID()): Promise<PendingProject> {
    if (!PENDING_ID.test(id)) throw new PtbkError('Use a 1–64 character initialization ID made of lowercase letters, digits or hyphens.', { kind: 'usage' });
    const directory = pendingRoot(env);
    await ensurePrivateDirectory(directory);
    const workspace = projectAt(join(directory, id));
    await ensurePrivateDirectory(workspace.root);
    const existing = await readPendingProject(workspace, env);
    if (existing) return existing;
    const projectsHome = sharedProjectsRoot(env);
    await mkdir(projectsHome, { recursive: true });
    const canonicalHome = canonicalPath(projectsHome);
    const git = await inspectGit(canonicalHome);
    if (git.state !== 'not-repository') {
        throw new PtbkError('The projects home needs to be outside a Git repository to start this initialization.', { kind: 'setup', project: canonicalHome });
    }
    try {
        await createPrivateFile(workspace.root, PENDING_FILE, JSON.stringify({ id, projectsHome: canonicalHome }));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    return (await readPendingProject(workspace, env))!;
}

/** Selects an existing initialization without creating one on a misspelt ID. @private project onboarding */
export async function selectPendingProject(id: string, env: NodeJS.ProcessEnv): Promise<PendingProject> {
    if (!PENDING_ID.test(id)) throw new PtbkError('The initialization ID is invalid.', { kind: 'usage' });
    const record = await readPendingProject(projectAt(join(pendingRoot(env), id)), env);
    if (!record) throw new PtbkError('This initialization does not exist on this host.', { kind: 'not-found' });
    return record;
}

/** Finds unfinished or completed host-local initializations for discovery and retries. @private project onboarding */
export async function listPendingProjects(env: NodeJS.ProcessEnv): Promise<PendingProject[]> {
    const directory = pendingRoot(env);
    const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    const records = await Promise.all(entries.filter((entry) => entry.isDirectory() && PENDING_ID.test(entry.name))
        .map(async (entry) => await readPendingProject(projectAt(join(directory, entry.name)), env)));
    return records.filter((record): record is PendingProject => Boolean(record));
}

/** Private staging directory on the target filesystem for an atomic project handoff. @private project onboarding */
export function pendingStage(record: PendingProject): string {
    return join(record.projectsHome, '.ptbk-initializations', record.id);
}

/** The marker checked on both sides of a retryable directory rename. */
const HANDOFF_FILE = 'initialization-id';

/** Ensures the final path is a new direct child of the pinned projects home. */
async function checkTarget(record: PendingProject, target: string): Promise<void> {
    if (dirname(target) !== record.projectsHome || basename(target).startsWith('.') || canonicalPath(record.projectsHome) !== record.projectsHome) {
        throw new PtbkError('Choose a project folder inside the original projects home.', { kind: 'setup' });
    }
    const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
    });
    if (existing) throw new PtbkError('The selected project folder already exists. Choose another name.', { kind: 'conflict', project: target });
}

/** Starts the final write in a private staging directory, allowing interrupted writes to be rebuilt. @private project onboarding */
export async function preparePendingStage(record: PendingProject, target: string): Promise<string> {
    await checkTarget(record, target);
    const stage = pendingStage(record);
    await ensurePrivateDirectory(dirname(stage));
    if (await pathExists(stage)) {
        await assertPrivate(stage, 'directory');
        await rm(stage, { recursive: true });
    }
    await ensurePrivateDirectory(stage);
    return stage;
}

/** Records a complete staged project before shutting down the bootstrap connection. @private project onboarding */
export async function savePendingHandoff(record: PendingProject, target: string): Promise<void> {
    const stage = projectAt(pendingStage(record));
    if (process.platform !== 'win32' && await pathExists(stage.runtime.root)) await chmod(stage.runtime.root, 0o700);
    await ensurePrivateDirectory(stage.runtime.root);
    await writePrivateFile(stage.runtime.root, HANDOFF_FILE, record.id);
    await writePrivateFile(record.workspace.root, PENDING_FILE, JSON.stringify({ id: record.id, projectsHome: record.projectsHome, target }));
}

/** Publishes the complete staged project and transfers the original App identity while its connection is closed. @private project onboarding */
export async function publishPendingProject(record: PendingProject): Promise<Project> {
    if (!record.target) throw new Error('This initialization has no completed project.');
    const target = projectAt(record.target);
    if (target.root !== record.target) throw new PtbkError('The selected project path now points elsewhere.', { kind: 'conflict' });
    if (await readPrivateFile(target.runtime.root, HANDOFF_FILE) === record.id) return target;
    await checkTarget(record, target.root);
    const stage = projectAt(pendingStage(record));
    if (await readPrivateFile(stage.runtime.root, HANDOFF_FILE) !== record.id) throw new Error('The completed staged project could not be verified.');
    if (await pathExists(record.workspace.runtime.app)) {
        await rename(record.workspace.runtime.app, stage.runtime.app).catch(async (error: NodeJS.ErrnoException) => {
            if (error.code !== 'EXDEV') throw error;
            if (await pathExists(stage.runtime.app)) return; // A previous copy finished before publication.
            const temporary = join(stage.runtime.root, 'app-transfer');
            await rm(temporary, { recursive: true, force: true });
            await cp(record.workspace.runtime.app, temporary, { recursive: true, force: false, errorOnExist: true });
            await rename(temporary, stage.runtime.app);
        });
        await syncDirectory(record.workspace.runtime.root);
        await syncDirectory(stage.runtime.root);
    }
    await rename(stage.root, target.root);
    await syncDirectory(dirname(stage.root));
    await syncDirectory(record.projectsHome);
    return target;
}
