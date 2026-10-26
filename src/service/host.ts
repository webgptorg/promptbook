import { PtbkError, errorMessage } from '../common/errors.js';
import type { ComposedSegment } from '../ui/composer.js';
import { secretToken, shortId } from '../common/ids.js';
import { ipcAddress, type IpcServer } from '../common/ipc.js';
import { ENGINE_VERSION } from '../common/version.js';
import { setting, type BrowserOverrides } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import { Agenda, type AgendaMode, type AgendaSummary } from '../engine/agenda.js';
import type { ConnectionView } from '../engine/snapshot.js';
import { browserTools } from '../browser/agent-tools.js';
import { BrowserFleet } from '../browser/fleet.js';
import { describeProfileSource } from '../tools/model.js';
import { applyChatAction, applyControlAction, applySettings, applyToolAction, type BrowserControls } from './actions.js';
import { AuthStore } from './auth.js';
import { CONTROL_CONTRACT, startControlServer } from './control.js';
import { registerEngine, summaryOfSnapshot } from './discovery.js';
import { recordRunEnded, registerKnownProject } from './known-projects.js';
import { startHttpServer, type RunningHttpServer } from './http.js';
import { OwnedProcessRecorder } from './owned-processes.js';
import { acquireProjectLock, engineIdentity, removeProcessRecord, writeProcessRecord } from './records.js';
import { TunnelManager } from './tunnel.js';

/**
 * Options of a hosted service process.
 *
 * @private service host
 */
export type HostOptions = {
    readonly project: Project;
    readonly mode: AgendaMode;
    readonly env: NodeJS.ProcessEnv;
    /** CLI setting overrides (parsed). */
    readonly cli: Readonly<Record<string, unknown>>;
    /** CLI harness restriction. */
    readonly cliHarnesses?: readonly string[];
    /** Temporary browser overrides of one named browser tool. */
    readonly cliBrowser?: BrowserOverrides;
    /** `--tasks` override (absolute). */
    readonly tasksDirectory?: string;
    /** Restart persistence state. */
    readonly persistent: boolean | null;
    /** Explanation of the persistence state. */
    readonly persistenceNote?: string;
    /** PID of the daemon supervisor. */
    readonly supervisorPid?: number;
    /** Launch correlation nonce. */
    readonly launchNonce?: string;
    /** Allows installing cloudflared when missing. */
    readonly allowTunnelInstall: boolean;
    /** Plain event stream. */
    readonly onEvent?: (text: string, level: 'info' | 'warning' | 'error') => void;
};

/**
 * Hosts one project's agenda with its control channel, HTTP API/SPA and tunnel.
 *
 * @private service host
 */
export class ServiceHost {
    public readonly instanceId = shortId(12);
    public readonly agenda: Agenda;
    private readonly auth: AuthStore;
    private readonly token = secretToken(24);
    private readonly publicInstance = secretToken(9);
    private controlServer?: IpcServer;
    private http?: RunningHttpServer;
    private tunnel?: TunnelManager;
    private releaseLock?: () => Promise<void>;
    private unregister?: () => Promise<void>;
    /** This instance is the known project's last run (its end is recorded on shutdown). */
    private knownRun = false;
    private connection: ConnectionView = { local: { state: 'disabled' }, remote: { state: 'disabled' } };
    private pairingRefresh?: NodeJS.Timeout;
    private readonly browsers: BrowserFleet;
    /** Every execution process this engine starts, so a force stop (also from outside) ends all of them. */
    private readonly owned: OwnedProcessRecorder;

    public constructor(private readonly options: HostOptions) {
        this.owned = new OwnedProcessRecorder(options.project, this.instanceId);
        this.agenda = new Agenda({
            project: options.project,
            mode: options.mode,
            instanceId: this.instanceId,
            env: options.env,
            cli: options.cli,
            cliHarnesses: options.cliHarnesses,
            cliBrowser: options.cliBrowser,
            tasksDirectory: options.tasksDirectory,
            persistent: options.persistent,
            persistenceNote: options.persistenceNote,
            onEvent: options.onEvent,
            // Each task works in its own tabs of the shared browsers, with its own recordings (concurrent tasks too).
            extraTools: (task, context) => {
                const scope = this.browsers.scope(task.key);
                void scope.useFor(context.trace, context.attempt);
                return browserTools(scope, context.chats, context.agent, context.onUserChat, () =>
                    this.agenda.effectiveSettings.tools.flatMap((tool) => (tool.type === 'BROWSER' && tool.isEnabled ? [{ name: tool.name, description: tool.description, profile: describeProfileSource(tool.profile.source, tool.profile.path), isHeadless: tool.isHeadless }] : [])),
                );
            },
            finalizeEvidence: async (task) => await this.browsers.scope(task.key).finishEvidence(),
            afterWork: async (task) => await this.browsers.endScope(task.key),
            browsers: {
                primary: () => (this.agenda.effectiveSettings ? this.browsers.primary() : undefined),
                all: () => (this.agenda.effectiveSettings ? this.browsers.inspectAll() : []),
                inUse: () => this.browsers.inUse(),
            },
        });
        this.auth = new AuthStore(options.project);
        this.browsers = new BrowserFleet(options.project, () => this.agenda.effectiveSettings, options.env, () => this.agenda.notifyChange(), this.instanceId);
    }

    /** Engine-owned per-browser diagnosis and recovery shared by every client. */
    private get browserControls(): BrowserControls {
        return {
            recheck: (name) => this.browsers.control('recheck', name),
            retry: (name) => this.browsers.control('retry', name),
            restart: (name) => this.browsers.control('restart', name),
            kill: (name) => this.browsers.control('kill', name),
            testTab: (name) => this.browsers.control('test-tab', name),
        };
    }

    /** Local HTTP address, when serving. */
    public get httpUrl(): string | undefined {
        return this.http?.url;
    }

    /** Publishes connection state to the agenda (and so to every view). */
    private publishConnection(changes: Partial<ConnectionView>): void {
        this.connection = { ...this.connection, ...changes };
        this.agenda.setConnection(this.connection);
    }

    /** Refreshes pairing availability (never mints). */
    private async refreshPairing(): Promise<void> {
        const pairing = await this.auth.currentPairing();
        this.publishConnection({ pairing: { available: Boolean(pairing), expiresAt: pairing ? new Date(pairing.expiresAt).toISOString() : undefined } });
    }

    /**
     * Acquires ownership and starts the agenda's supporting services. Local readiness never waits indefinitely for the tunnel.
     */
    public async start(): Promise<void> {
        const { project } = this.options;
        this.releaseLock = await acquireProjectLock(project, this.instanceId, this.options.mode);
        this.owned.start();
        try {
            await this.agenda.initialize();
            this.controlServer = await startControlServer(ipcAddress(`control:${project.root}:${this.instanceId}`), this.token, (method, params) => this.handleControl(method, params));
            const settings = this.agenda.effectiveSettings;
            const serverEnabled = setting<boolean>(settings, 'server.isEnabled');
            if (serverEnabled) {
                this.publishConnection({ local: { state: 'starting' } });
                try {
                    this.http = await startHttpServer({
                        agenda: this.agenda,
                        control: (action, params) => applyControlAction(this.agenda, action, params, this.browserControls),
                        auth: this.auth,
                        port: setting<number | undefined>(settings, 'server.port'),
                        publicInstance: this.publicInstance,
                        publicUrl: () => (this.tunnel?.state.state === 'ready' ? this.tunnel.state.url : undefined),
                        onPairingChanged: () => void this.refreshPairing(),
                    });
                    this.publishConnection({ local: { state: 'ready', url: this.http.url, port: this.http.port } });
                } catch (error) {
                    this.publishConnection({ local: { state: 'failed', error: errorMessage(error) } });
                    throw error;
                }
            }
            await this.writeRecord();
            // Enabled browsers start (or join their profile's shared process) with the engine, not at their first task,
            // and again when the enabled set changes; a failure is that browser's resource wait, never the engine's.
            if (this.options.env.PTBK_BROWSER_START !== 'lazy') {
                let enabled = '';
                const startBrowsers = (): void => {
                    const names = this.agenda.effectiveSettings ? this.browsers.enabledNames().join('\n') : '';
                    if (names === enabled) return;
                    enabled = names;
                    void this.browsers.startEnabled();
                };
                startBrowsers();
                this.agenda.onChange(startBrowsers);
                // Diagnostics follow other engines joining or leaving the shared browsers.
                this.browsers.watch();
            }
            // Host-wide discovery (independent of HTTP and of any open dashboard); not a project lock.
            this.unregister = await registerEngine(
                {
                    version: 1,
                    instanceId: this.instanceId,
                    pid: process.pid,
                    supervisorPid: this.options.supervisorPid,
                    mode: this.options.mode,
                    projectRoot: project.root,
                    projectName: project.name,
                    ...engineIdentity(),
                    controlAddress: this.controlServer.address,
                    startedAt: new Date().toISOString(),
                },
                this.options.env,
            ).catch((error: unknown) => {
                this.agenda.log(`This engine could not register for \`ptbk dashboard --global\`: ${errorMessage(error)}`, 'warning');
                return undefined;
            });
            // The durable known-project entry outlives this instance (stopped projects stay listed globally).
            if (this.options.mode !== 'maintenance') {
                await registerKnownProject(
                    project,
                    { nodePath: process.execPath, lastRun: { instanceId: this.instanceId, pid: process.pid, mode: this.options.mode, ...engineIdentity(), startedAt: new Date().toISOString() } },
                    this.options.env,
                ).then(
                    () => (this.knownRun = true),
                    (error: unknown) => this.agenda.log(`This project could not be registered as known for \`ptbk dashboard --global\`: ${errorMessage(error)}`, 'warning'),
                );
            }
            if (this.http && setting<boolean>(settings, 'server.tunnel.isEnabled')) {
                if (!(await this.auth.currentPairing())) await this.auth.renewPairing();
                await this.refreshPairing();
                this.pairingRefresh = setInterval(() => void this.refreshPairing(), 30_000);
                this.pairingRefresh.unref();
                this.tunnel = new TunnelManager(
                    {
                        provider: setting<'cloudflare-quick' | 'cloudflare-named'>(settings, 'server.tunnel.provider'),
                        hostname: setting<string | undefined>(settings, 'server.tunnel.hostname'),
                        name: setting<string | undefined>(settings, 'server.tunnel.name'),
                        credentialsFile: setting<string | undefined>(settings, 'server.tunnel.credentialsFile'),
                        tokenEnv: setting<string | undefined>(settings, 'server.tunnel.tokenEnv'),
                        allowInstall: this.options.allowTunnelInstall,
                    },
                    this.http.url,
                    this.publicInstance,
                    (remote, message) => {
                        this.publishConnection({ remote });
                        if (message) this.agenda.log(message, remote.state === 'degraded' ? 'warning' : 'info');
                    },
                    this.options.env,
                );
                this.publishConnection({ remote: this.tunnel.state });
                await this.tunnel.start();
            } else if (this.http) {
                if (!(await this.auth.currentPairing())) await this.auth.renewPairing();
                await this.refreshPairing();
            }
        } catch (error) {
            await this.shutdown();
            throw error;
        }
    }

    /** Writes the process record after the control endpoint exists. */
    private async writeRecord(): Promise<void> {
        await writeProcessRecord(this.options.project, {
            version: 1,
            instanceId: this.instanceId,
            mode: this.options.mode,
            pid: process.pid,
            supervisorPid: this.options.supervisorPid,
            controlAddress: this.controlServer!.address,
            token: this.token,
            projectRoot: this.options.project.root,
            ...engineIdentity(),
            startedAt: new Date().toISOString(),
            http: this.http ? { port: this.http.port, url: this.http.url } : undefined,
            persistent: this.options.persistent,
            launchNonce: this.options.launchNonce,
        });
    }

    /** Runs the agenda until it stops/finishes. */
    public async runAgenda(): Promise<AgendaSummary> {
        return await this.agenda.run();
    }

    /**
     * Releases every owned resource (browser, tunnel, HTTP, control, discovery entry, record and finally its own project
     * lock). Each step is bounded so an internal force stop still cleans up promptly; after a force stop every owned
     * process still running is killed, so no owned worker outlives the engine. Only this owner's records are removed,
     * never another process's lock or persistent project data.
     */
    public async shutdown(): Promise<void> {
        const bounded = async (step: () => Promise<unknown> | unknown): Promise<void> => {
            await Promise.race([Promise.resolve().then(step).catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 10_000).unref())]);
        };
        clearInterval(this.pairingRefresh);
        const forced = this.agenda.forceStopped;
        // Recording evidence is finalized even on force stop (bounded); this engine leaves its shared browsers (a
        // browser other engines still use stays, the last disconnection closes it).
        await bounded(() => this.browsers.close());
        this.tunnel?.stop();
        this.tunnel = undefined;
        if (forced) await bounded(() => this.owned.terminateRemaining(1000));
        await bounded(() => this.http?.close());
        this.http = undefined;
        await bounded(() => this.controlServer?.close());
        this.controlServer = undefined;
        await bounded(() => this.unregister?.());
        this.unregister = undefined;
        if (this.knownRun) {
            const reason = this.agenda.shutdownReason;
            await bounded(() => recordRunEnded(this.options.project, this.instanceId, reason === 'force' ? 'force-stopped' : reason === 'stop' ? 'stopped' : reason === 'restart' ? 'restarted' : 'ended', this.options.env));
            this.knownRun = false;
        }
        await bounded(() => removeProcessRecord(this.options.project, this.instanceId));
        this.owned.stop();
        await bounded(() => this.releaseLock?.());
        this.releaseLock = undefined;
    }

    /** Public pairing URL (with the secret in the fragment) of the current capability. */
    private pairingUrl(code: string): string | undefined {
        const remote = this.tunnel?.state;
        const base = remote?.state === 'ready' && remote.url ? remote.url : this.http?.url;
        return base ? `${base.replace(/\/$/, '')}/#pair=${code}` : undefined;
    }

    /** In-process control (the owning terminal uses the same methods as the IPC channel). */
    public async control<T>(method: string, params: Readonly<Record<string, unknown>> = {}): Promise<T> {
        return (await this.handleControl(method, params)) as T;
    }

    /** Handles authenticated local control requests. */
    private async handleControl(method: string, params: Readonly<Record<string, unknown>>): Promise<unknown> {
        const agenda = this.agenda;
        switch (method) {
            case 'identify':
                return { instanceId: this.instanceId, projectRoot: this.options.project.root, pid: process.pid, mode: this.options.mode, version: ENGINE_VERSION, contract: CONTROL_CONTRACT, state: agenda.serviceState };
            case 'snapshot':
                return agenda.snapshot();
            case 'summary':
                return summaryOfSnapshot(agenda.snapshot());
            case 'watch': {
                const since = Number(params.since ?? -1);
                await agenda.waitForChange(since, Math.min(Number(params.timeoutMs ?? 20_000), 25_000));
                return agenda.snapshot();
            }
            case 'pause':
            case 'resume':
            case 'skip-wait':
            case 'stop':
            case 'force-stop':
            case 'restart':
            case 'stop-now':
            case 'cancel-stop':
            case 'browser-recheck':
            case 'browser-retry':
            case 'browser-restart':
            case 'sync-now':
            case 'health-recheck':
            case 'health-override':
            case 'health-clean-cache':
            case 'health-swap':
                return await applyControlAction(agenda, method, params, this.browserControls);
            case 'tool-operation':
                return await applyToolAction(agenda, params, typeof params.via === 'string' ? params.via : 'cli');
            case 'chat-list':
            case 'chat-agents':
            case 'chat-get':
            case 'chat-read':
            case 'chat-create':
            case 'chat-send':
                // The authenticated local control channel of the engine host may attach local files.
                return await applyChatAction(agenda, method, params, typeof params.via === 'string' ? params.via : 'cli', { trusted: true });
            case 'task-inventory':
                return await agenda.taskInventory();
            case 'book-source':
                return await agenda.bookSource({ reference: typeof params.reference === 'string' ? params.reference : undefined, path: typeof params.path === 'string' ? params.path : undefined });
            case 'book-save':
                // Attachments by local path are accepted on this trusted local channel only (as for chats).
                return await agenda.bookSave({ path: String(params.path), text: String(params.text ?? ''), revision: String(params.revision ?? ''), segments: Array.isArray(params.segments) ? (params.segments as ComposedSegment[]) : undefined });
            case 'settings':
                return await applySettings(agenda, params);
            case 'add-task':
                return await agenda.addTaskFile(
                    String(params.path),
                    String(params.content),
                    String(params.summary),
                    typeof params.commit === 'boolean' ? params.commit : undefined,
                    Array.isArray(params.taskNames) ? params.taskNames.map(String) : [],
                );
            case 'recover':
                return { message: await agenda.recover(String(params.taskRef), params.action as 'resume' | 'retry' | 'acknowledge') };
            case 'pairing': {
                if (!this.http) return { available: false, reason: 'HTTP is disabled (--no-server).' };
                const pairing = params.renew === true ? await this.auth.renewPairing() : await this.auth.currentPairing();
                await this.refreshPairing();
                if (!pairing) return { available: false, reason: 'No unused pairing link exists; renew it with `ptbk access pair`.' };
                return { available: true, url: this.pairingUrl(pairing.code), expiresAt: new Date(pairing.expiresAt).toISOString(), remote: this.tunnel?.state.state === 'ready' };
            }
            case 'devices':
                return (await this.auth.sessions()).map(({ id, label, createdAt, lastSeenAt, expiresAt, revokedAt }) => ({ id, label, createdAt, lastSeenAt, expiresAt, revokedAt }));
            case 'revoke':
                return { revoked: await this.auth.revokeSessions(String(params.id ?? 'all')) };
            case 'api-token':
                return await this.auth.createApiToken(String(params.label ?? 'api client'));
            default:
                throw new PtbkError(`Unknown control method ${method}.`, { kind: 'usage' });
        }
    }
}
