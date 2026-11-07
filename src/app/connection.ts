import { PtbkError, errorMessage } from '../common/errors.js';
import type { AppCertificateView, AppConnectionView, AppHeartbeatView, AppRelayView } from '../engine/snapshot.js';
import { HEARTBEAT_INTERVAL_MS, buildHeartbeat, hostFigures, nextHeartbeatSeq, sendHeartbeat, type HeartbeatUpdateState } from './heartbeat.js';
import { loadEngineIdentity, type EngineIdentity } from './identity.js';
import type { TestTlsOptions } from './net.js';
import { CONFORMANCE_BUILD } from './build.js';
import { engineVersion, parseAppLink, readRegistration, registerEngine, storeRegistration, type StoredRegistration } from './registration.js';
import { DEFAULT_DASHBOARD_URL, appSettings, isTunnelMode, type AppSettings, type RelayEndpoint } from './settings.js';
import { RelayLink } from './tunnel/relay-link.js';
import { AccessStore, type Actor } from './web/access.js';
import { SESSION_COOKIE_NAME } from './web/gateway.js';
import type { CertificateSourceKind } from './web/certificates.js';
import { EngineOrigin } from './web/origin.js';

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
    /**
     * The engine's own web origin behind the tunnels: the engine API and the documents (UI) its gateway serves to
     * signed-in members. Without it, browser streams are refused.
     */
    readonly web?: AppWebHandlers;
    /** Heartbeat cadence (tests only shorten it). */
    readonly heartbeatIntervalMs?: number;
    readonly tls?: TestTlsOptions;
};

/**
 * What the engine serves on its own origin through the App tunnels, behind the passkey gateway.
 *
 * @private App connection
 */
export type AppWebHandlers = {
    /** The engine API (`/api/v1/...`) for a signed-in member. */
    readonly api: (request: Request, actor: Actor, access: AccessStore) => Promise<Response>;
    /** Every other document or file for a signed-in member (the UI bundle or the plain engine page). */
    readonly documents: (request: Request, actor: Actor) => Promise<Response>;
    /** Audit entries of gateway events. */
    readonly audit?: (event: import('./web/gateway.js').GatewayAuditEvent) => void;
    /** `dev-ca` only in the conformance build. */
    readonly certificateSource?: CertificateSourceKind;
    /** Called with the access store once it is open (the API's members, sessions and passkeys). */
    readonly onAccess?: (access: AccessStore) => void;
};

/**
 * The result of exchanging an operator's pairing URL with the App registry.
 *
 * @private App connection
 */
export type AppPairingOutcome =
    | { readonly outcome: 'linked' | 'already-linked'; readonly app: AppConnectionView }
    | { readonly outcome: 'refused'; readonly code: string; readonly message: string };

/**
 * The one-time owner setup URL or the reason it is not available.
 *
 * @private App connection
 */
export type SetupLinkOutcome =
    | { readonly kind: 'issued'; readonly url: string; readonly expiresAt: string; readonly engineId: string; readonly fingerprint: string }
    | { readonly kind: 'not-ready'; readonly missing: string }
    | { readonly kind: 'owner-exists'; readonly hostname: string };

/**
 * What the engine API's security overview (`GET /security`) shows of the App connection: no key, token or signature.
 *
 * @private App connection
 */
export type AppSecurityFacts = {
    readonly hostname?: string;
    readonly dashboardUrl: string;
    readonly certificate?: { readonly sha256: string; readonly notAfter: string };
    readonly certificateState?: AppCertificateView['state'];
    readonly relays: readonly AppRelayView[];
    readonly heartbeat?: AppHeartbeatView;
    /** The engine clock minus the App's, from the last stale-timestamp answer. */
    readonly clockSkew?: { readonly seconds: number; readonly measuredAt: string };
    readonly acmeDirectoryUrl?: string;
};

/**
 * Longest wait of the launch-contract registration: a link code is valid for 30 minutes.
 */
const REGISTRATION_ATTEMPTS = 9;

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
    private origin?: EngineOrigin;
    private access?: AccessStore;
    private wasConnected = false;
    /** The launch-contract registration with `PTBK_LINK_CODE` while it runs. */
    private registering?: AbortController;
    /** Why the App refused the launch-contract registration (final codes stay until the next start). */
    private registrationRefusal?: { readonly code: string; readonly message: string };
    /** Whether "Ready" was reported for the current link. */
    private announcedReady = false;
    /** The engine clock minus the App's, measured from the last stale-timestamp answer. */
    private clockSkew?: { readonly seconds: number; readonly measuredAt: string };
    private heartbeat?: AppHeartbeatView;
    private heartbeatTimer?: NodeJS.Timeout;
    private dashboardUrl = DEFAULT_DASHBOARD_URL;
    private running = false;
    /** Serializes start, reload and stop. */
    private queue: Promise<void> = Promise.resolve();

    public constructor(private readonly options: AppConnectionOptions) {}

    /**
     * Loads the link and connects when the project is linked. An engine started as an App tunnel engine
     * (`PTBK_MODE=tunnel`) refuses to start when its App state is unsafe or invalid (a loose data directory or key
     * file, invalid configuration): this throws, naming the path or setting.
     */
    public async start(): Promise<void> {
        await this.serialize(async () => {
            this.running = true;
            await this.load();
        });
        if (this.problem && isTunnelMode(this.options.env)) throw new PtbkError(this.problem, { kind: 'configuration', phase: 'App connection' });
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

    /** Exchanges an operator-supplied pairing URL once, without passing it in the service's saved launch. */
    public async pair(link: string): Promise<AppPairingOutcome> {
        let result!: AppPairingOutcome;
        await this.serialize(async () => {
            if (!this.running) throw new PtbkError('The App connection is not running.', { kind: 'conflict' });
            const { linkCode, settings } = parseAppLink(link, this.options.env);
            const identity = await loadEngineIdentity(this.options.directory, { create: true });
            if (!identity) throw new Error('The engine identity could not be created.');
            const existing = await readRegistration(this.options.directory, identity, settings);
            if (existing) {
                result = { outcome: 'already-linked', app: this.view() };
                return;
            }
            if (this.registering) throw new PtbkError('The engine is already pairing.', { kind: 'conflict' });
            const outcome = await registerEngine({ identity, linkCode, settings, env: this.options.env, tls: this.options.tls });
            if (outcome.kind === 'refused') {
                result = { outcome: 'refused', code: outcome.code, message: outcome.message };
                return;
            }
            await storeRegistration(this.options.directory, outcome.registration);
            this.disconnect();
            await this.load();
            result = { outcome: 'linked', app: this.view() };
        });
        return result;
    }

    /** Closes every tunnel and stops the heartbeat. */
    public async stop(): Promise<void> {
        await this.serialize(async () => {
            this.running = false;
            const access = this.access;
            this.disconnect();
            await access?.flush();
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
        this.registrationRefusal = undefined;
        this.announcedReady = false;
        try {
            const settings = appSettings(this.options.env);
            this.dashboardUrl = settings.dashboardUrl;
            // The launch contract: an engine given a link code registers with it once, when it holds no registration.
            const linkCode = this.options.env.PTBK_LINK_CODE?.trim();
            this.identity = await loadEngineIdentity(this.options.directory, { create: Boolean(linkCode) });
            this.registration = await readRegistration(this.options.directory, this.identity, settings);
            if (this.identity) {
                const hostname = this.registration?.hostname ?? (settings.engineDomain ? `${this.identity.engineId}.${settings.engineDomain}` : undefined);
                this.options.log?.(`App engine ${this.identity.engineId}${hostname ? ` (${hostname})` : ''}, fingerprint ${this.identity.fingerprint.formatted}.`, 'info');
            }
            if (this.registration && this.identity) {
                if (linkCode) this.options.log?.('Already linked to the Promptbook App; the link code was not used.', 'info');
                await this.connect(this.identity, this.registration, settings.relays);
            } else if (linkCode && this.identity) {
                const link = parseAppLink(linkCode, this.options.env);
                this.dashboardUrl = link.settings.dashboardUrl;
                this.register(this.identity, link.linkCode, link.settings);
            }
        } catch (error) {
            this.problem = errorMessage(error);
            this.options.log?.(`The App connection is not available: ${this.problem}`, 'error');
        }
        this.options.onChange();
    }

    /** Registers in the background with the launch contract's link code, then connects (never logs the code). */
    private register(identity: EngineIdentity, linkCode: string, settings: AppSettings): void {
        const abort = new AbortController();
        this.registering = abort;
        this.options.log?.(`Linking this engine with the Promptbook App at ${settings.dashboardUrl}.`, 'info');
        void (async () => {
            const outcome = await registerEngine({
                identity,
                linkCode,
                settings,
                env: this.options.env,
                attempts: REGISTRATION_ATTEMPTS,
                signal: abort.signal,
                tls: this.options.tls,
                onRetry: (refused, delayMs) => this.options.log?.(`The Promptbook App did not link the engine (${refused.code}): ${refused.message} Retrying in ${String(Math.round(delayMs / 1000))} s.`, 'warning'),
            }).catch((error: unknown) => ({ kind: 'refused' as const, code: 'internal-error', final: true, message: errorMessage(error) }));
            if (abort.signal.aborted || !this.running || this.registering !== abort) return;
            this.registering = undefined;
            if (outcome.kind === 'refused') {
                this.registrationRefusal = { code: outcome.code, message: outcome.message };
                this.options.log?.(`The Promptbook App refused to link this engine (${outcome.code}): ${outcome.message}`, 'error');
                this.options.onChange();
                return;
            }
            await this.serialize(async () => {
                if (!this.running || this.identity !== identity) return;
                try {
                    await storeRegistration(this.options.directory, outcome.registration);
                    this.registration = outcome.registration;
                    this.options.log?.(`Linked to your Promptbook account as ${outcome.registration.hostname}.`, 'info');
                    await this.connect(identity, outcome.registration, settings.relays);
                } catch (error) {
                    this.problem = errorMessage(error);
                    this.options.log?.(`The App connection is not available: ${this.problem}`, 'error');
                }
                this.options.onChange();
            });
        })();
    }

    /** Something of the connection changed: report readiness once, then tell the engine. */
    private changed(): void {
        const hostname = this.registration?.hostname;
        if (!this.announcedReady && hostname && this.origin?.servesBrowsers && this.links.some((link) => link.view().state === 'connected')) {
            this.announcedReady = true;
            if (this.access && !this.access.hasOwner) this.options.log?.('No owner yet. Run `ptbk connect --setup-link` in this project to get the setup link.', 'info');
            this.options.log?.(`Ready: https://${hostname}/`, 'info');
        }
        this.options.onChange();
    }

    /** What still keeps browsers from opening the engine's address, if anything. */
    private notReadyReason(): string | undefined {
        if (!this.registration) return this.registering ? 'The engine is still linking with the Promptbook App.' : 'This project is not linked to the Promptbook App; run `ptbk connect --link <code>` first.';
        if (!this.origin || !this.access) return 'The engine does not serve its own address in this run.';
        if (!this.links.some((link) => link.view().state === 'connected')) return 'No relay routes the engine yet.';
        if (!this.origin.servesBrowsers) {
            const certificate = this.origin.certificateView();
            return `The engine has no valid certificate for ${certificate.hostname} yet (${certificate.state}${certificate.problem ? `: ${certificate.problem}` : ''}).`;
        }
        return undefined;
    }

    /**
     * A fresh owner setup link (`https://<hostname>/setup#<secret>`) replacing any earlier one, once the engine's address
     * works and while it has no owner. The caller shows it only in the operator's terminal, never in a log.
     */
    public async setupLink(): Promise<SetupLinkOutcome> {
        const missing = this.notReadyReason();
        if (missing) return { kind: 'not-ready', missing };
        const access = this.access!;
        const registration = this.registration!;
        if (access.hasOwner) return { kind: 'owner-exists', hostname: registration.hostname };
        const { secret, expiresAt } = await access.createSetupSecret();
        return { kind: 'issued', url: `https://${registration.hostname}/setup#${secret}`, expiresAt: expiresAt.toISOString(), engineId: this.identity?.engineId ?? registration.engineId, fingerprint: this.identity?.fingerprint.formatted ?? '' };
    }

    /**
     * The owner reset run in the engine's terminal: every member, passkey and session ends (the agents and the project
     * stay), then a fresh setup link once the address works.
     */
    public async resetOwner(): Promise<SetupLinkOutcome> {
        if (!this.access) return { kind: 'not-ready', missing: this.notReadyReason() ?? 'The engine does not serve its own address in this run.' };
        await this.access.resetOwner();
        this.options.log?.('The owner access was reset: every passkey and session of this engine ended.', 'warning');
        this.options.onChange();
        return await this.setupLink();
    }

    /**
     * A session for the conformance harness (`conformance-session`): the owner, or a new member holding exactly the
     * given permissions. Only the conformance build has it; it is never an HTTP endpoint.
     */
    public async conformanceSession(subject: { readonly kind: 'owner' } | { readonly kind: 'member'; readonly permissions: readonly string[] }): Promise<{ readonly cookie: string } | null> {
        if (!CONFORMANCE_BUILD) throw new PtbkError('Conformance sessions exist only in the conformance build.', { kind: 'unsupported' });
        const access = this.access;
        if (!access) return null;
        const member =
            subject.kind === 'owner'
                ? (access.members().find((candidate) => candidate.role === 'owner') ?? (await access.addMember({ displayName: 'Conformance owner', role: 'owner' })))
                : await access.addMember({ displayName: 'Conformance member', role: 'member', permissions: subject.permissions as never });
        const { token } = await access.signIn(member.id, null, null);
        return { cookie: `${SESSION_COOKIE_NAME}=${token}` };
    }

    /** The access store (members, passkeys, sessions) once the project is linked. */
    public get accessStore(): AccessStore | undefined {
        return this.access;
    }

    /** Opens the engine's own origin (access state and certificate) for the linked hostname. */
    private async openOrigin(identity: EngineIdentity, registration: StoredRegistration): Promise<void> {
        const web = this.options.web;
        if (!web) return;
        const access = await AccessStore.open(this.options.directory);
        this.access = access;
        web.onAccess?.(access);
        this.origin = new EngineOrigin({
            directory: this.options.directory,
            hostname: registration.hostname,
            certificateSource: web.certificateSource ?? 'acme',
            env: this.options.env,
            tunnelReady: () => this.links.some((link) => link.view().state === 'connected'),
            onChange: () => this.changed(),
            log: this.options.log,
            tls: this.options.tls,
            access,
            engineId: identity.engineId,
            fingerprint: identity.fingerprint,
            api: (request, actor) => web.api(request, actor, access),
            documents: web.documents,
            audit: web.audit,
        });
        await this.origin.start();
    }

    /** Relay state changed: let the certificate manager order once a tunnel is ready, then tell the engine. */
    private linkChanged(): void {
        const connected = this.links.some((link) => link.view().state === 'connected');
        if (connected && !this.wasConnected) this.origin?.tunnelBecameReady();
        this.wasConnected = connected;
        this.changed();
    }

    /** Starts the relay links and the heartbeat loop. */
    private async connect(identity: EngineIdentity, registration: StoredRegistration, override: readonly RelayEndpoint[] | undefined): Promise<void> {
        await this.openOrigin(identity, registration);
        const version = engineVersion();
        const relays = override ?? registration.relays.map((id) => ({ id, port: 443 }));
        this.links = relays.map(
            (relay) =>
                new RelayLink({
                    relay,
                    identity,
                    version,
                    env: this.options.env,
                    onChange: () => this.linkChanged(),
                    onStream: this.origin ? (stream) => this.origin?.handleStream(stream) : undefined,
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
                const access = this.access;
                // Members who can sign in: at least one registered passkey (0 until the owner's first passkey).
                const members = access ? access.members().filter((member) => access.passkeys(member.id).length > 0).length : figures.members;
                const body = buildHeartbeat({ engineId: identity.engineId, seq, ts: new Date().toISOString(), version, uptimeS: process.uptime(), ...host, ...figures, members });
                const result = await sendHeartbeat({ identity, dashboardUrl: registration.dashboardUrl, body, env: this.options.env, tls: this.options.tls });
                if (!this.running || this.registration !== registration) return;
                this.heartbeat = { ...result, nextAt: new Date(Date.now() + this.heartbeatIntervalMs()).toISOString() };
                if (result.skewMs !== undefined) this.clockSkew = { seconds: Math.round(result.skewMs / 1000), measuredAt: result.at };
                if (result.outcome !== 'accepted') this.options.log?.(`The App heartbeat was ${result.outcome === 'refused' ? `refused (HTTP ${String(result.status)}${result.code ? `, ${result.code}` : ''})` : 'not delivered'}.`, 'warning');
            } catch (error) {
                this.heartbeat = { at: new Date().toISOString(), outcome: 'failed', body: '', message: errorMessage(error) };
            }
            this.options.onChange();
        };
        void beat();
        this.heartbeatTimer = setInterval(() => void beat(), this.heartbeatIntervalMs());
        this.heartbeatTimer.unref();
    }

    /** The heartbeat cadence: 60 s; the conformance build also takes `PTBK_HEARTBEAT_INTERVAL_S` from its command. */
    private heartbeatIntervalMs(): number {
        if (this.options.heartbeatIntervalMs) return this.options.heartbeatIntervalMs;
        const override = Number(this.options.env.PTBK_HEARTBEAT_INTERVAL_S);
        return CONFORMANCE_BUILD && Number.isFinite(override) && override >= 1 ? override * 1000 : HEARTBEAT_INTERVAL_MS;
    }

    /** Stops every link and the heartbeat. */
    private disconnect(): void {
        this.registering?.abort();
        this.registering = undefined;
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
        for (const link of this.links) link.stop();
        this.links = [];
        this.origin?.stop();
        this.origin = undefined;
        this.access = undefined;
        this.wasConnected = false;
    }

    /** What the security overview shows of the connection. */
    public securityFacts(): AppSecurityFacts {
        const served = this.origin?.certificates.served();
        return {
            ...(this.registration ? { hostname: this.registration.hostname } : {}),
            dashboardUrl: this.registration?.dashboardUrl ?? this.dashboardUrl,
            ...(served ? { certificate: served } : {}),
            ...(this.origin ? { certificateState: this.origin.certificateView().state } : {}),
            relays: this.links.map((link) => link.view()),
            ...(this.heartbeat ? { heartbeat: this.heartbeat } : {}),
            ...(this.clockSkew ? { clockSkew: this.clockSkew } : {}),
            ...(this.origin && this.options.web?.certificateSource !== 'dev-ca' ? { acmeDirectoryUrl: this.options.env.PTBK_ACME_DIRECTORY_URL || 'https://acme-v02.api.letsencrypt.org/directory' } : {}),
        };
    }

    /** The App page's view of this connection (no secrets: no key, signature or link code). */
    public view(): AppConnectionView {
        const identity = this.identity;
        const registration = this.registration;
        const relays = this.links.map((link) => link.view());
        const connected = relays.filter((relay) => relay.state === 'connected').length;
        const refusal = relays.find((relay) => relay.refusal)?.refusal;
        const state: AppConnectionView['state'] = this.problem ? 'problem' : this.registrationRefusal ? 'refused' : this.registering ? 'connecting' : !registration ? 'unlinked' : connected ? 'linked' : refusal || this.heartbeat?.code === 'engine-suspended' ? 'refused' : 'connecting';
        return {
            state,
            dashboardUrl: registration?.dashboardUrl ?? this.dashboardUrl,
            ...(identity ? { engineId: identity.engineId, fingerprint: identity.fingerprint.formatted } : {}),
            ...(registration ? { hostname: registration.hostname, url: `https://${registration.hostname}/`, linkedAt: registration.registeredAt } : {}),
            relays,
            ...(this.heartbeat ? { heartbeat: this.heartbeat } : {}),
            browserAccess: connected && this.origin?.servesBrowsers ? 'available' : 'unavailable',
            ...(this.origin ? { certificate: this.origin.certificateView() } : {}),
            ...(this.access ? { owner: this.access.hasOwner ? 'set' : 'none' } : {}),
            ...(this.problem ? { problem: this.problem } : this.registrationRefusal ? { problem: `${this.registrationRefusal.message} (${this.registrationRefusal.code})` } : {}),
        };
    }
}
