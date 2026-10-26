import { PtbkError, errorMessage } from '../common/errors.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import type { BrowserDetailView } from '../engine/snapshot.js';
import type { TaskTrace } from '../engine/task-trace.js';
import type { ControlOutcome } from '../service/actions.js';
import { enabledToolsOf, type BrowserToolRecord } from '../tools/model.js';
import { ProjectBrowser, type TaskBrowser } from './browser.js';
import { BrowserPools } from './pool.js';
import { cleanStaleRecordings } from './recording.js';

/**
 * The engine-owned browser actions shared by every client (each targets one named tool's shared profile process).
 *
 * @private project browser
 */
export type BrowserAction = 'recheck' | 'retry' | 'restart' | 'kill' | 'test-tab';

/**
 * The project's named browser tools as this engine's connections to their shared profile processes, resolved from the
 * live configuration at every use: a browser added or enabled during a task is available to that task's next selection,
 * and an instance whose tool was disabled or removed keeps serving only the tasks that already acquired it. Each
 * active task works through its own {@link BrowserScope} (its own tabs and recordings), so concurrent tasks never share
 * a tab.
 *
 * @private project browser
 */
export class BrowserFleet {
    private readonly browsers = new Map<string, ProjectBrowser>();
    private readonly scopes = new Map<string, BrowserScope>();
    private readonly pools: BrowserPools;

    public constructor(
        private readonly project: Project,
        private readonly settings: () => EffectiveSettings | undefined,
        private readonly env: NodeJS.ProcessEnv,
        private readonly onChange: () => void = () => undefined,
        /** This engine's identity in the shared browser pools. */
        private readonly instanceId: string = `pid-${process.pid}`,
    ) {
        this.pools = new BrowserPools(env);
        void cleanStaleRecordings(project);
    }

    /** Saved/effective browser records. */
    private records(): BrowserToolRecord[] {
        const settings = this.settings();
        return settings ? settings.tools.filter((tool): tool is BrowserToolRecord => tool.type === 'BROWSER') : [];
    }

    /** The live instance of a tool name (created on demand for configured tools; kept while a removed one runs). */
    public instance(name: string): ProjectBrowser | undefined {
        let browser = this.browsers.get(name);
        if (!browser && this.records().some((tool) => tool.name === name)) {
            browser = new ProjectBrowser(
                this.project,
                name,
                () => {
                    const settings = this.settings();
                    const tool = this.records().find((record) => record.name === name);
                    return tool ? { tool, overridden: Boolean(settings?.overriddenTools.has(name)) } : undefined;
                },
                this.env,
                this.onChange,
                () => {
                    const settings = this.settings();
                    return settings ? setting<boolean>(settings, 'traces.isVideoRecordingEnabled') : true;
                },
                this.pools,
                this.instanceId,
            );
            this.browsers.set(name, browser);
        }
        return browser;
    }

    /** Enabled browser names in array order. */
    public enabledNames(): string[] {
        const settings = this.settings();
        return settings ? enabledToolsOf(settings.tools, 'BROWSER').map((tool) => tool.name) : [];
    }

    /**
     * Connects every enabled browser now (at engine start and after tool changes), without waiting for a task: the first
     * connection to a profile launches its process, later engines join it. A failure is a resource wait of that browser,
     * never a failure of the engine; one that already failed waits for its retry or the next task use.
     */
    public async startEnabled(): Promise<void> {
        for (const name of this.enabledNames()) {
            const browser = this.instance(name);
            if (!browser || browser.connected || ['failed', 'recovering', 'starting'].includes(browser.inspect().state)) continue;
            await browser.connect().catch(() => undefined);
        }
        // Drops pool connections of engines that ended without disconnecting (crash, force kill).
        await this.pools.reconcile().catch(() => undefined);
        await this.refresh();
    }

    /** Refreshes which engines share each connected browser (for diagnostics; no launch, no change). */
    public async refresh(): Promise<void> {
        for (const browser of this.browsers.values()) await browser.refreshPool();
    }

    /** Starts refreshing the shared browsers' membership periodically (the engine's lifetime; never keeps it alive). */
    public watch(intervalMs = 15_000): () => void {
        const timer = setInterval(() => void this.refresh().catch(() => undefined), intervalMs);
        timer.unref();
        return () => clearInterval(timer);
    }

    /** Every configured browser plus instances still connected for removed tools. */
    public inspectAll(): BrowserDetailView[] {
        const names = [...this.records().map((tool) => tool.name), ...[...this.browsers.keys()].filter((name) => !this.records().some((tool) => tool.name === name))];
        return [...new Set(names)].map((name) => this.instance(name)).filter((browser): browser is ProjectBrowser => Boolean(browser)).map((browser) => browser.inspect());
    }

    /** The browser shown as primary: the first enabled one. */
    public primary(): BrowserDetailView | undefined {
        const name = this.enabledNames()[0] ?? this.records()[0]?.name;
        return name ? this.instance(name)?.inspect() : undefined;
    }

    /** Names of browsers active tasks use. */
    public inUse(): string[] {
        return [...this.browsers.values()].filter((browser) => browser.inUse).map((browser) => browser.name);
    }

    /** The browser work of one active task (its own tabs and recordings). */
    public scope(key: string): BrowserScope {
        let scope = this.scopes.get(key);
        if (!scope) {
            scope = new BrowserScope(this, key);
            this.scopes.set(key, scope);
        }
        return scope;
    }

    /** Ends a task's browser work: its tabs close; connections whose configuration changed meanwhile end when unused. */
    public async endScope(key: string): Promise<void> {
        const scope = this.scopes.get(key);
        if (!scope) return;
        this.scopes.delete(key);
        await scope.detach();
        for (const browser of this.browsers.values()) await browser.endSession(key);
        // Removed tools disconnect once no task uses them.
        for (const [name, browser] of this.browsers) {
            if (!this.records().some((tool) => tool.name === name) && !browser.inUse) {
                await browser.disconnect();
                this.browsers.delete(name);
            }
        }
    }

    /**
     * Disconnects this engine from every shared browser: a process stays alive for the other engines using it and is
     * closed after the last managed disconnection (profiles and sessions stay).
     */
    public async close(): Promise<void> {
        // Recording evidence of interrupted tasks is finalized first.
        for (const scope of this.scopes.values()) await scope.detach().catch(() => undefined);
        this.scopes.clear();
        await Promise.all([...this.browsers.values()].map(async (browser) => await browser.disconnect().catch(() => undefined)));
    }

    /** Engine-owned per-browser recovery and checks shared by every client (`name` defaults to the primary browser). */
    public async control(action: BrowserAction, name?: string): Promise<ControlOutcome> {
        const target = name ?? this.enabledNames()[0] ?? this.records()[0]?.name;
        const browser = target ? this.instance(target) : undefined;
        if (!browser) return { action: `browser-${action}`, outcome: name ? `No browser tool is named "${name}".` : 'No browser tool is configured.', applied: false };
        try {
            switch (action) {
                case 'recheck':
                    return await browser.recheck();
                case 'retry':
                    return await browser.retry();
                case 'restart':
                    return await browser.restart();
                case 'kill':
                    return await browser.kill();
                case 'test-tab':
                    return await browser.testTab();
            }
        } catch (error) {
            return { action: `browser-${action}`, outcome: errorMessage(error), applied: false };
        }
    }
}

/**
 * One active task's browser work: the browser it currently works in, its own tabs in each named browser and the
 * recordings attributed to its attempt.
 *
 * @private project browser
 */
export class BrowserScope {
    /** The attempt currently allowed to use browsers (for recording attribution). */
    private attempt?: { readonly trace: TaskTrace; readonly label: string };
    /** Browsers whose recorder is attached to the current attempt. */
    private readonly used: TaskBrowser[] = [];
    /** The browser this task works in (subsequent calls without a name target it). */
    private current?: string;

    public constructor(
        private readonly fleet: BrowserFleet,
        /** The task scope key. */
        public readonly key: string,
    ) {}

    /**
     * Starts browser use of one attempt: the primary browser's recorder is attached at once (so an unused browser is
     * stated before the result commit), other browsers at their first use.
     */
    public async useFor(trace: TaskTrace, label: string): Promise<void> {
        await this.detach();
        this.attempt = { trace, label };
        const primary = this.fleet.enabledNames()[0];
        const browser = primary ? this.fleet.instance(primary)?.session(this.key) : undefined;
        if (browser) {
            this.used.push(browser);
            await browser.recorder.attach(trace, `${label}-${browser.name}`);
        }
    }

    /**
     * Selects the browser for an agent call: an explicitly named enabled tool (or the one this task already uses),
     * otherwise the task's current browser, otherwise the first enabled one. Never another account than requested.
     */
    public async acquire(name?: string): Promise<TaskBrowser> {
        const enabled = this.fleet.enabledNames();
        let chosen = name ?? this.current ?? enabled[0];
        if (!chosen) throw new PtbkError('No browser tool is enabled for this project.', { kind: 'setup', next: ['Add or enable one: `ptbk tool list`, then `ptbk tool enable <name>` or `ptbk tool add BROWSER …`.'] });
        const retained = (candidate: string): boolean => Boolean(this.fleet.instance(candidate)?.inUse) && this.current === candidate;
        if (name && !enabled.includes(name) && !retained(name)) {
            throw new PtbkError(`The browser tool "${name}" is ${this.fleet.inspectAll().some((tool) => tool.name === name) ? 'disabled' : 'not configured'}.`, { kind: 'usage', next: [`Available browsers: ${enabled.join(', ') || 'none'}.`] });
        }
        if (!name && this.current && !enabled.includes(this.current) && !retained(this.current)) chosen = enabled[0]!;
        const browser = this.fleet.instance(chosen);
        if (!browser) throw new PtbkError(`The browser tool "${chosen}" is not configured.`, { kind: 'usage' });
        this.current = chosen;
        const session = browser.session(this.key);
        if (this.attempt && !this.used.includes(session)) {
            this.used.push(session);
            await session.recorder.attach(this.attempt.trace, `${this.attempt.label}-${chosen}`);
        }
        return session;
    }

    /** Finalizes the recordings of the browsers this attempt used (before its result commit). */
    public async finishEvidence(): Promise<void> {
        for (const session of this.used) await session.recorder.finish();
    }

    /** Ends recording for the attempt (any outcome). */
    public async detach(): Promise<void> {
        for (const session of this.used) await session.recorder.detach();
        this.attempt = undefined;
        this.used.length = 0;
    }
}
