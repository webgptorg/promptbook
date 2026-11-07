import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { syncDirectory } from '../app/files.js';
import { initializeProject } from '../cli/commands/init.js';
import { COMMANDS } from '../cli/registry.js';
import { PtbkError } from '../common/errors.js';
import { readTextIfExists, writeFileAtomic } from '../common/fs.js';
import { gitOrThrow } from '../project/git.js';
import { projectAt, type Project } from '../project/workspace.js';
import { ensureKnownProject } from '../service/known-projects.js';
import { launchDaemon } from '../service/launcher.js';
import { unregisterPersistence } from '../service/persistence.js';
import { acquireProjectLock } from '../service/records.js';
import { createTerminalProfile } from '../ui/terminal.js';
import { onboardingTarget, onboardingTargetExists, type OnboardingDraft } from './draft.js';
import type { OnboardingUploads } from './uploads.js';

/** A private receipt inside the project, moved atomically with its initialized files. */
const RECEIPT = 'onboarding-engine-id';

/** Creates the complete project in an isolated worktree using the same writer and readiness checks as local init. */
async function initializeStaged(
    staging: Project,
    built: Project,
    draft: OnboardingDraft,
    uploads: OnboardingUploads,
    env: NodeJS.ProcessEnv,
): Promise<void> {
    const parent = dirname(built.root);
    // A crash before the publication receipt may leave a partial setup. Rebuild only this engine's private output.
    await rm(parent, { recursive: true, force: true });
    await mkdir(built.root, { recursive: true, mode: 0o700 });
    // A projects home may itself be inside a Git checkout. Setup must always use its own repository.
    await gitOrThrow(built.root, ['init', '--quiet', '--initial-branch=main'], { env });
    const terminal = createTerminalProfile({ raw: true, nonInteractive: true });
    const result = await initializeProject({
        path: ['init'],
        spec: COMMANDS.find((command) => command.name === 'init')!,
        options: { installation: 'global', harness: [...(draft.harnesses ?? [])], 'self-update': 'no', 'auto-sync': false, 'browser-profile': 'global', 'browser-mode': 'headless' },
        explicit: new Set(),
        positionals: [],
        terminal: { ...terminal, write: () => undefined, writeError: () => undefined },
        cwd: staging.root,
        env,
        argv: [],
    }, {
        projectRoot: built.root,
        prepared: { title: draft.title!, segments: await uploads.segments(draft.intent ?? '', draft.fileIds ?? []) },
    });
    if (result.outcome !== 'ready' || !result.firstTask) {
        throw new PtbkError(result.unresolved[0] ?? 'The project did not pass its setup checks.', { kind: 'setup' });
    }
    await writeFileAtomic(join(built.runtime.root, RECEIPT), draft.engineId, { mode: 0o600 });
}

/**
 * Publishes only a fully initialized worktree, then starts its ordinary agenda. All retries converge on the same
 * project and identity, including a crash after the move or after the normal daemon has already started.
 *
 * @private onboarding
 */
export async function finishOnboarding(input: {
    readonly staging: Project;
    readonly draft: OnboardingDraft;
    readonly uploads: OnboardingUploads;
    readonly env: NodeJS.ProcessEnv;
    readonly persistent: boolean;
    readonly closeApp: () => Promise<void>;
    readonly save: (patch: Partial<OnboardingDraft>) => Promise<void>;
}): Promise<Project | undefined> {
    const { staging, draft, env, save } = input;
    const target = onboardingTarget(staging, draft.folder!);
    const built = projectAt(join(staging.root, 'workspace', draft.folder!));
    const belongsToDraft = async (): Promise<boolean> => {
        const directory = await lstat(target.root).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return undefined;
            throw error;
        });
        return directory?.isDirectory() === true && (await readTextIfExists(join(target.runtime.root, RECEIPT))) === draft.engineId;
    };
    if (draft.step === 'create') {
        await initializeStaged(staging, built, draft, input.uploads, env);
        await save({ step: 'publish' });
    }
    if (draft.step !== 'published') {
        // Serialize the short placement step across pending engines sharing this projects home.
        const unlock = await acquireProjectLock(projectAt(dirname(staging.root)), randomUUID(), 'publish onboarding');
        try {
            if (!(await belongsToDraft())) {
                if ((await readTextIfExists(join(built.runtime.root, RECEIPT))) !== draft.engineId) throw new PtbkError('The staged project is missing its setup receipt.', { kind: 'persistence' });
                try {
                    await mkdir(target.root, { mode: 0o700 });
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                    await save({ step: 'folder', promptId: randomUUID(), error: 'That folder was taken. Choose a new name.' });
                    return undefined;
                }
                await rename(built.runtime.root, target.runtime.root);
                await syncDirectory(target.root);
                await syncDirectory(dirname(target.root));
            }
            await input.closeApp();
            if (!(await onboardingTargetExists(target.runtime.app))) await rename(staging.runtime.app, target.runtime.app);
            // The receipt and staged files let us resume after any move. Publish ptbk.json last so project discovery
            // cannot expose an incomplete workspace to ordinary start.
            const configName = basename(target.configPath);
            const remaining = await readdir(built.root);
            for (const name of [...remaining.filter((entry) => entry !== configName), ...remaining.filter((entry) => entry === configName)]) {
                const destination = join(target.root, name);
                if (await onboardingTargetExists(destination)) throw new PtbkError('A file in the destination was taken during setup. Resolve the conflict and retry.', { kind: 'conflict' });
                await rename(join(built.root, name), destination);
            }
            await syncDirectory(built.root);
            await syncDirectory(target.root);
            await save({ step: 'published' });
        } finally {
            await unlock();
        }
    } else if (!(await belongsToDraft())) {
        throw new PtbkError('The published project is missing its setup receipt.', { kind: 'persistence' });
    }
    await ensureKnownProject(target, env);
    await launchDaemon(target, { cli: {}, persistent: input.persistent, env });
    await save({ step: 'done', intent: undefined, fileIds: undefined, harnesses: undefined, error: undefined });
    await unregisterPersistence(staging).catch(() => undefined);
    await rm(input.uploads.directory, { force: true, recursive: true }).catch(() => undefined);
    await rm(dirname(built.root), { force: true, recursive: true }).catch(() => undefined);
    return target;
}
