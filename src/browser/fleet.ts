import { PtbkError } from '../common/errors.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import type { BrowserDetailView } from '../engine/snapshot.js';
import type { TaskTrace } from '../engine/task-trace.js';
import type { ControlOutcome } from '../service/actions.js';
import { enabledToolsOf, type BrowserToolRecord } from '../tools/model.js';
import { ProjectBrowser } from './browser.js';
import { cleanStaleRecordings } from './recording.js';

/**
 * The project's named browser tools as live instances (one coordinated owner per profile), resolved from the live
 * configuration at every use: a browser added or enabled during a task is available to that task's next selection,
 * and an instance whose tool was disabled or removed keeps serving only the task that already acquired it.
 *
 * @private project browser
 */
export class BrowserFleet {
    private readonly browsers = new Map<string, ProjectBrowser>();
    /** The attempt currently allowed to use browsers (for recording attribution). */
    private attempt?: { readonly trace: TaskTrace; readonly label: string };
    /** Browsers whose recorder is attached to the current attempt (the primary one from the start, others at first use). */
    private readonly used: string[] = [];
    /** The browser the current task works in (subsequent calls without a name target it). */
    private current?: string;

    public constructor(
        private readonly project: Project,
        private readonly settings: () => EffectiveSettings | undefined,
        private readonly env: NodeJS.ProcessEnv,
        private readonly onChange: () => void = () => undefined,
    ) {
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

    /** Every configured browser plus instances still running for removed tools. */
    public inspectAll(): BrowserDetailView[] {
        const names = [...this.records().map((tool) => tool.name), ...[...this.browsers.keys()].filter((name) => !this.records().some((tool) => tool.name === name))];
        return [...new Set(names)].map((name) => this.instance(name)).filter((browser): browser is ProjectBrowser => Boolean(browser)).map((browser) => browser.inspect());
    }

    /** The browser shown as primary: the current task's, otherwise the first enabled one. */
    public primary(): BrowserDetailView | undefined {
        const name = this.current ?? this.enabledNames()[0] ?? this.records()[0]?.name;
        return name ? this.instance(name)?.inspect() : undefined;
    }

    /** Names of browsers held by active work. */
    public inUse(): string[] {
        return [...this.browsers.values()].filter((browser) => browser.inUse).map((browser) => browser.name);
    }

    /**
     * Starts browser use of one task attempt: the primary browser's recorder is attached at once (so an unused browser
     * is stated before the result commit), other browsers are attached at their first use.
     */
    public async useFor(trace: TaskTrace, label: string): Promise<void> {
        this.attempt = { trace, label };
        this.used.length = 0;
        const primary = this.enabledNames()[0];
        const browser = primary ? this.instance(primary) : undefined;
        if (browser) {
            this.used.push(browser.name);
            await browser.recorder.attach(trace, `${label}-${browser.name}`);
        }
    }

    /**
     * Selects the browser for an agent call: an explicitly named enabled tool (or the one the task already holds),
     * otherwise the task's current browser, otherwise the first enabled one. Never another account than requested.
     */
    public async acquire(name?: string): Promise<ProjectBrowser> {
        const enabled = this.enabledNames();
        let chosen = name ?? this.current ?? enabled[0];
        if (!chosen) throw new PtbkError('No browser tool is enabled for this project.', { kind: 'setup', next: ['Add or enable one: `ptbk tool list`, then `ptbk tool enable <name>` or `ptbk tool add BROWSER …`.'] });
        if (name && !enabled.includes(name) && !(this.browsers.get(name)?.inUse && this.current === name)) {
            throw new PtbkError(`The browser tool "${name}" is ${this.records().some((tool) => tool.name === name) ? 'disabled' : 'not configured'}.`, { kind: 'usage', next: [`Available browsers: ${enabled.join(', ') || 'none'}.`] });
        }
        if (!name && this.current && !enabled.includes(this.current) && !this.browsers.get(this.current)?.inUse) chosen = enabled[0]!;
        const browser = this.instance(chosen);
        if (!browser) throw new PtbkError(`The browser tool "${chosen}" is not configured.`, { kind: 'usage' });
        this.current = chosen;
        if (this.attempt && !this.used.includes(chosen)) {
            this.used.push(chosen);
            await browser.recorder.attach(this.attempt.trace, `${this.attempt.label}-${chosen}`);
        }
        return browser;
    }

    /** Finalizes the recordings of the browsers this task used (before its result commit). */
    public async finishEvidence(): Promise<void> {
        for (const name of this.used) await this.browsers.get(name)?.recorder.finish();
    }

    /** Ends recording for the attempt (any outcome). */
    public async detach(): Promise<void> {
        for (const name of this.used) await this.browsers.get(name)?.recorder.detach();
        this.attempt = undefined;
        this.used.length = 0;
    }

    /** After a task: deferred restarts, end of retained uses and release of shared profiles; idle removed tools go away. */
    public async taskFinished(): Promise<void> {
        for (const browser of this.browsers.values()) await browser.taskFinished();
        this.current = undefined;
        for (const [name, browser] of this.browsers) {
            if (!this.records().some((tool) => tool.name === name) && !browser.inUse) {
                browser.close();
                this.browsers.delete(name);
            }
        }
    }

    /** Stops every browser process this service launched (never the user's browsers or profiles). */
    public close(): void {
        for (const browser of this.browsers.values()) browser.close();
    }

    /** Engine-owned per-instance recovery shared by every client (`name` defaults to the primary browser). */
    public async control(action: 'recheck' | 'retry' | 'restart', name?: string): Promise<ControlOutcome> {
        const target = name ?? this.current ?? this.enabledNames()[0] ?? this.records()[0]?.name;
        const browser = target ? this.instance(target) : undefined;
        if (!browser) return { action: `browser-${action}`, outcome: name ? `No browser tool is named "${name}".` : 'No browser tool is configured.', applied: false };
        return action === 'recheck' ? await browser.recheck() : action === 'retry' ? await browser.retry() : await browser.restart();
    }
}
