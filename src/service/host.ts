import { createHash } from 'node:crypto';
import { parseActionViewQuery } from '../engine/action-impact.js';
import { PtbkError, errorMessage } from '../common/errors.js';
import type { ComposedSegment } from '../ui/composer.js';
import { secretToken, shortId } from '../common/ids.js';
import { ipcAddress, type IpcServer } from '../common/ipc.js';
import { ENGINE_VERSION } from '../common/version.js';
import { setting, type BrowserOverrides } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import { Agenda, type AgendaMode, type AgendaSummary } from '../engine/agenda.js';
import type { LocalApiView, ServiceSnapshot } from '../engine/snapshot.js';
import { EngineApi } from '../app/api/engine-api.js';
import { CONFORMANCE_BUILD } from '../app/build.js';
import { AppConnection, type AppEngineFigures } from '../app/connection.js';
import { appDirectory, isTunnelMode } from '../app/settings.js';
import { engineHomePage } from '../app/web/documents.js';
import { UiLoader } from '../app/web/ui-loader.js';
import { ProjectEffects, effectsRequest, snapshotEffects } from '../engine/effects.js';
import { parseUsageRequest } from '../engine/usage.js';
import type { VoiceMediaInput } from '../engine/voice-calls.js';
import { browserTools } from '../browser/agent-tools.js';
import { BrowserFleet } from '../browser/fleet.js';
import { TabControls, type TabControlWallet, type TabInput } from '../browser/tab-control.js';
import { describeProfileSource } from '../tools/model.js';
import { WALLET_ACTIONS, applyChatAction, applyControlAction, applySettings, applyToolAction, applyWalletAction, type BrowserControls } from './actions.js';
import { CONTROL_CONTRACT, startControlServer } from './control.js';
import { registerEngine, summaryOfSnapshot } from './discovery.js';
import { recordRunEnded, registerKnownProject } from './known-projects.js';
import { startHttpServer, type RunningHttpServer } from './http.js';
import { OwnedProcessRecorder } from './owned-processes.js';
import { acquireProjectLock, engineIdentity, removeProcessRecord, writeProcessRecord } from './records.js';

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
    /** Private app credential for the embedded dashboard, which binds to an ephemeral loopback port. */
    readonly dashboardAccessKey?: string;
    /** Plain event stream. */
    readonly onEvent?: (text: string, level: 'info' | 'warning' | 'error') => void;
};

/**
 * Hosts one project's agenda with its control channel, local HTTP API/SPA.
 *
 * @private service host
 */
export class ServiceHost {
    public readonly instanceId = shortId(12);
    public readonly agenda: Agenda;
    private readonly token = secretToken(24);
    /** Temporary project-client ownership; an engine restart always starts effects Off. */
    private readonly effects = new ProjectEffects();
    private controlServer?: IpcServer;
    private http?: RunningHttpServer;
    private releaseLock?: () => Promise<void>;
    private unregister?: () => Promise<void>;
    /** This instance is the known project's last run (its end is recorded on shutdown). */
    private knownRun = false;
    private localApi: LocalApiView = { state: 'disabled' };
    /** The project's Promptbook App connection (not in maintenance runs). */
    private appConnection?: AppConnection;
    /** The engine UI loader of the App connection (verified UI bundles from the release store). */
    private uiLoader?: UiLoader;
    /** A coalesced App view publication is queued. */
    private appViewQueued = false;
    private readonly browsers: BrowserFleet;
    /** Tabs the user controls live (reserved for every engine of their profile until handed back). */
    private readonly tabs: TabControls;
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
                return browserTools(
                    scope,
                    context.chats,
                    context.agent,
                    context.onUserChat,
                    () => this.describeBrowsers(),
                    // A login request for the task's page only: the agent never reads a Wallet record.
                    { login: async (page, request) => await this.agenda.wallet.login(page, { ...request, task: task.title, agent: context.agent }), accounts: (site) => this.agenda.wallet.accounts(site), createLogin: async (page, request) => await this.agenda.wallet.createLogin(page, request), correctLogin: async (input) => await this.agenda.wallet.correctLogin(input), onWait: context.onWalletWait },
                );
            },
            finalizeEvidence: async (task) => await this.browsers.scope(task.key).finishEvidence(),
            afterWork: async (task) => await this.browsers.endScope(task.key),
            // A Wallet credential test signs in through its own scope of the project browser, in a fresh context.
            walletLoginContext: async (origin) => {
                const key = `wallet-test-${shortId()}`;
                try {
                    const login = await (await this.browsers.scope(key).acquire()).isolatedLogin(origin);
                    return {
                        page: login.page,
                        dispose: async () => {
                            await login.dispose();
                            await this.browsers.endScope(key);
                        },
                    };
                } catch (error) {
                    await this.browsers.endScope(key);
                    throw error;
                }
            },
            // The session looking for a Wallet test's one-time code reads with the project browser's sessions; it has no Wallet.
            walletCodeTools: () => {
                const key = `wallet-code-${shortId()}`;
                return { tools: browserTools(this.browsers.scope(key), undefined, 'Fixer', () => undefined, () => this.describeBrowsers()), dispose: async () => await this.browsers.endScope(key) };
            },
            browsers: {
                primary: () => (this.agenda.effectiveSettings ? this.browsers.primary() : undefined),
                all: () => (this.agenda.effectiveSettings ? this.browsers.inspectAll() : []),
                inUse: () => this.browsers.inUse(),
            },
            tabControls: () => this.tabs?.views() ?? [],
        });
        this.browsers = new BrowserFleet(options.project, () => this.agenda.effectiveSettings, options.env, () => this.agenda.notifyChange(), this.instanceId);
        this.tabs = new TabControls({ onChange: () => this.agenda.notifyChange(), log: (text) => this.agenda.log(text) });
        this.agenda.onChange(() => {
            if (this.effects.state.clients.length) this.effects.observe(snapshotEffects(this.agenda.snapshot()));
        });
    }

    /** Engine-owned per-browser diagnosis and recovery shared by every client. */
    /**
     * The browsers an agent may open, as its tools describe them (enabled ones of the effective settings).
     */
    private describeBrowsers(): Array<{ name: string; description?: string; profile: string; isHeadless: boolean }> {
        return this.agenda.effectiveSettings.tools.flatMap((tool) => (tool.type === 'BROWSER' && tool.isEnabled ? [{ name: tool.name, description: tool.description, profile: describeProfileSource(tool.profile.source, tool.profile.path), isHeadless: tool.isHeadless }] : []));
    }

    private get browserControls(): BrowserControls {
        return {
            recheck: (name) => this.browsers.control('recheck', name),
            retry: (name) => this.browsers.control('retry', name),
            restart: (name) => this.browsers.control('restart', name),
            kill: (name) => this.browsers.control('kill', name),
            testTab: (name) => this.browsers.control('test-tab', name),
        };
    }

    /** A project browser by name (the first enabled one by default). */
    private browserNamed(name: string | undefined): NonNullable<ReturnType<BrowserFleet['instance']>> {
        const chosen = name || this.browsers.enabledNames()[0];
        const browser = chosen ? this.browsers.instance(chosen) : undefined;
        if (!browser) throw new PtbkError(chosen ? `No browser named "${chosen}" is configured.` : 'No browser is enabled for this project.', { kind: 'not-found' });
        return browser;
    }

    /** Live tab-control operations of the local control channel. */
    private async tabControl(method: string, params: Readonly<Record<string, unknown>>): Promise<unknown> {
        const text = (key: string): string | undefined => (typeof params[key] === 'string' && params[key] ? (params[key] as string) : undefined);
        if (method === 'tab-control-list') return { controls: this.tabs.views() };
        if (method === 'tab-control-tabs') {
            const browser = this.browserNamed(text('browser'));
            return { browser: browser.name, tabs: (await browser.pages()).map((page) => ({ targetId: page.targetId, url: page.url, title: page.title, ...(page.task ? { task: page.task } : {}), reserved: page.reserved })) };
        }
        if (method === 'tab-control-open') {
            const request = text('request');
            let wallet: TabControlWallet | undefined;
            let browserName = text('browser');
            let url = text('url');
            if (request) {
                const context = this.agenda.wallet.manualSignIn(request);
                browserName ??= context.browser && this.browsers.instance(context.browser) ? context.browser : undefined;
                url ??= context.origin;
                wallet = {
                    request: context.request,
                    origin: context.origin,
                    ...(context.account ? { account: context.account } : {}),
                    offer: async (candidate) => this.agenda.wallet.manualOffer(candidate),
                    save: async (candidate, expected) => await this.agenda.wallet.saveFromManualSignIn(candidate, expected),
                    satisfy: async (access) => await this.agenda.wallet.satisfyByManualSignIn(context.request, access),
                    settled: () => {
                        const action = this.agenda.wallet.action(context.request);
                        if (!action) return 'The sign-in request no longer exists. You may finish here or leave; the tab stays with you until you return it.';
                        if (action.state === 'pending') return undefined;
                        return `The sign-in request was ${action.state === 'resolved' ? 'completed' : 'rejected'} meanwhile. You may finish here or leave; the tab stays with you until you return it.`;
                    },
                };
            }
            const session = await this.tabs.open({ browser: this.browserNamed(browserName), ...(text('target') ? { target: text('target') } : {}), ...(url && !text('target') ? { url } : {}), purpose: wallet ? 'wallet' : 'browse', ...(wallet ? { wallet } : {}) });
            return { control: session.view(), grant: session.claim() };
        }
        const session = this.tabs.get(String(params.id ?? ''));
        const grant = String(params.grant ?? '');
        switch (method) {
            case 'tab-control-poll':
                return await session.poll(grant, { version: Number(params.version ?? 0) || 0, frame: Number(params.frame ?? 0) || 0 }, Math.min(20_000, Math.max(0, Number(params.wait ?? 0) || 0)));
            case 'tab-control-attach':
                return { control: await session.viewerAttached(grant) };
            case 'tab-control-detach':
                return { control: session.viewerDetached(grant) };
            case 'tab-control-input':
                await session.input(grant, Array.isArray(params.events) ? (params.events as TabInput[]) : []);
                return { ok: true };
            case 'tab-control-navigate': {
                const action = String(params.action ?? '');
                if (!['go', 'back', 'forward', 'reload'].includes(action)) throw new PtbkError(`Unknown navigation "${action}".`, { kind: 'usage' });
                return { control: await session.navigate(grant, action as 'go', text('url')) };
            }
            case 'tab-control-clipboard': {
                const action = String(params.action ?? '');
                if (!['copy', 'cut', 'paste'].includes(action)) throw new PtbkError(`Unknown clipboard action "${action}".`, { kind: 'usage' });
                return await session.clipboard(grant, action as 'copy', typeof params.text === 'string' ? params.text : undefined);
            }
            case 'tab-control-resize':
                await session.resize(grant, { width: Number(params.width) || 1280, height: Number(params.height) || 800, scale: Number(params.scale) || 1 });
                return { ok: true };
            case 'tab-control-handback':
                return { control: await session.handBack() };
            case 'tab-control-end':
                return { control: await session.endUse() };
            case 'tab-control-offer': {
                const answer = String(params.answer ?? '');
                if (answer !== 'yes' && answer !== 'no') throw new PtbkError('Answer the save offer with yes or no.', { kind: 'usage' });
                return { outcome: await session.answerOffer(String(params.offer ?? ''), answer), control: session.view() };
            }
            case 'tab-control-reopen':
                return { control: session.view(), grant: session.reopen() };
        }
        throw new PtbkError(`Unknown tab control method "${method}".`, { kind: 'usage' });
    }

    /** Local HTTP address, when serving. */
    public get httpUrl(): string | undefined {
        return this.http?.url;
    }

    /** Publishes the local API state of local clients to the agenda (technical; never presented as a connection). */
    private publishLocalApi(localApi: LocalApiView): void {
        this.localApi = localApi;
        this.agenda.setLocalApi(this.localApi);
    }

    /** Publishes the App connection view, coalescing bursts of relay and stream changes into one update. */
    private publishAppView(): void {
        if (this.appViewQueued) return;
        this.appViewQueued = true;
        setImmediate(() => {
            this.appViewQueued = false;
            if (this.appConnection) this.agenda.setAppConnection(this.appConnection.view());
        });
    }

    /** What the App heartbeat reports from this engine: agents, App members and the self-update state. */
    private appFigures(): AppEngineFigures {
        const snapshot: ServiceSnapshot = this.agenda.snapshot();
        const update = snapshot.update;
        const state = !update ? 'none' : update.phase === 'installing' || update.phase === 'restarting' ? 'installing' : update.target ? 'pending' : update.latest && update.latest !== update.current ? 'available' : 'none';
        return { agents: snapshot.agents.length, members: 0, update: state };
    }

    /**
     * Starts the App connection with the engine's own origin (passkey gateway, engine API, engine page). Its failures
     * stay on the App page and never stop the engine, except in an App tunnel engine (`PTBK_MODE=tunnel`), which refuses
     * to start with an unsafe or invalid App state.
     */
    private async startAppConnection(): Promise<void> {
        const env = this.options.env;
        const view = (): ReturnType<AppConnection['view']> | undefined => this.appConnection?.view();
        const directory = appDirectory(this.options.project.runtime.app, env);
        // Created before anything listens: a release build refuses a conformance trust file, and an invalid update
        // policy or release URL stops the engine rather than serving an unchecked UI.
        const loader = await UiLoader.create({ directory, env, log: (text, level) => this.agenda.log(text, level) });
        this.uiLoader = loader;
        const enginePageSha256 = createHash('sha256').update(engineHomePage.toString()).digest('hex');
        const api = new EngineApi({
            agenda: this.agenda,
            projectRoot: this.options.project.root,
            stateDirectory: directory,
            engineId: () => view()?.engineId,
            hostname: () => view()?.hostname,
            dashboardUrl: () => view()?.dashboardUrl,
            security: () => this.appConnection?.securityFacts(),
            ui: () => loader.status(enginePageSha256),
            log: (text, level) => this.agenda.log(text, level),
        });
        this.appConnection = new AppConnection({
            directory,
            env,
            onChange: () => this.publishAppView(),
            figures: () => this.appFigures(),
            log: (text, level) => this.agenda.log(text, level),
            web: {
                api: (request, actor, access) => api.handle(request, actor, access),
                documents: async (request, actor) => (await loader.serve(request)) ?? engineHomePage(request, actor, { name: this.agenda.snapshot().project.name || 'Promptbook engine', engineId: view()?.engineId }),
                ...(CONFORMANCE_BUILD ? { certificateSource: 'dev-ca' as const } : {}),
            },
        });
        try {
            await this.appConnection.start();
            await loader.start();
        } catch (error) {
            if (isTunnelMode(env)) throw error;
            this.agenda.log(`The App connection did not start: ${errorMessage(error)}`, 'warning');
        }
        // At once (not coalesced), so the first client that finds this engine already sees its App connection.
        this.agenda.setAppConnection(this.appConnection.view());
    }

    /** Acquires ownership and starts the agenda's local supporting services. */
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
                this.publishLocalApi({ state: 'starting' });
                try {
                    this.http = await startHttpServer({
                        agenda: this.agenda,
                        control: (action, params) => applyControlAction(this.agenda, action, params, this.browserControls),
                        token: this.token,
                        port: this.options.dashboardAccessKey ? 0 : setting<number | undefined>(settings, 'server.port'),
                        dashboardAccessKey: this.options.dashboardAccessKey,
                    });
                    this.publishLocalApi({ state: 'ready', url: this.http.url, port: this.http.port });
                } catch (error) {
                    this.publishLocalApi({ state: 'failed', error: errorMessage(error) });
                    throw error;
                }
            }
            // The App connection links this project engine to the Promptbook App; maintenance runs stay offline. It reads
            // local files only (tunnels and heartbeats continue in the background), so it never delays the start.
            if (this.options.mode !== 'maintenance') await this.startAppConnection();
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
     * Releases every owned resource (browser, HTTP, control, discovery entry, record and finally its own project
     * lock). Each step is bounded so an internal force stop still cleans up promptly; after a force stop every owned
     * process still running is killed, so no owned worker outlives the engine. Only this owner's records are removed,
     * never another process's lock or persistent project data.
     */
    public async shutdown(): Promise<void> {
        const bounded = async (step: () => Promise<unknown> | unknown): Promise<void> => {
            await Promise.race([Promise.resolve().then(step).catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 10_000).unref())]);
        };
        const forced = this.agenda.forceStopped;
        // A tab the user controls is closed rather than left to another engine's automation.
        await bounded(() => this.tabs.closeAll('The engine stopped, so the tab you controlled was closed (nothing was handed back to the agent).'));
        // Recording evidence is finalized even on force stop (bounded); this engine leaves its shared browsers (a
        // browser other engines still use stays, the last disconnection closes it).
        await bounded(() => this.browsers.close());
        if (forced) await bounded(() => this.owned.terminateRemaining(1000));
        await bounded(() => this.uiLoader?.stop());
        await bounded(() => this.appConnection?.stop());
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

    /** In-process control (the owning terminal uses the same methods as the IPC channel). */
    public async control<T>(method: string, params: Readonly<Record<string, unknown>> = {}): Promise<T> {
        return (await this.handleControl(method, params)) as T;
    }

    /** Handles authenticated local control requests. */
    private async handleControl(method: string, params: Readonly<Record<string, unknown>>): Promise<unknown> {
        const agenda = this.agenda;
        // The authenticated local channel is the owner's terminal: it may show the 12 words for recovery during setup.
        if (WALLET_ACTIONS.has(method)) return await applyWalletAction(agenda, method, params, { ownerSurface: true, trustedFiles: true });
        switch (method) {
            case 'project-effects': {
                const snapshot = agenda.snapshot();
                const events = snapshotEffects(snapshot);
                return { ...this.effects.exchange(effectsRequest(params), events), active: events.map((event) => event.key), status: { project: snapshot.project.name, state: snapshot.service.state, attention: Object.keys(snapshot.attention ?? {}).length > 0, agent: snapshot.current?.agent } };
            }
            case 'identify':
                return { instanceId: this.instanceId, projectRoot: this.options.project.root, pid: process.pid, mode: this.options.mode, version: ENGINE_VERSION, contract: CONTROL_CONTRACT, state: agenda.serviceState };
            case 'snapshot':
                return agenda.snapshot();
            case 'app-status':
                return this.appConnection?.view() ?? agenda.snapshot().app;
            case 'app-link': {
                if (!this.appConnection) throw new PtbkError('This engine run has no App connection.', { kind: 'unsupported' });
                if (typeof params.link !== 'string') throw new PtbkError('Provide a pairing URL.', { kind: 'usage' });
                const result = await this.appConnection.pair(params.link);
                if (result.outcome === 'refused') return { applied: false, outcome: result.message };
                return { applied: result.outcome === 'linked', outcome: 'Paired with Promptbook App.' };
            }
            case 'app-setup-link':
                if (!this.appConnection) throw new PtbkError('This engine run has no App connection (maintenance mode).', { kind: 'unsupported' });
                return await this.appConnection.setupLink();
            case 'app-reset-owner':
                if (!this.appConnection) throw new PtbkError('This engine run has no App connection (maintenance mode).', { kind: 'unsupported' });
                return await this.appConnection.resetOwner();
            case 'app-conformance-session': {
                if (!CONFORMANCE_BUILD || !this.appConnection) throw new PtbkError('Conformance sessions exist only in the conformance build.', { kind: 'unsupported' });
                const permissions = Array.isArray(params.permissions) ? params.permissions.map(String) : [];
                return await this.appConnection.conformanceSession(params.subject === 'owner' ? { kind: 'owner' } : { kind: 'member', permissions });
            }
            case 'app-reload': {
                // `ptbk connect` and `ptbk disconnect` changed the stored link: reconnect from it.
                if (!this.appConnection) throw new PtbkError('This engine run has no App connection (maintenance mode).', { kind: 'unsupported' });
                const view = await this.appConnection.reload();
                this.agenda.setAppConnection(view);
                return view;
            }
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
            case 'browser-kill':
            case 'browser-test-tab':
            case 'sync-now':
            case 'health-recheck':
            case 'health-override':
            case 'health-clean-cache':
            case 'health-swap':
            case 'session-entry':
            case 'session-acquire':
            case 'session-renew':
            case 'session-release':
            case 'task-status':
            case 'task-change':
            case 'task-notify':
                return await applyControlAction(agenda, method, params, this.browserControls);
            case 'tool-operation':
                return await applyToolAction(agenda, params, typeof params.via === 'string' ? params.via : 'cli');
            case 'tool-recheck':
                return await agenda.recheckTools();
            case 'chat-list':
            case 'chat-agents':
            case 'chat-get':
            case 'chat-read':
            case 'chat-seen':
            case 'chat-create':
            case 'chat-send':
                // The authenticated local control channel of the engine host may attach local files.
                return await applyChatAction(agenda, method, params, typeof params.via === 'string' ? params.via : 'cli', { trusted: true });
            // Realtime voice is controlled from a local terminal or the local desktop app through this control channel
            // only: the project HTTP API never starts calls or receives a media grant.
            case 'voice-availability':
                return await agenda.voiceAvailability(String(params.name ?? ''));
            case 'voice-start':
                return await agenda.voiceStart(String(params.name ?? ''), typeof params.client === 'string' ? params.client : undefined);
            case 'voice-media':
                return agenda.voiceMedia(String(params.name ?? ''), String(params.grant ?? ''), {
                    attach: params.attach === true,
                    ...(params.detach === true || typeof params.detach === 'string' ? { detach: params.detach as true | string } : {}),
                    items: Array.isArray(params.items) ? (params.items as VoiceMediaInput['items']) : [],
                });
            case 'voice-media-events':
                return await agenda.voiceMediaEvents(String(params.name ?? ''), String(params.grant ?? ''), Number(params.after ?? 0) || 0, Number(params.wait ?? 0) || 0);
            case 'voice-control': {
                const action = String(params.action ?? '');
                if (!['end', 'mute-mic', 'unmute-mic', 'mute-output', 'unmute-output'].includes(action)) throw new PtbkError(`Unknown voice action "${action}".`, { kind: 'usage' });
                return await agenda.voiceControl(String(params.name ?? ''), action as 'end');
            }
            // Live tab control: the viewer's frames and inputs need its grant (only the presenting client has it); the
            // lifecycle choices are the owner's from any local client of this engine.
            case 'tab-control-tabs':
            case 'tab-control-open':
            case 'tab-control-list':
            case 'tab-control-poll':
            case 'tab-control-attach':
            case 'tab-control-detach':
            case 'tab-control-input':
            case 'tab-control-navigate':
            case 'tab-control-clipboard':
            case 'tab-control-resize':
            case 'tab-control-handback':
            case 'tab-control-end':
            case 'tab-control-offer':
            case 'tab-control-reopen':
                return await this.tabControl(method, params);
            case 'voice-heartbeat':
                return agenda.voiceHeartbeat(String(params.name ?? '')) ?? null;
            case 'task-inventory':
                return await agenda.taskInventory();
            case 'book-source':
                return await agenda.bookSource({ reference: typeof params.reference === 'string' ? params.reference : undefined, path: typeof params.path === 'string' ? params.path : undefined });
            case 'book-save':
                // Attachments by local path are accepted on this trusted local channel only (as for chats).
                return await agenda.bookSave({ path: String(params.path), text: String(params.text ?? ''), revision: String(params.revision ?? ''), segments: Array.isArray(params.segments) ? (params.segments as ComposedSegment[]) : undefined });
            case 'report-read':
                return agenda.reportSnapshot();
            case 'report-refresh':
                return await agenda.requestReport();
            case 'report-discuss':
                return await agenda.discussReport({ at: typeof params.at === 'string' ? params.at : undefined });
            case 'usage-summary':
                return await agenda.usageSummary(parseUsageRequest((name) => params[name]));
            case 'history-list':
                return await agenda.history({ limit: typeof params.limit === 'number' ? params.limit : undefined, skip: typeof params.skip === 'number' ? params.skip : undefined });
            case 'history-commit':
                return await agenda.historyCommit(String(params.sha ?? ''));
            case 'files-list':
                return await agenda.files(String(params.path ?? ''));
            case 'file-read':
                return await agenda.file(String(params.path ?? ''));
            case 'actions-list':
                return await agenda.actions.refresh();
            case 'action-read':
                return await agenda.actions.read(String(params.path ?? ''));
            case 'action-view':
                return await agenda.actions.activity(parseActionViewQuery((name) => params[name]));
            case 'settings':
                return await applySettings(agenda, params);
            case 'update-view':
                return agenda.engineUpdate;
            case 'update-check':
                return await agenda.checkEngineUpdate();
            case 'update-policy':
                if (typeof params.isAutoUpdateEnabled !== 'boolean') throw new PtbkError('update-policy needs a boolean isAutoUpdateEnabled.', { kind: 'usage' });
                await agenda.setAutoUpdate(params.isAutoUpdateEnabled);
                return agenda.engineUpdate;
            case 'update-restart':
                // Another engine replaced the shared installation this engine runs from.
                return agenda.requestUpdateRestart();
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
            default:
                throw new PtbkError(`Unknown control method ${method}.`, { kind: 'usage' });
        }
    }
}
