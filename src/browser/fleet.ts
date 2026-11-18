import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import type { BrowserDetailView } from '../engine/snapshot.js';
import type { TaskTrace } from '../engine/task-trace.js';
import type { ControlOutcome } from '../service/actions.js';
import { enabledToolsOf, type BrowserToolRecord } from '../tools/model.js';
import { browserProfileDirectory, ProjectBrowser, type TaskBrowser } from './browser.js';
import { BrowserPools } from './pool.js';
import { cleanStaleRecordings } from './recording.js';

/**
 * The engine-owned browser actions shared by every client (each targets one named tool's shared profile process).
 *
 * @private project browser
 */
export type BrowserAction = 'recheck' | 'retry' | 'restart' | 'kill' | 'test-tab';

/**
 * The canonical form of a profile directory: equivalent spellings (symbolic links, `..`) share one pool.
 *
 * @private project browser
 */
export function canonicalProfile(path: string): string {
    try {
        return realpathSync.native(path);
    } catch {
        return resolve(path);
    }
}

/**
 * The project's named browser tools as this engine's connections to their shared profile processes, resolved from the
 * live configuration at every acquisition: a browser added or enabled during a task is available to that task's next
 * selection, and a saved change is never postponed until tasks release the browser. A connection whose actual profile
 * no longer matches its saved tool (changed profile, disabled or removed) is released when no task acquired it, or
 * retired otherwise: it keeps serving only the tasks that acquired it, in their original profile, while new
 * acquisitions get a fresh instance of the saved revision. Each active task works through its own
 * {@link BrowserScope} (its own tabs and recordings), so concurrent tasks never share a tab.
 *
 * @private project browser
 */
export class BrowserFleet {
    /** The current revision of each tool name (the only instances new acquisitions get). */
    private readonly browsers = new Map<string, ProjectBrowser>();
    /** Retired old revisions still used by the tasks that acquired them. */
    private readonly draining = new Set<ProjectBrowser>();
    /** Instances created so far (a later revision gets its own pool membership, so releasing one never ends another). */
    private generation = 0;
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
                this.generation++ === 0 ? this.instanceId : `${this.instanceId}~${this.generation}`,
            );
            this.browsers.set(name, browser);
        }
        return browser;
    }

    /**
     * Reconciles live connections with the saved configuration before any new acquisition and on refresh (a cached
     * connection under the same name is no evidence that its profile still matches). A connection to another profile
     * than its saved tool resolves to, or of a disabled or removed tool, is released when no task acquired it and
     * retired otherwise. Canonically equivalent profiles keep their connection; a mode-only change follows the
     * requested/effective-mode rule and never restarts the shared process.
     */
    public async reconcile(): Promise<void> {
        // One reconciliation at a time: concurrent acquisitions never release a connection another one just resolved.
        const run = (this.reconciling ?? Promise.resolve()).then(async () => await this.reconcileNow());
        this.reconciling = run.catch(() => undefined);
        await run;
    }

    /** The reconciliation in progress (serializes {@link reconcile}). */
    private reconciling?: Promise<void>;

    /** One reconciliation pass (see {@link reconcile}). */
    private async reconcileNow(): Promise<void> {
        const records = this.records();
        for (const [name, browser] of [...this.browsers]) {
            const saved = records.find((tool) => tool.name === name);
            const withdrawn = !saved || !saved.isEnabled;
            const bound = browser.profile;
            const moved = Boolean(saved && bound && canonicalProfile(bound) !== canonicalProfile(browserProfileDirectory(this.project, saved, this.env)));
            if (!withdrawn && !moved) continue;
            if (browser.held) {
                this.browsers.delete(name);
                this.draining.add(browser);
                await browser.retire();
            } else if (!saved) {
                this.browsers.delete(name);
                await browser.disconnect();
            } else if (browser.connected || bound) await browser.disconnect();
        }
        for (const browser of [...this.draining]) {
            if (browser.inUse) continue;
            this.draining.delete(browser);
            await browser.disconnect();
        }
    }

    /** Old browser revisions retired while tasks still use them, with the scopes of those tasks. */
    public retained(): Array<{ readonly record: BrowserToolRecord; readonly scopes: readonly string[] }> {
        return [...this.draining].flatMap((browser) => (browser.retainedRecord ? [{ record: browser.retainedRecord, scopes: browser.holders }] : []));
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
        await this.reconcile();
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

    /** Every configured browser, then the retired revisions still draining (each a separate, `retained` entry). */
    public inspectAll(): BrowserDetailView[] {
        const names = [...this.records().map((tool) => tool.name), ...[...this.browsers.keys()].filter((name) => !this.records().some((tool) => tool.name === name))];
        const current = [...new Set(names)].map((name) => this.instance(name)).filter((browser): browser is ProjectBrowser => Boolean(browser));
        return [...current, ...this.draining].map((browser) => browser.inspect());
    }

    /** The browser shown as primary: the first enabled one. */
    public primary(): BrowserDetailView | undefined {
        const name = this.enabledNames()[0] ?? this.records()[0]?.name;
        return name ? this.instance(name)?.inspect() : undefined;
    }

    /** Names of saved browsers whose current revision active tasks acquired (a draining old revision is not counted). */
    public inUse(): string[] {
        return [...this.browsers.values()].filter((browser) => browser.held).map((browser) => browser.name);
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
        for (const browser of [...this.browsers.values(), ...this.draining]) await browser.endSession(key);
        // Only the released revision's own connection ends: a replacement or another engine on that profile stays.
        for (const browser of [...this.draining]) {
            if (browser.inUse) continue;
            this.draining.delete(browser);
            await browser.disconnect();
        }
        // Removed tools disconnect once no task uses them.
        for (const [name, browser] of [...this.browsers]) {
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
        await Promise.all([...this.browsers.values(), ...this.draining].map(async (browser) => await browser.disconnect().catch(() => undefined)));
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
    /** The revision this task acquired per tool name (kept even when the fleet retires it). */
    private readonly held = new Map<string, ProjectBrowser>();

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
        await this.fleet.reconcile();
        const primary = this.fleet.enabledNames()[0];
        const browser = primary ? (this.held.get(primary) ?? this.fleet.instance(primary))?.session(this.key) : undefined;
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
        // Every acquisition resolves the saved configuration; the revision this task already acquired stays its own.
        await this.fleet.reconcile();
        const enabled = this.fleet.enabledNames();
        let chosen = name ?? this.current ?? enabled[0];
        if (!chosen) throw new PtbkError('No browser tool is enabled for this project.', { kind: 'setup', next: ['Add or enable one: `ptbk tool list`, then `ptbk tool enable <name>` or `ptbk tool add BROWSER …`.'] });
        if (name && !enabled.includes(name) && !this.held.has(name)) {
            throw new PtbkError(`The browser tool "${name}" is ${this.fleet.inspectAll().some((tool) => tool.name === name && !tool.retained) ? 'disabled' : 'not configured'}.`, { kind: 'usage', next: [`Available browsers: ${enabled.join(', ') || 'none'}.`] });
        }
        if (!name && this.current && !enabled.includes(this.current) && !this.held.has(this.current)) chosen = enabled[0]!;
        const browser = this.held.get(chosen) ?? this.fleet.instance(chosen);
        if (!browser) throw new PtbkError(`The browser tool "${chosen}" is not configured.`, { kind: 'usage' });
        this.current = chosen;
        this.held.set(chosen, browser);
        const session = browser.session(this.key);
        session.acquired = true;
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
