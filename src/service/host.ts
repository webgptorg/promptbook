import { PtbkError, errorMessage } from '../common/errors.js';
import { secretToken, shortId } from '../common/ids.js';
import { ipcAddress, type IpcServer } from '../common/ipc.js';
import { ENGINE_VERSION } from '../common/version.js';
import { setting } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import { Agenda, type AgendaMode, type AgendaSummary, type RunOptions } from '../engine/agenda.js';
import type { ConnectionView } from '../engine/snapshot.js';
import { ProjectBrowser, browserTools } from '../browser/browser.js';
import { RequestStore } from '../engine/requests.js';
import { applyAnswer, applyControlAction, applySettings } from './actions.js';
import { AuthStore } from './auth.js';
import { startControlServer } from './control.js';
import { startHttpServer, type RunningHttpServer } from './http.js';
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
    /** Finite-run options. */
    readonly run?: RunOptions;
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
    private connection: ConnectionView = { local: { state: 'disabled' }, remote: { state: 'disabled' } };
    private pairingRefresh?: NodeJS.Timeout;
    private readonly browser: ProjectBrowser;

    public constructor(private readonly options: HostOptions) {
        this.agenda = new Agenda({
            project: options.project,
            mode: options.mode,
            instanceId: this.instanceId,
            env: options.env,
            cli: options.cli,
            cliHarnesses: options.cliHarnesses,
            tasksDirectory: options.tasksDirectory,
            persistent: options.persistent,
            persistenceNote: options.persistenceNote,
            run: options.run,
            onEvent: options.onEvent,
            extraTools: (task, context) => browserTools(this.browser, new RequestStore(options.project.runtime.requests), { ref: task.ref, title: task.title, agent: task.routing.agent }, context.onUserRequest),
        });
        this.auth = new AuthStore(options.project);
        this.browser = new ProjectBrowser(options.project, () => this.agenda.effectiveSettings, options.env);
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
        try {
            await this.agenda.initialize();
            this.controlServer = await startControlServer(ipcAddress(`control:${project.root}:${this.instanceId}`), this.token, (method, params) => this.handleControl(method, params));
            const settings = this.agenda.effectiveSettings;
            const serverEnabled = setting<boolean>(settings, 'server.enabled');
            if (serverEnabled) {
                this.publishConnection({ local: { state: 'starting' } });
                try {
                    this.http = await startHttpServer({
                        agenda: this.agenda,
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
            if (this.http && setting<boolean>(settings, 'server.tunnel.enabled')) {
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

    /** Releases every owned resource (tunnel, HTTP, control, record, lock). */
    public async shutdown(): Promise<void> {
        clearInterval(this.pairingRefresh);
        this.browser.close();
        this.tunnel?.stop();
        this.tunnel = undefined;
        await this.http?.close().catch(() => undefined);
        this.http = undefined;
        await this.controlServer?.close().catch(() => undefined);
        this.controlServer = undefined;
        await removeProcessRecord(this.options.project, this.instanceId).catch(() => undefined);
        await this.releaseLock?.();
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
                return { instanceId: this.instanceId, projectRoot: this.options.project.root, pid: process.pid, mode: this.options.mode, version: ENGINE_VERSION };
            case 'snapshot':
                return agenda.snapshot();
            case 'watch': {
                const since = Number(params.since ?? -1);
                await agenda.waitForChange(since, Math.min(Number(params.timeoutMs ?? 20_000), 25_000));
                return agenda.snapshot();
            }
            case 'pause':
            case 'resume':
            case 'skip-wait':
            case 'stop':
            case 'stop-now':
            case 'cancel-stop':
                return applyControlAction(agenda, method);
            case 'answer':
                return await applyAnswer(agenda, params, (params.via as 'terminal' | 'cli' | undefined) ?? 'cli');
            case 'settings':
                return await applySettings(agenda, params);
            case 'add-task':
                return await agenda.addTaskFile(String(params.path), String(params.content), String(params.summary), typeof params.commit === 'boolean' ? params.commit : undefined);
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
