import { open, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, pathExists, readJsonIfExists, sha256, writeJsonAtomic } from '../common/fs.js';
import { isProcessAlive } from '../common/process.js';
import { compareVersions } from '../common/semver.js';
import { ENGINE_VERSION, detectInstallation, type InstallationInfo } from '../common/version.js';
import { interpretConfig, readProjectConfigFile, updatePolicyOf } from '../project/config.js';
import { installEngineVersion, publishedEngineVersions } from '../project/self-update.js';
import { policyPermits, selectCompatibleUpdate, selectUpdate, type UpdatePolicy, type UpdateSelection } from '../project/update-policy.js';
import { projectAt, type Project } from '../project/workspace.js';
import { readKnownProjects } from '../service/known-projects.js';
import { readRegistry, verifyEngine } from '../service/discovery.js';
import type { TaskInventoryItem, TaskRunView } from '../tasks/views.js';
import type { QueueItemView, ResultView } from './snapshot.js';

/**
 * Inventory reference of the engine's self-update system task (it has no project Book).
 *
 * @private engine self-update
 */
export const ENGINE_UPDATE_REF = 'system:engine-update';

/**
 * The durable engine definition every update run belongs to (it has no project Book).
 *
 * @private engine self-update
 */
export const ENGINE_UPDATE_DEFINITION = 'Engine self-update';

/**
 * Effective priority of the self-update system task: below every ordinary task (default priority 0).
 *
 * @private engine self-update
 */
export const ENGINE_UPDATE_PRIORITY = -1_000_000;

/**
 * First release lookup after the engine starts (startup stays cheap).
 */
const FIRST_LOOKUP_DELAY_MS = 60_000;

/**
 * Regular release lookup interval.
 */
const LOOKUP_INTERVAL_MS = 6 * 3_600_000;

/**
 * Lookup retry after an unknown result (offline, registry error): unknown is never "up to date".
 */
const LOOKUP_RETRY_MS = 3_600_000;

/**
 * Bound of one registry lookup.
 */
const LOOKUP_TIMEOUT_MS = 30_000;

/**
 * Bound of one package installation.
 */
const INSTALL_TIMEOUT_MS = 10 * 60_000;

/**
 * Immediate technical attempts of one installation before cause-aware rechecks take over.
 */
const TECHNICAL_ATTEMPTS = 2;

/**
 * Rechecks after failed update runs (the last value repeats); never a tight loop and never a "try again?" question.
 */
const RECHECK_DELAYS_MS = [3_600_000, 4 * 3_600_000, 12 * 3_600_000, 24 * 3_600_000];

/**
 * Recheck while another engine of a shared installation is busy or updating it.
 */
const SHARED_RECHECK_MS = 10 * 60_000;

/**
 * How long a finished update stays in the task inventory as completed/failed history.
 */
const RECENT_OUTCOME_MS = 7 * 24 * 3_600_000;

/**
 * Finished runs kept as the system task's own evidence (it has no project trace directory).
 */
const RUN_HISTORY = 10;

/**
 * Engine phases in which another engine of a shared installation is not executing loaded code for work.
 */
const FREE_PHASES = new Set(['idle', 'paused', 'awaiting-user', 'blocked', 'waiting', 'stopped', 'finished']);

/**
 * Progress of the self-update system task (words of the view, not a wire enum of the lifecycle).
 *
 * @private engine self-update
 */
export type EngineUpdatePhase = 'idle' | 'waiting' | 'checking' | 'installing' | 'restarting' | 'verified' | 'failed' | 'recovering' | 'unsupported';

/**
 * One finished update run: its versions, verified or failed outcome and the result or cause.
 */
type EngineUpdateOutcome = { readonly at: string; readonly from: string; readonly to: string; readonly outcome: 'verified' | 'failed'; readonly detail: string };

/**
 * Durable record of the system task (`.ptbk/state/engine-update.json`): what the last lookup found, the run in
 * progress across the replacement restart, failure rechecks and the last outcome.
 */
type EngineUpdateRecord = {
    readonly version: 1;
    /** Last lookup attempt and its result (versions newer than the engine that looked them up). */
    readonly checkedAt?: string;
    readonly published?: readonly string[];
    readonly latest?: string;
    /** Why the last lookup could not decide (offline is unknown, never up to date). */
    readonly lookupProblem?: string;
    readonly nextLookupAt?: string;
    /** When the currently selected target was first discovered. */
    readonly discoveredAt?: string;
    /**
     * The replacement in progress (it survives the restart that loads the new version). `launchFailure` is set by the
     * supervisor when the restarted version exited before it served the project and the previous one was restored.
     */
    readonly run?: { readonly from: string; readonly target: string; readonly installation: string; readonly scope: string; readonly phase: 'installing' | 'restarting'; readonly startedAt: string; readonly launchFailure?: string };
    /** Consecutive failed runs, their last cause and the next automatic recheck. */
    readonly failures?: number;
    readonly failure?: string;
    readonly nextAttemptAt?: string;
    /** A temporary condition the next attempt waits for (shared installation busy, another update running). */
    readonly deferral?: { readonly reason: string; readonly until: string };
    readonly lastOutcome?: EngineUpdateOutcome;
    /** Recent finished runs, oldest first (bounded; the attributable evidence of the definition's runs). */
    readonly runs?: readonly EngineUpdateOutcome[];
};

/**
 * The self-update state every client shows (Connection page, task inventory and API).
 *
 * @private engine self-update
 */
export type EngineUpdateView = {
    /** The saved policy and where it comes from (`default`, `ptbk.json`, ...). */
    readonly policy: UpdatePolicy & { readonly source: string };
    readonly current: string;
    readonly installation: { readonly scope: string; readonly root: string };
    readonly phase: EngineUpdatePhase;
    /** Human explanation of the current phase. */
    readonly reason: string;
    readonly latest?: string;
    readonly target?: string;
    readonly checkedAt?: string;
    readonly nextLookupAt?: string;
    readonly lookupProblem?: string;
    readonly failure?: string;
    readonly nextAttemptAt?: string;
    readonly lastOutcome?: EngineUpdateRecord['lastOutcome'];
    /** Whether this engine can run automatic updates at all (supported installation and placement). */
    readonly isSupported: boolean;
};

/**
 * What the agenda provides to the updater.
 *
 * @private engine self-update
 */
export type EngineUpdaterOptions = {
    readonly project: Project;
    readonly env: NodeJS.ProcessEnv;
    readonly mode: 'daemon' | 'foreground' | 'maintenance';
    /** The live effective policy and its source. */
    readonly policy: () => UpdatePolicy & { readonly source: string };
    readonly log: (text: string, level?: 'info' | 'warning' | 'error') => void;
    /** Notifies views of a change. */
    readonly changed: () => void;
    /** Wakes the agenda loop (a lookup it did not start found something to decide). */
    readonly wake?: () => void;
    /** Commits project files changed by the update as a system operation (`ptbk: …`, no agent); undefined when nothing was committed. */
    readonly commit: (paths: readonly string[], summary: string) => Promise<string | undefined>;
    /** Test seams: the running installation and version. */
    readonly installation?: InstallationInfo;
    readonly version?: string;
};

/**
 * The engine-owned self-update: one low-priority **system task** without a project Book. The engine looks up releases
 * (bounded, best-effort), selects a target under the project's `updates` policy, and only when it has free hands
 * replaces the installation it actually runs from, verifies the result and restarts into the new version while keeping
 * the latest manual pause. A failed installation restores the previous version and is rechecked later.
 *
 * The host service never decides updates; a shared global installation is replaced only when every associated project's
 * policy permits the same target and its other live engines are not working.
 *
 * @private engine self-update
 */
export class EngineUpdater {
    private record: EngineUpdateRecord = { version: 1 };
    private phase: EngineUpdatePhase = 'idle';
    private lookingUp = false;
    private running = false;
    private readonly startedAt = Date.now();
    private readonly installation: InstallationInfo;
    private readonly current: string;
    /** The version the saved configuration requires (`promptbookVersion` newer than this engine), if any. */
    private minimum?: string;
    /** The update restart that loaded this version, verified once this engine actually serves the project. */
    private loadedRun?: NonNullable<EngineUpdateRecord['run']>;

    public constructor(private readonly options: EngineUpdaterOptions) {
        this.installation = options.installation ?? detectInstallation();
        this.current = options.version ?? ENGINE_VERSION;
    }

    /** Path of the durable record. */
    private get path(): string {
        return join(this.options.project.runtime.state, 'engine-update.json');
    }

    /** Saves the record (a failed save is reported, the update then stays in memory only). */
    private async save(changes: Partial<Omit<EngineUpdateRecord, 'version'>>): Promise<void> {
        this.record = { ...this.record, ...changes, version: 1 };
        try {
            await writeJsonAtomic(this.path, this.record);
        } catch (error) {
            this.options.log(`The engine update state could not be saved: ${errorMessage(error)}`, 'warning');
        }
        this.options.changed();
    }

    /** Why this engine cannot run automatic updates, if it cannot. */
    private get limitation(): string | undefined {
        if (this.options.mode === 'maintenance') return 'A maintenance operation never updates the engine.';
        if (this.installation.scope === 'development') return 'This engine runs from a source checkout; update it by pulling and rebuilding the checkout.';
        if (this.installation.scope === 'npx') return 'This engine runs from the transient npx cache; install ptbk locally or globally for automatic updates.';
        if (this.options.mode === 'foreground') return 'A foreground engine cannot replace its own loaded code; the background service (`ptbk start`) updates itself.';
        return undefined;
    }

    /**
     * Loads the record and settles a replacement that was in progress when the previous process ended. The restart into
     * the target is only verified once this process actually serves the project ({@link confirmServing}); a restored
     * previous version records the failed launch and commits its restored package files.
     */
    public async load(): Promise<void> {
        const saved = await readJsonIfExists<EngineUpdateRecord>(this.path).catch(() => undefined);
        if (saved?.version === 1) this.record = saved;
        const run = this.record.run;
        if (!run) return;
        if (compareVersions(this.current, run.target) === 0) {
            this.loadedRun = run;
            this.phase = 'restarting';
            return;
        }
        if (run.phase === 'installing' && compareVersions(this.current, run.from) === 0) {
            // The previous process ended during the installation: check what is on disk and repair it before work.
            await this.restoreIfBroken(run.from);
        }
        if (run.launchFailure && compareVersions(this.current, run.from) === 0) {
            const sha = await this.commitPackageFiles(`Restore Promptbook engine ${run.from} after ${run.target} failed to start`);
            if (sha) this.options.log(`Committed the restored package files (${sha.slice(0, 8)}).`);
        }
        const detail = run.launchFailure ?? (run.phase === 'restarting' ? `The restart loaded ptbk ${this.current} instead of ${run.target}.` : `The installation of ptbk ${run.target} was interrupted.`);
        this.options.log(`Engine update did not complete: ${detail} It is rechecked automatically.`, 'warning');
        await this.fail(detail, run.from, run.target);
    }

    /**
     * The replacement serves the project (its control endpoint and process record exist and the agenda runs): only now
     * is the update restart that loaded it verified. A replacement that exits earlier is restored by the supervisor.
     */
    public async confirmServing(): Promise<void> {
        const run = this.loadedRun;
        if (!run) return;
        this.loadedRun = undefined;
        this.phase = 'verified';
        this.options.log(`Engine update verified: ptbk ${run.from} → ${run.target} is loaded and serving this project.`);
        await this.save({ run: undefined, failures: 0, failure: undefined, nextAttemptAt: undefined, deferral: undefined, ...this.finished({ at: new Date().toISOString(), from: run.from, to: run.target, outcome: 'verified', detail: `Installed into the ${run.scope} installation, restarted and serving the project.` }) });
        void this.restartPeers();
    }

    /**
     * Asks the other live engines of this installation, still running older loaded code, to restart into the verified
     * version once their active work settles (each keeps its manual pause). A release that cannot start is restored
     * before any of them is asked, so it never takes the other projects down.
     */
    private async restartPeers(): Promise<void> {
        const peers = await readRegistry(this.options.env).then((registry) => registry.entries.filter((entry) => entry.installation === this.installation.root && entry.projectRoot !== this.options.project.root)).catch(() => []);
        for (const peer of peers) {
            if (peer.engineVersion && compareVersions(peer.engineVersion, this.current) === 0) continue;
            const engine = await verifyEngine(peer, this.options.env).catch(() => undefined);
            if (engine?.status !== 'live') continue;
            // Engines that predate the update restart keep their loaded version until their own next start.
            await engine.client
                .request('update-restart', {}, 5000)
                .then(() => this.options.log(`Asked the engine of ${peer.projectRoot} to restart into ptbk ${this.current}.`))
                .catch(() => this.options.log(`${peer.projectRoot} keeps ptbk ${peer.engineVersion ?? 'its version'} loaded until its next start.`));
        }
    }

    /** Commits the owner project's package files of a local installation as a system operation (undefined when nothing was committed). */
    private async commitPackageFiles(summary: string): Promise<string | undefined> {
        if (this.installation.scope !== 'local' || !this.installation.ownerProject) return undefined;
        const paths: string[] = [];
        for (const name of ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']) if (await pathExists(join(this.installation.ownerProject, name))) paths.push(join(this.installation.ownerProject, name));
        return await this.options.commit(paths, summary).catch((error: unknown) => {
            this.options.log(`The package files could not be committed yet: ${errorMessage(error)}`, 'warning');
            return undefined;
        });
    }

    /**
     * The project's saved configuration needs at least this version (an older engine never downgrades it): an update the
     * saved policy already allows is the fix and needs no confirmation; anything else is reported as the real constraint.
     */
    public requireAtLeast(version: string | undefined): void {
        if (version === this.minimum) return;
        this.minimum = version;
        // Look up at once instead of waiting for the regular interval.
        if (version) void this.lookupIfDue(true)?.then(() => this.options.wake?.());
        this.options.changed();
    }

    /** The current selection under the live policy and the last known published versions (compatible with the minimum). */
    private selection(): UpdateSelection & { readonly policy: UpdatePolicy } {
        const { source: _source, ...policy } = this.options.policy();
        void _source;
        if (!this.minimum) return { ...selectUpdate(this.current, this.record.published ?? [], policy), policy };
        const selection = selectCompatibleUpdate(this.current, this.record.published ?? [], policy, this.minimum);
        if (selection.target) return { ...selection, policy };
        const why = selection.reason.replace(/\.$/, '');
        return { reason: `This project's configuration needs ptbk ${this.minimum} or newer, but ${why.charAt(0).toLowerCase()}${why.slice(1)}. The project is kept as it is (never downgraded).`, constraint: selection.constraint ?? 'none', policy };
    }

    /** The shared view of every client. */
    public view(): EngineUpdateView {
        const policy = this.options.policy();
        const limitation = this.limitation;
        const selection = this.selection();
        const target = limitation ? undefined : selection.target;
        const deferral = this.record.deferral && Date.parse(this.record.deferral.until) > Date.now() ? this.record.deferral : undefined;
        let phase = this.phase;
        let reason: string;
        if (limitation) {
            phase = 'unsupported';
            reason = limitation;
        } else if (this.running) reason = this.runningReason;
        else if (phase === 'verified' && !target) reason = `Updated to ptbk ${this.current}.`;
        else if (target) {
            phase = this.record.nextAttemptAt && Date.parse(this.record.nextAttemptAt) > Date.now() ? 'recovering' : 'waiting';
            reason =
                phase === 'recovering'
                    ? `ptbk ${target} waits for its automatic recheck after a failed update (${this.record.failure ?? 'unknown cause'}).`
                    : deferral
                      ? `ptbk ${target} waits: ${deferral.reason}`
                      : `ptbk ${target} is installed when this engine has free hands (low priority; ordinary work goes first).`;
        } else {
            phase = this.record.failure && this.record.lastOutcome?.outcome === 'failed' ? 'failed' : 'idle';
            reason = this.record.lookupProblem ? `Release information is unknown: ${this.record.lookupProblem}` : this.record.checkedAt ? selection.reason : 'No release lookup yet.';
        }
        return {
            policy,
            current: this.current,
            installation: { scope: this.installation.scope, root: this.installation.root },
            phase,
            reason,
            isSupported: !limitation,
            ...(this.record.latest ? { latest: this.record.latest } : {}),
            ...(target ? { target } : {}),
            ...(this.record.checkedAt ? { checkedAt: this.record.checkedAt } : {}),
            ...(!limitation && this.nextLookupAt() ? { nextLookupAt: new Date(this.nextLookupAt()!).toISOString() } : {}),
            ...(this.record.lookupProblem ? { lookupProblem: this.record.lookupProblem } : {}),
            ...(this.record.failure ? { failure: this.record.failure } : {}),
            ...(this.record.nextAttemptAt ? { nextAttemptAt: this.record.nextAttemptAt } : {}),
            ...(this.record.lastOutcome ? { lastOutcome: this.record.lastOutcome } : {}),
        };
    }

    /** Explanation of the running phase. */
    private runningReason = '';

    /**
     * The system task in the shared task inventory: a pending/running update, or the last outcome as recent history.
     * It has no source (no Book actions) and names its actual executor. The title names the current run; the
     * definition, the retry after failed runs and the recent runs keep definition, run and retry distinct.
     */
    public inventoryItem(): TaskInventoryItem | undefined {
        const view = this.view();
        const runs: TaskRunView[] = (this.record.runs ?? (this.record.lastOutcome ? [this.record.lastOutcome] : []))
            .map((run) => ({ at: run.at, title: `${run.from} → ${run.to}`, outcome: run.outcome === 'verified' ? ('completed' as const) : ('failed' as const), detail: run.detail }))
            .reverse();
        const common = {
            ref: ENGINE_UPDATE_REF,
            priority: ENGINE_UPDATE_PRIORITY,
            priorityText: 'lowest (system)',
            source: '',
            kind: 'system' as const,
            executor: 'Promptbook engine (deterministic update, no agent)',
            origin: 'system: engine self-update',
            definition: ENGINE_UPDATE_DEFINITION,
            ...(runs.length ? { runs } : {}),
        };
        if (view.target || this.running) {
            const target = view.target ?? this.record.run?.target ?? '';
            const readiness = this.running ? 'active' : view.phase === 'recovering' ? 'waiting-until' : 'not-ready';
            const retry = this.record.failures ?? 0;
            return { ...common, title: `Update Promptbook ${view.current} → ${target}`, readiness, reason: view.reason, doneCount: runs.filter((run) => run.outcome === 'completed').length, ...(retry ? { retry } : {}), ...(view.phase === 'recovering' && view.nextAttemptAt ? { until: view.nextAttemptAt } : {}) };
        }
        const last = view.lastOutcome;
        if (last && Date.now() - Date.parse(last.at) <= RECENT_OUTCOME_MS) {
            return { ...common, title: `Update Promptbook ${last.from} → ${last.to}`, readiness: last.outcome === 'verified' ? 'done' : 'failed', reason: last.detail, lastDone: last.at, doneCount: runs.filter((run) => run.outcome === 'completed').length };
        }
        return undefined;
    }

    /**
     * Finished runs as results, newest first: the system task shares the results feed with ordinary task outcomes
     * (one event model), attributed to its definition instead of an agent or a trace.
     */
    public resultViews(): ResultView[] {
        return (this.record.runs ?? (this.record.lastOutcome ? [this.record.lastOutcome] : []))
            .map((run) => ({ ref: ENGINE_UPDATE_REF, title: `Update Promptbook ${run.from} → ${run.to}`, outcome: run.outcome === 'verified' ? 'completed' : 'failed', summary: run.detail, endedAt: run.at, attempts: 1, kind: 'system' }))
            .reverse();
    }

    /** The system task in the queue summary (only while pending or running). */
    public queueItem(): QueueItemView | undefined {
        const item = this.inventoryItem();
        if (!item || item.readiness === 'done' || item.readiness === 'failed') return undefined;
        return { ref: item.ref, title: item.title, readiness: item.readiness, reason: item.reason, priority: item.priority, priorityText: item.priorityText, source: '', origin: item.origin, kind: 'system', executor: item.executor, ...(item.until ? { until: item.until } : {}) };
    }

    /** When the next release lookup is due (undefined when lookups do not apply). */
    public nextLookupAt(): number | undefined {
        if (this.limitation || !this.options.policy().isAutoUpdateEnabled) return undefined;
        if (this.record.nextLookupAt) return Math.max(Date.parse(this.record.nextLookupAt), this.startedAt + FIRST_LOOKUP_DELAY_MS);
        return this.startedAt + FIRST_LOOKUP_DELAY_MS;
    }

    /** The next time the agenda should wake for this task (a lookup or a recheck). */
    public wakeAt(): number | undefined {
        const times = [this.nextLookupAt(), this.record.nextAttemptAt ? Date.parse(this.record.nextAttemptAt) : undefined, this.record.deferral ? Date.parse(this.record.deferral.until) : undefined].filter((time): time is number => time !== undefined && Number.isFinite(time));
        return times.length ? Math.min(...times) : undefined;
    }

    /** Starts a due lookup in the background (never blocks the agenda loop); `force` checks now. */
    public lookupIfDue(force = false): Promise<void> | undefined {
        if (this.lookingUp || this.limitation) return undefined;
        if (!force && (!this.options.policy().isAutoUpdateEnabled || (this.nextLookupAt() ?? Infinity) > Date.now())) return undefined;
        this.lookingUp = true;
        return this.lookup().finally(() => {
            this.lookingUp = false;
        });
    }

    /** One lookup: remembers newer published versions and announces a newly selected target. */
    private async lookup(): Promise<void> {
        const previous = this.selection().target;
        const found = await publishedEngineVersions(this.installation, this.options.env, LOOKUP_TIMEOUT_MS);
        const now = Date.now();
        if (!found.versions) {
            await this.save({ checkedAt: new Date(now).toISOString(), lookupProblem: found.problem, nextLookupAt: new Date(now + LOOKUP_RETRY_MS).toISOString() });
            return;
        }
        const newer = found.versions.filter((version) => (compareVersions(version, this.current) ?? 0) > 0);
        const latest = [...found.versions].sort((a, b) => compareVersions(b, a) ?? 0)[0];
        await this.save({ checkedAt: new Date(now).toISOString(), published: newer, latest, lookupProblem: undefined, nextLookupAt: new Date(now + LOOKUP_INTERVAL_MS).toISOString() });
        const target = this.selection().target;
        if (target && target !== previous) {
            await this.save({ discoveredAt: new Date(now).toISOString() });
            this.options.log(`Engine update available: ptbk ${this.current} → ${target}. It installs as a low-priority system task when this engine has free hands.`);
        }
    }

    /**
     * Whether the update may claim its maintenance boundary now (the agenda additionally requires free hands: running,
     * no active unit and no other eligible work).
     */
    public get isDue(): boolean {
        if (this.running || this.limitation) return false;
        if (!this.selection().target) return false;
        const now = Date.now();
        if (this.record.nextAttemptAt && Date.parse(this.record.nextAttemptAt) > now) return false;
        if (this.record.deferral && Date.parse(this.record.deferral.until) > now) return false;
        return true;
    }

    /** Version currently on disk in the running installation (undefined when unreadable). */
    private async installedVersion(): Promise<string | undefined> {
        try {
            const manifest = JSON.parse(await readFile(join(this.installation.root, 'package.json'), 'utf8')) as { name?: string; version?: string };
            return manifest.name === 'ptbk' && typeof manifest.version === 'string' ? manifest.version : undefined;
        } catch {
            return undefined;
        }
    }

    /** Installs one exact version into exactly the running installation (dependency placement preserved). */
    private async install(version: string): Promise<void> {
        await installEngineVersion(this.installation, version, {
            env: this.options.env,
            timeoutMs: INSTALL_TIMEOUT_MS,
            onOutput: (line) => {
                if (line.trim()) this.runningReason = `Installing ptbk ${version}: ${line.trim().slice(0, 160)}`;
            },
        });
    }

    /** Reinstalls `version` when the installation on disk is no longer exactly it (a failed or interrupted replacement). */
    private async restoreIfBroken(version: string): Promise<string | undefined> {
        if ((await this.installedVersion()) === version) return undefined;
        this.options.log(`Restoring ptbk ${version} in the ${this.installation.scope} installation after an incomplete update.`, 'warning');
        try {
            await this.install(version);
        } catch (error) {
            return `Restoring ptbk ${version} failed too: ${errorMessage(error)}`;
        }
        return (await this.installedVersion()) === version ? undefined : `The installation does not report ptbk ${version} after restoring it.`;
    }

    /** Record changes of one finished run: the last outcome and the bounded run history. */
    private finished(outcome: EngineUpdateOutcome): Pick<EngineUpdateRecord, 'lastOutcome' | 'runs'> {
        return { lastOutcome: outcome, runs: [...(this.record.runs ?? []), outcome].slice(-RUN_HISTORY) };
    }

    /** Records a failed run with its cause-aware recheck (backing off; never a question). */
    private async fail(detail: string, from: string, to: string): Promise<void> {
        const failures = (this.record.failures ?? 0) + 1;
        const delay = RECHECK_DELAYS_MS[Math.min(failures, RECHECK_DELAYS_MS.length) - 1]!;
        this.phase = 'failed';
        await this.save({ run: undefined, failures, failure: detail, nextAttemptAt: new Date(Date.now() + delay).toISOString(), deferral: undefined, ...this.finished({ at: new Date().toISOString(), from, to, outcome: 'failed', detail }) });
    }

    /** Defers the next attempt for a temporary condition (not a failure). */
    private async defer(reason: string): Promise<void> {
        this.options.log(`Engine update deferred: ${reason}`);
        await this.save({ deferral: { reason, until: new Date(Date.now() + SHARED_RECHECK_MS).toISOString() } });
    }

    /**
     * Why a shared global installation cannot be replaced by `target` now: a project using it whose policy does not
     * permit the same target (a pin blocks everyone), or another live engine on it that is working.
     */
    private async sharedBlocker(target: string): Promise<{ readonly reason: string; readonly temporary: boolean } | undefined> {
        if (this.installation.scope !== 'global') return undefined;
        const self = this.options.project.root;
        const roots = new Set<string>();
        for (const known of (await readKnownProjects(this.options.env)).entries) if ((known.lastRun?.installation ?? known.installation) === this.installation.root && known.projectRoot !== self) roots.add(known.projectRoot);
        const registry = (await readRegistry(this.options.env)).entries.filter((entry) => entry.installation === this.installation.root && entry.projectRoot !== self);
        for (const entry of registry) roots.add(entry.projectRoot);
        for (const root of roots) {
            const file = await readProjectConfigFile(projectAt(root)).catch(() => undefined);
            if (!file?.exists) continue;
            const policy = updatePolicyOf(interpretConfig(file));
            if (!policyPermits(policy, this.current, target)) {
                return { reason: `the shared global installation also serves ${root}, whose update policy (${policy.isAutoUpdateEnabled ? `updates.versionRange ${policy.versionRange ?? 'default'}` : 'automatic updates off'}) does not permit ptbk ${target}.`, temporary: false };
            }
        }
        for (const entry of registry) {
            const engine = await verifyEngine(entry, this.options.env).catch(() => undefined);
            if (engine?.status === 'live' && !FREE_PHASES.has(engine.summary.phase)) return { reason: `another engine on the shared installation (${entry.projectRoot}) is working.`, temporary: true };
        }
        return undefined;
    }

    /** Exclusive per-installation lock coalescing competing proposals (a dead holder's lock is taken over). */
    private async lock(): Promise<(() => Promise<void>) | undefined> {
        const directory = await ensureDirectory(join(promptbookAppData(this.options.env), 'updates'));
        const path = join(directory, `${sha256(this.installation.root).slice(0, 24)}.lock`);
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const handle = await open(path, 'wx', 0o600);
                await handle.writeFile(JSON.stringify({ pid: process.pid, project: this.options.project.root, at: new Date().toISOString() }));
                await handle.close();
                return async () => {
                    await rm(path, { force: true });
                };
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                const holder = await readJsonIfExists<{ pid?: number }>(path).catch(() => undefined);
                if (holder?.pid && isProcessAlive(holder.pid)) return undefined;
                await rm(path, { force: true });
            }
        }
        return undefined;
    }

    /**
     * Runs the claimed update: revalidates the policy and the release, coordinates with the installation's other users,
     * installs the exact target, verifies it on disk, commits changed project package files as a system operation and
     * requests the restart that loads it. Anything short of a verified installation restores the previous version and
     * schedules a recheck. `stillFree` is asked again right before the installation; `restart` must keep manual intent.
     */
    public async run(hooks: { readonly stillFree: () => boolean; readonly restart: () => void }): Promise<void> {
        if (this.running) return;
        this.running = true;
        this.phase = 'checking';
        this.runningReason = 'Checking the release and the update policy.';
        this.options.changed();
        let release: (() => Promise<void>) | undefined;
        try {
            await this.lookup();
            const target = this.selection().target;
            if (!target) {
                this.phase = 'idle';
                return;
            }
            const blocker = await this.sharedBlocker(target);
            if (blocker) {
                this.phase = 'waiting';
                if (blocker.temporary) await this.defer(blocker.reason);
                else await this.save({ deferral: { reason: blocker.reason, until: new Date(Date.now() + LOOKUP_INTERVAL_MS).toISOString() } });
                return;
            }
            release = await this.lock();
            if (!release) {
                this.phase = 'waiting';
                await this.defer('another engine is updating this installation.');
                return;
            }
            if (!hooks.stillFree()) {
                this.phase = 'waiting';
                return;
            }
            const from = this.current;
            const onDisk = await this.installedVersion();
            await this.save({ run: { from, target, installation: this.installation.root, scope: this.installation.scope, phase: 'installing', startedAt: new Date().toISOString() }, deferral: undefined });
            this.phase = 'installing';
            this.runningReason = `Installing ptbk ${target} into the ${this.installation.scope} installation.`;
            this.options.log(`Engine update: installing ptbk ${from} → ${target} into the ${this.installation.scope} installation ${this.installation.root}.`);
            // Another engine of the same installation may already have installed it: then only the restart remains.
            if (onDisk !== target) {
                let failure: string | undefined;
                for (let attempt = 1; attempt <= TECHNICAL_ATTEMPTS; attempt++) {
                    try {
                        await this.install(target);
                        failure = undefined;
                        break;
                    } catch (error) {
                        failure = errorMessage(error);
                    }
                }
                const installed = await this.installedVersion();
                if (failure || installed !== target) {
                    const detail = failure ? `Installing ptbk ${target} failed: ${failure}` : `The installation reports ptbk ${installed ?? 'nothing readable'} instead of ${target}.`;
                    const restoreProblem = await this.restoreIfBroken(from);
                    this.options.log(`${detail}${restoreProblem ? ` ${restoreProblem}` : ` ptbk ${from} stays in place.`} The update is rechecked automatically.`, 'warning');
                    await this.fail(restoreProblem ? `${detail} ${restoreProblem}` : detail, from, target);
                    return;
                }
            }
            const sha = await this.commitPackageFiles(`Update Promptbook engine ${from} → ${target}`);
            if (sha) this.options.log(`Committed the updated package files (${sha.slice(0, 8)}).`);
            await this.save({ run: { ...this.record.run!, phase: 'restarting' } });
            this.phase = 'restarting';
            this.runningReason = `Restarting to load ptbk ${target}.`;
            // Other engines of this installation restart only once the replacement serves this project (confirmServing).
            this.options.log(`Engine update: ptbk ${target} is installed; restarting to load it (a manual pause is kept).`);
            hooks.restart();
        } catch (error) {
            const run = this.record.run;
            this.options.log(`Engine update failed: ${errorMessage(error)}`, 'warning');
            if (run) await this.restoreIfBroken(run.from);
            await this.fail(errorMessage(error), this.current, run?.target ?? this.selection().target ?? '?');
        } finally {
            await release?.().catch(() => undefined);
            this.running = false;
            this.options.changed();
        }
    }
}

/**
 * Supervisor side of an update restart whose new version exited before it served the project: the previous version
 * is reinstalled into the same installation, so the supervisor can start functional code again (with the latest manual
 * intent, not as an unexpected loss). The replacement then records the failed run and its automatic recheck. Returns
 * undefined when no update restart was pending (ordinary crash handling applies), including a second exit after the
 * restore, so it never loops.
 *
 * @private engine self-update
 */
export async function restoreFailedUpdateLaunch(project: Project, exitCode: number | null, env: NodeJS.ProcessEnv, installation: InstallationInfo = detectInstallation()): Promise<{ readonly restored: boolean; readonly detail: string } | undefined> {
    const path = join(project.runtime.state, 'engine-update.json');
    const record = await readJsonIfExists<EngineUpdateRecord>(path).catch(() => undefined);
    const run = record?.version === 1 ? record.run : undefined;
    if (!record || !run || run.phase !== 'restarting' || run.launchFailure || run.installation !== installation.root) return undefined;
    const installed = async (): Promise<string | undefined> => {
        const manifest = await readJsonIfExists<{ name?: string; version?: string }>(join(installation.root, 'package.json')).catch(() => undefined);
        return manifest?.name === 'ptbk' ? manifest.version : undefined;
    };
    const exited = `ptbk ${run.target} exited${exitCode === null ? '' : ` with code ${exitCode}`} before it served the project`;
    let problem: string | undefined;
    if ((await installed()) !== run.from) {
        for (let attempt = 1; attempt <= TECHNICAL_ATTEMPTS; attempt++) {
            try {
                await installEngineVersion(installation, run.from, { env, timeoutMs: INSTALL_TIMEOUT_MS });
                problem = undefined;
                break;
            } catch (error) {
                problem = errorMessage(error);
            }
        }
        if (!problem && (await installed()) !== run.from) problem = `the installation does not report ptbk ${run.from} afterwards`;
    }
    const detail = problem ? `${exited}; restoring ptbk ${run.from} failed: ${problem}.` : `${exited}; ptbk ${run.from} was restored into the ${run.scope} installation.`;
    await writeJsonAtomic(path, { ...record, run: { ...run, launchFailure: detail } });
    return { restored: !problem, detail };
}
