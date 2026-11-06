import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { appDirectory } from '../app/settings.js';
import { removePrivateFile } from '../app/files.js';
import { loadEngineIdentity } from '../app/identity.js';
import { ProjectOnboarding, type OnboardingAnswer } from '../app/onboarding.js';
import { pendingProjectName, preparePendingStage, publishPendingProject, readPendingProject, savePendingHandoff, type PendingProject } from '../app/pending-project.js';
import { createAppRuntime } from '../app/runtime.js';
import { createCommandContext } from '../cli/context.js';
import { COMMANDS } from '../cli/registry.js';
import { errorMessage, PtbkError } from '../common/errors.js';
import { secretToken, shortId } from '../common/ids.js';
import { ipcAddress, type IpcServer } from '../common/ipc.js';
import { ENGINE_VERSION } from '../common/version.js';
import type { HarnessContext, HarnessPlugin } from '../harness/types.js';
import type { LoginResult } from '../harness/maintenance.js';
import { CONTROL_CONTRACT, startControlServer } from './control.js';
import { registerEngine } from './discovery.js';
import { launchDaemon, markIntentionalStop } from './launcher.js';
import { unregisterPersistence } from './persistence.js';
import { OwnedProcessRecorder } from './owned-processes.js';
import { acquireProjectLock, engineIdentity, removeProcessRecord, writeProcessRecord, type LaunchMetadata } from './records.js';

/** Runs the adapter's native flow as the daemon account and rechecks that account's readiness. */
async function signInDevice(onboarding: ProjectOnboarding, plugin: HarnessPlugin, context: HarnessContext, service: HarnessContext, signal: AbortSignal): Promise<LoginResult> {
    const id = plugin.id;
    if (!plugin.deviceLogin) return { id, outcome: 'unsupported', diagnostic: plugin.loginHint };
    try {
        const result = await plugin.deviceLogin({ ...context, env: service.env, signal }, (challenge) => onboarding.showLogin({
            kind: 'harness-login', title: 'Harness sign-in', question: `Sign in to ${plugin.displayName} in your browser.`,
            hint: 'Enter this one-time code on the provider’s page. Setup continues after the engine verifies the sign-in.',
            error: null, canGoBack: false, harness: plugin.displayName, method: 'device-code',
            ...challenge, status: 'waiting', diagnostic: null,
        }));
        if (signal.aborted) return { id, outcome: 'cancelled', diagnostic: 'Sign-in was interrupted.' };
        const inspection = await plugin.inspect(service);
        if (inspection.usable && inspection.authenticated === true) return { id, outcome: 'authenticated', diagnostic: inspection.summary };
        return { id, outcome: result === 'finished' ? 'failed' : result, diagnostic: result === 'expired' ? 'The device code expired. Request another code.' : result === 'denied' ? 'The provider denied device sign-in. Check account or workspace settings.' : 'Sign-in was not verified by the service. Check whether device login is enabled or sign in with the native CLI.' };
    } finally {
        onboarding.clearLogin();
    }
}

/** Runs the same project setup without letting the client or the final directory own the wizard. */
async function initialize(onboarding: ProjectOnboarding, record: PendingProject, env: NodeJS.ProcessEnv, signal: AbortSignal): Promise<void> {
    const { initializeProject } = await import('../cli/commands/init.js');
    const spec = COMMANDS.find((command) => command.name === 'init')!;
    const base = createCommandContext({ path: ['init'], spec, options: { raw: true, 'non-interactive': true, 'self-update': 'no', 'auto-sync': false, installation: 'global', 'update-harnesses': 'keep' }, explicit: new Set(), positionals: [], argv: [] });
    const context = {
        ...base, cwd: record.workspace.root, env,
        terminal: { ...base.terminal, interactive: true, prompts: (prompt: Parameters<ProjectOnboarding['present']>[0]) => onboarding.present(prompt), write: () => undefined, writeError: () => undefined },
    };
    while (!signal.aborted) {
        try {
            let target: string | undefined;
            const result = await initializeProject(context, {
                homeOnly: true,
                pending: {
                    projectsHome: record.projectsHome,
                    prepareDestination: async (path) => {
                        signal.throwIfAborted();
                        target = path;
                        return await preparePendingStage(record, path);
                    },
                    signIn: (plugin, local, service) => signInDevice(onboarding, plugin, local, service, signal),
                },
            });
            signal.throwIfAborted();
            if (result.outcome !== 'ready' || !target) throw new Error(result.unresolved[0] || 'Project setup is incomplete.');
            await savePendingHandoff(record, target);
            return;
        } catch (error) {
            if (signal.aborted) return;
            await onboarding.retry(errorMessage(error));
        }
    }
}

/** The detached lifecycle stage before the project is named or initialized. @private project onboarding */
export async function runOnboardingWorker(record: PendingProject, launch: LaunchMetadata, env: NodeJS.ProcessEnv, log: (text: string, level: 'info' | 'warning' | 'error') => void): Promise<number> {
    const project = record.workspace;
    const instanceId = shortId(12);
    const token = secretToken(24);
    const releaseLock = await acquireProjectLock(project, instanceId, 'daemon');
    const owned = new OwnedProcessRecorder(project, instanceId);
    owned.start();
    const abort = new AbortController();
    const stopped = new Promise<void>((resolve) => abort.signal.addEventListener('abort', () => resolve(), { once: true }));
    const stop = (): void => abort.abort();
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
    process.on('SIGHUP', () => undefined);

    let server: IpcServer | undefined;
    let unregister: (() => Promise<void>) | undefined;
    let runtime: Awaited<ReturnType<typeof createAppRuntime>> | undefined;
    let operatorStopped = false;
    try {
        const onboarding = await ProjectOnboarding.open(project.root);
        if (!record.target) {
            await loadEngineIdentity(appDirectory(project.runtime.app, env), { create: true });
            runtime = await createAppRuntime({ project, env, onboarding, log, figures: () => ({ agents: 0, members: 0, update: 'none' }), onChange: () => undefined });
            await runtime.connection.start();
            await runtime.loader.start();
        } else onboarding.complete();
        const name = pendingProjectName(record.id);
        server = await startControlServer(ipcAddress(`control:${project.root}:${instanceId}`), token, async (method, params) => {
            const connection = runtime?.connection;
            switch (method) {
                case 'identify': return { instanceId, projectRoot: project.root, pid: process.pid, mode: 'daemon', version: ENGINE_VERSION, contract: CONTROL_CONTRACT, state: 'pending-setup' };
                case 'summary': return { state: 'pending-setup', phase: 'initialization', work: connection?.view().state === 'unlinked' ? 'Ready to pair or continue locally' : 'Waiting for project setup', waitingChats: 0, observedAt: new Date().toISOString() };
                case 'app-status': return connection?.view();
                case 'app-reload': return await connection?.reload();
                case 'app-connect': {
                    if (!connection || typeof params.link !== 'string') throw new PtbkError('A pairing URL is required for this running initialization.', { kind: 'usage' });
                    return await connection.link(params.link);
                }
                case 'app-setup-link': return await connection?.setupLink() ?? { kind: 'not-ready', missing: 'The project is starting.' };
                case 'app-reset-owner': return await connection?.resetOwner() ?? { kind: 'not-ready', missing: 'The project is starting.' };
                case 'app-conformance-session': return await connection?.conformanceSession(params.subject === 'owner' ? { kind: 'owner' } : { kind: 'member', permissions: Array.isArray(params.permissions) ? params.permissions.map(String) : [] });
                case 'onboarding-state': return onboarding.state();
                case 'onboarding-answer': return await onboarding.answer(params as OnboardingAnswer);
                case 'onboarding-defer': return await onboarding.defer();
                case 'onboarding-upload-local': {
                    if (typeof params.path !== 'string' || typeof params.name !== 'string') throw new PtbkError('Choose a local file to attach.', { kind: 'usage' });
                    return await onboarding.files.uploadLocal(params.path, params.name);
                }
                case 'stop':
                case 'force-stop':
                case 'stop-now':
                    operatorStopped = true;
                    setImmediate(stop);
                    return { outcome: 'stopping', state: 'stopping' };
                default: throw new PtbkError('Project setup is still pending.', { kind: 'unsupported' });
            }
        });
        const owner = {
            version: 1 as const, instanceId, mode: 'daemon' as const, pid: process.pid, supervisorPid: process.ppid,
            controlAddress: server.address, projectRoot: project.root, ...engineIdentity(), startedAt: new Date().toISOString(),
        };
        await writeProcessRecord(project, { ...owner, token, persistent: launch.persistent, launchNonce: launch.launchNonce });
        unregister = await registerEngine({ ...owner, projectName: name }, env);
        if (!record.target) await Promise.race([initialize(onboarding, record, env, abort.signal), stopped]);
        if (abort.signal.aborted) {
            if (operatorStopped) await markIntentionalStop(project);
            return 0;
        }
        const completed = await readPendingProject(project, env);
        if (!completed?.target) throw new Error('Project setup finished without a handoff record.');
        runtime?.loader.stop();
        await runtime?.connection.stop();
        const final = await publishPendingProject(completed);
        await launchDaemon(final, { cli: {}, persistent: launch.persistent, env });
        onboarding.complete();
        await unregisterPersistence(project);
        await Promise.all([
            removePrivateFile(project.root, 'onboarding.json'),
            rm(join(project.root, 'uploads'), { recursive: true, force: true }),
            rm(project.runtime.app, { recursive: true, force: true }),
        ]).catch(() => log('The finished initialization still has local draft files.', 'warning'));
        return 0;
    } finally {
        abort.abort();
        process.off('SIGTERM', stop);
        process.off('SIGINT', stop);
        runtime?.loader.stop();
        await runtime?.connection.stop();
        await server?.close();
        await unregister?.();
        await removeProcessRecord(project, instanceId);
        if (operatorStopped) await owned.terminateRemaining(1000);
        owned.stop();
        await releaseLock();
    }
}
