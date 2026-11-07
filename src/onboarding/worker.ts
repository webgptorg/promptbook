import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { EngineApi } from '../app/api/engine-api.js';
import { CONFORMANCE_BUILD } from '../app/build.js';
import { AppConnection, type AppPairingOutcome } from '../app/connection.js';
import { onboardingPage } from '../app/web/onboarding-page.js';
import { harnessTerminalPage } from '../app/web/harness-terminal.js';
import { engineHomePage } from '../app/web/documents.js';
import { UiLoader } from '../app/web/ui-loader.js';
import { PtbkError } from '../common/errors.js';
import { ipcAddress, type IpcServer } from '../common/ipc.js';
import type { Project } from '../project/workspace.js';
import { CONTROL_CONTRACT, startControlServer } from '../service/control.js';
import { acquireProjectLock, engineIdentity, removeProcessRecord, writeProcessRecord, type LaunchMetadata } from '../service/records.js';
import { onboardingTargetExists, pairingDigest, readOnboarding } from './draft.js';
import { finishOnboarding } from './finish.js';
import { OnboardingSession } from './session.js';
import { OnboardingUploads } from './uploads.js';

/**
 * Owns a pending initialization before a project or an Agenda exists. Uses the same App tunnel, signed UI,
 * owner passkey gateway and daemon supervision as the ordinary service.
 *
 * @private onboarding
 */
export async function runOnboardingWorker(staging: Project, launch: LaunchMetadata): Promise<number> {
    const draft = await readOnboarding(staging);
    if (!draft || draft.step === 'done') return 0;
    const engineId = draft.engineId;
    const instanceId = randomUUID();
    const unlock = await acquireProjectLock(staging, instanceId, 'onboarding');
    const env = { ...process.env };
    delete env.PTBK_LINK_CODE;
    delete env.PTBK_DATA_DIR;
    const directory = staging.runtime.app;
    const uploads = new OnboardingUploads(join(staging.root, 'uploads'));
    const token = randomBytes(32).toString('hex');
    const address = ipcAddress('onboarding:' + staging.root + ':' + instanceId);
    const log = (message: string, level: 'info' | 'warning' | 'error'): void => {
        process.stderr.write(new Date().toISOString() + ' ' + level + ' ' + message + '\n');
    };
    let stop!: () => void;
    const stopped = new Promise<void>((resolve) => { stop = resolve; });
    let control: IpcServer | undefined;
    let connection: AppConnection | undefined;
    let loader: UiLoader | undefined;
    let linking: Promise<AppPairingOutcome> | undefined;

    /** Ends browser access and disk writers before the handoff moves the App state. */
    const closeApp = async (): Promise<void> => {
        await linking?.catch(() => undefined);
        const active = connection;
        const ui = loader;
        connection = undefined;
        loader = undefined;
        await Promise.all([active?.stop(), ui?.stop()]);
    };

    const session = new OnboardingSession(staging, draft, uploads, env, async (saved, save) => {
        try {
            const project = await finishOnboarding({ staging, draft: saved, env, uploads, persistent: launch.persistent, closeApp, save });
            if (project) stop();
        } catch (error) {
            if (!connection && await onboardingTargetExists(directory)) await startApp();
            throw error;
        }
    });

    /** Installs the regular engine-origin authentication and presentation handlers on the pre-project service. */
    async function startApp(): Promise<void> {
        if (connection) return;
        const ui = await UiLoader.create({ directory, env, log });
        const pageHash = createHash('sha256').update(engineHomePage.toString()).digest('hex');
        const api = new EngineApi({
            onboarding: session, projectRoot: staging.root, stateDirectory: directory,
            engineId: () => engineId, hostname: () => connection?.view().hostname,
            dashboardUrl: () => connection?.view().dashboardUrl, security: () => connection?.securityFacts(),
            ui: () => ui.status(pageHash), log,
        });
        const app = new AppConnection({
            directory, env, onChange: () => undefined, figures: () => ({ agents: 0, members: 0, update: 'none' }), log,
            web: {
                api: (request, actor, access) => api.handle(request, actor, access),
                documents: async (request, actor) => (await harnessTerminalPage(request, actor, session)) ?? (await onboardingPage(request)) ?? (await ui.serve(request)) ?? engineHomePage(request, actor, { name: 'Pending initialization', engineId }),
                ...(CONFORMANCE_BUILD ? { certificateSource: 'dev-ca' as const } : {}),
            },
        });
        loader = ui;
        connection = app;
        await app.start();
        await ui.start();
    }

    /** Exchanges the secret once inside the running engine, then reloads its App connection. */
    async function link(value: unknown): Promise<AppPairingOutcome> {
        if (typeof value !== 'string') throw new PtbkError('Provide a pairing URL.', { kind: 'usage' });
        if (!connection || linking) throw new PtbkError('The engine is already changing its App connection.', { kind: 'conflict' });
        const active = connection;
        linking = (async () => {
            const result = await active.pair(value);
            if (result.outcome === 'linked') await session.notePairing(pairingDigest(value, env));
            return result;
        })();
        try {
            return await linking;
        } finally {
            linking = undefined;
        }
    }

    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
    try {
        if (await onboardingTargetExists(directory)) await startApp();
        control = await startControlServer(address, token, async (method, params) => {
            switch (method) {
                case 'identify': return { instanceId, projectRoot: staging.root, version: engineIdentity().engineVersion, contract: CONTROL_CONTRACT };
                case 'onboarding-state': return session.view();
                case 'onboarding-answer': return await session.answer(params);
                case 'onboarding-defer': return await session.defer();
                case 'onboarding-terminal': return await session.terminal('local', params);
                case 'onboarding-use-terminal': session.useTerminal(params.promptId); return null;
                case 'onboarding-api-key': await session.useApiKey(params.promptId, params.value); return null;
                case 'onboarding-upload': {
                    if (typeof params.path !== 'string') throw new PtbkError('Select a file on the engine host.', { kind: 'usage' });
                    return await session.uploadLocal(params.path) ?? null;
                }
                case 'app-status': return connection?.view();
                case 'app-link': return await link(params.link);
                case 'app-reload': return await connection?.reload();
                case 'app-setup-link': return await connection?.setupLink() ?? { kind: 'not-ready', missing: 'The engine is handing off to its project.' };
                case 'app-reset-owner': return await connection?.resetOwner() ?? { kind: 'not-ready', missing: 'The engine is handing off to its project.' };
                case 'app-conformance-session':
                    if (CONFORMANCE_BUILD && connection) {
                        const permissions = Array.isArray(params.permissions) ? params.permissions.map(String) : [];
                        return await connection.conformanceSession(params.subject === 'owner' ? { kind: 'owner' } : { kind: 'member', permissions });
                    }
                    break;
                case 'stop': stop(); return { applied: true, completed: true, outcome: 'Stopping initialization service.' };
            }
            throw new PtbkError('Unknown initialization control method.', { kind: 'usage' });
        });
        await writeProcessRecord(staging, {
            version: 1, mode: 'daemon', projectRoot: staging.root, pid: process.pid, supervisorPid: process.ppid,
            instanceId, controlAddress: address, token, ...engineIdentity(), startedAt: new Date().toISOString(),
            persistent: launch.persistent, launchNonce: launch.launchNonce,
        });
        void session.discoverDefaults().catch(() => undefined);
        session.resume();
        await stopped;
        return 0;
    } finally {
        process.off('SIGTERM', stop);
        process.off('SIGINT', stop);
        await session.stop();
        await control?.close();
        await closeApp();
        await removeProcessRecord(staging, instanceId);
        await unlock();
    }
}
