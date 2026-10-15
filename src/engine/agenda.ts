import { watch, type FSWatcher } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { formatDuration } from '../common/duration.js';
import { confinePath, ensureDirectory, toProjectRelative } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { formatIsoWithOffset, formatShortTime } from '../common/time.js';
import { ENGINE_VERSION, detectInstallation } from '../common/version.js';
import { setControlCommitment } from '../book/edit.js';
import { normalizeAgentName } from '../book/references.js';
import { loadSettings, setting, SETTING_SPECS, serializeSettingValue, updateProjectConfig, type EffectiveSettings, type ThinkingLevel } from '../project/config.js';
import { AgentCatalog, learningPolicyOf, resolveEffectiveAgent } from '../project/agents.js';
import { commitPaths, inspectGit, git as runGit } from '../project/git.js';
import { runCheck } from '../project/checks.js';
import { newTaskPath, renderTaskBook } from '../tasks/authoring.js';
import type { Project } from '../project/workspace.js';
import { checkHarnessVersion, updateHarness } from '../harness/maintenance.js';
import { HARNESS_PLUGINS, harnessName } from '../harness/registry.js';
import { readTaskBook } from '../tasks/book-task.js';
import { evaluateQueue, isUnfinished, selectNext, type EvaluatedTask, type RouteCheck } from '../tasks/eligibility.js';
import { setMarkdownControl } from '../tasks/markdown.js';
import { isRecurring, type Task } from '../tasks/model.js';
import { describePriority } from '../tasks/priority.js';
import { findTask, readTaskQueue } from '../tasks/sources.js';
import { agentView, type BadgeActivity } from '../ui/badges.js';
import type { BridgeTool } from './bridge.js';
import { captureSnapshot, executeWork, type ExecutionEnvironment, type ExecutionOutcome, type WorkItem } from './executor.js';
import {
    applyAssignment,
    assignmentPrompt,
    createAssignmentTask,
    createDiscoveryTask,
    discoveryPrompt,
    learningPrompt,
    originTarget,
    validateAssignment,
    workKindOf,
} from './generated.js';
import { HarnessPool } from './harnesses.js';
import { RequestStore, type UserRequest } from './requests.js';
import { resolveRoute, type RouteResolution, type RunSelection } from './routing.js';
import type {
    ActivityView,
    AgentView,
    BlockerView,
    ConnectionView,
    CurrentWorkView,
    ErrorView,
    Phase,
    QueueItemView,
    RequestView,
    ResultView,
    ServiceSnapshot,
    WaitView,
} from './snapshot.js';
import { StateStore, type ActiveRecord, type ResultRecord } from './state.js';
import { recordDiagnostic, rotateTraces } from './traces.js';
import { integrateWorktree, prepareWorktree } from './isolation.js';
import { shortId } from '../common/ids.js';

/**
 * Process placement of the agenda.
 *
 * @private agenda supervisor
 */
export type AgendaMode = 'daemon' | 'foreground' | 'run';

/**
 * Finite-run options.
 *
 * @private agenda supervisor
 */
export type RunOptions = {
    /** The one configuration of the run. */
    readonly selection: RunSelection;
    /** Lower priority bound. */
    readonly minPriority?: number;
    /** Upper priority bound. */
    readonly maxPriority?: number;
    /** Successful-task limit. */
    readonly limit?: number;
    /** Confirmation before each task (`--no-auto`). */
    readonly confirm?: (task: Task) => Promise<boolean>;
};

/**
 * Construction options of the agenda.
 *
 * @private agenda supervisor
 */
export type AgendaOptions = {
    readonly project: Project;
    readonly mode: AgendaMode;
    readonly instanceId: string;
    readonly env: NodeJS.ProcessEnv;
    /** CLI setting overrides by key (parsed values). */
    readonly cli: Readonly<Record<string, unknown>>;
    /** CLI harness restriction. */
    readonly cliHarnesses?: readonly string[];
    /** `--tasks` (absolute), overriding `paths.tasks`. */
    readonly tasksDirectory?: string;
    /** Persistence state for status views. */
    readonly persistent: boolean | null;
    /** Explanation of persistence state. */
    readonly persistenceNote?: string;
    /** Finite-run options (mode `run`). */
    readonly run?: RunOptions;
    /** Plain event stream (raw/noninteractive output). */
    readonly onEvent?: (text: string, level: 'info' | 'warning' | 'error') => void;
    /** Additional tools for agents (project browser). */
    readonly extraTools?: (task: Task, context: { readonly onUserRequest: (request: UserRequest) => void }) => BridgeTool[];
};

/**
 * Summary returned when the agenda ends.
 *
 * @private agenda supervisor
 */
export type AgendaSummary = {
    readonly completed: number;
    readonly failed: number;
    readonly pendingRequests: number;
    readonly outcome: 'stopped' | 'finished' | 'incomplete' | 'failed';
    readonly message: string;
    readonly nextTime?: number;
};

/**
 * Maximal activity lines kept in memory.
 */
const MAX_ACTIVITY = 300;

/**
 * Recheck interval of setup/workspace/recovery blockers.
 */
const BLOCKER_RECHECK_MS = 5 * 60_000;

/**
 * Longest idle sleep before reevaluating sources and time.
 */
const IDLE_RECHECK_MS = 10 * 60_000;

/**
 * Interval of automatic harness update checks.
 */
const HARNESS_MAINTENANCE_INTERVAL_MS = 12 * 3_600_000;

/**
 * Answer choices of a failure recovery request.
 */
const RECOVERY_CHOICES = ['Retry the task', 'Acknowledge the failure'] as const;

/**
 * The project supervisor: one active task at a time, shared by start (indefinite) and run (finite).
 *
 * @private agenda supervisor
 */
export class Agenda {
    private revision = 0;
    private readonly changeListeners = new Set<() => void>();
    private phase: Phase = 'starting';
    private serviceState: ServiceSnapshot['service']['state'] = 'starting';
    private current?: CurrentWorkView;
    private waitView?: WaitView;
    private queueView: QueueItemView[] = [];
    private queueTotal = 0;
    private readonly activity: ActivityView[] = [];
    private readonly errors: ErrorView[] = [];
    private blockers: BlockerView[] = [];
    private requestViews: RequestView[] = [];
    private recentResults: ResultView[] = [];
    private completed = 0;
    private failed = 0;
    private paused = false;
    private pauseRequested = false;
    private stopRequested = false;
    private ownedWork = new AbortController();
    private waiter?: { readonly skippable: boolean; readonly resolve: (reason: 'elapsed' | 'skipped' | 'cancelled' | 'woken') => void };
    private readonly runtimeOverrides: Record<string, unknown> = {};
    private settings!: EffectiveSettings;
    private catalog!: AgentCatalog;
    private pool!: HarnessPool;
    private readonly state: StateStore;
    private readonly requests: RequestStore;
    private readonly gitMutex = new Mutex();
    private readonly authoredPaths = new Set<string>();
    private repositoryRoot?: string;
    private connection: ConnectionView = { local: { state: 'disabled' }, remote: { state: 'disabled' } };
    private readonly startedAt = new Date().toISOString();
    private readonly executedInRun = new Set<string>();
    private runInitial?: Set<string>;
    private runSucceeded = 0;
    private lastHarnessMaintenance = 0;
    private readonly watchers: FSWatcher[] = [];
    private wakeTimer?: NodeJS.Timeout;
    private lastPersistenceRetry = 0;
    private nextKnownTime?: number;
    private finishedSummary?: AgendaSummary;

    public constructor(private readonly options: AgendaOptions) {
        this.state = new StateStore(options.project.runtime.state);
        this.requests = new RequestStore(options.project.runtime.requests);
    }

    /** Effective task source directory. */
    private get tasksDirectory(): string {
        return this.options.tasksDirectory ?? resolve(this.options.project.root, setting<string>(this.settings, 'paths.tasks'));
    }

    /** Effective time zone. */
    private get timeZone(): string {
        return setting<string>(this.settings, 'timezone');
    }

    /** Effective commit mode. */
    public get commitMode(): boolean {
        return setting<boolean>(this.settings, 'execution.commit');
    }

    /** Effective settings (for the service). */
    public get effectiveSettings(): EffectiveSettings {
        return this.settings;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    /**
     * Prepares runtime storage, settings, agents and harness availability.
     */
    public async initialize(): Promise<void> {
        const { project } = this.options;
        for (const directory of [project.runtime.state, project.runtime.requests, project.runtime.logs, project.runtime.temporary]) await ensureDirectory(directory);
        await this.refreshContext(true);
        await confinePath(project.root, this.tasksDirectory);
        const results = await this.state.recentResults(200);
        this.recentResults = results.slice(0, 20).map(resultView);
        await this.refreshRequests();
        this.log(`ptbk ${ENGINE_VERSION} ${this.options.mode === 'run' ? 'run' : 'agenda'} started for ${project.root}${this.commitMode ? '' : ' (explicit no-commit mode)'}`);
    }

    /**
     * Runs until stopped (start) or until the finite queue is done (run).
     */
    public async run(): Promise<AgendaSummary> {
        this.serviceState = 'running';
        this.touch();
        this.startWatching();
        try {
            while (!this.stopRequested && !this.finishedSummary) {
                try {
                    await this.iteration();
                } catch (error) {
                    await this.reportError('supervisor', error);
                    if (this.options.mode === 'run') {
                        this.finishedSummary = { completed: this.completed, failed: this.failed + 1, pendingRequests: this.requestViews.length, outcome: 'failed', message: errorMessage(error) };
                        break;
                    }
                    await this.wait(setting<number>(this.settings, 'execution.waitAfterError') || 60_000, { kind: 'error-backoff', reason: `Supervisor error: ${errorMessage(error)}`, skippable: true });
                }
            }
        } finally {
            this.stopWatching();
        }
        this.serviceState = this.options.mode === 'run' && !this.stopRequested ? 'finished' : 'stopped';
        this.phase = this.options.mode === 'run' && !this.stopRequested ? 'finished' : 'stopped';
        this.current = undefined;
        this.waitView = undefined;
        this.touch();
        return (
            this.finishedSummary ?? {
                completed: this.completed,
                failed: this.failed,
                pendingRequests: this.requestViews.length,
                outcome: 'stopped',
                message: 'Stopped on request; unfinished work keeps its recovery record.',
            }
        );
    }

    // ── Controls (shared by terminal, browser and API) ───────────────────────

    /** Pauses after the current task (immediately when idle). */
    public pause(): { state: string } {
        if (this.current) {
            this.pauseRequested = true;
            this.serviceState = 'pausing';
            this.log('Pause requested; the current task finishes first.');
        } else {
            this.paused = true;
            this.serviceState = 'paused';
            this.log('Paused.');
            this.waiter?.resolve('woken');
        }
        this.touch();
        return { state: this.serviceState };
    }

    /** Resumes task starts. */
    public resume(): { state: string } {
        this.paused = false;
        this.pauseRequested = false;
        this.serviceState = 'running';
        this.log('Resumed.');
        this.waiter?.resolve('woken');
        this.touch();
        return { state: this.serviceState };
    }

    /** Skips a pacing/backoff wait; setup, schedule and human waits cannot be skipped. */
    public skipWait(): { applied: boolean; reason?: string } {
        if (!this.waiter || !this.waitView) return { applied: false, reason: 'Nothing is waiting.' };
        if (!this.waiter.skippable) return { applied: false, reason: `This wait cannot be skipped: ${this.waitView.reason}` };
        this.log('Wait skipped.');
        this.waiter.resolve('skipped');
        return { applied: true };
    }

    /**
     * Requests a graceful stop: after the current task, or immediately cancelling owned work (recoverable).
     */
    public requestStop(options: { cancelCurrent: boolean }): { state: string } {
        this.stopRequested = true;
        this.serviceState = 'stopping';
        this.phase = 'stopping';
        if (options.cancelCurrent) {
            this.log('Stopping: cancelling owned work (recovery state is preserved).', 'warning');
            this.ownedWork.abort();
        } else this.log(this.current ? 'Stopping after the current task.' : 'Stopping.');
        this.waiter?.resolve('cancelled');
        this.touch();
        return { state: this.serviceState };
    }

    /** Cancels a pending stop that has not taken effect yet. */
    public cancelStop(): { state: string } {
        if (this.stopRequested && !this.ownedWork.signal.aborted) {
            this.stopRequested = false;
            this.serviceState = this.paused ? 'paused' : 'running';
            this.log('Stop cancelled.');
            this.touch();
        }
        return { state: this.serviceState };
    }

    /** Applies an answer to a pending request (once). */
    public async answer(id: string, answer: string, via: UserRequest['resolvedVia'], status: 'answered' | 'cancelled' | 'rejected' | 'unable' = 'answered'): Promise<UserRequest> {
        const request = await this.requests.resolve(id, { status, answer, via });
        this.log(`Request ${id} ${status} via ${via ?? 'unknown channel'}.`);
        await this.refreshRequests();
        this.wake();
        return request;
    }

    /**
     * Changes settings: temporary by default, saved to ptbk.json (and committed) when requested.
     */
    public async updateSettings(changes: Readonly<Record<string, unknown>>, save: boolean): Promise<{ applied: string[]; saved: boolean; commit?: string; restartRequired: string[] }> {
        const applied: string[] = [];
        const restartRequired: string[] = [];
        for (const [key, value] of Object.entries(changes)) {
            const spec = SETTING_SPECS.find((candidate) => candidate.key === key);
            if (!spec) throw new PtbkError(`Unknown setting ${key}.`, { kind: 'usage' });
            this.runtimeOverrides[key] = value;
            applied.push(key);
            if (spec.application === 'restart') restartRequired.push(key);
        }
        let commit: string | undefined;
        if (save) {
            const changed = await updateProjectConfig(this.options.project, { settings: changes });
            if (changed && this.commitMode) commit = await this.commitAuthoring([this.options.project.configPath], 'Update project configuration');
            for (const key of applied) delete this.runtimeOverrides[key];
        }
        await this.refreshContext();
        this.log(`Settings ${save ? 'saved' : 'changed for this process'}: ${applied.join(', ')}${restartRequired.length ? ` (restart required: ${restartRequired.join(', ')})` : ''}`);
        this.wake();
        return { applied, saved: save, commit, restartRequired };
    }

    /**
     * Writes and commits an authored task file at a safe boundary (never folded into the active task).
     */
    public async addTaskFile(path: string, content: string, summary: string, commit: boolean = this.commitMode): Promise<{ path: string; commit?: string }> {
        const absolute = await confinePath(this.options.project.root, path);
        this.authoredPaths.add(absolute);
        await ensureDirectory(dirname(absolute));
        await writeFile(absolute, content, { flag: 'wx' });
        let sha: string | undefined;
        if (commit) {
            sha = await this.commitAuthoring([absolute], summary);
            // Committed sources are clean again; later edits (e.g. Manager routing) belong to the work that makes them.
            this.authoredPaths.delete(absolute);
        } else await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, absolute)]: null });
        this.log(`Added ${toProjectRelative(this.options.project.root, absolute)}${sha ? ` (${sha.slice(0, 8)})` : ' (uncommitted)'}`);
        this.wake();
        return { path: absolute, commit: sha };
    }

    /** Commits authored paths under the Git lock. */
    private async commitAuthoring(paths: readonly string[], summary: string): Promise<string | undefined> {
        if (!this.repositoryRoot) throw new PtbkError('The project is not in a Git working tree.', { kind: 'setup', next: ['Run `ptbk init`.'] });
        const outcome = await this.gitMutex.run(() =>
            commitPaths({ projectRoot: this.options.project.root, repositoryRoot: this.repositoryRoot!, paths, subject: summary, temporaryDirectory: this.options.project.runtime.temporary, env: this.options.env }),
        );
        return outcome.committed ? outcome.sha : undefined;
    }

    /** Updates connection information (owned by the service). */
    public setConnection(connection: ConnectionView): void {
        this.connection = connection;
        this.touch();
    }

    /** Wakes an idle wait to reevaluate sources/time. */
    public wake(): void {
        this.waiter?.resolve('woken');
    }

    /** Adds an activity line (also used by the service for connection events). */
    public log(text: string, level: ActivityView['level'] = 'info'): void {
        this.activity.push({ at: new Date().toISOString(), text, level });
        if (this.activity.length > MAX_ACTIVITY) this.activity.splice(0, this.activity.length - MAX_ACTIVITY);
        this.options.onEvent?.(text, level);
        this.touch();
    }

    // ── Snapshot ─────────────────────────────────────────────────────────────

    /** Notifies listeners of a state change. */
    private touch(): void {
        this.revision++;
        for (const listener of [...this.changeListeners]) listener();
    }

    /** Subscribes to state changes. */
    public onChange(listener: () => void): () => void {
        this.changeListeners.add(listener);
        return () => this.changeListeners.delete(listener);
    }

    /** Current revision. */
    public get currentRevision(): number {
        return this.revision;
    }

    /**
     * Waits until the revision differs from `since` (long polling), bounded by `timeoutMs`.
     */
    public async waitForChange(since: number, timeoutMs: number): Promise<void> {
        if (this.revision !== since) return;
        await new Promise<void>((resolvePromise) => {
            const timer = setTimeout(done, timeoutMs);
            const unsubscribe = this.onChange(done);
            function done(): void {
                clearTimeout(timer);
                unsubscribe();
                resolvePromise();
            }
        });
    }

    /**
     * The shared status snapshot.
     */
    public snapshot(): ServiceSnapshot {
        const installation = detectInstallation();
        const activityOf = (name: string): BadgeActivity => {
            if (!this.current || normalizeAgentName(this.current.agent.name) !== normalizeAgentName(name)) return 'idle';
            return this.current.agent.activity;
        };
        const agents: AgentView[] = this.catalog
            ? [...new Map([...this.catalog.ordinary(), ...this.catalog.all().filter((definition) => definition.core)].map((definition) => [definition.normalized, definition])).values()].map(
                  (definition) => agentView(definition.name, activityOf(definition.name)),
              )
            : [];
        if (this.current && !agents.some((agent) => agent.key === this.current!.agent.key)) agents.unshift(this.current.agent);
        const harnesses = this.pool
            ? HARNESS_PLUGINS.filter((plugin) => plugin.featured || this.pool.enabled().includes(plugin.id)).map((plugin) => {
                  const inspection = this.pool.inspection(plugin.id);
                  return {
                      id: plugin.id,
                      name: plugin.displayName,
                      featured: plugin.featured,
                      enabled: this.pool.enabled().includes(plugin.id),
                      usable: Boolean(inspection?.usable),
                      summary: inspection?.summary ?? (this.pool.enabled().includes(plugin.id) ? 'Not inspected yet.' : 'Not enabled.'),
                      version: inspection?.version,
                  };
              })
            : [];
        return {
            revision: this.revision,
            observedAt: new Date().toISOString(),
            project: { name: this.options.project.name, path: this.options.project.root },
            engine: { version: ENGINE_VERSION, installation: installation.root, scope: installation.scope },
            service: {
                mode: this.options.mode,
                state: this.serviceState,
                pid: process.pid,
                instanceId: this.options.instanceId,
                startedAt: this.startedAt,
                persistent: this.options.persistent,
                persistenceNote: this.options.persistenceNote,
                commitMode: this.settings && !this.commitMode ? 'no-commit' : 'commit',
                stopRequested: this.stopRequested,
            },
            phase: this.paused && !this.current ? 'paused' : this.phase,
            current: this.current,
            wait: this.waitView,
            queue: this.queueView,
            queueTotal: this.queueTotal,
            results: { completed: this.completed, failed: this.failed, recent: this.recentResults },
            requests: this.requestViews,
            blockers: this.blockers,
            errors: this.errors.slice(-10),
            activity: this.activity.slice(-120),
            agents,
            harnesses,
            settings: this.settings
                ? SETTING_SPECS.map((spec) => ({
                      key: spec.key,
                      value: formatSettingValue(serializeSettingValue(spec, this.settings.values[spec.key])),
                      source: this.settings.sources[spec.key] ?? 'default',
                      application: spec.application,
                      description: spec.description,
                  }))
                : [],
            connection: this.connection,
        };
    }

    // ── Context ──────────────────────────────────────────────────────────────

    /** Reloads settings, agents, repository facts and harness availability. */
    private async refreshContext(initial = false): Promise<void> {
        const loaded = await loadSettings(this.options.project, { env: this.options.env, cli: this.options.cli, runtime: this.runtimeOverrides, cliHarnesses: this.options.cliHarnesses });
        this.settings = loaded;
        this.catalog = await AgentCatalog.load(this.options.project.root, setting<string>(loaded, 'paths.agents'));
        if (!this.pool) this.pool = new HarnessPool(this.options.project.root, loaded, this.options.env);
        else this.pool.updateSettings(loaded);
        const runHarness = this.options.run?.selection.harness;
        await this.pool.refresh(runHarness ? [...new Set([...this.pool.enabled(), runHarness])] : this.pool.enabled(), initial);
        const gitInfo = await inspectGit(this.options.project.root);
        this.repositoryRoot = gitInfo.state === 'repository' ? gitInfo.root : undefined;
        const blockers: BlockerView[] = [];
        if (gitInfo.state !== 'repository') {
            blockers.push({
                kind: 'workspace',
                title: 'Not a usable Git working tree',
                reason: gitInfo.state === 'missing-git' ? `Git is not available: ${gitInfo.reason}` : gitInfo.state === 'not-repository' ? 'The project is not inside a Git repository.' : `Repository state: ${gitInfo.state}${'reason' in gitInfo ? ` (${gitInfo.reason})` : ''}`,
                action: 'Run `ptbk init` in the project.',
            });
        }
        const configErrors = loaded.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        if (configErrors.length) {
            blockers.push({ kind: 'configuration', title: 'Invalid configuration', reason: configErrors.map((error) => `${error.location}: ${error.message}`).join('; '), action: 'Fix ptbk.json.' });
        }
        this.blockers = [...blockers, ...this.blockers.filter((blocker) => !['workspace', 'configuration'].includes(blocker.kind))];
    }

    /** Reloads pending requests into the view. */
    private async refreshRequests(): Promise<void> {
        const pending = await this.requests.list({ status: 'pending' });
        this.requestViews = pending.map((request) => ({
            id: request.id,
            kind: request.kind,
            reason: request.reason,
            question: request.question,
            choices: request.choices,
            blocking: request.blocking,
            createdAt: request.createdAt,
            taskRef: request.origin.taskRef,
            taskTitle: request.origin.taskTitle,
            agent: request.origin.agent,
            origin: request.origin.kind,
        }));
        this.touch();
    }

    /** Watches task/agent sources and configuration to react quickly to changes. */
    private startWatching(): void {
        const targets = [this.tasksDirectory, resolve(this.options.project.root, setting<string>(this.settings, 'paths.agents')), this.options.project.runtime.requests, this.options.project.root];
        for (const target of targets) {
            try {
                const watcher = watch(target, { recursive: target !== this.options.project.root }, (_event, file) => {
                    if (target === this.options.project.root && file !== 'ptbk.json') return;
                    clearTimeout(this.wakeTimer);
                    this.wakeTimer = setTimeout(() => {
                        void this.refreshRequests();
                        this.wake();
                    }, 750);
                });
                watcher.on('error', () => undefined);
                this.watchers.push(watcher);
            } catch {
                // Polling on the idle recheck interval covers unsupported watchers.
            }
        }
    }

    /** Stops watching. */
    private stopWatching(): void {
        for (const watcher of this.watchers) watcher.close();
        this.watchers.length = 0;
        clearTimeout(this.wakeTimer);
    }

    // ── Waiting ──────────────────────────────────────────────────────────────

    /**
     * Waits with an honest explanation; resolves on time, skip (skippable only), wake or stop.
     */
    private async wait(ms: number, view: Omit<WaitView, 'until'> & { until?: string }): Promise<'elapsed' | 'skipped' | 'cancelled' | 'woken'> {
        if (this.stopRequested) return 'cancelled';
        const until = view.kind === 'user' || view.kind === 'paused' ? undefined : Number.isFinite(ms) ? new Date(Date.now() + ms).toISOString() : view.until;
        this.waitView = { ...view, until };
        if (!this.current) this.phase = view.kind === 'paused' ? 'paused' : ['setup', 'recovery', 'workspace', 'persistence'].includes(view.kind) ? 'blocked' : view.kind === 'user' ? 'awaiting-user' : view.kind === 'idle' || view.kind === 'schedule' || view.kind === 'discovery' ? 'idle' : 'waiting';
        this.touch();
        const reason = await new Promise<'elapsed' | 'skipped' | 'cancelled' | 'woken'>((resolvePromise) => {
            let timer: NodeJS.Timeout | undefined;
            const done = (result: 'elapsed' | 'skipped' | 'cancelled' | 'woken'): void => {
                if (timer) clearTimeout(timer);
                this.waiter = undefined;
                resolvePromise(result);
            };
            if (Number.isFinite(ms)) timer = setTimeout(() => done('elapsed'), Math.max(0, Math.min(ms, 2_147_000_000)));
            this.waiter = { skippable: view.skippable, resolve: done };
        });
        this.waitView = undefined;
        this.touch();
        return reason;
    }

    // ── Main iteration ───────────────────────────────────────────────────────

    /** One supervisor step: resume, execute, discover or wait. */
    private async iteration(): Promise<void> {
        if (this.paused) {
            await this.wait(Infinity, { kind: 'paused', reason: 'Paused. Resume to continue starting tasks.', skippable: false });
            return;
        }
        this.phase = 'evaluating';
        await this.refreshContext();
        await this.refreshRequests();
        if (this.blockers.some((blocker) => blocker.kind === 'workspace' || blocker.kind === 'configuration')) {
            const blocker = this.blockers.find((item) => item.kind === 'workspace' || item.kind === 'configuration')!;
            if (this.options.mode === 'run') {
                this.finishedSummary = { completed: this.completed, failed: this.failed, pendingRequests: this.requestViews.length, outcome: 'failed', message: `${blocker.title}: ${blocker.reason}` };
                return;
            }
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason: `${blocker.title}: ${blocker.reason}`, action: blocker.action, skippable: false });
            return;
        }
        if (this.options.mode !== 'run') await this.maintainHarnesses();
        const active = await this.state.readActive();
        if (active) {
            await this.continueActive(active);
            return;
        }
        this.blockers = this.blockers.filter((blocker) => blocker.kind !== 'recovery' && blocker.kind !== 'persistence');
        if (!(await this.checkBeforeWork())) return;
        if (setting<boolean>(this.settings, 'execution.autoPull') && this.commitMode) await this.pull();
        const evaluated = await this.evaluate();
        const candidates = this.filterForRun(evaluated);
        const next = selectNext(candidates);
        if (next) {
            const dirty = await this.unrelatedChanges();
            const policy = setting<string>(this.settings, 'execution.gitChanges');
            if (dirty.length && policy !== 'ignore') {
                const reason = `Uncommitted changes not owned by ptbk: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ` and ${dirty.length - 5} more` : ''}.`;
                const action = 'Commit or discard them, or restart with `--git-changes ignore` to leave them aside.';
                if (this.options.mode === 'run') {
                    this.finishedSummary = { completed: this.completed, failed: this.failed, pendingRequests: this.requestViews.length, outcome: 'failed', message: `${reason} ${action}` };
                    return;
                }
                this.setBlocker({ kind: 'workspace', title: 'Unrelated uncommitted changes', reason, action, recheckAt: new Date(Date.now() + 60_000).toISOString() });
                await this.wait(60_000, { kind: 'workspace', reason, action, skippable: false });
                return;
            }
            this.clearBlocker('workspace');
            if (this.options.run?.confirm && !(await this.options.run.confirm(next.task))) {
                this.executedInRun.add(next.task.ref);
                this.log(`Skipped ${next.task.title} (not confirmed).`);
                return;
            }
            await this.startTask(next);
            if (this.pauseRequested) {
                this.pauseRequested = false;
                this.paused = true;
                this.serviceState = 'paused';
                this.touch();
            }
            return;
        }
        if (this.options.mode === 'run') {
            this.finishRun(evaluated);
            return;
        }
        if (!evaluated.some((item) => isUnfinished(item.readiness)) && setting<boolean>(this.settings, 'discovery.enabled')) {
            const discovered = await this.discover();
            if (discovered) return;
        }
        const waiting = evaluated.filter((item) => item.readiness.kind === 'waiting-until').map((item) => (item.readiness as { until: number }).until);
        const nextTime = waiting.length ? Math.min(...waiting) : undefined;
        this.nextKnownTime = nextTime;
        const blocked = evaluated.filter((item) => ['blocked', 'needs-recovery', 'failed'].includes(item.readiness.kind));
        const reason = nextTime
            ? `No eligible work now; next scheduled work at ${formatShortTime(nextTime, Date.now(), this.timeZone)}.`
            : blocked.length
              ? `No eligible work; ${blocked.length} task(s) blocked (${blocked[0]!.task.title}: ${blocked[0]!.readiness.reason}).`
              : (this.idleReason ?? 'No unfinished work.');
        this.phase = 'idle';
        await this.wait(nextTime ? Math.min(nextTime - Date.now(), IDLE_RECHECK_MS) : IDLE_RECHECK_MS, { kind: nextTime ? 'schedule' : 'idle', reason, skippable: false });
    }

    /** Explanation of the most recent idle reason (discovery). */
    private idleReason?: string;

    /** Finishes a finite run with a truthful summary. */
    private finishRun(evaluated: EvaluatedTask[]): void {
        const future = evaluated.filter((item) => item.readiness.kind === 'waiting-until').map((item) => (item.readiness as { until: number }).until);
        const nextTime = future.length ? Math.min(...future) : undefined;
        const pending = this.requestViews.length;
        const outcome: AgendaSummary['outcome'] = this.failed ? 'failed' : pending ? 'incomplete' : 'finished';
        const parts = [`${this.completed} completed, ${this.failed} failed`];
        if (pending) parts.push(`${pending} request(s) waiting for you (ptbk answer)`);
        if (nextTime) parts.push(`next scheduled work at ${formatShortTime(nextTime, Date.now(), this.timeZone)}`);
        this.finishedSummary = { completed: this.completed, failed: this.failed, pendingRequests: pending, outcome, message: parts.join('; '), nextTime };
    }

    /** Restricts candidates for a finite run: initial snapshot, priority bounds, one occurrence per definition. */
    private filterForRun(evaluated: EvaluatedTask[]): EvaluatedTask[] {
        if (this.options.mode !== 'run') return evaluated;
        const run = this.options.run!;
        if (run.limit !== undefined && this.runSucceeded >= run.limit) return [];
        const inBounds = (item: EvaluatedTask): boolean =>
            (run.minPriority === undefined || item.task.priority.value >= run.minPriority) && (run.maxPriority === undefined || item.task.priority.value <= run.maxPriority);
        if (!this.runInitial) this.runInitial = new Set(evaluated.filter((item) => item.readiness.kind === 'ready').map((item) => item.task.ref));
        return evaluated.filter((item) => item.readiness.kind === 'ready' && this.runInitial!.has(item.task.ref) && !this.executedInRun.has(item.task.ref) && inBounds(item));
    }

    /** Evaluates readiness of every task and updates the queue view. */
    private async evaluate(): Promise<EvaluatedTask[]> {
        const queue = await readTaskQueue({ root: this.options.project.root, tasksDirectory: this.tasksDirectory, explicit: Boolean(this.options.tasksDirectory), timeZone: this.timeZone });
        for (const problem of queue.problems) this.logOnce(problem, 'warning');
        const blockers = await this.state.readBlockers();
        const pending = await this.requests.list({ status: 'pending' });
        const awaitingUser = new Map<string, string>();
        for (const request of pending) if (request.origin.taskRef && request.blocking) awaitingUser.set(request.origin.taskRef, request.id);
        const uncommitted = new Set<string>();
        if (this.commitMode && this.repositoryRoot) {
            const dirty = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot }, new Set());
            for (const path of Object.keys(dirty)) uncommitted.add(resolve(this.options.project.root, path));
        }
        const assignmentFor = new Map<string, string>();
        for (const task of queue.tasks) {
            if (workKindOf(task) === 'assignment' && task.status !== 'done') {
                const target = originTarget(task);
                if (target) {
                    const found = findTask(queue.tasks, target).task;
                    if (found) assignmentFor.set(found.ref, task.ref);
                }
            }
        }
        const activations = await this.state.readActivations();
        for (const task of queue.tasks) {
            if (isRecurring(task) && activations[task.id ?? task.ref] === undefined) activations[task.id ?? task.ref] = await this.state.ensureActivation(task.id ?? task.ref, Date.now());
        }
        const routeCache = new Map<string, RouteResolution>();
        const route = async (task: Task): Promise<RouteCheck> => {
            const resolution = await this.route(task);
            routeCache.set(task.ref, resolution);
            if (resolution.kind === 'routable') return { kind: 'routable' };
            return resolution;
        };
        const active = await this.state.readActive();
        const evaluated = await evaluateQueue(queue.tasks, {
            now: Date.now(),
            timeZone: this.timeZone,
            activeRef: active?.taskRef,
            awaitingUser,
            recovery: new Map(Object.entries(blockers).map(([ref, blocker]) => [ref, blocker.reason])),
            uncommittedSources: uncommitted,
            activation: (task) => activations[task.id ?? task.ref] ?? Date.now(),
            route,
            assignmentFor,
        });
        this.queueTotal = evaluated.filter((item) => item.readiness.kind !== 'done' && item.readiness.kind !== 'retired').length;
        this.queueView = evaluated
            .filter((item) => item.readiness.kind !== 'done' && item.readiness.kind !== 'retired')
            .slice(0, 60)
            .map((item) => {
                const resolution = routeCache.get(item.task.ref);
                return {
                    ref: item.task.ref,
                    title: item.task.title,
                    readiness: item.readiness.kind,
                    reason: item.readiness.reason,
                    priority: item.task.priority.value,
                    priorityText: item.task.priority.raw ? describePriority(item.task.priority) : undefined,
                    agent: resolution?.kind === 'routable' ? resolution.selection.agent : item.task.routing.agent,
                    harness: resolution?.kind === 'routable' ? resolution.selection.harness : item.task.routing.harness,
                    source: item.task.source.relativePath,
                    until: item.readiness.kind === 'waiting-until' ? new Date(item.readiness.until).toISOString() : undefined,
                    origin: item.task.origin,
                };
            });
        this.touch();
        return evaluated;
    }

    /** Routes a task in the agenda's mode. */
    private async route(task: Task): Promise<RouteResolution> {
        return await resolveRoute(task, { mode: this.options.mode === 'run' ? 'run' : 'start', catalog: this.catalog, pool: this.pool, settings: this.settings, runSelection: this.options.run?.selection });
    }

    /** Uncommitted project paths not owned by ptbk (relative). */
    private async unrelatedChanges(): Promise<string[]> {
        if (!this.repositoryRoot) return [];
        const dirty = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot }, this.authoredPaths);
        // Explicit no-commit writes stay owned only within no-commit operation; committed operation must reconcile them.
        const owned = this.commitMode ? {} : await this.state.readOwnedUncommitted();
        return Object.entries(dirty)
            .filter(([path, hash]) => owned[path] === undefined || (owned[path] !== hash && owned[path] !== null))
            .map(([path]) => path);
    }

    /** Execution environment for the executor. */
    private environment(task: Task): ExecutionEnvironment {
        if (!this.repositoryRoot) throw new PtbkError('The project is not in a Git working tree.', { kind: 'setup', next: ['Run `ptbk init`.'] });
        this.ownedWork = this.ownedWork.signal.aborted && !this.stopRequested ? new AbortController() : this.ownedWork;
        return {
            project: this.options.project,
            settings: this.settings,
            catalog: this.catalog,
            pool: this.pool,
            state: this.state,
            requests: this.requests,
            repositoryRoot: this.repositoryRoot,
            instanceId: this.options.instanceId,
            commit: this.commitMode,
            questionsAllowed: setting<boolean>(this.settings, 'execution.questions'),
            timeZone: this.timeZone,
            tasksDirectory: this.tasksDirectory,
            signal: this.ownedWork.signal,
            env: this.options.env,
            hooks: {
                emit: (event) => {
                    if (event.type === 'activity') this.log(event.text, event.level);
                    else if (event.type === 'phase' && this.current) {
                        const phase: Phase = event.phase === 'repairing' ? 'repairing' : event.phase === 'awaiting-user' ? 'awaiting-user' : (event.phase as Phase);
                        this.current = { ...this.current, phase, detail: event.detail, agent: agentView(this.current.agent.name, phase === 'awaiting-user' ? 'waiting-user' : 'working') };
                        this.phase = phase;
                        this.touch();
                    } else if (event.type === 'attempt' && this.current) {
                        this.current = { ...this.current, attempt: event.attempt, attemptBudget: event.budget };
                        this.touch();
                    } else if (event.type === 'model' && this.current) {
                        this.current = { ...this.current, model: event.model, modelSource: 'reported' };
                        this.touch();
                    }
                },
                wait: async (ms, info) => {
                    const result = await this.wait(ms, { kind: info.kind, reason: info.reason, skippable: true });
                    return result === 'woken' ? 'elapsed' : result;
                },
                gitLock: (action) => this.gitMutex.run(action),
                excludedPaths: () => this.authoredPaths,
                extraTools: this.options.extraTools ? (context) => this.options.extraTools!(task, context) : undefined,
            },
        };
    }

    // ── Starting work ────────────────────────────────────────────────────────

    /** Starts the selected task (or its Manager prerequisite). */
    private async startTask(next: EvaluatedTask): Promise<void> {
        const task = next.task;
        if (next.readiness.kind === 'needs-assignment') {
            await this.assign(task);
            return;
        }
        const route = await this.route(task);
        if (route.kind !== 'routable') return;
        const item = await this.buildWorkItem(task, route, { slot: next.readiness.kind === 'ready' ? next.readiness.slot : undefined });
        if (!item) return;
        await this.execute(item);
    }

    /**
     * Builds the work item of a task according to its provenance (assignment, learning, discovery, ordinary).
     */
    private async buildWorkItem(task: Task, route: Extract<RouteResolution, { kind: 'routable' }>, extra: { slot?: number; createdPaths?: string[]; resume?: ActiveRecord }): Promise<WorkItem | undefined> {
        const kind = workKindOf(task);
        const base = { task, route, slot: extra.slot, createdPaths: extra.createdPaths ?? [], resume: extra.resume };
        if (kind === 'assignment') {
            const targetRef = originTarget(task);
            return {
                ...base,
                kind: 'assignment',
                learning: true,
                extraPrompt: await this.assignmentInstructions(targetRef),
                validateReport: async (report, changed) => {
                    const queue = await readTaskQueue({ root: this.options.project.root, tasksDirectory: this.tasksDirectory, timeZone: this.timeZone });
                    const target = targetRef ? findTask(queue.tasks, targetRef).task : undefined;
                    if (!target) return { ok: true };
                    const unexpected = changed.filter((path) => path !== task.source.relativePath && path !== target.source.relativePath && !base.createdPaths.some((created) => toProjectRelative(this.options.project.root, created) === path));
                    if (unexpected.length) return { ok: false, feedback: `Assignment work must not edit files, but these changed: ${unexpected.join(', ')}. Revert them and report only the routing decision.` };
                    const validation = await validateAssignment(report.data, { target, catalog: this.catalog, pool: this.pool });
                    if (!validation.ok) return validation;
                    return {
                        ok: true,
                        apply: async () => {
                            await applyAssignment(target, validation.decision);
                            this.log(`Manager routed "${target.title}": ${Object.entries(validation.decision.controls).map(([key, value]) => `${key} ${value}`).join(', ')}`);
                            return [target.source.path];
                        },
                    };
                },
            };
        }
        if (kind === 'learning') {
            const match = /\bby\s+(@\S+|\{[^}]+\})/.exec(task.origin ?? '');
            const learnerRef = match?.[1];
            const learner = learnerRef ? await resolveEffectiveAgent(this.catalog, learnerRef) : undefined;
            const teacher = await this.catalog.resolve('@Teacher');
            if (teacher.kind === 'agent' && learningPolicyOf(teacher.definition.document).open) {
                this.setBlocker({ kind: 'configuration', title: 'Teacher is open', reason: 'Teacher must end with CLOSED; an open Teacher would teach itself endlessly. Learning tasks wait until it is fixed.', action: `Add CLOSED as the last line of ${teacher.definition.relativePath}.` });
                await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason: 'Teacher must end with CLOSED before learning tasks run.', skippable: false });
                return undefined;
            }
            if (!learner?.definition || !learner.learning.open) {
                await this.completeWithoutModel(task, `Skipped: ${learner?.name ?? learnerRef ?? 'the agent'} is ${learner?.definition ? 'CLOSED' : 'not an editable project agent'}; no learning change is permitted.`);
                return undefined;
            }
            const agentPath = learner.definition.relativePath;
            const evidence = await this.learningEvidence(task);
            return {
                ...base,
                kind: 'learning',
                learning: false,
                extraPrompt: learningPrompt({ learner, agentPath, evidence }),
                validateReport: async (_report, changed) => {
                    const unexpected = changed.filter((path) => path !== agentPath && path !== task.source.relativePath);
                    return unexpected.length ? { ok: false, feedback: `Learning work may only edit ${agentPath}; revert changes to ${unexpected.join(', ')}.` } : { ok: true };
                },
            };
        }
        if (kind === 'discovery') {
            const tasksRelative = toProjectRelative(this.options.project.root, this.tasksDirectory);
            const recent = (await this.state.recentResults(30)).filter((result) => result.outcome === 'completed').map((result) => result.title);
            const newTasks = (changed: readonly string[]): string[] =>
                changed.filter((path) => path !== task.source.relativePath && path.startsWith(`${tasksRelative}/`) && !path.slice(tasksRelative.length + 1).includes('/') && /\.(book|md)$/i.test(path));
            return {
                ...base,
                kind: 'discovery',
                learning: (changed) => newTasks(changed).length > 0,
                extraPrompt: discoveryPrompt({ agent: route.agent, tasksDirectory: tasksRelative, recentTitles: recent }),
            };
        }
        return { ...base, kind: 'task', learning: true };
    }

    /** Manager instructions for a target. */
    private async assignmentInstructions(targetRef: string | undefined): Promise<string> {
        const queue = await readTaskQueue({ root: this.options.project.root, tasksDirectory: this.tasksDirectory, timeZone: this.timeZone });
        const target = targetRef ? findTask(queue.tasks, targetRef).task : undefined;
        if (!target) return `## Assignment work\n\nThe target ${targetRef ?? '(unknown)'} no longer exists. Report done with a summary saying so; change nothing.`;
        return await assignmentPrompt({ target, catalog: this.catalog, pool: this.pool, preferences: setting<string | undefined>(this.settings, 'routing.preferences') });
    }

    /** Evidence for a learning task: the trace and summary of the parent result. */
    private async learningEvidence(task: Task): Promise<string | undefined> {
        const parent = task.parent;
        const results = await this.state.recentResults(200);
        const result = results.find((item) => item.taskRef === parent || (parent && item.taskRef === parent.replace(/^#/, '')));
        const tracePath = /Evidence:\s*(\S+)/.exec(task.notes.join('\n'))?.[1] ?? result?.trace;
        const parts: string[] = [];
        if (result) parts.push(`Result: ${result.outcome} after ${result.attempts} attempt(s); summary: ${result.summary}; commit: ${result.commit ?? 'none'}`);
        if (tracePath) {
            try {
                const trace = await readFile(resolve(this.options.project.root, tracePath), 'utf8');
                parts.push(`Trace ${tracePath} (excerpt):\n${trace.slice(-20_000)}`);
            } catch {
                parts.push(`Trace ${tracePath} is no longer available.`);
            }
        }
        return parts.length ? parts.join('\n\n') : undefined;
    }

    /** Creates and executes the Manager prerequisite of a task with missing routing. */
    private async assign(target: Task): Promise<void> {
        const manager = await this.catalog.resolve('@Manager');
        if (manager.kind !== 'agent') {
            this.setBlocker({ kind: 'setup', title: 'Manager is missing', reason: 'The core agent Manager (agents/.core/manager.book) is not available, so missing routing cannot be assigned.', action: 'Run `ptbk init` to restore core agents.' });
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason: 'Manager core agent is missing.', action: 'Run `ptbk init`.', skippable: false });
            return;
        }
        const usable = this.pool.usable();
        const preferred = setting<string | undefined>(this.settings, 'routing.harness');
        const harness = preferred && usable.includes(preferred) ? preferred : usable[0];
        if (!harness) {
            const reason = 'No enabled harness is usable for Manager assignment.';
            this.setBlocker({ kind: 'harness', title: 'No usable harness', reason, action: 'Run `ptbk init` to set up a harness.' });
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason, skippable: false });
            return;
        }
        this.phase = 'assigning';
        const model = harness === preferred ? setting<string | undefined>(this.settings, 'routing.model') : this.settings.harnesses[harness]?.model;
        const thinking = harness === preferred ? setting<ThinkingLevel | undefined>(this.settings, 'routing.thinkingLevel') : this.settings.harnesses[harness]?.thinkingLevel;
        const created = await createAssignmentTask({ target, tasksDirectory: this.tasksDirectory, bootstrap: { harness, model, thinkingLevel: thinking }, timeZone: this.timeZone });
        this.log(`Missing routing for "${target.title}": Manager prerequisite ${toProjectRelative(this.options.project.root, created.path)}`);
        const managerTask = readTaskBook({ source: await readFile(created.path, 'utf8'), path: created.path, relativePath: toProjectRelative(this.options.project.root, created.path), order: 0, timeZone: this.timeZone })!;
        const route = await this.route(managerTask);
        if (route.kind !== 'routable') {
            this.log(`Manager prerequisite is not routable: ${route.reason}`, 'error');
            return;
        }
        const item = await this.buildWorkItem(managerTask, route, { createdPaths: created.paths });
        if (item) await this.execute(item);
    }

    /** Creates and executes a goal enquiry when one is due; returns false when none is due. */
    private async discover(): Promise<boolean> {
        const candidates = this.catalog.ordinary().filter((definition) => definition.document.commitments.some((commitment) => commitment.keyword === 'GOAL' && commitment.body.trim()));
        if (!candidates.length) {
            this.idleReason = 'No unfinished work, and no ordinary agent has a GOAL for goal discovery. Add tasks or goals.';
            return false;
        }
        if (!this.pool.usable().length) {
            this.idleReason = 'No unfinished work; goal discovery needs a usable harness.';
            return false;
        }
        const discovery = await this.state.readDiscovery();
        const now = Date.now();
        const due = candidates
            .map((definition) => ({ definition, entry: discovery.agents[definition.normalized] }))
            .filter(({ entry }) => !entry?.cooldownUntil || Date.parse(entry.cooldownUntil) <= now)
            .sort((a, b) => (a.entry ? Date.parse(a.entry.lastAt) : 0) - (b.entry ? Date.parse(b.entry.lastAt) : 0));
        if (!due.length) {
            const nextAt = Math.min(...candidates.map((definition) => Date.parse(discovery.agents[definition.normalized]?.cooldownUntil ?? new Date(now).toISOString())));
            this.idleReason = `No unfinished work; next goal enquiry at ${formatShortTime(nextAt, now, this.timeZone)}.`;
            this.nextKnownTime = nextAt;
            await this.wait(Math.max(1000, Math.min(nextAt - now, IDLE_RECHECK_MS)), { kind: 'discovery', reason: this.idleReason, skippable: false });
            return true;
        }
        const chosen = due[0]!.definition;
        this.phase = 'discovering';
        const path = await createDiscoveryTask({ tasksDirectory: this.tasksDirectory, agentName: chosen.name, timeZone: this.timeZone });
        this.log(`Goal discovery: asking ${chosen.name} whether its goals justify new work.`);
        const task = readTaskBook({ source: await readFile(path, 'utf8'), path, relativePath: toProjectRelative(this.options.project.root, path), order: 0, timeZone: this.timeZone })!;
        const route = await this.route(task);
        if (route.kind !== 'routable') {
            this.log(`Goal enquiry cannot run: ${route.reason}`, 'warning');
            const { rm } = await import('node:fs/promises');
            await rm(path, { force: true });
            await this.recordDiscovery(chosen.normalized, 'failed');
            return false;
        }
        const item = await this.buildWorkItem(task, route, { createdPaths: [path] });
        if (!item) return false;
        const outcome = await this.execute(item);
        const tasksRelative = toProjectRelative(this.options.project.root, this.tasksDirectory);
        const created = outcome.kind === 'completed' ? outcome.changedPaths.filter((changed) => changed !== task.source.relativePath && changed.startsWith(`${tasksRelative}/`) && /\.(book|md)$/i.test(changed)) : [];
        const work = created.filter((changed) => !/learn-/.test(changed));
        await this.recordDiscovery(chosen.normalized, outcome.kind === 'completed' ? (work.length ? 'work' : 'no-work') : 'failed');
        this.log(work.length ? `${chosen.name} recorded ${work.length} new task(s).` : `${chosen.name} found no new work; next enquiry after the cooldown.`);
        return true;
    }

    /** Persists a goal-enquiry outcome and cooldown. */
    private async recordDiscovery(key: string, outcome: 'work' | 'no-work' | 'failed'): Promise<void> {
        const state = await this.state.readDiscovery();
        const cooldown = setting<number>(this.settings, 'discovery.cooldown');
        const at = Date.now();
        await this.state.writeDiscovery({
            agents: { ...state.agents, [key]: { lastAt: new Date(at).toISOString(), outcome, cooldownUntil: outcome === 'work' ? undefined : new Date(at + cooldown).toISOString() } },
        });
    }

    /** Completes a task without a model call (e.g. learning for a CLOSED agent), with its own commit. */
    private async completeWithoutModel(task: Task, note: string): Promise<void> {
        const { appendCommitment } = await import('../book/edit.js');
        const { stampBookCompletion } = await import('../tasks/book-task.js');
        const source = await readFile(task.source.path, 'utf8');
        await writeFile(task.source.path, stampBookCompletion(appendCommitment(source, 'TASK NOTE', note), Date.now(), this.timeZone));
        const commit = this.commitMode ? await this.commitAuthoring([task.source.path], task.title) : undefined;
        this.log(`${task.title}: ${note}${commit ? ` (${commit.slice(0, 8)})` : ''}`);
    }

    // ── Executing ────────────────────────────────────────────────────────────

    /** Runs one work item through the executor and handles its outcome. */
    private async execute(item: WorkItem): Promise<ExecutionOutcome> {
        const selection = item.route.selection;
        const targetRef = item.kind === 'assignment' ? originTarget(item.task) : undefined;
        this.current = {
            taskRef: item.task.ref,
            taskTitle: item.task.title,
            kind: item.kind,
            agent: agentView(selection.agent, 'working'),
            harness: selection.harness,
            harnessName: harnessName(selection.harness),
            model: selection.model,
            modelSource: selection.model ? 'requested' : 'default',
            thinkingLevel: selection.thinkingLevel,
            phase: 'executing',
            attempt: item.resume?.attempt ?? 0,
            attemptBudget: setting<number>(this.settings, 'execution.repairAttempts'),
            startedAt: new Date().toISOString(),
            target: targetRef ? { ref: targetRef, title: targetRef } : undefined,
        };
        this.phase = item.kind === 'assignment' ? 'assigning' : item.kind === 'learning' ? 'learning' : item.kind === 'discovery' ? 'discovering' : 'executing';
        this.log(`${item.resume ? 'Resuming' : 'Starting'} ${item.kind === 'task' ? '' : `${item.kind} `}"${item.task.title}" with ${selection.agent} on ${harnessName(selection.harness)}${selection.model ? ` (${selection.model})` : ''}`);
        let outcome: ExecutionOutcome;
        try {
            outcome = await this.executeMaybeIsolated(item);
        } catch (error) {
            await this.reportError('execution', error, item.task.ref);
            outcome = { kind: 'failed', reason: errorMessage(error) };
            const record = await this.state.readActive();
            if (record) await this.state.writeActive({ ...record, phase: 'failed', failure: errorMessage(error) });
        }
        const finished = this.current;
        this.current = undefined;
        this.touch();
        switch (outcome.kind) {
            case 'completed': {
                this.completed++;
                this.executedInRun.add(item.task.ref);
                this.runSucceeded++;
                await this.state.setBlocker(item.task.ref, undefined);
                this.recentResults = (await this.state.recentResults(20)).map(resultView);
                if (setting<boolean>(this.settings, 'execution.autoPush') && outcome.commit) await this.push();
                if (!setting<boolean>(this.settings, 'execution.preserveLogs')) await rotateTraces(this.options.project, new Set());
                const pacing = setting<number>(this.settings, 'execution.waitBetweenPrompts');
                if (pacing > 0 && !this.stopRequested) await this.wait(pacing, { kind: 'pacing', reason: 'Pause between tasks (--wait-between-prompts).', skippable: true });
                break;
            }
            case 'awaiting-user':
                this.log(`"${item.task.title}" waits for your answer to ${outcome.requestId} (ptbk answer ${outcome.requestId}).`, 'warning');
                await this.refreshRequests();
                if (this.options.mode === 'run') this.executedInRun.add(item.task.ref);
                break;
            case 'failed':
                this.failed++;
                this.executedInRun.add(item.task.ref);
                this.recentResults = (await this.state.recentResults(20)).map(resultView);
                this.addError({ at: new Date().toISOString(), summary: `"${item.task.title}" failed: ${outcome.reason}`, phase: 'task execution', task: item.task.ref, trace: outcome.trace, next: `Answer the recovery request or run \`ptbk recover ${item.task.ref}\`.` });
                break;
            case 'setup':
                this.setBlocker({ kind: 'harness', title: `${harnessName(selection.harness)} needs setup`, reason: outcome.reason, action: outcome.next, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
                if (this.options.mode === 'run') this.finishedSummary = { completed: this.completed, failed: this.failed + 1, pendingRequests: this.requestViews.length, outcome: 'failed', message: `${outcome.reason} ${outcome.next ?? ''}`.trim() };
                break;
            case 'quota':
                this.log(`${outcome.reason}; waiting ${formatDuration(outcome.retryAfterMs)} before rechecking.`, 'warning');
                if (this.options.mode === 'run') this.finishedSummary = { completed: this.completed, failed: this.failed, pendingRequests: this.requestViews.length, outcome: 'incomplete', message: outcome.reason };
                else await this.wait(outcome.retryAfterMs, { kind: 'quota', reason: outcome.reason, skippable: true });
                break;
            case 'persistence-failed':
                this.setBlocker({ kind: 'persistence', title: 'Commit failed', reason: outcome.reason, action: 'Fix the Git hook/signing/identity problem; ptbk retries persistence without rerunning the agent.' });
                this.addError({ at: new Date().toISOString(), summary: `Commit of "${item.task.title}" failed: ${outcome.reason}`, phase: 'commit', task: item.task.ref, next: 'Fix the cause; persistence resumes automatically.' });
                if (this.options.mode === 'run') this.finishedSummary = { completed: this.completed, failed: this.failed + 1, pendingRequests: this.requestViews.length, outcome: 'failed', message: `Commit failed: ${outcome.reason}` };
                break;
            case 'interrupted':
                this.log(`"${item.task.title}" was interrupted; its recovery record is preserved.`, 'warning');
                break;
        }
        void finished;
        return outcome;
    }

    /**
     * Executes ordinary tasks in an isolated worktree when requested (generated work stays in the checkout).
     */
    private async executeMaybeIsolated(item: WorkItem): Promise<ExecutionOutcome> {
        const environment = this.environment(item.task);
        const isolate = (setting<boolean>(this.settings, 'execution.isolate') && item.kind === 'task' && this.commitMode && !item.createdPaths.length) || Boolean(item.resume?.worktree);
        if (!isolate) return await executeWork(environment, item);
        const runId = item.resume?.runId ?? shortId(10);
        const worktree = await prepareWorktree(this.options.project, environment.repositoryRoot, runId);
        const project = this.options.project;
        const map = (path: string): string => resolve(worktree.projectRoot, relative(project.root, path));
        const isolatedProject = { ...project, root: worktree.projectRoot };
        const task = { ...item.task, source: { ...item.task.source, path: map(item.task.source.path) } };
        this.log(`Isolated in worktree ${toProjectRelative(project.root, worktree.root)} (branch ${worktree.branch}).`);
        return await executeWork(
            { ...environment, project: isolatedProject, repositoryRoot: worktree.root, tasksDirectory: map(this.tasksDirectory) },
            {
                ...item,
                task,
                runId,
                worktree: worktree.root,
                integrate: async () => {
                    const { sha } = await this.gitMutex.run(() => integrateWorktree(environment.repositoryRoot, worktree, item.check ?? setting<string | undefined>(this.settings, 'execution.check'), this.options.env));
                    this.log(`Integrated the isolated result by fast-forward (${sha.slice(0, 8)}).`);
                    return sha;
                },
            },
        );
    }

    /** Continues the task recorded in the active record. */
    private async continueActive(record: ActiveRecord): Promise<void> {
        if (this.options.mode === 'run' && record.instanceId !== this.options.instanceId && setting<string>(this.settings, 'execution.gitChanges') !== 'continue' && record.phase !== 'awaiting-user') {
            this.finishedSummary = {
                completed: this.completed,
                failed: this.failed,
                pendingRequests: this.requestViews.length,
                outcome: 'failed',
                message: `Interrupted work exists for "${record.taskTitle}" (${record.phase}). Resume it with \`ptbk run --git-changes continue\`, \`ptbk start\`, or resolve it with \`ptbk recover ${record.taskRef}\`.`,
            };
            return;
        }
        if (record.phase === 'failed') {
            await this.handleFailedRecord(record);
            return;
        }
        if (record.phase === 'awaiting-user' && record.requestId) {
            const request = await this.requests.get(record.requestId);
            if (request?.status === 'pending') {
                this.current = {
                    taskRef: record.taskRef,
                    taskTitle: record.taskTitle,
                    kind: record.kind,
                    agent: agentView(record.routing.agent, 'waiting-user'),
                    harness: record.routing.harness,
                    harnessName: harnessName(record.routing.harness),
                    model: record.routing.model,
                    modelSource: record.routing.model ? 'requested' : 'default',
                    thinkingLevel: record.routing.thinkingLevel,
                    phase: 'awaiting-user',
                    attempt: record.attempt,
                    attemptBudget: setting<number>(this.settings, 'execution.repairAttempts'),
                    startedAt: record.startedAt,
                    detail: request.id,
                };
                this.phase = 'awaiting-user';
                await this.evaluate();
                if (this.options.mode === 'run') {
                    this.current = undefined;
                    this.finishRun([]);
                    return;
                }
                await this.wait(IDLE_RECHECK_MS, { kind: 'user', reason: `"${record.taskTitle}" waits for your answer to ${request.id}.`, action: `ptbk answer ${request.id}`, skippable: false });
                this.current = undefined;
                return;
            }
        }
        if (record.phase === 'committing' && record.failure) {
            const since = Date.now() - this.lastPersistenceRetry;
            if (since < 120_000) {
                this.setBlocker({ kind: 'persistence', title: 'Commit pending', reason: record.failure, action: 'Fix the cause; ptbk retries the commit without rerunning the agent.', recheckAt: new Date(this.lastPersistenceRetry + 120_000).toISOString() });
                await this.wait(120_000 - since, { kind: 'persistence', reason: `Commit of "${record.taskTitle}" failed: ${record.failure}`, skippable: false });
                return;
            }
            this.lastPersistenceRetry = Date.now();
        }
        const queue = await readTaskQueue({ root: this.options.project.root, tasksDirectory: this.tasksDirectory, explicit: Boolean(this.options.tasksDirectory), timeZone: this.timeZone });
        const task =
            queue.tasks.find((candidate) => candidate.source.relativePath === record.sourcePath && (!record.sectionHash || candidate.source.sectionHash === record.sectionHash)) ??
            findTask(queue.tasks, record.taskRef).task;
        if (!task) {
            await this.state.writeActive({ ...record, phase: 'failed', failure: `The task source ${record.sourcePath} moved or disappeared during execution.` });
            return;
        }
        const route = await resolveRoute({ ...task, routing: { ...task.routing, agent: task.routing.agent ?? record.routing.agent, harness: task.routing.harness ?? record.routing.harness } }, {
            mode: this.options.mode === 'run' ? 'run' : 'start',
            catalog: this.catalog,
            pool: this.pool,
            settings: this.settings,
            runSelection: this.options.run?.selection,
        });
        if (route.kind !== 'routable') {
            const reason = `"${record.taskTitle}" cannot resume: ${route.reason}`;
            if (this.options.mode === 'run') {
                this.finishedSummary = { completed: this.completed, failed: this.failed + 1, pendingRequests: this.requestViews.length, outcome: 'failed', message: reason };
                return;
            }
            this.setBlocker({ kind: 'harness', title: 'Interrupted work cannot resume', reason, action: route.kind === 'blocked' ? route.next : undefined, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
            await this.pool.refresh(this.pool.enabled(), true);
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason, action: route.kind === 'blocked' ? route.next : undefined, skippable: false });
            return;
        }
        this.clearBlocker('harness');
        const item = await this.buildWorkItem(task, route, { resume: record, createdPaths: record.createdPaths.map((path) => resolve(this.options.project.root, path)), slot: record.occurrence ? Date.parse(record.occurrence) : undefined });
        if (item) await this.execute(item);
    }

    /** Keeps a failed task visible with a recovery request and applies the user's decision. */
    private async handleFailedRecord(record: ActiveRecord): Promise<void> {
        let requestId = record.recoveryRequestId;
        let request = requestId ? await this.requests.get(requestId) : undefined;
        if (!request) {
            request = await this.requests.create({
                kind: 'action',
                reason: `"${record.taskTitle}" failed: ${record.failure ?? 'unknown reason'}`,
                question: 'How should ptbk continue? Retry runs the task again with a fresh attempt budget; acknowledging records the failure (TASK STATUS failed) and moves on. Partial changes stay in the working tree.',
                choices: [...RECOVERY_CHOICES],
                origin: { kind: 'recovery', taskRef: record.taskRef, taskTitle: record.taskTitle, agent: record.routing.agent },
                blocking: true,
            });
            requestId = request.id;
            await this.state.writeActive({ ...record, recoveryRequestId: requestId });
            await this.refreshRequests();
        }
        if (request.status === 'pending') {
            this.setBlocker({ kind: 'recovery', title: `"${record.taskTitle}" needs a decision`, reason: record.failure ?? 'The task failed.', action: `ptbk answer ${request.id}` });
            if (this.options.mode === 'run') {
                this.finishRun([]);
                return;
            }
            await this.wait(IDLE_RECHECK_MS, { kind: 'recovery', reason: `"${record.taskTitle}" failed and waits for your decision (${request.id}).`, action: `ptbk answer ${request.id}`, skippable: false });
            return;
        }
        this.clearBlocker('recovery');
        if (request.status === 'answered' && request.answer === RECOVERY_CHOICES[0]) await this.retryRecord(record);
        else await this.acknowledgeRecord(record);
    }

    /** Resets a failed record for a deliberate retry. */
    public async retryRecord(record: ActiveRecord): Promise<void> {
        await this.state.writeActive({ ...record, phase: 'executing', attempt: 0, technicalRetries: 0, completionApplied: false, failure: undefined, recoveryRequestId: undefined, feedback: `A previous run failed: ${record.failure ?? 'unknown'}. Inspect the current state and complete the task.` });
        this.log(`Retrying "${record.taskTitle}".`);
        this.wake();
    }

    /** Records an acknowledged failure in the task source (its own commit) and releases the active slot. */
    public async acknowledgeRecord(record: ActiveRecord): Promise<void> {
        const path = resolve(this.options.project.root, record.sourcePath);
        try {
            const source = await readFile(path, 'utf8');
            const updated = path.endsWith('.book')
                ? setControlCommitment(source, 'TASK STATUS', 'failed')
                : setMarkdownControl(source, record.sectionHash!, '!', `failed ${formatIsoWithOffset(Date.now(), this.timeZone)}: ${(record.failure ?? '').slice(0, 160)}`);
            await writeFile(path, updated);
            if (this.commitMode) await this.commitAuthoring([path], `Mark failed - ${record.taskTitle}`);
        } catch (error) {
            this.log(`Could not mark "${record.taskTitle}" as failed in its source: ${errorMessage(error)}`, 'warning');
        }
        await this.state.clearActive();
        this.log(`Acknowledged the failure of "${record.taskTitle}". Partial changes (if any) remain uncommitted for review.`, 'warning');
    }

    // ── Maintenance ──────────────────────────────────────────────────────────

    /** Checks and updates enabled harnesses at a safe boundary (bounded interval). */
    private async maintainHarnesses(): Promise<void> {
        if (setting<string>(this.settings, 'service.harnessUpdates') !== 'auto') return;
        if (Date.now() - this.lastHarnessMaintenance < HARNESS_MAINTENANCE_INTERVAL_MS) return;
        this.lastHarnessMaintenance = Date.now();
        for (const id of this.pool.enabled()) {
            const plugin = this.pool.plugin(id);
            const inspection = this.pool.inspection(id);
            if (!plugin || !inspection?.installed) continue;
            const check = await checkHarnessVersion(plugin, inspection, this.pool.context(id));
            if (check.outcome !== 'outdated') {
                if (check.outcome === 'unknown') this.log(`${plugin.displayName} update check: ${check.diagnostic}`);
                continue;
            }
            this.log(`Updating ${plugin.displayName} ${check.current} → ${check.latest} (shared global installation).`);
            const result = await updateHarness(plugin, inspection, this.pool.context(id));
            this.log(`${plugin.displayName}: ${result.diagnostic}`, result.outcome === 'failed' ? 'warning' : 'info');
            this.pool.invalidate(id);
            await this.pool.refresh([id], true);
        }
    }

    /** Whether the pre-work check already passed in this process. */
    private checkedBefore = false;

    /**
     * Runs the optional pre-work check once (`--check-before`); failures block (fail) or become a repair task (fix).
     */
    private async checkBeforeWork(): Promise<boolean> {
        const mode = setting<string>(this.settings, 'execution.checkBefore');
        if (mode === 'no' || this.checkedBefore || this.options.mode === 'run') return true;
        const check = setting<string | null | undefined>(this.settings, 'execution.check');
        if (!check) return true;
        this.log(`Running the pre-work check: ${check}`);
        const result = await runCheck(this.options.project.root, check, { env: this.options.env });
        if (result.passed) {
            this.checkedBefore = true;
            return true;
        }
        if (mode === 'yes-and-fail') {
            const reason = `The project check \`${check}\` fails before work (exit ${String(result.exitCode)}).`;
            this.setBlocker({ kind: 'setup', title: 'Pre-work check fails', reason, action: 'Fix the project (or run `ptbk fix`); ptbk rechecks automatically.', recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason, skippable: false });
            return false;
        }
        const path = await newTaskPath(this.tasksDirectory, 'repair failing project check', Date.now(), this.timeZone);
        const agent = setting<string>(this.settings, 'routing.defaultAgent');
        await writeFile(path, renderTaskBook({ title: 'Repair the failing project check', description: `The project check \`${check}\` fails before work. Fix the underlying defects without weakening validation.\n\n\`\`\`\n${result.output.slice(-6000)}\n\`\`\``, commitments: [`TASK AGENT {${agent}}`, 'TASK ORIGIN maintenance: failing project check'] }), { flag: 'wx' });
        const outcome = await this.executeMaintenance(path, check);
        this.checkedBefore = outcome.kind === 'completed';
        return this.checkedBefore;
    }

    /** Pulls with rebase (no automatic stash) at a safe boundary; failures leave synchronization pending. */
    private async pull(): Promise<void> {
        if (!this.repositoryRoot) return;
        if ((await this.unrelatedChanges()).length) {
            this.logOnce('Automatic pull skipped: the working tree has uncommitted changes.', 'warning');
            return;
        }
        this.phase = 'synchronizing';
        const result = await this.gitMutex.run(() => runGit(this.repositoryRoot!, ['pull', '--rebase', '--no-autostash', '--quiet'], { timeoutMs: 120_000 }));
        if (result.exitCode !== 0) {
            await this.gitMutex.run(() => runGit(this.repositoryRoot!, ['rebase', '--abort']));
            this.log(`Automatic pull failed (local work continues; synchronization pending): ${result.stderr.trim().split('\n').slice(-2).join(' ')}`, 'warning');
        }
    }

    /** Pushes completed work when automatic push is enabled (failures stay local and pending). */
    private async push(): Promise<void> {
        if (!this.repositoryRoot) return;
        this.phase = 'synchronizing';
        const result = await this.gitMutex.run(() => runGit(this.repositoryRoot!, ['push'], { timeoutMs: 120_000 }));
        if (result.exitCode === 0) this.log('Pushed completed work.');
        else this.log(`Push failed; the commit stays local and synchronization is pending: ${result.stderr.trim().split('\n').slice(-2).join(' ')}`, 'warning');
    }

    // ── Views ────────────────────────────────────────────────────────────────

    /** Adds or replaces a blocker. */
    private setBlocker(blocker: BlockerView): void {
        this.blockers = [...this.blockers.filter((item) => item.kind !== blocker.kind), blocker];
        this.touch();
    }

    /** Removes blockers of a kind. */
    private clearBlocker(kind: BlockerView['kind']): void {
        const before = this.blockers.length;
        this.blockers = this.blockers.filter((item) => item.kind !== kind);
        if (before !== this.blockers.length) this.touch();
    }

    /** Records an actionable error. */
    private addError(error: ErrorView): void {
        this.errors.push(error);
        if (this.errors.length > 50) this.errors.splice(0, this.errors.length - 50);
        this.touch();
    }

    /** Logs a supervisor error with diagnostics. */
    private async reportError(phase: string, error: unknown, task?: string): Promise<void> {
        const trace = await recordDiagnostic(this.options.project, { phase, message: errorMessage(error), details: error instanceof PtbkError ? error.details : { stack: (error as Error)?.stack } });
        const next = error instanceof PtbkError ? error.details.next?.[0] : undefined;
        this.addError({ at: new Date().toISOString(), summary: errorMessage(error), phase, task, trace, next });
        this.log(`${phase}: ${errorMessage(error)}`, 'error');
    }

    /** Logs a message once per process. */
    private readonly logged = new Set<string>();

    /** Logs once. */
    private logOnce(text: string, level: ActivityView['level']): void {
        if (this.logged.has(text)) return;
        this.logged.add(text);
        this.log(text, level);
    }

    /** Next known scheduled time (for summaries). */
    public get nextScheduledTime(): number | undefined {
        return this.nextKnownTime;
    }

    /**
     * Executes one engine-created maintenance task (e.g. `ptbk fix`) through the common lifecycle.
     */
    public async executeMaintenance(taskPath: string, check: string): Promise<ExecutionOutcome> {
        await this.refreshContext();
        const source = await readFile(taskPath, 'utf8');
        const task = readTaskBook({ source, path: taskPath, relativePath: toProjectRelative(this.options.project.root, taskPath), order: 0, timeZone: this.timeZone });
        if (!task) throw new PtbkError('The maintenance task could not be read.', { kind: 'internal' });
        const route = await this.route(task);
        if (route.kind !== 'routable') throw new PtbkError(`The maintenance task cannot run: ${route.reason}`, { kind: 'setup', next: route.kind === 'blocked' && route.next ? [route.next] : [] });
        return await this.execute({ task, route, kind: 'maintenance', createdPaths: [taskPath], learning: false, check });
    }

    /** Applies a recovery action from `ptbk recover` through the running process. */
    public async recover(taskRef: string, action: 'resume' | 'retry' | 'acknowledge'): Promise<string> {
        const record = await this.state.readActive();
        if (!record || (record.taskRef !== taskRef && record.sourcePath !== taskRef.replace(/\\/g, '/'))) {
            const blockers = await this.state.readBlockers();
            if (blockers[taskRef]) {
                await this.state.setBlocker(taskRef, undefined);
                this.wake();
                return `Cleared the recovery blocker of ${taskRef}.`;
            }
            throw new PtbkError(`No interrupted or failed work is recorded for ${taskRef}.`, { kind: 'not-found' });
        }
        if (action === 'acknowledge') {
            if (record.recoveryRequestId) await this.requests.resolve(record.recoveryRequestId, { status: 'answered', answer: RECOVERY_CHOICES[1], via: 'cli' }).catch(() => undefined);
            await this.acknowledgeRecord(record);
        } else if (action === 'retry') {
            if (record.recoveryRequestId) await this.requests.resolve(record.recoveryRequestId, { status: 'answered', answer: RECOVERY_CHOICES[0], via: 'cli' }).catch(() => undefined);
            await this.retryRecord(record);
        } else {
            if (record.phase === 'failed') throw new PtbkError('A failed task cannot resume; use --action retry or --action acknowledge.', { kind: 'usage' });
            this.wake();
        }
        await this.refreshRequests();
        this.wake();
        return `${action} applied to ${record.taskRef}.`;
    }
}

/**
 * Converts a history record into a result view.
 */
function resultView(result: ResultRecord): ResultView {
    return {
        ref: result.taskRef,
        title: result.title,
        outcome: result.outcome,
        agent: result.agent,
        harness: result.harness,
        model: result.model,
        commit: result.commit,
        summary: result.summary,
        endedAt: result.endedAt,
        attempts: result.attempts,
    };
}

/**
 * Human representation of a setting value.
 */
function formatSettingValue(value: unknown): string {
    if (value === undefined) return '(not set)';
    if (value === null) return 'null (disabled)';
    return typeof value === 'string' ? value : JSON.stringify(value);
}

