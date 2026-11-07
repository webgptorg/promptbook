import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdtemp, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { assertPrivate, ensurePrivateDirectory, readPrivateFile, syncDirectory, writePrivateFile } from '../app/files.js';
import { isEngineId, loadEngineIdentity } from '../app/identity.js';
import { parseAppLink } from '../app/registration.js';
import { PtbkError } from '../common/errors.js';
import { intendedUser, sharedProjectsRoot } from '../common/user-home.js';
import { canonicalPath, projectAt, runtimePaths, type Project } from '../project/workspace.js';
import { acquireProjectLock } from '../service/records.js';

/** The persisted transition, independent of any running client. @private onboarding */
export type DraftStep = 'intent' | 'harnesses' | 'prepare' | 'title' | 'folder' | 'review' | 'create' | 'publish' | 'published' | 'done';

/** Private draft and recovery receipt. OAuth challenges and pairing secrets are never written here. @private onboarding */
export type OnboardingDraft = {
    readonly version: 1;
    readonly engineId: string;
    readonly linkDigest?: string;
    readonly step: DraftStep;
    readonly promptId: string;
    readonly deferred: boolean;
    readonly error?: string;
    readonly intent?: string;
    readonly fileIds?: readonly string[];
    readonly harnesses?: readonly string[];
    readonly title?: string;
    readonly folder?: string;
};

/** The engine's private staging area, on the same filesystem as the resulting project. @private onboarding */
export function onboardingRoot(env: NodeJS.ProcessEnv): string {
    return join(sharedProjectsRoot(env), '.ptbk-onboarding');
}

/** The descriptor supplies paths to existing daemon utilities; no ptbk.json or agenda lives here. @private onboarding */
export function onboardingAt(engineId: string, env: NodeJS.ProcessEnv): Project {
    if (!isEngineId(engineId)) throw new PtbkError('Enter the engine ID of a pending initialization.', { kind: 'usage' });
    const root = join(canonicalPath(onboardingRoot(env)), engineId);
    return { ...projectAt(root), root, name: engineId, runtime: runtimePaths(root) };
}

/** Reads one private draft. @private onboarding */
export async function readOnboarding(project: Project): Promise<OnboardingDraft | undefined> {
    const text = await readPrivateFile(project.root, 'onboarding.json');
    if (text === undefined) return undefined;
    const draft = JSON.parse(text) as OnboardingDraft;
    if (draft.version !== 1 || !isEngineId(draft.engineId) || draft.engineId !== project.name) {
        throw new PtbkError('The saved initialization record is invalid.', { kind: 'configuration' });
    }
    return draft;
}

/** Atomically replaces the saved record. @private onboarding */
export async function saveOnboarding(project: Project, draft: OnboardingDraft): Promise<void> {
    await writePrivateFile(project.root, 'onboarding.json', JSON.stringify(draft));
}

/** Lists saved work, including receipts used to retry an installer command. @private onboarding */
export async function listOnboardings(env: NodeJS.ProcessEnv): Promise<readonly OnboardingDraft[]> {
    const root = onboardingRoot(env);
    const entries = await assertPrivate(root, 'directory').then(() => readdir(root)).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    const drafts = await Promise.all(entries.filter(isEngineId).map((id) => readOnboarding(onboardingAt(id, env))));
    return drafts.filter((draft): draft is OnboardingDraft => draft !== undefined);
}

/** Stable receipt for retrying a one-time pairing URL without storing the URL. @private onboarding */
export function pairingDigest(value: string, env: NodeJS.ProcessEnv): string {
    const { linkCode, settings } = parseAppLink(value, env);
    return createHash('sha256').update(settings.dashboardUrl).update('\0').update(linkCode).digest('hex');
}

/** Reserves a new engine identity without creating a project; repeating an installer command finds its draft. @private onboarding */
export async function createOnboarding(env: NodeJS.ProcessEnv, link?: string): Promise<OnboardingDraft> {
    if (intendedUser(env).scope === 'sudo') throw new PtbkError('Run onboarding as the user who will run the engine.', { kind: 'usage' });
    const linkDigest = link === undefined ? undefined : pairingDigest(link, env);
    const root = onboardingRoot(env);
    await ensurePrivateDirectory(root);
    const unlock = await acquireProjectLock(projectAt(root), randomUUID(), 'create onboarding');
    try {
        if (linkDigest) {
            const saved = (await listOnboardings(env)).find((draft) => draft.linkDigest === linkDigest);
            if (saved) return saved;
        }
        const temporary = await mkdtemp(join(root, 'new-'));
        try {
            const identity = await loadEngineIdentity(projectAt(temporary).runtime.app, { create: true });
            if (!identity) throw new Error('Could not create the engine identity.');
            const draft: OnboardingDraft = { version: 1, engineId: identity.engineId, linkDigest, step: 'intent', promptId: randomUUID(), deferred: false };
            await saveOnboarding(projectAt(temporary), draft);
            await rename(temporary, onboardingAt(identity.engineId, env).root);
            await syncDirectory(root);
            return draft;
        } finally {
            await rm(temporary, { recursive: true, force: true });
        }
    } finally {
        await unlock();
    }
}

/** Folder names are safe direct children of the projects home on all supported OSes. @private onboarding */
export function validOnboardingFolder(folder: string): boolean {
    return /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(folder) && !/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(folder);
}

/** Resolves a final path only after a safe folder name has been chosen. @private onboarding */
export function onboardingTarget(staging: Project, folder: string): Project {
    if (!validOnboardingFolder(folder)) throw new PtbkError('Use a folder name with lowercase letters, digits and dashes.', { kind: 'usage' });
    // Retain the literal child path. An occupied symlink must never be followed.
    const root = join(dirname(dirname(staging.root)), folder);
    return { ...projectAt(root), root, name: folder, runtime: runtimePaths(root) };
}

/** An occupied directory, symlink or file is never reused by remote initialization. @private onboarding */
export async function onboardingTargetExists(path: string): Promise<boolean> {
    try {
        await lstat(path);
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw error;
    }
}
