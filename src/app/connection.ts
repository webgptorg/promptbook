import { errorMessage } from '../common/errors.js';
import type { AppConnectionView, AppHeartbeatView } from '../engine/snapshot.js';
import { HEARTBEAT_INTERVAL_MS, buildHeartbeat, hostFigures, nextHeartbeatSeq, sendHeartbeat, type HeartbeatUpdateState } from './heartbeat.js';
import { loadEngineIdentity, type EngineIdentity } from './identity.js';
import type { TestTlsOptions } from './net.js';
import { engineVersion, readRegistration, type StoredRegistration } from './registration.js';
import { DEFAULT_DASHBOARD_URL, appSettings, type RelayEndpoint } from './settings.js';
import { RelayLink, type TunnelStreamHandler } from './tunnel/relay-link.js';

/**
 * The App view of a project whose engine is not running, from the stored identity and registration only (no network,
 * nothing created).
 *
 * @private App connection
 */
export async function storedAppView(directory: string, env: NodeJS.ProcessEnv): Promise<AppConnectionView> {
    let dashboardUrl = DEFAULT_DASHBOARD_URL;
    try {
        const settings = appSettings(env);
        dashboardUrl = settings.dashboardUrl;
        const identity = await loadEngineIdentity(directory, { create: false });
        const registration = await readRegistration(directory, identity, settings);
        return {
            state: registration ? 'offline' : 'unlinked',
            dashboardUrl: registration?.dashboardUrl ?? dashboardUrl,
            ...(identity ? { engineId: identity.engineId, fingerprint: identity.fingerprint.formatted } : {}),
            ...(registration ? { hostname: registration.hostname, url: `https://${registration.hostname}/`, linkedAt: registration.registeredAt } : {}),
            relays: [],
            browserAccess: 'unavailable',
        };
    } catch (error) {
        return { state: 'problem', dashboardUrl, relays: [], browserAccess: 'unavailable', problem: errorMessage(error) };
    }
}

/**
 * Live figures the heartbeat reports from the engine.
 *
 * @private App connection
 */
export type AppEngineFigures = {
    /** Project agents (not deleted). */
    readonly agents: number;
    /** People who can sign in to this engine through the App (0 until App sign-in exists). */
    readonly members: number;
    readonly update: HeartbeatUpdateState;
};

/**
 * Options of a project's App connection.
 *
 * @private App connection
 */
export type AppConnectionOptions = {
    /** The App data directory (`.ptbk/app/`). */
    readonly directory: string;
    readonly env: NodeJS.ProcessEnv;
    readonly onChange: () => void;
    readonly figures: () => AppEngineFigures;
    readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
    /** Browser streams; refused until the engine ends browser TLS itself. */
    readonly onStream?: TunnelStreamHandler;
    /** Heartbeat cadence (tests only shorten it). */
    readonly heartbeatIntervalMs?: number;
    readonly tls?: TestTlsOptions;
};

/**
 * Keeps one project's App connection: the signed heartbeat and one tunnel per relay while the project is linked. It
 * never blocks the engine: every failure becomes part of its view.
 *
 * @private App connection
 */
export class AppConnection {
    private identity?: EngineIdentity;
    private registration?: StoredRegistration;
    private problem?: string;
    private links: RelayLink[] = [];
    private heartbeat?: AppHeartbeatView;
    private heartbeatTimer?: NodeJS.Timeout;
    private dashboardUrl = DEFAULT_DASHBOARD_URL;
    private running = false;
    /** Serializes start, reload and stop. */
    private queue: Promise<void> = Promise.resolve();

    public constructor(private readonly options: AppConnectionOptions) {}

    /** Loads the link and connects when the project is linked. */
    public async start(): Promise<void> {
        await this.serialize(async () => {
            this.running = true;
            await this.load();
        });
    }

    /** Re-reads the link after `ptbk connect` or `ptbk disconnect`. */
    public async reload(): Promise<AppConnectionView> {
        await this.serialize(async () => {
            if (!this.running) return;
            this.disconnect();
            await this.load();
        });
        return this.view();
    }

    /** Closes every tunnel and stops the heartbeat. */
    public async stop(): Promise<void> {
        await this.serialize(async () => {
            this.running = false;
            this.disconnect();
        });
    }

    /** Runs one lifecycle step after the previous one. */
    private async serialize(step: () => Promise<void>): Promise<void> {
        const next = this.queue.then(step, step);
        this.queue = next.catch(() => undefined);
        await next;
    }

    /** Reads settings, identity and registration, then connects when linked. */
    private async load(): Promise<void> {
        this.problem = undefined;
        this.identity = undefined;
        this.registration = undefined;
        this.heartbeat = undefined;
        try {
            const settings = appSettings(this.options.env);
            this.dashboardUrl = settings.dashboardUrl;
            this.identity = await loadEngineIdentity(this.options.directory, { create: false });
            this.registration = await readRegistration(this.options.directory, this.identity, settings);
            if (this.registration && this.identity) this.connect(this.identity, this.registration, settings.relays);
        } catch (error) {
            this.problem = errorMessage(error);
            this.options.log?.(`The App connection is not available: ${this.problem}`, 'error');
        }
        this.options.onChange();
    }

    /** Starts the relay links and the heartbeat loop. */
    private connect(identity: EngineIdentity, registration: StoredRegistration, override: readonly RelayEndpoint[] | undefined): void {
        const version = engineVersion();
        const relays = override ?? registration.relays.map((id) => ({ id, port: 443 }));
        this.links = relays.map(
            (relay) =>
                new RelayLink({
                    relay,
                    identity,
                    version,
                    env: this.options.env,
                    onChange: this.options.onChange,
                    onStream: this.options.onStream,
                    log: this.options.log,
                    tls: this.options.tls,
                }),
        );
        for (const link of this.links) link.start();
        const beat = async (): Promise<void> => {
            try {
                const figures = this.options.figures();
                const host = await hostFigures(this.options.directory);
                const seq = await nextHeartbeatSeq(this.options.directory);
                const body = buildHeartbeat({ engineId: identity.engineId, seq, ts: new Date().toISOString(), version, uptimeS: process.uptime(), ...host, ...figures });
                const result = await sendHeartbeat({ identity, dashboardUrl: registration.dashboardUrl, body, env: this.options.env, tls: this.options.tls });
                if (!this.running || this.registration !== registration) return;
                this.heartbeat = { ...result, nextAt: new Date(Date.now() + (this.options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS)).toISOString() };
                if (result.outcome !== 'accepted') this.options.log?.(`The App heartbeat was ${result.outcome === 'refused' ? `refused (HTTP ${String(result.status)}${result.code ? `, ${result.code}` : ''})` : 'not delivered'}.`, 'warning');
            } catch (error) {
                this.heartbeat = { at: new Date().toISOString(), outcome: 'failed', body: '', message: errorMessage(error) };
            }
            this.options.onChange();
        };
        void beat();
        this.heartbeatTimer = setInterval(() => void beat(), this.options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS);
        this.heartbeatTimer.unref();
    }

    /** Stops every link and the heartbeat. */
    private disconnect(): void {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
        for (const link of this.links) link.stop();
        this.links = [];
    }

    /** The App page's view of this connection (no secrets: no key, signature or link code). */
    public view(): AppConnectionView {
        const identity = this.identity;
        const registration = this.registration;
        const relays = this.links.map((link) => link.view());
        const connected = relays.filter((relay) => relay.state === 'connected').length;
        const refusal = relays.find((relay) => relay.refusal)?.refusal;
        const state: AppConnectionView['state'] = this.problem ? 'problem' : !registration ? 'unlinked' : connected ? 'linked' : refusal || this.heartbeat?.code === 'engine-suspended' ? 'refused' : 'connecting';
        return {
            state,
            dashboardUrl: registration?.dashboardUrl ?? this.dashboardUrl,
            ...(identity ? { engineId: identity.engineId, fingerprint: identity.fingerprint.formatted } : {}),
            ...(registration ? { hostname: registration.hostname, url: `https://${registration.hostname}/`, linkedAt: registration.registeredAt } : {}),
            relays,
            ...(this.heartbeat ? { heartbeat: this.heartbeat } : {}),
            browserAccess: 'unavailable',
            ...(this.problem ? { problem: this.problem } : {}),
        };
    }
}
