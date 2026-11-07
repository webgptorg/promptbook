import { assertPrivate } from '../app/files.js';
import { PtbkError } from '../common/errors.js';
import type { Project } from '../project/workspace.js';
import { lookupService, type ControlClient } from '../service/control.js';
import { launchDaemon, type LaunchResult } from '../service/launcher.js';
import { readLaunchMetadata, restoreDiscoveryEnvironment } from '../service/records.js';
import { onboardingAt, onboardingRoot, readOnboarding } from './draft.js';

/** Selects a local draft by its stable engine identity. @private onboarding */
export async function pendingOnboarding(id: string, env: NodeJS.ProcessEnv): Promise<Project> {
    const project = onboardingAt(id, env);
    if (!await readOnboarding(project)) throw new PtbkError('No saved initialization has that engine ID.', { kind: 'not-found' });
    await assertPrivate(onboardingRoot(env), 'directory');
    return project;
}

/** Starts a draft service using its saved user environment and the existing launcher. @private onboarding */
export async function launchOnboarding(project: Project, env: NodeJS.ProcessEnv, persistent?: boolean): Promise<LaunchResult> {
    const saved = await readLaunchMetadata(project);
    const launchEnv = saved ? restoreDiscoveryEnvironment(saved.env, saved.nodePath, env) : { ...env };
    delete launchEnv.PTBK_LINK_CODE;
    delete launchEnv.PTBK_DATA_DIR;
    return await launchDaemon(project, { cli: {}, onboarding: true, persistent: persistent ?? saved?.persistent ?? true, env: launchEnv });
}

/** Gets a running service, restarting a stopped draft only for an explicit attachment. @private onboarding */
export async function onboardingClient(project: Project, env: NodeJS.ProcessEnv): Promise<ControlClient> {
    const lookup = await lookupService(project);
    return lookup.state === 'running' ? lookup.client : (await launchOnboarding(project, env)).lookup.client;
}
