import { watch, type FSWatcher } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { formatDuration } from '../common/duration.js';
import { confinePath, ensureDirectory, pathExists, toProjectRelative } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { creationTimestamp, formatIsoWithOffset, formatShortTime } from '../common/time.js';
import { ENGINE_VERSION, detectInstallation } from '../common/version.js';
import { setControlCommitment } from '../book/edit.js';
import { formatAgentReference, normalizeAgentName, parseReferenceValue, referenceName, toReference } from '../book/references.js';
import { isCheckPlaceholder, loadSettings, setting, SETTING_SPECS, serializeSettingValue, updateProjectConfig, type BrowserOverrides, type EffectiveSettings, type LoadedSettings } from '../project/config.js';
import { AgentCatalog, learningPolicyOf, resolveEffectiveAgent, validateAgents } from '../project/agents.js';
import { readBookSource, type BookSource } from '../project/book-sources.js';
import { validateAttachments } from '../chats/store.js';
import { materializeAttachments } from '../ui/attachments.js';
import type { TaskInventoryItem } from '../tasks/views.js';
import { commitPaths, git, inspectGit, stageableFiles } from '../project/git.js';
import { ensureTraceIgnoreRules, traceIgnoreRulesMatch } from '../project/setup.js';
import { runCheck } from '../project/checks.js';
import { newTaskPath, renderTaskBook } from '../tasks/authoring.js';
import { distinctName, generatedName, traceDirectoryOf } from '../tasks/identity.js';
import { BookIndex } from '../project/books.js';
import { parseBook } from '../book/parse.js';
import { renderDeclaration } from '../book/write.js';
import { ChatStore, type ChatSummary, type ChatWrite } from '../chats/store.js';
import { isHumanFacing } from '../chats/chat-book.js';
import { taskChats } from '../chats/task-chats.js';
import { appendUserMessage, chatAgentChoices, chatDetail, createUserChat, type ChatAgentChoice, type ChatDetail } from '../chats/service.js';
import { replyInChat } from '../chats/conversation.js';
import { migrateLegacyRequests } from '../chats/migration.js';
import type { Project } from '../project/workspace.js';
import { checkHarnessVersion, updateHarness } from '../harness/maintenance.js';
import { HARNESS_PLUGINS, harnessName } from '../harness/registry.js';
import { readTaskBook } from '../tasks/book-task.js';
import { evaluateQueue, isUnfinished, selectNext, type EvaluatedTask, type RouteCheck } from '../tasks/eligibility.js';
import { setMarkdownControl } from '../tasks/markdown.js';
import { isRecurring, nameKey, type Task } from '../tasks/model.js';
import { describePriority } from '../tasks/priority.js';
import { findTask, readTaskQueue } from '../tasks/sources.js';
import { agentView, type BadgeActivity } from '../ui/badges.js';
import type { BridgeTool } from './bridge.js';
import { HANDOVER_ATTEMPTS, captureSnapshot, changedPaths, executeWork, type ExecutionEnvironment, type ExecutionOutcome, type WorkItem } from './executor.js';
import {
    applyAssignment,
    assignmentPrompt,
    createAssignmentTask,
    createChatLearningTask,
    createDiscoveryTask,
    createRepairTask,
    routerAgent,
    discoveryPrompt,
    learningPrompt,
    originTarget,
    validateAssignment,
    workKindOf,
} from './generated.js';
import { HarnessPool } from './harnesses.js';
import { domainAttention } from './attention.js';
import { HealthSubEngine, type CachePreview, type SwapPlan } from './health.js';
import { readOperatorIntent, saveOperatorIntent } from './operator-intent.js';
import { SyncCoordinator, type SyncOutcome } from './sync.js';
import { maintainProjectConfiguration } from '../project/configuration.js';
import { applyToolOperation, type ToolOperationOutcome, type ToolOperationRequest } from '../tools/operations.js';
import { inspectBrowserTool, toolInventory, type BrowserReadiness } from '../tools/readiness.js';
import type { TaskChats } from '../chats/task-chats.js';
import type { ComposedSegment } from '../ui/composer.js';
import { completeWithDefaults, resolveRoute, routeWithDefaults, type RouteResolution, type RoutingContext } from './routing.js';
import { describeModel, formatModelContent, formatModelRow, intersectModels, UNCONSTRAINED } from '../book/model.js';
import { harnessVariantOf } from '../tools/model.js';
import type {
    ActivityView,
    AgentView,
    BlockerView,
    BrowserDetailView,
    ConnectionView,
    CurrentWorkView,
    ErrorView,
    ExecutionContextView,
    ExecutionDetailView,
    PauseReasonView,
    Phase,
    QueueItemView,
    ResultView,
    ServiceSnapshot,
    ToolsView,
    WaitView,
} from './snapshot.js';
import { StateStore, isolationBranch, parkedReadiness, type ActiveRecord, type ResultRecord, type RoutingSelection } from './state.js';
import { TaskTrace } from './task-trace.js';
import { recordDiagnostic } from './traces.js';
import { finishWorktree, integrateWorktree, isIntegrated, prepareWorktree } from './isolation.js';
import { shortHash, shortId } from '../common/ids.js';

/**
 * Process placement of the agenda: the ongoing engine as a daemon or in a foreground terminal, or an in-process
 * host of one explicit finite maintenance operation (`ptbk fix`, `ptbk recover`), never a queue workflow.
 *
 * @private agenda supervisor
 */
export type AgendaMode = 'daemon' | 'foreground' | 'maintenance';

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
    /** CLI harness restriction (variants or named instances). */
    readonly cliHarnesses?: readonly string[];
    /** Temporary browser overrides of one named browser tool. */
    readonly cliBrowser?: BrowserOverrides;
    /** `--tasks` (absolute), overriding `paths.tasks`. */
    readonly tasksDirectory?: string;
    /** Persistence state for status views. */
    readonly persistent: boolean | null;
    /** Explanation of persistence state. */
    readonly persistenceNote?: string;
    /** Plain event stream (raw/noninteractive output). */
    readonly onEvent?: (text: string, level: 'info' | 'warning' | 'error') => void;
    /** Additional tools for agents (project browser); `trace`/`attempt` identify the evidence they belong to. */
    readonly extraTools?: (task: Task, context: { readonly chats: TaskChats; readonly agent: string; readonly onUserChat: (chat: { chat: string; awaited: number }) => void; readonly trace: TaskTrace; readonly attempt: string }) => BridgeTool[];
    /** Answers a user message in a human-led chat (an agent turn outside the task queue). */
    readonly chatReplies?: boolean;
    /** Finalizes task evidence produced outside the harness (browser video) before the result commit. */
    readonly finalizeEvidence?: (trace: TaskTrace) => Promise<void>;
    /** Releases per-task resources after every executed piece of work, whatever its outcome. */
    readonly afterWork?: () => Promise<void>;
    /** Named browser tools owned by the service: inspections for the dashboard pages and the names held by work. */
    readonly browsers?: { readonly primary: () => BrowserDetailView | undefined; readonly all: () => BrowserDetailView[]; readonly inUse: () => string[] };
};

/**
 * Outcome of saving an edited Book source.
 *
 * @private agenda supervisor
 */
export type BookSaveOutcome = {
    readonly path: string;
    /** The file was written (an unchanged source creates no commit). */
    readonly saved: boolean;
    readonly unchanged?: boolean;
    readonly commit?: string;
    /** Revision of the saved source (the base of the next save). */
    readonly revision: string;
    /** Detected problems (warnings; saving is never refused for them). */
    readonly diagnostics: BookSource['diagnostics'];
    /** Whether an ordinary Fixer repair task was created for the problems. */
    readonly repair?: boolean;
};

/**
 * Summary returned when the agenda ends.
 *
 * @private agenda supervisor
 */
export type AgendaSummary = {
    readonly completed: number;
    readonly failed: number;
    readonly waitingChats: number;
    /** `restart`: the owner shut down for a restart and starts exactly one replacement with the same configuration. */
    readonly outcome: 'stopped' | 'restart';
    readonly message: string;
    readonly nextTime?: number;
};

/**
 * A pending lifecycle request applied once the current task settles (draining).
 *
 * @private agenda supervisor
 */
export type LifecycleIntent = 'pause' | 'stop' | 'restart';

/**
 * Outcome of a lifecycle operation, shared by CLI, terminal, browser and API.
 *
 * `accepted` means the request is pending (draining) or applied; `completed` that its effect already holds.
 *
 * @private agenda supervisor
 */
export type LifecycleOutcome = {
    readonly action: string;
    readonly applied: boolean;
    readonly completed: boolean;
    readonly state: ServiceSnapshot['service']['state'];
    readonly outcome: string;
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
 * Recheck interval while the running engine waits for usable tools (file changes and tool commands wake it sooner).
 */
const TOOLS_RECHECK_MS = 2 * 60_000;

/**
 * Longest idle sleep before reevaluating sources and time.
 */
const IDLE_RECHECK_MS = 10 * 60_000;

/**
 * Interval of automatic harness update checks.
 */
const HARNESS_MAINTENANCE_INTERVAL_MS = 12 * 3_600_000;

/**
 * Shortest interval between two Fixer health checks (also after diagnostics change).
 */
const HEALTH_MIN_INTERVAL_MS = 3_600_000;

/**
 * Interval after which unchanged, still-unresolved diagnostics are checked again.
 */
const HEALTH_RECHECK_INTERVAL_MS = 24 * 3_600_000;

/**
 * Origin of Fixer's health-check tasks.
 */
const HEALTH_ORIGIN = 'maintenance: project health';

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
    /** Observed outcome after the agenda ended (not a live state). */
    private exitState?: 'stopped';
    private current?: CurrentWorkView;
    /** Effective routing of the current execution and its consultation contexts (for the execution panel). */
    private currentContext?: { readonly selection: RoutingSelection; readonly harnessVersion?: string; readonly source: string; consultations: ExecutionContextView[] };
    private waitView?: WaitView;
    private queueView: QueueItemView[] = [];
    private queueTotal = 0;
    private readonly activity: ActivityView[] = [];
    private readonly errors: ErrorView[] = [];
    private blockers: BlockerView[] = [];
    private chatSummaries: ChatSummary[] = [];
    private recentResults: ResultView[] = [];
    private completed = 0;
    private failed = 0;
    /** Isolated results of this process waiting on their temporary branch for integration. */
    private pendingIntegrations = 0;
    /**
     * The ordinary manual pause reason (since when): set by Pause, removed by Resume. Pause is composed from this and the
     * Health sub-engine's reasons; scheduling continues only when no reason remains.
     */
    private manualPauseSince?: string;
    /** A pause became effective while a task was still draining (logged once it settles). */
    private pauseDraining = false;
    /** Pending stop/restart applied once the current task settles. */
    private intent?: Exclude<LifecycleIntent, 'pause'>;
    /** When the pending request was accepted (ISO). */
    private intentSince?: string;
    /** Revision of the lifecycle decision; a confirmation made against an older revision is stale. */
    private intentRevision = 0;
    /** Irreversible shutdown has begun (cancellation is too late). */
    private shutdown?: 'stop' | 'restart' | 'force';
    /** Whether shutdown was requested by the operating system (not an intentional user stop). */
    private shutdownBySignal = false;
    /** A task owns execution right now (the claim boundary of pause/stop). */
    private executing = false;
    private ownedWork = new AbortController();
    private waiter?: { readonly skippable: boolean; readonly resolve: (reason: 'elapsed' | 'skipped' | 'cancelled' | 'woken') => void };
    private readonly runtimeOverrides: Record<string, unknown> = {};
    private settings!: LoadedSettings;
    private catalog!: AgentCatalog;
    private pool!: HarnessPool;
    private readonly state: StateStore;
    private chatStore?: ChatStore;
    private readonly gitMutex = new Mutex();
    private readonly authoredPaths = new Set<string>();
    private repositoryRoot?: string;
    private connection: ConnectionView = { local: { state: 'disabled' }, remote: { state: 'disabled' } };
    private readonly startedAt = new Date().toISOString();
    private lastHarnessMaintenance = 0;
    private readonly watchers: FSWatcher[] = [];
    private wakeTimer?: NodeJS.Timeout;
    private configTimer?: NodeJS.Timeout;
    private lastPersistenceRetry = 0;
    private nextKnownTime?: number;
    /** Readiness of the enabled browser tools (inspected without launching them). */
    private browserReadiness = new Map<string, BrowserReadiness>();
    /** The shared tool inventory as of the last refresh. */
    private tools: ToolsView = { items: [], problems: [] };
    /** Required configuration work that could not be persisted yet (why no new work starts). */
    private configurationPending?: string;
    /** Opt-in Git synchronization (one coordinator for timer, boundaries and manual cycles). */
    private readonly sync: SyncCoordinator;
    /** The engine's one Health sub-engine (host resources, health incidents and their pause reasons). */
    private readonly health?: HealthSubEngine;

    public constructor(private readonly options: AgendaOptions) {
        this.state = new StateStore(options.project.runtime.state);
        this.sync = new SyncCoordinator({
            repositoryRoot: () => this.repositoryRoot,
            env: options.env,
            gitLock: (action) => this.gitMutex.run(action),
            enabled: () => Boolean(this.settings && setting<boolean>(this.settings, 'isAutoSync') && this.commitMode),
            integrationBlocker: async (files) => await this.integrationBlocker(files),
            onConflict: async (conflict) => await this.scheduleSyncConflict(conflict),
            onIntegrated: async () => {
                await this.refreshContext();
                this.wake();
            },
            onChange: () => this.touch(),
            log: (text, level) => this.log(text, level),
        });
        // A finite maintenance host is not the ongoing engine and has no Health sub-engine of its own.
        if (options.mode !== 'maintenance') {
            this.health = new HealthSubEngine({
                project: options.project,
                env: options.env,
                limits: () => ({
                    disk: this.settings ? setting<number>(this.settings, 'limit.disk') : 500,
                    memory: this.settings ? setting<number>(this.settings, 'limit.memory') : 512,
                    source: this.settings ? [this.settings.sources['limit.disk'], this.settings.sources['limit.memory']].every((source) => !source || source === 'default') ? 'engine defaults' : 'ptbk.json limit' : 'engine defaults',
                }),
                onChange: () => this.touch(),
                onPauseChange: () => this.pauseReasonsChanged(),
                log: (text, level) => this.log(text, level),
            });
        }
    }

    /** The project's chats (each human-facing message is its own commit unless explicitly uncommitted). */
    public get chats(): ChatStore {
        if (!this.chatStore) {
            this.chatStore = new ChatStore(this.options.project, {
                timeZone: this.settings ? this.timeZone : 'UTC',
                persistence: this.settings && !this.commitMode
                    ? {
                          uncommitted: async (path) => {
                              this.authoredPaths.add(path);
                              await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, path)]: null });
                          },
                      }
                    : { commit: async (paths, subject, trailers) => await this.commitAuthoring(paths, subject, trailers) },
                takenNames: async () => await this.freshTakenNames(),
            });
        }
        return this.chatStore;
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
        return setting<boolean>(this.settings, 'execution.isCommitEnabled');
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
        for (const directory of [project.runtime.state, project.runtime.logs, project.runtime.temporary]) await ensureDirectory(directory);
        // The operator's accepted manual pause (also one still draining) survives crashes and reboots: it holds before
        // any background claim. Health reasons are re-evaluated by the fresh Health sub-engine instead.
        const restored = this.options.mode === 'maintenance' ? undefined : readOperatorIntent(project)?.manualPause;
        if (restored) {
            this.manualPauseSince = restored.since;
            this.log(`Restored the manual pause of ${restored.since}: no background task starts until you resume (ptbk resume).`);
        }
        await this.maintainConfiguration();
        await this.refreshContext(true);
        await this.sync.begin();
        await confinePath(project.root, this.tasksDirectory);
        const results = await this.state.recentResults(200);
        this.recentResults = results.slice(0, 20).map(resultView);
        this.log(`ptbk ${ENGINE_VERSION} ${this.options.mode === 'maintenance' ? 'maintenance host' : 'agenda'} started for ${project.root}${this.commitMode ? '' : ' (explicit no-commit mode)'}`);
        await this.applyTraceIgnoreRules();
        await this.ensureCoreAgents();
        const migrated = await migrateLegacyRequests(project, this.chats, this.state, () => this.catalog.index.names()).catch((error: unknown) => {
            this.log(`Pending requests of an older engine could not be migrated to chats: ${errorMessage(error)}`, 'warning');
            return 0;
        });
        if (migrated) this.log(`Migrated ${migrated} pending request(s) of an older engine into chats waiting for you.`);
        await this.refreshChats();
        if (this.options.mode !== 'maintenance') {
            // User messages written while no service ran (or interrupted replies) still get their agent's reply, once.
            for (const stored of await this.chats.list().catch(() => [])) {
                const last = stored.chat.messages[stored.chat.messages.length - 1];
                if (!isHumanFacing(stored.chat) || last?.senderKey !== 'user' || stored.chat.status === 'resolved') continue;
                // An answer a task waits for resumes the task; a clarifying question in a still-waiting chat gets a reply.
                const awaited = await this.isAwaitedByTask(stored.chat.name);
                if (awaited ? stored.chat.status === 'waiting-for-user' : stored.chat.status === 'open') this.queueChatReply(stored.chat.name);
            }
        }
    }

    /** Whether a task waits for (or was just answered in) this chat: its reply resumes the task instead. */
    private async isAwaitedByTask(name: string): Promise<boolean> {
        const active = await this.state.readActive();
        return [...(await this.state.readParked()), ...(active ? [active] : [])].some((record) => record.waitingChat === name || record.recoveryChat === name);
    }

    /**
     * Materializes required core agents that are missing (e.g. Fixer after an engine upgrade) as one scoped commit;
     * existing core Books are never touched.
     */
    private async ensureCoreAgents(): Promise<void> {
        if (!this.repositoryRoot) return;
        const { ensureCoreAgents } = await import('../project/setup.js');
        // A missing Router is created directly runnable: the first suitable enabled harness and its plugin defaults.
        const created = await ensureCoreAgents(this.options.project.root, setting<string>(this.settings, 'paths.agents'), {
            routerModel: async () => {
                const completed = await completeWithDefaults(UNCONSTRAINED, this.routing, { includeUnusable: true });
                return completed.row ? formatModelRow(completed.row) : undefined;
            },
        });
        // Sources in former syntax are never rewritten automatically: they wait for an explicit `ptbk migrate`.
        const legacy = (this.catalog?.index.all() ?? []).filter((entry) => entry.tier !== 4 && entry.document.legacy && entry.kind === 'invalid');
        if (legacy.length) {
            this.logOnce(
                `${legacy.length} Book(s) use former syntax (a plain name line instead of AGENT/TASK/CHAT <name>) and are not usable until converted: ${legacy
                    .slice(0, 5)
                    .map((entry) => entry.relativePath)
                    .join(', ')}${legacy.length > 5 ? ', …' : ''}. Run \`ptbk migrate\` to convert them.`,
                'warning',
            );
        }
        if (!created.length) return;
        const commit = this.commitMode ? await this.commitAuthoring(created, 'Add required core agents').catch(() => undefined) : undefined;
        if (!this.commitMode) for (const path of created) await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, path)]: null });
        this.log(`Added missing core agent(s): ${created.map((path) => toProjectRelative(this.options.project.root, path)).join(', ')}${commit ? ` (${commit.slice(0, 8)})` : ''}.`);
        await this.refreshContext();
    }

    /**
     * Applies the saved trace policy to the project's `.gitignore` (projects initialized by an older engine), as a
     * scoped configuration commit. A user-edited `.gitignore` is left alone and reported instead.
     */
    private async applyTraceIgnoreRules(): Promise<void> {
        if (!this.repositoryRoot) return;
        const { project } = this.options;
        const file = await loadSettings(project, { env: this.options.env });
        const policy = { commit: setting<boolean>(file, 'traces.isCommitted'), ignoreVideos: setting<boolean>(file, 'traces.isVideoIgnored') };
        if (await traceIgnoreRulesMatch(project.root, policy)) return;
        const gitignore = resolve(project.root, '.gitignore');
        const dirty = await captureSnapshot({ project, repositoryRoot: this.repositoryRoot });
        if (dirty['.gitignore'] !== undefined) {
            this.logOnce('The trace ignore rules in .gitignore do not match ptbk.json "traces"; .gitignore has uncommitted edits, so it was left unchanged (run `ptbk init` to apply them).', 'warning');
            return;
        }
        await ensureTraceIgnoreRules(project.root, policy);
        const commit = this.commitMode ? await this.commitAuthoring([gitignore], 'Apply trace ignore rules').catch(() => undefined) : undefined;
        if (!this.commitMode) await this.state.addOwnedUncommitted({ '.gitignore': null });
        this.log(`Applied the trace policy to .gitignore (${policy.commit ? 'traces committed' : 'traces/ ignored'})${commit ? ` (${commit.slice(0, 8)})` : ''}.`);
    }

    /**
     * Runs until stopped (start) or until the finite queue is done (run).
     */
    public async run(): Promise<AgendaSummary> {
        this.touch();
        this.startWatching();
        // The first health sample precedes the first claim, so a preventive pause applies before any work starts.
        await this.health?.sampleNow();
        this.health?.start();
        try {
            while (!this.shutdown) {
                try {
                    await this.iteration();
                } catch (error) {
                    await this.reportError('supervisor', error);
                    await this.wait(setting<number>(this.settings, 'execution.waitAfterError') || 60_000, { kind: 'error-backoff', reason: `Supervisor error: ${errorMessage(error)}`, skippable: true });
                }
                this.settle();
            }
        } finally {
            this.stopWatching();
        }
        this.exitState = 'stopped';
        this.phase = 'stopped';
        this.current = undefined;
        this.currentContext = undefined;
        this.waitView = undefined;
        this.touch();
        if (this.shutdown === 'restart') {
            return { completed: this.completed, failed: this.failed, waitingChats: this.waitingChats().length, outcome: 'restart', message: 'Shut down for a restart; unfinished work keeps its recovery record.' };
        }
        return {
            completed: this.completed,
            failed: this.failed,
            waitingChats: this.waitingChats().length,
            outcome: 'stopped',
            message: this.shutdown === 'force' ? 'Force-stopped; interrupted work keeps its recovery record.' : 'Stopped on request; unfinished work keeps its recovery record.',
        };
    }

    /** Whether the stop that ended the agenda was an intentional user request (not a restart or an OS signal). */
    public get intentionalStop(): boolean {
        return (this.shutdown === 'stop' || this.shutdown === 'force') && !this.shutdownBySignal;
    }

    // ── Lifecycle controls (shared by CLI, terminal, browser and API) ────────

    /**
     * The live service state: `running`, `pausing` (a pause reason is active while the current task drains), `pause`
     * or `stopping` (draining into exit, including a restart's shutdown phase). After the agenda ended, the observed
     * `stopped`/`finished` outcome.
     */
    public get serviceState(): ServiceSnapshot['service']['state'] {
        if (this.exitState) return this.exitState;
        if (this.shutdown || this.intent) return 'stopping';
        if (this.pauseActive) return this.executing ? 'pausing' : 'pause';
        return 'running';
    }

    /**
     * Every active pause reason: the ordinary manual one and those of the Health sub-engine. They compose; background
     * scheduling continues only when none remains.
     */
    public get pauseReasons(): PauseReasonView[] {
        const manual: PauseReasonView[] = this.manualPauseSince ? [{ id: 'manual', kind: 'manual', owner: 'System', summary: 'Paused by the operator (Pause).', since: this.manualPauseSince, removable: true }] : [];
        return [...manual, ...(this.health?.pauseReasons() ?? [])];
    }

    /** Whether any pause reason blocks new background claims. */
    private get pauseActive(): boolean {
        return Boolean(this.manualPauseSince) || Boolean(this.health?.pauseReasons().length);
    }

    /** Human explanation of why background work is paused (manual and/or health reasons). */
    private pauseExplanation(): string {
        const health = this.health?.pauseReasons() ?? [];
        if (!health.length) return 'Paused: no task starts until you resume (ptbk resume).';
        const summary = health.map((reason) => `${reason.summary} (${reason.severity})`).join('; ');
        return `Paused by Health: ${summary}.${this.manualPauseSince ? ' A manual pause is also active.' : ''} It resumes automatically once resolved${health.some((reason) => reason.severity === 'soft') ? '; a soft incident can be overridden on the Health page' : ''}.`;
    }

    /** The Health sub-engine added or removed a pause reason: re-evaluate scheduling immediately. */
    private pauseReasonsChanged(): void {
        if (this.pauseActive && this.executing) this.pauseDraining = true;
        if (!this.pauseActive) this.pauseDraining = false;
        // A paused wait ends so that a resolved reason resumes (or a new one holds) at once.
        if (!this.executing) this.waiter?.resolve('woken');
        this.touch();
    }

    /**
     * Sets or removes the ordinary manual pause reason and saves it as durable operator intent (a maintenance host keeps
     * it in memory only). A failed save is reported, never hidden: recovery would then miss the latest intent.
     */
    private setManualPause(since: string | undefined): void {
        this.manualPauseSince = since;
        if (this.options.mode === 'maintenance') return;
        try {
            saveOperatorIntent(this.options.project, since);
        } catch (error) {
            this.log(`The ${since ? 'pause' : 'resume'} applies now, but it could not be saved for crash/reboot recovery: ${errorMessage(error)}`, 'warning');
        }
    }

    /** Whether a stop or restart is pending or under way (waits end early; no next task is claimed). */
    private get stopRequested(): boolean {
        return Boolean(this.shutdown) || Boolean(this.intent);
    }

    /** Whether a new task may be claimed now: only while `running`. */
    private get claimable(): boolean {
        return this.serviceState === 'running';
    }

    /** Records a stop/restart decision (new revision) and notifies every client. */
    private decide(intent: Exclude<LifecycleIntent, 'pause'> | undefined, message: string, level: ActivityView['level'] = 'info'): void {
        this.intent = intent;
        this.intentSince = intent ? new Date().toISOString() : undefined;
        this.intentRevision++;
        this.log(message, level);
    }

    /** Builds a lifecycle outcome. */
    private outcome(action: string, applied: boolean, outcome: string): LifecycleOutcome {
        const state = this.serviceState;
        return { action, applied, completed: applied && (state === 'pause' || state === 'running') && !this.intent, state, outcome };
    }

    /**
     * Applies pending intents once no task executes: a draining pause settles into `pause`; stop/restart begin the
     * irreversible orderly shutdown (the run loop then exits and the owner cleans up).
     */
    private settle(): void {
        if (this.executing || this.shutdown) return;
        if (this.intent === 'stop' || this.intent === 'restart') {
            this.shutdown = this.intent;
            this.log(this.intent === 'restart' ? 'Restarting: shutting down so one replacement can start.' : 'Stopping: shutting down.');
            this.waiter?.resolve('cancelled');
        } else if (this.pauseDraining) {
            this.pauseDraining = false;
            if (this.pauseActive) this.log(this.manualPauseSince ? 'Paused: no task runs until you resume.' : 'Paused by Health: no task runs until the health condition is resolved.');
        }
        this.touch();
    }

    /**
     * Adds the ordinary manual pause reason: no new task is claimed; the current task settles first (`pausing`),
     * otherwise the service pauses immediately. Replacing a pending stop/restart requires explicit confirmation
     * against the decision revision the caller saw (`replaceStop` + `revision`).
     */
    public pause(options: { readonly replaceStop?: boolean; readonly revision?: number } = {}): LifecycleOutcome {
        if (this.shutdown) return this.outcome('pause', false, 'Too late: the service is already shutting down.');
        if (this.manualPauseSince && !this.intent) return this.outcome('pause', true, this.executing ? 'Pause is already pending: the current task finishes first.' : 'Already paused.');
        if (this.intent) {
            if (!options.replaceStop) {
                throw new PtbkError(`A ${this.intent} is pending; pausing instead would cancel it.`, {
                    kind: 'conflict',
                    reason: `Decision revision ${this.intentRevision}: ${this.intent} after the current task.`,
                    effect: 'Nothing was changed.',
                    next: ['Confirm replacing the pending shutdown with pause, or run `ptbk resume` (cancels it) and then `ptbk pause`.'],
                    data: { intent: this.intent, revision: this.intentRevision },
                });
            }
            if (options.revision !== undefined && options.revision !== this.intentRevision) {
                throw new PtbkError('The lifecycle decision changed since you confirmed; nothing was replaced.', { kind: 'conflict', next: ['Check the current state (`ptbk status`) and decide again.'] });
            }
            this.decide(undefined, `The pending ${this.intent} was cancelled in favour of pause.`);
        } else {
            this.intentRevision++;
            this.log(this.executing ? 'Pause requested: the current task finishes first, then no task starts until you resume.' : 'Paused: no task runs until you resume.');
        }
        this.setManualPause(new Date().toISOString());
        if (this.executing) this.pauseDraining = true;
        this.settle();
        // An idle wait (or a human wait outside task execution) re-evaluates so the pause holds immediately.
        if (!this.executing) this.waiter?.resolve('woken');
        this.touch();
        return this.outcome('pause', true, this.serviceState === 'pause' ? 'Paused.' : 'Pause pending: the current task finishes first.');
    }

    /**
     * Removes the manual pause reason, or cancels a pending stop/restart (and a restart's planned replacement), without
     * interrupting or replaying the current task. Health pause reasons are never removed here: the service returns to
     * `running` only when no other reason remains.
     */
    public resume(): LifecycleOutcome {
        if (this.shutdown) return this.outcome('resume', false, 'Too late: shutdown has already begun.');
        const remaining = (): string => {
            const health = this.health?.pauseReasons() ?? [];
            return health.length ? ` Health still pauses new work: ${health.map((reason) => reason.summary).join('; ')} (resolves automatically${health.some((reason) => reason.severity === 'soft') ? ', or override the soft incident on the Health page' : ''}).` : '';
        };
        if (this.intent) {
            const cancelled = this.intent;
            this.decide(undefined, `The pending ${cancelled} was cancelled; the service keeps running${this.executing ? ' (the current task continues)' : ''}.`);
            this.setManualPause(undefined);
            this.waiter?.resolve('woken');
            this.touch();
            return this.outcome('resume', true, `Cancelled the pending ${cancelled}.${remaining()}`);
        }
        if (!this.manualPauseSince) {
            if (this.pauseActive) return this.outcome('resume', false, `No manual pause is active.${remaining()}`);
            return this.outcome('resume', true, 'Already running.');
        }
        const pending = this.executing;
        this.setManualPause(undefined);
        this.intentRevision++;
        if (!this.pauseActive) this.pauseDraining = false;
        this.log(this.pauseActive ? `Manual pause removed.${remaining()}` : pending ? 'The pending pause was cancelled; the current task continues.' : 'Resumed.');
        this.waiter?.resolve('woken');
        this.touch();
        if (this.pauseActive) return this.outcome('resume', true, `Manual pause removed; still paused.${remaining()}`);
        return this.outcome('resume', true, pending ? 'Cancelled the pending pause.' : 'Resumed.');
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
     * Requests a graceful stop (`stopping`: the current task settles, then orderly shutdown), a graceful restart (the
     * same drain, then exactly one replacement) or an immediate force stop of owned work. Repeating a request is
     * idempotent; it never escalates to force.
     */
    public requestStop(options: { readonly force?: boolean; readonly restart?: boolean; readonly signal?: boolean } = {}): LifecycleOutcome {
        const action = options.force ? 'force-stop' : options.restart ? 'restart' : 'stop';
        // An OS termination request is not an intentional user stop (unless the user had already asked to stop).
        if (options.signal && !this.intent && !this.shutdown) this.shutdownBySignal = true;
        if (options.force) {
            if (this.shutdown === 'force') return this.outcome(action, true, 'Already force-stopping.');
            const busy = this.executing;
            if (!this.shutdownBySignal) this.setManualPause(undefined);
            this.shutdown = 'force';
            this.intent = 'stop';
            this.intentRevision++;
            this.log(busy ? 'Force stop: interrupting owned work now (its recovery record is kept; nothing is marked done).' : 'Force stop: no task is running; shutting down now.', 'warning');
            this.ownedWork.abort();
            this.waiter?.resolve('cancelled');
            this.touch();
            return this.outcome(action, true, busy ? 'Force-stopping: owned work is interrupted and recoverable.' : 'Stopping now.');
        }
        if (this.shutdown) return this.outcome(action, this.shutdown === (options.restart ? 'restart' : 'stop'), this.shutdown === 'restart' ? 'Already restarting.' : 'Already shutting down.');
        const wanted = options.restart ? 'restart' : 'stop';
        if (this.intent === wanted) return this.outcome(action, true, `${options.restart ? 'Restart' : 'Stop'} is already pending: the current task finishes first.`);
        if (options.restart && this.options.mode === 'maintenance') throw new PtbkError('A finite maintenance operation cannot be restarted.', { kind: 'usage', next: ['Run it again when it has finished.'] });
        const previous = this.intent ?? (this.manualPauseSince && this.executing ? 'pause' : undefined);
        // An intentional stop replaces the manual pause (resume cancels the stop and returns to running, as before). An
        // OS termination request (e.g. a reboot) keeps it, so recovery restores the operator's pause.
        if (!this.shutdownBySignal) this.setManualPause(undefined);
        this.pauseDraining = false;
        this.decide(
            wanted,
            this.executing
                ? `${options.restart ? 'Restart' : 'Stop'} requested${previous ? ` (instead of the pending ${previous})` : ''}: the current task finishes first, then the service ${options.restart ? 'restarts' : 'stops'}.`
                : `${options.restart ? 'Restart' : 'Stop'} requested.`,
        );
        this.settle();
        // Waits between tasks end now; a wait inside the current task ends with a recoverable checkpoint.
        this.waiter?.resolve('cancelled');
        this.touch();
        return this.outcome(action, true, this.shutdown ? (options.restart ? 'Restarting now.' : 'Stopping now.') : `${options.restart ? 'Restart' : 'Stop'} pending: the current task finishes first.`);
    }

    /** Cancels a pending stop/restart that has not taken effect yet (compatibility alias of resume). */
    public cancelStop(): LifecycleOutcome {
        if (!this.intent) return this.outcome('cancel-stop', false, 'No stop is pending.');
        return this.resume();
    }

    /** Lifecycle details for every view: pending intent, its revision and whether work is still draining. */
    private lifecycleView(): ServiceSnapshot['service']['lifecycle'] {
        const pausing = !this.intent && !this.shutdown && this.pauseActive && this.executing;
        return {
            intent: this.shutdown ? (this.shutdown === 'force' ? 'force-stop' : this.shutdown) : (this.intent ?? (pausing ? 'pause' : undefined)),
            since: this.intent ? this.intentSince : pausing ? this.manualPauseSince : undefined,
            revision: this.intentRevision,
            draining: (Boolean(this.intent) || pausing) && this.executing,
            shutdown: Boolean(this.shutdown),
            // A pending manual pause is cancelled by Resume; a pause of Health alone resolves by itself.
            cancellable: !this.shutdown && (Boolean(this.intent) || (pausing && Boolean(this.manualPauseSince))),
            restartable: this.options.mode !== 'maintenance',
        };
    }

    // ── Health (the per-engine Health sub-engine's shared operations) ──────────

    /** Overrides a soft health incident (incident-scoped; hard incidents cannot be overridden). */
    public healthOverride(incident?: string): { readonly applied: boolean; readonly outcome: string } {
        if (!this.health) return { applied: false, outcome: 'This process has no Health sub-engine.' };
        return this.health.override(incident);
    }

    /** Previews cleaning the Promptbook-owned project cache. */
    public async healthCachePreview(): Promise<CachePreview | undefined> {
        return await this.health?.cachePreview();
    }

    /** Cleans the Promptbook-owned project cache (after the operator confirmed the preview). */
    public async healthCleanCache(): Promise<{ readonly applied: boolean; readonly outcome: string }> {
        if (!this.health) return { applied: false, outcome: 'This process has no Health sub-engine.' };
        return await this.health.cleanCache();
    }

    /** How swap can be inspected or added on this host. */
    public async healthSwapPlan(): Promise<SwapPlan | undefined> {
        return await this.health?.swapPlan();
    }

    /** Creates the planned swap file (explicitly approved; never prompts for a password). */
    public async healthApplySwap(): Promise<{ readonly applied: boolean; readonly outcome: string }> {
        if (!this.health) return { applied: false, outcome: 'This process has no Health sub-engine.' };
        return await this.health.applySwap();
    }

    /** Takes a fresh health sample now (Recheck). */
    public async healthRecheck(): Promise<{ readonly applied: boolean; readonly outcome: string }> {
        if (!this.health) return { applied: false, outcome: 'This process has no Health sub-engine.' };
        await this.health.sampleNow();
        return { applied: true, outcome: `Health rechecked: ${this.health.view().summary}.` };
    }

    // ── Chats (shared by terminal, browser, API and `ptbk answer`) ─────────────

    /** Chats whose agent waits for the user. */
    private waitingChats(): ChatSummary[] {
        return this.chatSummaries.filter((chat) => chat.status === 'waiting-for-user' && chat.humanFacing);
    }

    /** Every chat summary (waiting first). */
    public async chatList(): Promise<ChatSummary[]> {
        await this.refreshChats();
        return this.chatSummaries;
    }

    /** One chat with its full messages. */
    public async chatGet(name: string): Promise<ChatDetail> {
        return await chatDetail(this.chats, name);
    }

    /** Agents the user may start a chat with (ordinary first; hidden/core and Expert behind More). */
    public chatAgents(): ChatAgentChoice[] {
        return chatAgentChoices(this.catalog);
    }

    /** Marks a chat as read by this viewer (local runtime state; never an answer and never committed). */
    public async chatRead(name: string): Promise<void> {
        await this.chats.markRead(name);
        await this.refreshChats();
    }

    /**
     * Starts a new user-led chat with one agent (its first message is committed), then lets the agent reply.
     */
    public async chatCreate(agent: string, text: string, options: { readonly name?: string; readonly requestKey?: string; readonly segments?: readonly ComposedSegment[] } = {}): Promise<ChatWrite> {
        // A retried creation (same client request key) returns the chat already prepared, never a second name.
        const previous = options.requestKey ? this.createdChats.get(options.requestKey) : undefined;
        const existing = previous ? await this.chats.find(previous) : undefined;
        if (existing) return existing;
        const written: ChatWrite = await this.chatCreation.run(async () => {
            const again = options.requestKey ? this.createdChats.get(options.requestKey) : undefined;
            const stored = again ? await this.chats.find(again) : undefined;
            return stored ?? (await createUserChat(this.chats, this.catalog, agent, text, options));
        });
        if (options.requestKey) {
            if (this.createdChats.get(options.requestKey) === written.chat.name) return written;
            this.createdChats.set(options.requestKey, written.chat.name);
            if (this.createdChats.size > 500) this.createdChats.delete(this.createdChats.keys().next().value!);
        }
        this.log(`New chat {${written.chat.name}}${written.commit ? ` (${written.commit.slice(0, 8)})` : ''}.`);
        await this.chats.markRead(written.chat.name);
        await this.refreshChats();
        this.queueChatReply(written.chat.name);
        return written;
    }

    /**
     * Appends the user's message to a chat (one commit). A valid answer lets the waiting task resume; any other
     * message is a conversation turn the chat's agent replies to.
     */
    public async chatSend(name: string, text: string, options: { readonly expected?: number; readonly via?: string; readonly segments?: readonly ComposedSegment[] } = {}): Promise<ChatWrite> {
        const { written, needsReply } = await appendUserMessage(this.chats, this.state, name, text, { expected: options.expected, segments: options.segments });
        this.log(`Message in {${written.chat.name}}${options.via ? ` via ${options.via}` : ''}${written.commit ? ` (${written.commit.slice(0, 8)})` : ''}.`);
        await this.refreshChats();
        if (needsReply) this.queueChatReply(written.chat.name);
        this.wake();
        return written;
    }

    /** Chats created per client request key (retries return the same chat). */
    private readonly createdChats = new Map<string, string>();

    /** Serializes chat creation so a retried request cannot race its original. */
    private readonly chatCreation = new Mutex();

    /** Chats queued for an agent reply (one turn at a time, outside the single-task queue). */
    private readonly chatTurns = new Mutex();

    /** Runs the chat agent's reply in the background (read-only; tasks only through ordinary authoring). */
    private queueChatReply(name: string): void {
        if (this.options.chatReplies === false) return;
        void this.chatTurns
            .run(async () => {
                const turn = await replyInChat(
                    {
                        project: this.options.project,
                        settings: this.settings,
                        catalog: this.catalog,
                        pool: this.pool,
                        chats: this.chats,
                        env: this.options.env,
                        createTask: async (input) => await this.createChatTask(input),
                        scheduleLearning: async (input) => await this.scheduleChatLearning(input),
                        establishedExecution: async (chat) => {
                            const active = await this.state.readActive();
                            return [...(active ? [active] : []), ...(await this.state.readParked())].find((record) => record.waitingChat === chat || record.recoveryChat === chat)?.routing;
                        },
                        onActivity: (text) => this.log(text),
                    },
                    name,
                );
                if (turn.error) this.log(`No reply in {${name}}: ${turn.error}`, 'warning');
                else if (turn.reply) {
                    const notes = [
                        ...(turn.consultations?.length ? [`consulted in ${turn.consultations.map((consultation) => `{${consultation}}`).join(', ')}`] : []),
                        ...(turn.createdTasks.length ? [`created ${turn.createdTasks.map((task) => `{${task}}`).join(', ')}`] : []),
                    ];
                    this.log(`Reply in {${turn.reply.chat.name}}${notes.length ? ` (${notes.join('; ')})` : ''}.`);
                }
                await this.refreshChats();
            })
            .catch((error: unknown) => this.log(`The reply in {${name}} failed: ${errorMessage(error)}`, 'warning'));
    }

    /** Creates an ordinary task requested in a chat (own authoring commit, linked to the chat). */
    private async createChatTask(input: { readonly title: string; readonly description: string; readonly agent?: string; readonly priority?: number; readonly chat: string }): Promise<string> {
        if (!input.title) throw new PtbkError('A task needs a name.', { kind: 'usage' });
        const title = generatedName(input.title, { taken: await this.takenNames(), timeZone: this.timeZone });
        const commitments: string[] = [];
        if (input.agent) commitments.push(`TASK AGENT ${toReference(input.agent)}`);
        if (input.priority !== undefined) commitments.push(`TASK PRIORITY ${input.priority}`);
        commitments.push(`TASK ORIGIN chat {${input.chat}}`, `LINK {${input.chat}}`);
        const path = await newTaskPath(this.tasksDirectory, input.title, Date.now(), this.timeZone);
        // The final name (rechecked at publication) is what the chat reports and links.
        const published = await this.addTaskFile(path, renderTaskBook({ title, description: input.description || undefined, commitments }), `Add task - ${title}`, this.commitMode, [title]);
        return published.names[0] ?? title;
    }

    /** Schedules one Teacher task for a chat correction, unless equivalent teaching work is still unresolved. */
    private async scheduleChatLearning(input: { readonly chat: string; readonly agent: string; readonly note: string }): Promise<string | undefined> {
        const learner = await this.catalog.resolve(formatAgentReference(input.agent));
        if (learner.kind !== 'agent' || !learningPolicyOf(learner.definition.document).open) return undefined;
        const chatKey = nameKey(input.chat);
        const pending = (await this.readQueue()).tasks.find((task) => !['done', 'failed', 'retired'].includes(task.status) && workKindOf(task) === 'learning' && parseReferenceValue(originTarget(task) ?? '')?.normalized === chatKey);
        if (pending) return undefined;
        const created = await createChatLearningTask({ tasksDirectory: this.tasksDirectory, chat: input.chat, agent: learner.definition.name, agentPath: learner.definition.relativePath, note: input.note, timeZone: this.timeZone, taken: await this.takenNames() });
        if (this.commitMode) await this.commitAuthoring([created.path], `Add task - ${created.name}`, { 'Task-Name': created.name, 'Chat-Name': input.chat });
        else await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, created.path)]: null });
        this.log(`Scheduled {${created.name}} for Teacher from the chat {${input.chat}}.`);
        this.wake();
        return created.name;
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
    public async addTaskFile(path: string, content: string, summary: string, commit: boolean = this.commitMode, taskNames: readonly string[] = []): Promise<{ path: string; commit?: string; names: string[] }> {
        return await this.publication.run(async () => {
            let absolute = await confinePath(this.options.project.root, path);
            // Recheck at publication: the name (and path) may have been taken since the writer prepared it.
            let text = content;
            let names = [...taskNames];
            const document = parseBook(content);
            if (document.kind === 'task' && document.name) {
                const taken = await this.freshTakenNames();
                if (taken.has(nameKey(document.name))) {
                    const final = distinctName(document.name, taken);
                    const lines = [...document.lines];
                    lines[document.headerLine] = renderDeclaration('task', final);
                    text = `${lines.join(document.newline)}`;
                    names = names.map((name) => (nameKey(name) === nameKey(document.name) ? final : name));
                    summary = summary.split(document.name).join(final);
                }
            }
            for (let attempt = 2; await pathExists(absolute); attempt++) absolute = absolute.replace(/(-\d+)?\.(book|md)$/i, `-${attempt}.$2`);
            this.authoredPaths.add(absolute);
            await ensureDirectory(dirname(absolute));
            await writeFile(absolute, text, { flag: 'wx' });
            let sha: string | undefined;
            if (commit) {
                sha = await this.commitAuthoring([absolute], summary, { 'Task-Name': names });
                // Committed sources are clean again; later edits (e.g. Router routing) belong to the work that makes them.
                this.authoredPaths.delete(absolute);
            } else await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, absolute)]: null });
            this.log(`Added ${toProjectRelative(this.options.project.root, absolute)}${sha ? ` (${sha.slice(0, 8)})` : ' (uncommitted)'}`);
            this.wake();
            return { path: absolute, commit: sha, names };
        });
    }

    /** Serializes publication of new task/chat Books so two writers never publish the same normalized name. */
    private readonly publication = new Mutex();

    /** Normalized names of every Book and queued task right now (fresh, for checks at publication). */
    private async freshTakenNames(): Promise<Set<string>> {
        const index = await BookIndex.load(this.options.project.root, { agents: setting<string>(this.settings, 'paths.agents'), tasks: setting<string>(this.settings, 'paths.tasks') });
        const names = index.names();
        for (const task of (await this.readQueue()).tasks) names.add(task.key);
        return names;
    }

    /** Commits authored paths under the Git lock (with name trailers such as `Task-Name`/`Chat-Name`). */
    private async commitAuthoring(paths: readonly string[], summary: string, trailers: Readonly<Record<string, string | readonly string[] | undefined>> = {}): Promise<string | undefined> {
        if (!this.repositoryRoot) throw new PtbkError('The project is not in a Git working tree.', { kind: 'setup', next: ['Run `ptbk init`.'] });
        // Opt-in synchronization attempts around the operation's own commit (fetch before, publish after).
        await this.sync.request('pre-commit');
        const outcome = await this.gitMutex.run(() =>
            commitPaths({
                projectRoot: this.options.project.root,
                repositoryRoot: this.repositoryRoot!,
                paths,
                subject: summary,
                trailers,
                temporaryDirectory: this.options.project.runtime.temporary,
                env: this.options.env,
            }),
        );
        if (outcome.committed) void this.sync.request('post-commit');
        return outcome.committed ? outcome.sha : undefined;
    }

    /** Policy-eligible trace files of a task (by its source file) for a task-related commit (never ignored evidence). */
    private async traceFiles(sourcePath: string): Promise<string[]> {
        if (!this.commitMode || !setting<boolean>(this.settings, 'traces.isCommitted')) return [];
        return await stageableFiles(this.options.project.root, traceDirectoryOf(sourcePath));
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

    /** Publishes a change of service-owned state (e.g. the project browser) to every view. */
    public notifyChange(): void {
        this.touch();
    }

    /**
     * Effective execution configuration of the current execution, or of the last finished one labelled historical
     * (never presented as currently running).
     */
    private executionView(): ExecutionDetailView | undefined {
        const current = this.current;
        const context = this.currentContext;
        if (current && context) {
            return {
                status: 'active',
                task: { ref: current.taskRef, title: current.taskTitle, source: context.source, trace: current.trace, kind: current.kind },
                agent: { name: current.agent.name, source: context.selection.sources?.agent },
                phase: current.phase,
                attempt: current.attempt || undefined,
                attemptBudget: current.attemptBudget,
                startedAt: current.startedAt,
                contexts: [
                    executionContextView({
                        role: 'task',
                        agent: current.agent.name,
                        harness: current.harness,
                        tool: context.selection.tool,
                        harnessVersion: context.harnessVersion,
                        model: current.model,
                        modelReported: current.modelSource === 'reported',
                        thinkingLevel: current.thinkingLevel,
                        sources: context.selection.sources,
                        state: 'active',
                    }),
                    ...context.consultations,
                ],
            };
        }
        const last = this.recentResults[0];
        if (!last?.harness) return undefined;
        return {
            status: 'historical',
            task: { ref: last.ref, title: last.title, source: last.source, trace: last.trace, kind: last.kind ?? 'task' },
            agent: { name: last.agent ?? 'unknown' },
            startedAt: last.startedAt,
            endedAt: last.endedAt,
            outcome: last.outcome,
            attempt: last.attempts || undefined,
            contexts: [executionContextView({ role: 'task', agent: last.agent ?? 'unknown', harness: last.harness, harnessVersion: last.harnessVersion, model: last.model, modelReported: last.modelReported, thinkingLevel: last.thinkingLevel, state: 'finished' })],
        };
    }

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
        // The complete team inventory: ordinary agents, core roles and the engine-provided Expert.
        const agents: AgentView[] = this.catalog
            ? [
                  ...[...new Map([...this.catalog.ordinary(), ...this.catalog.all().filter((definition) => definition.core)].map((definition) => [definition.normalized, definition])).values()].map((definition) => ({
                      ...agentView(definition.name, activityOf(definition.name)),
                      ...(definition.core ? { role: 'core' as const } : {}),
                  })),
                  { ...agentView('Expert', activityOf('Expert')), role: 'engine' as const },
              ]
            : [];
        if (this.current && !agents.some((agent) => agent.key === this.current!.agent.key)) agents.unshift(this.current.agent);
        const harnesses = this.pool
            ? HARNESS_PLUGINS.map((plugin) => {
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
        const snapshot: ServiceSnapshot = {
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
                lifecycle: this.lifecycleView(),
                pauseReasons: this.pauseReasons,
            },
            phase: this.pauseActive && !this.current && !this.intent && !this.shutdown ? 'paused' : this.phase,
            current: this.current,
            execution: this.executionView(),
            browser: this.options.browsers?.primary(),
            browsers: this.options.browsers?.all(),
            tools: this.settings && this.pool ? toolInventory({ project: this.options.project, settings: this.settings, env: this.options.env, pool: this.pool, browsers: this.browserReadiness, inUse: this.toolsInUse(), retained: this.retainedTools() }) : undefined,
            sync: this.sync.view(),
            health: this.health?.view(),
            configuration: this.settings ? { promptbookVersion: typeof this.settings.interpreted.promptbookVersion === 'string' ? this.settings.interpreted.promptbookVersion : undefined, pending: this.configurationPending } : undefined,
            wait: this.waitView,
            queue: this.queueView,
            queueTotal: this.queueTotal,
            results: { completed: this.completed, failed: this.failed, recent: this.recentResults },
            chats: { waiting: this.waitingChats(), unread: this.chatSummaries.reduce((sum, chat) => sum + chat.unread, 0), total: this.chatSummaries.length, recent: this.chatSummaries.slice(0, 30) },
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
        return { ...snapshot, attention: domainAttention(snapshot) };
    }

    // ── Context ──────────────────────────────────────────────────────────────

    /** Loads the effective settings of this engine (saved configuration plus invocation overrides). */
    private async loadEffectiveSettings(): Promise<Awaited<ReturnType<typeof loadSettings>>> {
        return await loadSettings(this.options.project, { env: this.options.env, cli: this.options.cli, runtime: this.runtimeOverrides, cliHarnesses: this.options.cliHarnesses, cliBrowser: this.options.cliBrowser });
    }

    /**
     * Applies required configuration evolution through the shared coordinator: a committed migration pass when this
     * engine is newer, and deterministic spelling corrections as their own commit. A pass that cannot be persisted
     * (explicit no-commit, someone's uncommitted ptbk.json edits, an older engine, a failed commit) keeps the engine
     * controllable and visibly stops new work instead of using an untracked configuration.
     */
    private async maintainConfiguration(): Promise<void> {
        const commitMode = this.settings ? this.commitMode : this.options.cli['execution.isCommitEnabled'] !== false;
        try {
            const outcome = await maintainProjectConfiguration(this.options.project, { commit: commitMode, env: this.options.env, gitLock: (action) => this.gitMutex.run(action) });
            this.configurationPending = undefined;
            if (outcome.migrated) this.log(`Migrated ptbk.json from ${outcome.migrated.from} to ${outcome.migrated.to}${outcome.migrated.steps.length ? ` (${outcome.migrated.steps.join(', ')})` : ' (version only)'}${outcome.migrated.commit ? ` (${outcome.migrated.commit.slice(0, 8)})` : ''}.`);
            if (outcome.normalized) this.log(`Normalized ptbk.json spelling: ${outcome.normalized.corrections.join('; ')}${outcome.normalized.commit ? ` (${outcome.normalized.commit.slice(0, 8)})` : ''}.`);
            if (outcome.deferred) this.logOnce(outcome.deferred, 'info');
        } catch (error) {
            this.configurationPending = errorMessage(error);
            const next = error instanceof PtbkError ? error.details.next?.[0] : undefined;
            this.setBlocker({ kind: 'configuration', title: 'Configuration update required', reason: `${errorMessage(error)}${error instanceof PtbkError && error.details.reason ? ` ${error.details.reason}` : ''}`, action: next ?? 'Fix ptbk.json.', recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
            this.logOnce(`Configuration update required: ${errorMessage(error)}`, 'warning');
        }
    }

    /** Names of tools held by active work (the task's harness instance, active consultations, acquired browsers). */
    private toolsInUse(): Set<string> {
        const names = new Set<string>(this.options.browsers?.inUse() ?? []);
        if (this.current && this.currentContext?.selection.tool) names.add(this.currentContext.selection.tool);
        for (const consultation of this.currentContext?.consultations ?? []) if (consultation.state === 'active' && consultation.harness.tool) names.add(consultation.harness.tool);
        return names;
    }

    /** Tools whose acquired old configuration active work still uses (changed, disabled or removed meanwhile). */
    private retainedTools(): Set<string> {
        const retained = new Set((this.options.browsers?.all() ?? []).filter((browser) => browser.retained && browser.inUse).map((browser) => browser.name));
        const tool = this.current ? this.currentContext?.selection.tool : undefined;
        if (tool && !this.settings.tools.some((record) => record.name === tool && record.isEnabled)) retained.add(tool);
        return retained;
    }

    /**
     * Re-reads the tool inventory and `.env`, reinspecting changed and new instances (no browser launch, no model
     * call). Runs before every task, while idle or waiting, and when ptbk.json/.env change during active work: a
     * new usable tool can serve the current task at its next selection.
     */
    private async refreshTools(force = false): Promise<void> {
        if (!this.pool) this.pool = new HarnessPool(this.options.project.root, this.settings, this.options.env);
        else this.pool.updateSettings(this.settings);
        await this.pool.refresh(this.pool.instances().map((tool) => tool.name), force);
        const browsers = new Map<string, BrowserReadiness>();
        for (const tool of this.settings.tools) if (tool.type === 'BROWSER' && tool.isEnabled) browsers.set(tool.name, await inspectBrowserTool(this.options.project, tool, this.options.env));
        this.browserReadiness = browsers;
        this.tools = toolInventory({ project: this.options.project, settings: this.settings, env: this.options.env, pool: this.pool, browsers, inUse: this.toolsInUse(), retained: this.retainedTools() });
        if (!this.tools.waiting) this.clearBlocker('tools');
        this.touch();
    }

    /** Live refresh after an external change of ptbk.json or .env (another terminal, manual edit, synchronization). */
    private async refreshLive(): Promise<void> {
        try {
            this.settings = await this.loadEffectiveSettings();
            await this.refreshTools();
        } catch (error) {
            this.logOnce(`Configuration reload failed: ${errorMessage(error)}`, 'warning');
        }
    }

    /** Reloads settings, agents, repository facts, tool readiness and configuration compatibility. */
    private async refreshContext(initial = false): Promise<void> {
        let loaded = await this.loadEffectiveSettings();
        if (!initial && (loaded.migration.kind === 'migrate' || (loaded.corrections.length && !this.configurationPending))) {
            await this.maintainConfiguration();
            loaded = await this.loadEffectiveSettings();
        }
        this.settings = loaded;
        this.catalog = await AgentCatalog.load(this.options.project.root, setting<string>(loaded, 'paths.agents'), setting<string>(loaded, 'paths.tasks'));
        await this.refreshTools(initial || this.waitView?.kind === 'tools');
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
        // Tool records with problems only make those tools unusable (Fixer repairs them); other errors stop new work.
        const configErrors = loaded.diagnostics.filter((diagnostic) => diagnostic.severity === 'error' && !diagnostic.location.includes('tools') && !diagnostic.location.startsWith('--'));
        if (configErrors.length) {
            blockers.push({ kind: 'configuration', title: 'Invalid configuration', reason: configErrors.map((error) => `${error.location}: ${error.message}`).join('; '), action: loaded.migration.kind === 'older-engine' ? 'Update ptbk, then restart the service.' : 'Fix ptbk.json.' });
        } else if (loaded.migration.kind === 'migrate' && this.configurationPending) {
            blockers.push({ kind: 'configuration', title: 'Configuration migration pending', reason: this.configurationPending, action: 'See the reason; ptbk retries automatically.' });
        }
        this.blockers = [...blockers, ...this.blockers.filter((blocker) => !['workspace', 'configuration'].includes(blocker.kind))];
    }

    /** Reloads chat summaries (waiting-for-user first) into the view. */
    private async refreshChats(): Promise<void> {
        this.chatSummaries = await this.chats.summaries().catch(() => this.chatSummaries);
        this.touch();
    }

    /** Watches task/agent sources and configuration to react quickly to changes. */
    private startWatching(): void {
        const targets = [this.tasksDirectory, resolve(this.options.project.root, setting<string>(this.settings, 'paths.agents')), this.chats.directory, this.options.project.root];
        for (const target of targets) {
            try {
                const watcher = watch(target, { recursive: target !== this.options.project.root }, (_event, file) => {
                    const configuration = target === this.options.project.root;
                    if (configuration && file !== 'ptbk.json' && file !== '.env') return;
                    clearTimeout(configuration ? this.configTimer : this.wakeTimer);
                    const timer = setTimeout(() => {
                        // Tools and credentials apply live, also to the task running now (at its next selection).
                        if (configuration) void this.refreshLive().then(() => this.wake());
                        else {
                            void this.refreshChats();
                            this.wake();
                        }
                    }, 750);
                    if (configuration) this.configTimer = timer;
                    else this.wakeTimer = timer;
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
        clearTimeout(this.configTimer);
        this.sync.end();
        this.health?.stop();
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
        this.settle();
        if (this.shutdown) return;
        if (this.pauseActive) {
            await this.wait(Infinity, { kind: 'paused', reason: this.pauseExplanation(), skippable: false });
            return;
        }
        this.phase = 'evaluating';
        await this.refreshContext();
        await this.refreshChats();
        if (this.blockers.some((blocker) => blocker.kind === 'workspace' || blocker.kind === 'configuration')) {
            const blocker = this.blockers.find((item) => item.kind === 'workspace' || item.kind === 'configuration')!;
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason: `${blocker.title}: ${blocker.reason}`, action: blocker.action, skippable: false });
            return;
        }
        await this.maintainHarnesses();
        const active = await this.state.readActive();
        if (active) {
            await this.continueActive(active);
            return;
        }
        if (await this.resumeParked()) return;
        this.blockers = this.blockers.filter((blocker) => blocker.kind !== 'recovery' && blocker.kind !== 'persistence');
        if (!(await this.checkBeforeWork())) return;
        // Opt-in synchronization before new work: an attempt, never a prerequisite of local progress.
        await this.sync.request('boundary');
        const evaluated = await this.evaluate();
        if (await this.scheduleHealthCheck(evaluated)) return;
        if (await this.scheduleRoutingRepairs(evaluated)) return;
        // While Router cannot run, routing waits (bounded) and its repair or other ready work proceeds.
        const routerProblem = evaluated.some((item) => item.readiness.kind === 'needs-assignment') ? await this.routerProblem() : undefined;
        const next = selectNext(evaluated, Date.now(), { assignable: !routerProblem });
        const waitingForTools = this.tools.waiting;
        // Unfinished work that cannot be routed for lack of tools is a running resource wait (never a plain idle).
        if (waitingForTools && (next || evaluated.some((item) => isUnfinished(item.readiness)))) {
            // A running engine waiting for resources (not a pause or stop): controls, refresh and rechecks stay alive.
            this.setBlocker({ kind: 'tools', title: 'Waiting for tools', reason: waitingForTools.reason, action: waitingForTools.action, recheckAt: new Date(Date.now() + TOOLS_RECHECK_MS).toISOString() });
            await this.wait(TOOLS_RECHECK_MS, { kind: 'tools', reason: `Waiting for tools: ${waitingForTools.reason}`, action: waitingForTools.action, skippable: false });
            return;
        }
        if (next) {
            const dirty = await this.unrelatedChanges();
            const policy = setting<string>(this.settings, 'execution.gitChanges');
            if (dirty.length && policy !== 'ignore') {
                const reason = `Uncommitted changes not owned by ptbk: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ` and ${dirty.length - 5} more` : ''}.`;
                const action = 'Commit or discard them, or restart with `--git-changes ignore` to leave them aside.';
                this.logOnce(`${reason} ${action}`, 'warning');
                this.setBlocker({ kind: 'workspace', title: 'Unrelated uncommitted changes', reason, action, recheckAt: new Date(Date.now() + 60_000).toISOString() });
                await this.wait(60_000, { kind: 'workspace', reason, action, skippable: false });
                return;
            }
            this.clearBlocker('workspace');
            // Lifecycle decisions are serialized with claims: after pause/stop is accepted, no next task starts.
            if (!this.claimable) return;
            await this.startTask(next);
            return;
        }
        if (!evaluated.some((item) => isUnfinished(item.readiness)) && setting<boolean>(this.settings, 'discovery.isEnabled') && !waitingForTools) {
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
              : waitingForTools && !evaluated.some((item) => isUnfinished(item.readiness))
                ? `No unfinished work. Waiting for tools: ${waitingForTools.reason}`
                : (this.idleReason ?? 'No unfinished work.');
        this.phase = 'idle';
        await this.wait(nextTime ? Math.min(nextTime - Date.now(), IDLE_RECHECK_MS) : IDLE_RECHECK_MS, { kind: nextTime ? 'schedule' : 'idle', reason, skippable: false });
    }

    /**
     * Current project health findings Fixer can act on: Book syntax, name collisions and shadowing, unresolved or
     * wrong-kind references, unreadable task sources, chat syntax and configuration problems (no model call).
     */
    private async healthFindings(evaluated: readonly EvaluatedTask[]): Promise<string[]> {
        const findings = new Set<string>();
        for (const diagnostic of this.catalog.index.diagnostics) findings.add(`${diagnostic.severity}: ${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        // Problems of effective agents (inheritance, references, MODEL) and of every project Book's own content.
        for (const diagnostic of await validateAgents(this.catalog)) findings.add(`${diagnostic.severity}: ${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        for (const diagnostic of this.settings.diagnostics.filter((item) => !item.location.startsWith('--') && !item.location.startsWith('environment ›') && !/migration .* is pending/.test(item.message))) {
            findings.add(`${diagnostic.severity}: ${diagnostic.location} — ${diagnostic.message}`);
        }
        for (const problem of (await this.readQueue()).problems) findings.add(`error: ${problem}`);
        for (const { task } of evaluated) {
            for (const diagnostic of task.diagnostics.filter((item) => item.severity === 'error')) findings.add(`error: ${task.source.relativePath}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        }
        for (const stored of await this.chats.list().catch(() => [])) {
            for (const diagnostic of stored.chat.diagnostics.filter((item) => item.severity === 'error')) findings.add(`error: ${stored.relativePath}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        }
        return [...findings].sort();
    }

    /**
     * Schedules one ordinary Fixer task when the project has health findings: after the findings change (at most
     * hourly) or when they stay unresolved for a day. Nothing is scheduled (and no model runs) without findings, while
     * Fixer's previous check is unfinished, or when Fixer is unavailable. Returns whether a task was created.
     */
    private async scheduleHealthCheck(evaluated: readonly EvaluatedTask[], options: { readonly explicit?: boolean } = {}): Promise<boolean> {
        // An explicit save with detected problems schedules the repair at once, also while paused (it then waits).
        if (!this.claimable && !options.explicit) return false;
        const fixer = await this.catalog.resolve('@Fixer');
        if (fixer.kind !== 'agent') return false;
        if (evaluated.some((item) => item.task.origin === HEALTH_ORIGIN && isUnfinished(item.readiness))) return false;
        const findings = await this.healthFindings(evaluated);
        if (!findings.length) return false;
        const fingerprint = shortHash(findings.join('\n'), 16);
        const health = await this.state.readHealth();
        const since = health.scheduledAt ? Date.now() - Date.parse(health.scheduledAt) : Number.POSITIVE_INFINITY;
        if (health.fingerprint === fingerprint && (options.explicit || since < HEALTH_RECHECK_INTERVAL_MS)) return false;
        if (since < HEALTH_MIN_INTERVAL_MS && !options.explicit) return false;
        const title = generatedName('Project health check', { taken: await this.takenNames(), timeZone: this.timeZone });
        const recentFailures = (await this.state.recentResults(50)).filter((result) => result.outcome === 'failed').slice(0, 5);
        const description = [
            'Promptbook found these problems in the project. Diagnose each one (source, impact, confidence) and fix the clear, low-risk ones within your authority; check the result.',
            'For a risky, ambiguous or owner-dependent correction, do not guess: consult your team as your own instructions direct, once and with a specific explanation and options, only when you genuinely need help. Do not rewrite ambiguous definitions or unrelated files. Making no change is valid when nothing is justified.',
            '',
            ...findings.slice(0, 60).map((finding) => `- ${finding}`),
            ...(findings.length > 60 ? [`- … ${findings.length - 60} more (run \`ptbk lint\`)`] : []),
            ...(recentFailures.length ? ['', 'Recent failed tasks (context):', ...recentFailures.map((result) => `- {${result.title}}: ${result.summary.slice(0, 200)}`)] : []),
        ].join('\n');
        const path = await newTaskPath(this.tasksDirectory, 'project health check', Date.now(), this.timeZone);
        await this.addTaskFile(path, renderTaskBook({ title, description, commitments: ['TASK AGENT @Fixer', `TASK ORIGIN ${HEALTH_ORIGIN}`] }), `Add task - ${title}`, this.commitMode, [title]);
        await this.state.writeHealth({ fingerprint, scheduledAt: new Date().toISOString(), task: title });
        this.log(`Fixer will check ${findings.length} project health finding(s) in {${title}}.`);
        return true;
    }

    /**
     * Why Router cannot take assignment work now (its bootstrap problem is reported and repaired), or undefined when
     * it can.
     */
    private async routerProblem(): Promise<string | undefined> {
        const router = await routerAgent(this.catalog);
        if (!router) return 'Router is missing';
        const route = await this.route(readTaskBook({ source: `TASK Routing probe\nTASK AGENT ${formatAgentReference(router.name)}\n`, path: resolve(this.tasksDirectory, '.routing-probe.book'), relativePath: '.routing-probe.book', order: 0, timeZone: this.timeZone })!);
        if (route.kind === 'routable') return undefined;
        await this.routerBootstrapProblem(router.name, route);
        return route.reason;
    }

    /** Explanation of the most recent idle reason (discovery). */
    private idleReason?: string;

    /** Evaluates readiness of every task and updates the queue view. */
    private async evaluate(): Promise<EvaluatedTask[]> {
        const queue = await this.readQueue();
        for (const problem of queue.problems) this.logOnce(problem, 'warning');
        const blockers = await this.state.readBlockers();
        // Checkpointed tasks wait for their person (a chat) until resumed, even once answered (resumption restores them first).
        const { awaitingUser, integrations } = parkedReadiness(await this.state.readParked());
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
                    if (found) assignmentFor.set(found.key, task.title);
                }
            }
        }
        const routingBlocks = new Map(Object.entries(await this.state.readRoutingBlocks()));
        const activations = await this.state.readActivations();
        for (const task of queue.tasks) {
            if (isRecurring(task) && activations[task.key] === undefined) activations[task.key] = await this.state.ensureActivation(task.key, Date.now());
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
            activeKey: active ? (active.taskKey ?? normalizeAgentName(active.taskTitle)) : undefined,
            awaitingUser,
            recovery: new Map([...Object.entries(blockers).map(([key, blocker]) => [key, blocker.reason] as const), ...integrations]),
            uncommittedSources: uncommitted,
            activation: (task) => activations[task.key] ?? Date.now(),
            route,
            assignmentFor,
            routingBlocks,
        });
        this.inventory = evaluated.map(({ task, readiness }) => {
            const resolution = routeCache.get(task.ref);
            return {
                ref: task.ref,
                title: task.title,
                readiness: readiness.kind,
                reason: readiness.reason,
                priority: task.priority.value,
                priorityText: task.priority.raw ? describePriority(task.priority) : undefined,
                agent: resolution?.kind === 'routable' ? resolution.selection.agent : task.routing.agent,
                model: task.routing.model.explicit ? formatModelContent(task.routing.model) : undefined,
                until: readiness.kind === 'waiting-until' ? new Date(readiness.until).toISOString() : readiness.kind === 'needs-assignment' && readiness.ahead?.until ? new Date(readiness.ahead.until).toISOString() : undefined,
                repeat: task.repeatRaw,
                lastDone: task.doneStamps.filter((stamp) => !stamp.startsWith('unknown')).at(-1)?.split(/\s+/)[0],
                doneCount: task.doneStamps.length,
                source: task.source.relativePath,
                origin: task.origin,
            } satisfies TaskInventoryItem;
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
                    harness: resolution?.kind === 'routable' ? resolution.selection.harness : undefined,
                    model: resolution?.kind === 'routable' ? resolution.selection.model : undefined,
                    source: item.task.source.relativePath,
                    until: item.readiness.kind === 'waiting-until' ? new Date(item.readiness.until).toISOString() : undefined,
                    origin: item.task.origin,
                };
            });
        this.touch();
        return evaluated;
    }

    /** The complete task inventory of the last evaluation (every state; views sort it, execution never does). */
    private inventory: TaskInventoryItem[] = [];

    /** The complete task inventory (refreshed when stale, e.g. while the loop waits). */
    public async taskInventory(): Promise<TaskInventoryItem[]> {
        if (!this.inventory.length && this.catalog) await this.evaluate();
        return this.inventory;
    }

    /** A Book's source with its revision and detected problems (read-only). */
    public async bookSource(input: { readonly reference?: string; readonly path?: string }): Promise<BookSource> {
        return await readBookSource(this.options.project.root, this.catalog, input);
    }

    /**
     * Saves an edited Book source: the exact text (attachments become project assets next to it), checked against the
     * revision the editor started from, never over an executing task's source, committed as its own scoped operation.
     * Problematic content is saved with its warnings and handed to ordinary Fixer repair (pending under pause).
     */
    public async bookSave(input: { readonly path: string; readonly text: string; readonly revision: string; readonly segments?: readonly ComposedSegment[] }): Promise<BookSaveOutcome> {
        return await this.publication.run(async () => {
            const current = await readBookSource(this.options.project.root, this.catalog, { path: input.path });
            if (!current.editable) throw new PtbkError(`${current.path} cannot be edited here.`, { kind: 'usage', reason: current.reason });
            if (current.revision !== input.revision) {
                throw new PtbkError(`${current.path} changed since you opened it.`, { kind: 'conflict', effect: 'Nothing was saved; your draft is kept.', next: ['Reload the source, reconcile your draft and save again.'] });
            }
            const active = await this.state.readActive();
            if (active && (active.sourcePath === current.path || active.createdPaths.includes(current.path))) {
                throw new PtbkError(`${current.path} belongs to the executing task "${active.taskTitle}".`, { kind: 'conflict', effect: 'Nothing was saved; your draft is kept.', next: ['Save again after the task has finished.'] });
            }
            const absolute = resolve(this.options.project.root, current.path);
            let text = input.text;
            let assets: string[] = [];
            if (input.segments?.some((segment) => segment.type === 'attachment')) {
                await validateAttachments(input.segments);
                const directory = join(dirname(absolute), 'assets', basename(absolute).replace(/\.book$/i, ''));
                const materialized = await materializeAttachments(input.segments, { directory, link: (name) => relative(dirname(absolute), join(directory, name)).split(sep).join('/') });
                text = materialized.text;
                assets = materialized.files;
            }
            if (text === current.text) return { path: current.path, saved: false, unchanged: true, revision: current.revision, diagnostics: current.diagnostics };
            await writeFile(absolute, text);
            await this.refreshContext();
            const saved = await readBookSource(this.options.project.root, this.catalog, { path: current.path });
            let commit: string | undefined;
            if (this.commitMode) commit = await this.commitAuthoring([absolute, ...assets], `Edit ${saved.kind === 'invalid' ? 'Book' : saved.kind} - ${saved.name || current.path}`, saved.kind === 'task' ? { 'Task-Name': saved.name } : saved.kind === 'chat' ? { 'Chat-Name': saved.name } : {});
            else for (const path of [absolute, ...assets]) await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, path)]: null });
            this.log(`Saved ${current.path}${commit ? ` (${commit.slice(0, 8)})` : ' (uncommitted)'}${saved.diagnostics.length ? ` with ${saved.diagnostics.length} warning(s)` : ''}.`, saved.diagnostics.length ? 'warning' : 'info');
            // Detected problems go to the ordinary, deduplicated Fixer repair (created now, executed when work may run).
            const repair = saved.diagnostics.length ? await this.scheduleHealthCheck(await this.evaluate(), { explicit: true }) : false;
            this.wake();
            return { path: current.path, saved: true, commit, revision: saved.revision, diagnostics: saved.diagnostics, repair };
        });
    }

    /** Normalized names of every Book plus queued tasks (new generated tasks and chats get distinct names). */
    private async takenNames(): Promise<Set<string>> {
        const names = this.catalog.index.names();
        for (const task of (await this.readQueue()).tasks) names.add(task.key);
        return names;
    }

    /** Reads the executable queue with the shared Book index (same-name Books shadow queued copies). */
    private async readQueue(): Promise<Awaited<ReturnType<typeof readTaskQueue>>> {
        return await readTaskQueue({ root: this.options.project.root, tasksDirectory: this.tasksDirectory, explicit: Boolean(this.options.tasksDirectory), timeZone: this.timeZone, index: this.catalog?.index });
    }

    /** The shared routing context of this engine's live catalog, tools and settings. */
    private get routing(): RoutingContext {
        return { catalog: this.catalog, pool: this.pool, settings: this.settings };
    }

    /** Routes a task (no model call). */
    private async route(task: Task): Promise<RouteResolution> {
        return await resolveRoute(task, this.routing);
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
            chats: this.chats,
            takenNames: () => this.catalog.index.names(),
            repositoryRoot: this.repositoryRoot,
            instanceId: this.options.instanceId,
            commit: this.commitMode,
            questionsAllowed: setting<boolean>(this.settings, 'execution.isQuestionsEnabled'),
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
                    } else if (event.type === 'consultation' && this.currentContext) {
                        const consultations = this.currentContext.consultations;
                        if (event.state === 'started') {
                            consultations.push(executionContextView({ role: 'consultation', agent: event.advisor, by: event.by, harness: event.harness, tool: event.tool, model: event.model, state: 'active' }));
                            if (consultations.length > 8) consultations.splice(0, consultations.length - 8);
                        } else {
                            const index = consultations.map((item) => item.agent === event.advisor && item.state === 'active').lastIndexOf(true);
                            if (index >= 0) consultations[index] = { ...consultations[index]!, state: 'finished' };
                        }
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
                finalizeEvidence: this.options.finalizeEvidence,
                beforeCommit: async () => void (await this.sync.request('pre-commit')),
            },
        };
    }

    // ── Starting work ────────────────────────────────────────────────────────

    /** Starts the selected task (or its Router prerequisite). */
    private async startTask(next: ReturnType<typeof selectNext> & object): Promise<void> {
        const task = next.task;
        if (next.readiness.kind === 'needs-assignment') {
            await this.assign(task, next.rank);
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
                // Routing decisions never spawn learning work: it would need routing itself (an unbounded loop).
                learning: false,
                extraPrompt: await this.assignmentInstructions(targetRef),
                validateReport: async (report, changed) => {
                    const queue = await this.readQueue();
                    const target = targetRef ? findTask(queue.tasks, targetRef).task : undefined;
                    if (!target) return { ok: true };
                    const unexpected = changed.filter((path) => path !== task.source.relativePath && path !== target.source.relativePath && !base.createdPaths.some((created) => toProjectRelative(this.options.project.root, created) === path));
                    if (unexpected.length) return { ok: false, feedback: `Assignment work must not edit files, but these changed: ${unexpected.join(', ')}. Revert them and report only the routing decision.` };
                    const validation = await validateAssignment(report.data, { target, context: this.routing });
                    if (!validation.ok) return validation;
                    const decision = validation.decision;
                    if (decision.kind === 'impossible') {
                        // The target stays unfinished and blocked; Fixer gets a separate ordinary repair task.
                        return { ok: true, apply: async () => await this.recordImpossibleRouting(target, `Router found no compatible agent/combination: ${decision.reason}`) };
                    }
                    return {
                        ok: true,
                        apply: async () => {
                            await applyAssignment(target, decision);
                            this.log(`Router routed "${target.title}": ${decision.agent ? `TASK AGENT ${decision.agent}, ` : ''}MODEL ${formatModelRow(decision.model)}`);
                            return [target.source.path];
                        },
                    };
                },
            };
        }
        if (kind === 'learning') {
            const match = /\bby\s+(@\S+|\{[^{}]+\})/.exec(task.origin ?? '');
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
                extraPrompt: discoveryPrompt({ agent: route.agent, tasksDirectory: tasksRelative, recentTitles: recent, creationStamp: creationTimestamp(Date.now(), this.timeZone) }),
            };
        }
        return { ...base, kind: 'task', learning: true };
    }

    /** Router instructions for a target. */
    private async assignmentInstructions(targetRef: string | undefined): Promise<string> {
        const queue = await this.readQueue();
        const target = targetRef ? findTask(queue.tasks, targetRef).task : undefined;
        if (!target) return `## Assignment work\n\nThe target ${targetRef ?? '(unknown)'} no longer exists. Report done with a summary saying so; change nothing.`;
        return await assignmentPrompt({ target, context: this.routing });
    }

    /** Evidence for a learning task: the trace and summary of the parent result. */
    private async learningEvidence(task: Task): Promise<string | undefined> {
        const parent = task.parent;
        const results = await this.state.recentResults(200);
        const result = results.find((item) => item.taskRef === parent || (parent && item.taskRef === parent.replace(/^#/, '')));
        const tracePath = /Evidence:\s*(\S+)/.exec(task.notes.join('\n'))?.[1] ?? result?.trace;
        const parts: string[] = [];
        const chatName = /^learning from chat\s+\{([^{}]+)\}/i.exec(task.origin ?? '')?.[1];
        const chat = chatName ? await this.chats.find(chatName) : undefined;
        if (chatName) {
            parts.push(
                chat
                    ? `Chat {${chat.chat.name}} (${chat.relativePath}):\n${chat.chat.messages.map((message) => `${message.sender} (${message.at}):\n${message.text}`).join('\n\n').slice(-30_000)}`
                    : `The chat {${chatName}} is no longer available.`,
            );
        }
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

    /**
     * Creates and executes Router's prerequisite of a task whose agent or concrete execution is not determined.
     * Router must be directly runnable; an incomplete bootstrap is a bounded setup problem, never a Router chain.
     */
    private async assign(target: Task, priority: number, options: { readonly createdPaths?: readonly string[] } = {}): Promise<void> {
        if (!this.claimable) return;
        const router = await routerAgent(this.catalog);
        if (!router) {
            const needsConversion = Boolean(this.catalog.index.winnerOf('router')?.document.legacy || this.catalog.index.winnerOf('manager')?.document.legacy);
            this.setBlocker({
                kind: 'setup',
                title: 'Router is missing',
                reason: needsConversion ? 'The core agent Router uses former Book syntax, so missing routing cannot be assigned.' : 'The core agent Router (agents/.core/router.book) is not available, so missing routing cannot be assigned.',
                action: needsConversion ? 'Run `ptbk migrate` to convert Books in former syntax.' : 'Restart the service or run `ptbk init` to restore core agents.',
            });
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason: 'Router core agent is missing.', action: 'Run `ptbk init`.', skippable: false });
            return;
        }
        if (router.legacy) this.logOnce('Manager is the former name of Router: it routes until the project migration converts agents/.core/manager.book into router.book.', 'info');
        this.phase = 'assigning';
        const created = await createAssignmentTask({ target, tasksDirectory: this.tasksDirectory, router: router.name, priority, timeZone: this.timeZone, taken: await this.takenNames() });
        const routerTask = readTaskBook({ source: await readFile(created.path, 'utf8'), path: created.path, relativePath: toProjectRelative(this.options.project.root, created.path), order: 0, timeZone: this.timeZone })!;
        const route = await this.route(routerTask);
        if (route.kind !== 'routable') {
            const { rm } = await import('node:fs/promises');
            await rm(created.path, { force: true });
            await this.routerBootstrapProblem(router.name, route);
            return;
        }
        this.clearBlocker('setup');
        this.log(`Routing "${target.title}": ${router.name} prerequisite {${created.name}} (${toProjectRelative(this.options.project.root, created.path)})`);
        // Local evidence of the target (its own versioned trace is written when the target itself executes).
        await (await TaskTrace.open(this.options.project, { name: target.title, source: target.source.relativePath })).event('assignment-requested', { routerTask: created.name, routerSource: toProjectRelative(this.options.project.root, created.path) }, { local: true });
        const item = await this.buildWorkItem(routerTask, route, { createdPaths: [created.path, ...(options.createdPaths ?? [])] });
        if (item) await this.execute({ ...item, relatedTaskNames: [target.title] });
    }

    /**
     * Router cannot run itself (no concrete MODEL, or no tool serves it): a visible setup problem and one ordinary
     * Fixer repair task that carries a concrete MODEL from plugin defaults, so the repair never needs the routing it
     * repairs. Assignment work waits meanwhile (bounded).
     */
    private async routerBootstrapProblem(router: string, route: Exclude<RouteResolution, { kind: 'routable' }>): Promise<void> {
        const reason = route.kind === 'needs-assignment' ? `${router} has no concrete MODEL, so it would have to route itself (${route.reason})` : `${router} cannot run: ${route.reason}`;
        const bootstrap = await completeWithDefaults(UNCONSTRAINED, this.routing);
        const example = bootstrap.row ? `MODEL ${formatModelRow(bootstrap.row)}` : 'a concrete MODEL';
        // Problems in Router's definition chain (often an inherited Book such as Adam) are repaired where they are.
        const definition = await resolveEffectiveAgent(this.catalog, toReference(router));
        const broken = [...new Set(definition.diagnostics.filter((diagnostic) => diagnostic.severity === 'error' && diagnostic.path).map((diagnostic) => diagnostic.path))];
        const books = broken.join(', ');
        const action = broken.length ? `Fix the problems in ${books} (${router} inherits them); Fixer repairs them automatically.` : `Give agents/.core/${router.toLowerCase()}.book ${example}; Fixer repairs it automatically.`;
        this.setBlocker({ kind: 'setup', title: `${router} cannot route`, reason, action, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
        this.logOnce(`${reason}. Routing waits for repair (no Router chain is created).`, 'warning');
        await this.scheduleRepair({
            key: `router-bootstrap`,
            origin: 'maintenance: router bootstrap',
            title: `Repair ${router}'s execution setup`,
            description: [
                `${reason}. Router must be directly runnable with an already concrete MODEL (harness, model, thinking level where the harness has one, and endpoint) from the usable tools, so it never needs to route itself.`,
                broken.length
                    ? `The cause is in ${books}: every agent inherits the Books of its FROM chain (Adam by default), so these problems stop ${router} and the agents sharing them. Fix them where they are, keeping each Book's intent; for example, rewrite a prose MODEL as field=value alternatives and keep any further preference as a RULE. Do not change ${router}'s own MODEL to work around them. If the user explicitly restricted the execution, keep that restriction and consult your team as your instructions direct.`
                    : `Edit only the MODEL of ${router}'s Book (agents/.core/${router.toLowerCase()}.book), keeping its customized instructions, for example \`${example}\`. If the user explicitly restricted the execution, keep that restriction and consult your team as your instructions direct.`,
            ].join('\n\n'),
            links: [],
            model: bootstrap.row,
            fingerprint: reason,
        });
    }

    /**
     * Records a judged or deterministic impossibility for a task (blocked until its source changes) and creates one
     * separate Fixer repair task; returns the created paths for the current result commit.
     */
    private async recordImpossibleRouting(target: Task, reason: string): Promise<string[]> {
        await this.state.setRoutingBlock(target.key, { reason, sourceHash: target.source.fileHash, at: new Date().toISOString() });
        const created = await this.scheduleRepair({ key: `routing ${target.key}`, origin: `maintenance: impossible execution of ${target.ref}`, title: `Repair the execution requirements of ${target.title}`, description: impossibleDescription(target, reason), links: [target.ref], fingerprint: `${target.source.fileHash} ${reason}`, commit: false });
        this.log(`"${target.title}" stays blocked: ${reason}${created ? ` Fixer repairs it in {${created.name}}.` : ''}`, 'warning');
        return created ? [created.path] : [];
    }

    /**
     * Schedules one ordinary Fixer repair task per condition (deduplicated by its fingerprint across retries and
     * restarts). Returns the created task, or undefined when an equivalent repair exists or Fixer is unavailable.
     */
    private async scheduleRepair(input: { readonly key: string; readonly origin: string; readonly title: string; readonly description: string; readonly links: readonly string[]; readonly fingerprint: string; readonly model?: import('../book/model.js').ModelRow; readonly commit?: boolean }): Promise<{ path: string; name: string } | undefined> {
        const fixer = await this.catalog.resolve('@Fixer');
        if (fixer.kind !== 'agent') {
            this.logOnce(`Fixer is unavailable, so "${input.title}" stays visible until it is repaired manually.`, 'warning');
            return undefined;
        }
        const repairs = await this.state.readRepairs();
        const fingerprint = shortHash(input.fingerprint, 16);
        const queue = await this.readQueue();
        const unfinished = queue.tasks.some((task) => task.origin === input.origin && !['done', 'failed', 'retired'].includes(task.status));
        if (unfinished || repairs[input.key]?.fingerprint === fingerprint) return undefined;
        const created = await createRepairTask({ tasksDirectory: this.tasksDirectory, title: input.title, description: input.description, origin: input.origin, links: input.links, model: input.model, timeZone: this.timeZone, taken: await this.takenNames() });
        await this.state.writeRepairs({ ...repairs, [input.key]: { fingerprint, task: created.name, at: new Date().toISOString() } });
        if (input.commit !== false) {
            if (this.commitMode) await this.commitAuthoring([created.path], `Add task - ${created.name}`, { 'Task-Name': created.name }).catch(() => undefined);
            else await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, created.path)]: null });
            this.log(`Fixer will repair: {${created.name}}.`, 'warning');
            this.wake();
        }
        return created;
    }

    /**
     * Creates Fixer repair tasks for tasks with no compatible execution (their source and evidence linked); returns
     * whether one was created (the agenda reevaluates before claiming).
     */
    private async scheduleRoutingRepairs(evaluated: readonly EvaluatedTask[]): Promise<boolean> {
        // Only a stable, valid configuration with usable tools can prove an impossibility (never a transient read).
        if (!this.claimable || this.tools.waiting || this.settings.diagnostics.some((diagnostic) => diagnostic.severity === 'error' && !diagnostic.location.startsWith('--'))) return false;
        let created = false;
        for (const { task, readiness } of evaluated) {
            if (readiness.kind !== 'incompatible' || task.source.kind !== 'book' || task.shadowedBy || /^maintenance:/i.test(task.origin ?? '')) continue;
            const repair = await this.scheduleRepair({ key: `routing ${task.key}`, origin: `maintenance: impossible execution of ${task.ref}`, title: `Repair the execution requirements of ${task.title}`, description: impossibleDescription(task, readiness.reason), links: [task.ref], fingerprint: `${task.source.fileHash} ${readiness.reason}` });
            created ||= Boolean(repair);
        }
        return created;
    }

    /**
     * Routing of resumed work: its current source, or the execution it was already using when the source has not been
     * refined to a concrete MODEL (no rerouting in the middle of work).
     */
    private async resumeRoute(task: Task, agent: string | undefined, record: ActiveRecord): Promise<RouteResolution> {
        const route = await resolveRoute({ ...task, routing: { ...task.routing, agent } }, this.routing);
        if (route.kind !== 'needs-assignment' || !agent) return route;
        const effective = await resolveEffectiveAgent(this.catalog, toReference(agent));
        const variant = harnessVariantOf(record.routing.harness);
        if (!variant) return route;
        const established = { rows: [{ harness: variant, ...(record.routing.model ? { model: record.routing.model } : {}), ...(record.routing.thinkingLevel ? { thinking: record.routing.thinkingLevel } : {}), ...(record.routing.runtime ? { runtime: record.routing.runtime } : {}) }], explicit: true };
        return await routeWithDefaults(effective, intersectModels(task.routing.model, established), this.routing, { sources: { agent: 'established execution of the interrupted work' } });
    }

    /** Creates and executes a goal enquiry when one is due; returns false when none is due. */
    private async discover(): Promise<boolean> {
        if (!this.claimable) return true;
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
        const { path } = await createDiscoveryTask({ tasksDirectory: this.tasksDirectory, agentName: chosen.name, timeZone: this.timeZone, taken: await this.takenNames() });
        this.log(`Goal discovery: asking ${chosen.name} whether its goals justify new work.`);
        let task = readTaskBook({ source: await readFile(path, 'utf8'), path, relativePath: toProjectRelative(this.options.project.root, path), order: 0, timeZone: this.timeZone })!;
        let route = await this.route(task);
        // Files this claim still owns (withdrawn when the claim does not happen).
        let createdPaths = [path];
        if (route.kind === 'needs-assignment') {
            // The enquiry is ordinary work: Router specializes its MODEL first (one prerequisite, then the enquiry).
            await this.assign(task, task.priority.value, { createdPaths: [path] });
            if (!(await pathExists(path))) return true;
            task = readTaskBook({ source: await readFile(path, 'utf8'), path, relativePath: toProjectRelative(this.options.project.root, path), order: 0, timeZone: this.timeZone })!;
            route = await this.route(task);
            // Router's result committed the enquiry: from now on it is an ordinary queued task, never withdrawn.
            createdPaths = this.commitMode ? [] : [path];
            if (route.kind === 'routable' && !this.claimable) return true;
        }
        if (route.kind !== 'routable') {
            this.log(`Goal enquiry cannot run: ${route.reason}`, 'warning');
            const { rm } = await import('node:fs/promises');
            await rm(path, { force: true });
            await this.recordDiscovery(chosen.normalized, 'failed');
            return false;
        }
        const item = await this.buildWorkItem(task, route, { createdPaths });
        if (!item) return false;
        const outcome = await this.execute(item);
        // Not claimed (pause/stop accepted meanwhile) or interrupted by a force stop: no enquiry outcome to record.
        if (outcome.kind === 'interrupted' && !this.claimable) return true;
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
        await (await TaskTrace.open(this.options.project, { name: task.title, source: task.source.relativePath })).event('completed-without-model', { note });
        const commit = this.commitMode ? await this.commitAuthoring([task.source.path, ...(await this.traceFiles(task.source.relativePath))], task.title, { 'Task-Name': task.title }) : undefined;
        this.log(`${task.title}: ${note}${commit ? ` (${commit.slice(0, 8)})` : ''}`);
    }

    // ── Executing ────────────────────────────────────────────────────────────

    /**
     * Runs one work item through the executor and handles its outcome. The claim boundary: once pause/stop is
     * accepted, nothing new starts (the work stays queued with its record intact).
     */
    private async execute(item: WorkItem): Promise<ExecutionOutcome> {
        if (!this.claimable) {
            this.log(`Not starting "${item.task.title}": the service is ${this.serviceState}.`);
            // Engine-created Books prepared for this very claim (a Router or discovery task) are withdrawn; they are
            // created again when work resumes. A resumed record keeps everything.
            if (!item.resume) {
                const { rm } = await import('node:fs/promises');
                for (const path of item.createdPaths) await rm(path, { force: true });
            }
            return { kind: 'interrupted' };
        }
        this.executing = true;
        try {
            return await this.executeClaimed(item);
        } finally {
            this.executing = false;
            this.settle();
        }
    }

    /** Executes claimed work (the service owns it until its outcome is handled). */
    private async executeClaimed(item: WorkItem): Promise<ExecutionOutcome> {
        const selection = item.route.selection;
        const targetRef = item.kind === 'assignment' ? originTarget(item.task) : undefined;
        this.current = {
            taskRef: item.task.ref,
            trace: `${traceDirectoryOf(item.task.source.relativePath)}/`,
            taskTitle: item.task.title,
            kind: item.kind,
            agent: agentView(selection.agent, 'working'),
            harness: selection.harness,
            harnessName: harnessName(selection.harness),
            tool: selection.tool,
            model: selection.model,
            modelSource: selection.model ? 'requested' : 'default',
            thinkingLevel: selection.thinkingLevel,
            phase: 'executing',
            attempt: item.resume?.attempt ?? 0,
            attemptBudget: setting<number>(this.settings, 'execution.repairAttempts'),
            startedAt: new Date().toISOString(),
            target: targetRef ? { ref: targetRef, title: targetRef } : undefined,
        };
        this.currentContext = { selection, harnessVersion: item.route.inspection.version, source: item.task.source.relativePath, consultations: [] };
        this.phase = item.kind === 'assignment' ? 'assigning' : item.kind === 'learning' ? 'learning' : item.kind === 'discovery' ? 'discovering' : 'executing';
        this.log(`${item.resume ? 'Resuming' : 'Starting'} ${item.kind === 'task' ? '' : `${item.kind} `}"${item.task.title}" with ${selection.agent} on ${harnessName(selection.harness)}${selection.tool ? ` [${selection.tool}]` : ''}${selection.model ? ` (${selection.model})` : ''}`);
        let outcome: ExecutionOutcome;
        try {
            outcome = await this.executeMaybeIsolated(item);
        } catch (error) {
            await this.reportError('execution', error, item.task.ref);
            outcome = { kind: 'failed', reason: errorMessage(error) };
            const record = await this.state.readActive();
            if (record) await this.state.writeActive({ ...record, phase: 'failed', failure: errorMessage(error) });
        } finally {
            await this.options.afterWork?.().catch(() => undefined);
        }
        const finished = this.current;
        this.current = undefined;
        this.currentContext = undefined;
        this.touch();
        switch (outcome.kind) {
            case 'completed': {
                this.completed++;
                await this.state.setBlocker(item.task.key, undefined);
                this.recentResults = (await this.state.recentResults(20)).map(resultView);
                if (outcome.commit) void this.publish({ name: item.task.title, source: item.task.source.relativePath });
                const pacing = setting<number>(this.settings, 'execution.waitBetweenPrompts');
                if (pacing > 0 && !this.stopRequested && !this.pauseActive) await this.wait(pacing, { kind: 'pacing', reason: 'Pause between tasks (--wait-between-prompts).', skippable: true });
                break;
            }
            case 'awaiting-user': {
                this.log(`"${item.task.title}" waits for your reply in the chat {${outcome.chat}} (ptbk chat --open "${outcome.chat}").`, 'warning');
                await this.refreshChats();
                const record = await this.state.readActive();
                if (record) await this.checkpoint(record);
                break;
            }
            case 'failed':
                this.failed++;
                this.recentResults = (await this.state.recentResults(20)).map(resultView);
                this.addError({
                    at: new Date().toISOString(),
                    summary: `"${item.task.title}" failed: ${outcome.reason}`,
                    phase: 'task execution',
                    task: item.task.ref,
                    trace: outcome.trace,
                    next: this.options.mode !== 'maintenance' && !item.resume?.handover && HANDOVER_KINDS.has(item.kind) ? 'Fixer takes over automatically; a decision is asked in a chat only if it cannot resolve it.' : `Reply in the recovery chat or run \`ptbk recover "${item.task.title}"\`.`,
                });
                break;
            case 'setup':
                if (this.sameVariantFallback(item, outcome.tool)) {
                    this.log(`${outcome.reason}; continuing with the next ${harnessName(selection.harness)} instance "${this.sameVariantFallback(item, outcome.tool)!.name}" (same-variant fallback).`, 'warning');
                    break;
                }
                this.setBlocker({ kind: 'harness', title: `${harnessName(selection.harness)} needs setup`, reason: outcome.reason, action: outcome.next, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
                break;
            case 'quota':
                // An authorized later instance of the same variant serves the retry at once (no wait through this reset).
                if (this.sameVariantFallback(item, outcome.tool)) {
                    this.log(`${outcome.reason}; continuing with the next ${harnessName(selection.harness)} instance "${this.sameVariantFallback(item, outcome.tool)!.name}" (same-variant fallback).`, 'warning');
                    break;
                }
                this.log(`${outcome.reason}; waiting ${formatDuration(outcome.retryAfterMs)} before rechecking.`, 'warning');
                await this.wait(outcome.retryAfterMs, { kind: 'quota', reason: outcome.reason, skippable: true });
                break;
            case 'persistence-failed':
                this.setBlocker({ kind: 'persistence', title: 'Commit failed', reason: outcome.reason, action: 'Fix the Git hook/signing/identity problem; ptbk retries persistence without rerunning the agent.' });
                this.addError({ at: new Date().toISOString(), summary: `Commit of "${item.task.title}" failed: ${outcome.reason}`, phase: 'commit', task: item.task.ref, next: 'Fix the cause; persistence resumes automatically.' });
                break;
            case 'interrupted':
                this.log(`"${item.task.title}" was interrupted; its recovery record is preserved.`, 'warning');
                break;
            case 'integration-pending': {
                // The committed result waits on its temporary branch; execution is released so Fixer can integrate it.
                this.pendingIntegrations++;
                const record = await this.state.readActive();
                if (record) {
                    await this.state.park(record);
                    await this.scheduleIntegrationRepair(record, outcome.reason);
                }
                this.addError({ at: new Date().toISOString(), summary: `The isolated result of "${item.task.title}" is not integrated yet: ${outcome.reason}`, phase: 'integration', task: item.task.ref, next: `Fixer integrates it with a visible merge; or merge ${record ? isolationBranch(record.runId) : 'its branch'} yourself (ptbk completes the task once it is merged).` });
                break;
            }
        }
        void finished;
        return outcome;
    }

    /**
     * The next usable instance of the failed instance's variant aimed at the same endpoint (MODEL never binds an
     * account, but accounts aimed at different services are not interchangeable).
     */
    private sameVariantFallback(item: WorkItem, failed: string | undefined): ReturnType<HarnessPool['select']> {
        if (!failed) return undefined;
        return this.pool.select(item.route.selection.harness, { runtime: item.route.selection.runtime, except: failed });
    }

    /**
     * Executes ordinary tasks in an isolated worktree when requested (generated work stays in the checkout).
     */
    private async executeMaybeIsolated(item: WorkItem): Promise<ExecutionOutcome> {
        const environment = this.environment(item.task);
        // Maintenance work (e.g. Fixer integrating a result or resolving a merge) operates on the project branch itself.
        const maintenance = /^maintenance:/i.test(item.task.origin ?? '');
        const isolate = (setting<boolean>(this.settings, 'execution.isIsolated') && item.kind === 'task' && !maintenance && this.commitMode && !item.createdPaths.length) || Boolean(item.resume?.worktree);
        if (!isolate) return await executeWork(environment, item);
        const runId = item.resume?.runId ?? shortId(10);
        const worktree = await prepareWorktree(this.options.project, environment.repositoryRoot, runId);
        const project = this.options.project;
        const map = (path: string): string => resolve(worktree.projectRoot, relative(project.root, path));
        const isolatedProject = { ...project, root: worktree.projectRoot };
        const task = { ...item.task, source: { ...item.task.source, path: map(item.task.source.path) } };
        this.log(`Isolated in worktree ${toProjectRelative(project.root, worktree.root)} (branch ${worktree.branch}).`);
        const outcome = await executeWork(
            { ...environment, project: isolatedProject, repositoryRoot: worktree.root, tasksDirectory: map(this.tasksDirectory) },
            {
                ...item,
                task,
                runId,
                worktree: worktree.root,
                integrate: async () => {
                    const { sha } = await this.gitMutex.run(() =>
                        integrateWorktree(environment.repositoryRoot, worktree, {
                            check: item.check ?? setting<string | undefined>(this.settings, 'execution.check'),
                            env: this.options.env,
                            message: { taskName: item.task.title, runId },
                            temporaryDirectory: project.runtime.temporary,
                        }),
                    );
                    this.log(`Integrated the isolated result with a visible merge commit (${sha.slice(0, 8)}).`);
                    return sha;
                },
            },
        );
        // The worktree's local evidence moves to the project's traces/ before the temporary checkout is removed.
        if (outcome.kind === 'completed') await this.gitMutex.run(() => finishWorktree(environment.repositoryRoot, worktree, project.root)).catch((error: unknown) => this.log(`Could not remove the worktree ${worktree.root}: ${errorMessage(error)}`, 'warning'));
        return outcome;
    }

    /** Continues the task recorded in the active record. */
    private async continueActive(initialRecord: ActiveRecord): Promise<void> {
        let record = initialRecord;
        if (record.phase === 'failed') {
            await this.handleFailedRecord(record);
            return;
        }
        if (record.phase === 'awaiting-user' && record.waitingChat) {
            const reply = await this.chatReplyOf(record.waitingChat, record.awaitedMessages);
            if (!reply.answered && (await this.checkpoint(record))) return;
            if (!reply.answered) {
                this.current = {
                    taskRef: record.taskRef,
                    trace: `${traceDirectoryOf(record.sourcePath)}/`,
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
                    detail: `{${record.waitingChat}}`,
                };
                this.currentContext = { selection: record.routing, source: record.sourcePath, consultations: [] };
                this.phase = 'awaiting-user';
                await this.evaluate();
                await this.wait(IDLE_RECHECK_MS, { kind: 'user', reason: `"${record.taskTitle}" waits for your reply in the chat {${record.waitingChat}} and holds uncommitted changes, so other work waits too.`, action: `ptbk answer "${record.waitingChat}"`, skippable: false });
                this.current = undefined;
                this.currentContext = undefined;
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
        const queue = await this.readQueue();
        const task =
            queue.tasks.find((candidate) => !candidate.shadowedBy && candidate.key === (record.taskKey || nameKey(record.taskTitle))) ??
            queue.tasks.find((candidate) => candidate.source.relativePath === record.sourcePath && (!record.sectionHash || candidate.source.sectionHash === record.sectionHash));
        if (task && task.key !== record.taskKey) {
            record = { ...record, taskKey: task.key, taskRef: task.ref, taskTitle: task.title, sectionHash: task.source.sectionHash };
            await this.state.writeActive(record);
        }
        if (!task) {
            await this.state.writeActive({ ...record, phase: 'failed', failure: `The task source ${record.sourcePath} moved or disappeared during execution.` });
            return;
        }
        // After a takeover, Fixer continues the task within the task's own MODEL constraints.
        const agent = record.handover ? record.handover.agent : (task.routing.agent ?? record.routing.agent);
        const route = await this.resumeRoute(task, agent, record);
        if (route.kind !== 'routable') {
            const reason = `"${record.taskTitle}" cannot resume: ${route.reason}`;
            this.setBlocker({ kind: 'harness', title: 'Interrupted work cannot resume', reason, action: route.kind === 'blocked' ? route.next : undefined, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
            await this.pool.refresh(undefined, true);
            await this.wait(BLOCKER_RECHECK_MS, { kind: 'setup', reason, action: route.kind === 'blocked' ? route.next : undefined, skippable: false });
            return;
        }
        this.clearBlocker('harness');
        const item = await this.buildWorkItem(task, route, { resume: record, createdPaths: record.createdPaths.map((path) => resolve(this.options.project.root, path)), slot: record.occurrence ? Date.parse(record.occurrence) : undefined });
        if (item) await this.execute(record.handover ? { ...item, extraPrompt: [item.extraPrompt, handoverPrompt(record, record.handover)].filter(Boolean).join('\n\n') } : item);
    }

    /**
     * Automatic repair before any human decision: a task that exhausted its budgets in the ongoing agenda is handed to
     * the ordinary Fixer, which continues the same record (its partial changes, trace and eventual single result
     * commit) for one bounded round and consults its team only as its own Book directs. Not repeated for Fixer's own
     * failure, for work Fixer itself owns, without a usable Fixer, or in a finite run (whose agent was chosen
     * explicitly). Returns whether the task was handed over.
     */
    private async handOverToFixer(record: ActiveRecord): Promise<boolean> {
        if (this.options.mode === 'maintenance' || record.handover || record.recoveryChat || !HANDOVER_KINDS.has(record.kind)) return false;
        const fixer = await this.catalog.resolve('@Fixer');
        if (fixer.kind !== 'agent') return false;
        const from = record.routing.agent ?? setting<string>(this.settings, 'routing.defaultAgent');
        const name = fixer.definition.name;
        if (normalizeAgentName(referenceName(from)) === normalizeAgentName(name)) return false;
        const failure = record.failure ?? 'unknown reason';
        await this.state.writeActive({
            ...record,
            phase: 'executing',
            attempt: 0,
            technicalRetries: 0,
            failure: undefined,
            handover: { agent: name, from, failure, at: new Date().toISOString() },
            feedback: `${formatAgentReference(from)} could not complete this task: ${failure}`,
        });
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('handed-over', { runId: record.runId, to: name, from, failure }).catch(() => undefined);
        this.log(`"${record.taskTitle}" failed with ${from} (${failure}); ${name} takes over for at most ${Math.min(HANDOVER_ATTEMPTS, setting<number>(this.settings, 'execution.repairAttempts'))} attempt(s) before anyone is asked.`, 'warning');
        this.wake();
        return true;
    }

    /**
     * Keeps a failed task visible after automatic repair: the agent that last handled it (Fixer after a takeover) asks
     * the user how to continue in a chat, then applies the chosen answer.
     */
    private async handleFailedRecord(record: ActiveRecord): Promise<void> {
        if (await this.handOverToFixer(record)) return;
        let current = record;
        if (!current.recoveryChat || !(await this.chats.find(current.recoveryChat))) {
            const agent = current.handover?.agent ?? current.routing.agent ?? setting<string>(this.settings, 'routing.defaultAgent');
            const asked = await taskChats(this.chats, { name: current.taskTitle, key: current.taskKey || nameKey(current.taskTitle) }, { takenNames: () => this.catalog.index.names() }).askUser({
                agent,
                reason: current.handover
                    ? `The task {${current.taskTitle}} failed with ${current.handover.from} (${current.handover.failure}), and ${current.handover.agent} could not resolve it either: ${current.failure ?? 'unknown reason'}`
                    : `The task {${current.taskTitle}} failed: ${current.failure ?? 'unknown reason'}`,
                attempted: `${current.handover ? `${current.handover.from} used its budgets, then ${current.handover.agent} took over; ` : ''}${current.attempt} attempt(s) and ${current.technicalRetries} technical retr${current.technicalRetries === 1 ? 'y' : 'ies'}${current.handover ? ' in the last round' : ' within the configured budgets'}. Evidence: ${traceDirectoryOf(current.sourcePath)}/.`,
                question: 'How should I continue? Retrying runs the task again with a fresh attempt budget; acknowledging records the failure (TASK STATUS failed) and moves on. Partial changes stay in the working tree.',
                choices: [...RECOVERY_CHOICES],
            });
            current = { ...current, recoveryChat: asked.chat, awaitedMessages: asked.awaited };
            await this.state.writeActive(current);
            await this.refreshChats();
        }
        const reply = await this.chatReplyOf(current.recoveryChat!, current.awaitedMessages, RECOVERY_CHOICES);
        if (!reply.answered) {
            if (await this.checkpoint(current)) return;
            this.setBlocker({ kind: 'recovery', title: `"${current.taskTitle}" needs a decision`, reason: current.failure ?? 'The task failed.', action: `ptbk answer "${current.recoveryChat}"` });
            await this.wait(IDLE_RECHECK_MS, { kind: 'recovery', reason: `"${current.taskTitle}" failed; its agent asks how to continue in {${current.recoveryChat}}.`, action: `ptbk answer "${current.recoveryChat}"`, skippable: false });
            return;
        }
        this.clearBlocker('recovery');
        if (reply.answer === RECOVERY_CHOICES[0]) await this.retryRecord(current);
        else await this.acknowledgeRecord(current);
    }

    /**
     * Whether the user replied in a chat after the awaited message (a reply among `choices` when they are required,
     * otherwise among the awaited message's own offered choices, or any reply when none were offered).
     */
    private async chatReplyOf(name: string, awaitedMessages: number | undefined, choices?: readonly string[]): Promise<{ readonly answered: boolean; readonly answer?: string; readonly missing?: boolean }> {
        const stored = await this.chats.find(name);
        if (!stored) return { answered: !choices, missing: true };
        const messages = stored.chat.messages;
        const awaited = awaitedMessages ?? messages.length;
        const question = messages[awaited - 1];
        const offered = choices ?? question?.choices;
        for (const message of messages.slice(awaited)) {
            if (message.senderKey !== 'user') continue;
            if (!offered?.length || offered.includes(message.text.trim())) return { answered: true, answer: message.text.trim() };
        }
        // Resolving an ordinary question without a reply lets the task continue with what it has.
        return { answered: !choices && stored.chat.status === 'resolved' };
    }

    /** Resets a failed record for a deliberate retry. */
    public async retryRecord(record: ActiveRecord): Promise<void> {
        // A deliberate retry starts a fresh chain with the task's own agent (Fixer may take over again if it fails).
        await this.state.writeActive({ ...record, phase: 'executing', attempt: 0, technicalRetries: 0, completionApplied: false, failure: undefined, recoveryChat: undefined, awaitedMessages: undefined, handover: undefined, feedback: `A previous run failed: ${record.failure ?? 'unknown'}. Inspect the current state and complete the task.` });
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
                : setMarkdownControl(source, { hash: record.sectionHash }, '!', `failed ${formatIsoWithOffset(Date.now(), this.timeZone)}: ${(record.failure ?? '').slice(0, 160)}`);
            await writeFile(path, updated);
            await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('failure-acknowledged', { runId: record.runId, failure: record.failure, chat: record.recoveryChat });
            if (this.commitMode) await this.commitAuthoring([path, ...(await this.traceFiles(record.sourcePath))], `Mark failed - ${record.taskTitle}`, { 'Task-Name': record.taskTitle });
        } catch (error) {
            this.log(`Could not mark "${record.taskTitle}" as failed in its source: ${errorMessage(error)}`, 'warning');
        }
        await this.state.clearActive();
        await this.state.dropParked(record.taskTitle);
        if (record.recoveryChat) await this.chats.setStatus(record.recoveryChat, 'resolved').catch(() => undefined);
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
        if (mode === 'no' || this.checkedBefore || this.options.mode === 'maintenance') return true;
        const check = setting<string | null | undefined>(this.settings, 'execution.check');
        if (!check) return true;
        if (isCheckPlaceholder(check)) {
            // Nothing to validate: the placeholder records that real validation is not configured (never a pass).
            this.logOnce('Pre-work check skipped: real automated validation is not configured (informational check placeholder).', 'info');
            this.checkedBefore = true;
            return true;
        }
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
        if (!this.claimable) return false;
        const path = await newTaskPath(this.tasksDirectory, 'repair failing project check', Date.now(), this.timeZone);
        const agent = setting<string>(this.settings, 'routing.defaultAgent');
        await writeFile(
            path,
            renderTaskBook({
                title: generatedName('Repair the failing project check', { taken: await this.takenNames(), timeZone: this.timeZone }),
                description: `The project check \`${check}\` fails before work. Fix the underlying defects without weakening validation.\n\n\`\`\`\n${result.output.slice(-6000)}\n\`\`\``,
                commitments: [`TASK AGENT {${agent}}`, 'TASK ORIGIN maintenance: failing project check'],
            }),
            { flag: 'wx' },
        );
        const outcome = await this.executeMaintenance(path, check);
        this.checkedBefore = outcome.kind === 'completed';
        return this.checkedBefore;
    }

    /** Publishes completed local work through the synchronization coordinator (failures stay pending, never rerun work). */
    private async publish(task?: { readonly name: string; readonly source: string }): Promise<void> {
        if (!this.sync.view()) return;
        const outcome = await this.sync.request('post-commit');
        // Synchronization happens after the result snapshot, so it is recorded as a local (post-commit) event.
        if (task) await (await TaskTrace.open(this.options.project, task)).event('synchronization', { outcome: outcome.outcome, detail: outcome.message }, { local: true }).catch(() => undefined);
    }

    /**
     * Why integrating remote changes now would be unsafe: work in progress (integration waits for the task boundary)
     * or uncommitted local edits of the same files (never overwritten, stashed or reset).
     */
    private async integrationBlocker(incomingFiles: readonly string[]): Promise<string | undefined> {
        if (this.executing || this.current) return 'a task is in progress; integration happens at its boundary';
        if (!this.repositoryRoot) return 'the project is not in a Git working tree';
        const dirty = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot });
        const base = toProjectRelative(this.repositoryRoot, this.options.project.root);
        const overlap = incomingFiles.map((file) => (base && base !== '.' && file.startsWith(`${base}/`) ? file.slice(base.length + 1) : file)).filter((file) => dirty[file] !== undefined);
        if (overlap.length) return `uncommitted local changes of incoming files (${overlap.slice(0, 5).join(', ')}) are preserved`;
        return undefined;
    }

    /**
     * Hands a merge needing judgment to the ordinary Fixer (one unfinished task per condition; no new channel). The
     * local branch is unchanged: the merge was aborted, so local tasks continue meanwhile.
     */
    private async scheduleSyncConflict(conflict: { readonly upstream: string; readonly branch: string; readonly files: readonly string[]; readonly incoming: number }): Promise<void> {
        const origin = 'maintenance: synchronization conflict';
        const queue = await this.readQueue();
        if (queue.tasks.some((task) => task.origin === origin && !task.doneStamps.length && task.status !== 'done' && task.status !== 'failed')) return;
        const fixer = await this.catalog.resolve('@Fixer');
        if (fixer.kind !== 'agent') {
            this.logOnce(`Synchronization conflict with ${conflict.upstream} (${conflict.files.join(', ')}): Fixer is unavailable, so the conflict stays visible until it is resolved manually.`, 'warning');
            return;
        }
        const path = await newTaskPath(this.tasksDirectory, 'resolve synchronization conflict', Date.now(), this.timeZone);
        await writeFile(
            path,
            renderTaskBook({
                title: generatedName(`Resolve the synchronization conflict with ${conflict.upstream}`, { taken: await this.takenNames(), timeZone: this.timeZone }),
                description: [
                    `Automatic Git synchronization could not merge \`${conflict.upstream}\` (${conflict.incoming} incoming commit(s)) into \`${conflict.branch}\`: both sides changed ${conflict.files.map((file) => `\`${file}\``).join(', ')}. The merge was aborted, so the local branch, history and working tree are unchanged.`,
                    `Integrate the remote changes with a visible merge: run \`git merge --no-ff --no-commit ${conflict.upstream}\`, resolve each conflict so that both intents are kept (inspect \`git log ${conflict.branch}...${conflict.upstream}\`), consult your team only when a genuine judgment is needed, then \`git add\` the resolved files and finish with \`git commit --no-edit -m "PTBK: Merge ${conflict.upstream} into ${conflict.branch} (conflicts resolved by Fixer)"\`. This merge commit is the one exception to "do not commit yourself".`,
                    'Never rebase, reset, amend, force-push or discard either side. If the conflict cannot be resolved safely, abort the merge (`git merge --abort`) and explain why.',
                ].join('\n\n'),
                commitments: ['TASK AGENT @Fixer', `TASK ORIGIN ${origin}`],
            }),
            { flag: 'wx' },
        );
        const commit = this.commitMode ? await this.commitAuthoring([path], `Ask Fixer to resolve the synchronization conflict with ${conflict.upstream}`).catch(() => undefined) : undefined;
        this.log(`Synchronization conflict with ${conflict.upstream} handed to Fixer (${toProjectRelative(this.options.project.root, path)}${commit ? `, ${commit.slice(0, 8)}` : ''}).`, 'warning');
        this.wake();
    }

    /**
     * Hands an isolated result that could not be merged automatically to the ordinary Fixer (one task per run; no
     * new channel). The result stays on its temporary branch and the project branch is unchanged meanwhile.
     */
    private async scheduleIntegrationRepair(record: ActiveRecord, reason: string): Promise<void> {
        const branch = isolationBranch(record.runId);
        const origin = `maintenance: integration of ${branch}`;
        const queue = await this.readQueue();
        if (queue.tasks.some((task) => task.origin === origin)) return;
        const fixer = await this.catalog.resolve('@Fixer');
        const target = this.repositoryRoot ? (await git(this.repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim() || 'the project branch' : 'the project branch';
        if (fixer.kind !== 'agent') {
            this.logOnce(`The isolated result of "${record.taskTitle}" waits on ${branch}: Fixer is unavailable, so it stays visible until it is merged manually (git merge --no-ff ${branch}).`, 'warning');
            return;
        }
        const path = await newTaskPath(this.tasksDirectory, 'integrate isolated result', Date.now(), this.timeZone);
        const title = generatedName(`Integrate the isolated result of ${record.taskTitle}`, { taken: await this.takenNames(), timeZone: this.timeZone });
        await writeFile(
            path,
            renderTaskBook({
                title,
                description: [
                    `The task {${record.taskTitle}} was executed in an isolated worktree and its verified result is committed on the branch \`${branch}\` (${record.commitSha ? `commit ${record.commitSha.slice(0, 12)}` : 'latest commit'}), but Promptbook could not merge it into \`${target}\` automatically: ${reason}`,
                    `Integrate it with a visible merge that keeps both histories: run \`git merge --no-ff --no-commit ${branch}\`, resolve each conflict so that both intents are kept (inspect \`git log ${target}...${branch}\`), make the project check pass, consult your team only when a genuine judgment is needed, then \`git add\` the resolved files and finish with \`git commit --no-edit -m "PTBK: Merge the isolated result of ${record.taskTitle} into ${target} (conflicts resolved by Fixer)"\`. This merge commit is the one exception to "do not commit yourself"; Promptbook completes {${record.taskTitle}} once the branch is merged.`,
                    'Never rebase, reset, amend, force-push or delete the branch or its worktree. If the result cannot be integrated safely, abort the merge (`git merge --abort`) and explain why.',
                ].join('\n\n'),
                commitments: ['TASK AGENT @Fixer', `TASK ORIGIN ${origin}`, `LINK {${record.taskTitle}}`],
            }),
            { flag: 'wx' },
        );
        const commit = this.commitMode ? await this.commitAuthoring([path], `Ask Fixer to integrate the isolated result of ${record.taskTitle}`, { 'Task-Name': title, 'Related-Task-Name': record.taskTitle }).catch(() => undefined) : undefined;
        this.log(`The isolated result of "${record.taskTitle}" was handed to Fixer for integration (${toProjectRelative(this.options.project.root, path)}${commit ? `, ${commit.slice(0, 8)}` : ''}).`, 'warning');
        this.wake();
    }

    /** Records a parked isolated result as completed once it was merged into the project branch (e.g. by Fixer). */
    private async completeIntegratedRecord(record: ActiveRecord): Promise<void> {
        const repositoryRoot = this.repositoryRoot!;
        await this.state.dropParked(record.taskTitle);
        const worktreeProject = resolve(record.worktree!, relative(repositoryRoot, this.options.project.root));
        await this.gitMutex.run(() => finishWorktree(repositoryRoot, { root: record.worktree!, projectRoot: worktreeProject, branch: isolationBranch(record.runId) }, this.options.project.root)).catch((error: unknown) => this.log(`Could not remove the worktree ${record.worktree}: ${errorMessage(error)}`, 'warning'));
        const integration = (await git(repositoryRoot, ['rev-parse', 'HEAD'])).stdout.trim() || undefined;
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('integrated', { runId: record.runId, result: record.commitSha ?? null, head: integration ?? null }, { local: true }).catch(() => undefined);
        await this.state.appendResult({
            taskRef: record.taskRef,
            taskName: record.taskTitle,
            title: record.taskTitle,
            kind: record.kind,
            outcome: 'completed',
            agent: record.routing.agent,
            harness: record.routing.harness,
            model: record.routing.model,
            source: record.sourcePath,
            thinkingLevel: record.routing.thinkingLevel,
            commit: record.commitSha,
            attempts: record.attempt,
            summary: `The isolated result was merged into the project branch${integration ? ` (now at ${integration.slice(0, 8)})` : ''}.`,
            startedAt: record.startedAt,
            endedAt: new Date().toISOString(),
            trace: `${traceDirectoryOf(record.sourcePath)}/harness.log`,
            occurrence: record.occurrence,
            engineVersion: ENGINE_VERSION,
        });
        this.recentResults = (await this.state.recentResults(20)).map(resultView);
        this.completed++;
        this.log(`"${record.taskTitle}" is complete: its isolated result is merged into the project branch.`);
        void this.publish({ name: record.taskTitle, source: record.sourcePath });
    }

    /** One manual synchronization cycle through the shared coordinator (never a second scheduler). */
    public async synchronizeNow(): Promise<SyncOutcome> {
        return await this.sync.request('manual');
    }

    /**
     * Applies one saved tool-management operation under this engine's coordination: the same shared implementation as
     * a stopped project's CLI, with the in-use set of active work, the Git lock and synchronization attempts. The new
     * inventory is effective at once, also for the task running now.
     */
    public async toolOperation(request: ToolOperationRequest): Promise<ToolOperationOutcome> {
        const configPath = this.options.project.configPath;
        // Never attribute the configuration write to the active task while it is being committed separately.
        const alreadyAuthored = this.authoredPaths.has(configPath);
        this.authoredPaths.add(configPath);
        try {
            const outcome = await applyToolOperation(this.options.project, request, {
                env: this.options.env,
                inUse: this.toolsInUse(),
                gitLock: (action) => this.gitMutex.run(action),
                sync: { before: async () => void (await this.sync.request('pre-commit')), after: async () => void this.sync.request('post-commit') },
                timeZone: this.timeZone,
            });
            if (outcome.status !== 'needs-acknowledgement') {
                await this.refreshLive();
                this.log(`${outcome.summary}${outcome.status === 'applied' && outcome.commit ? ` (${outcome.commit.slice(0, 8)})` : ''}${outcome.notes.length ? ` — ${outcome.notes.join(' ')}` : ''}`);
                this.wake();
            }
            return outcome;
        } finally {
            if (!alreadyAuthored) this.authoredPaths.delete(configPath);
        }
    }

    /**
     * Checkpoints a task waiting for a person (answer or recovery decision) and releases execution so independent
     * work can continue — only when it holds no uncommitted changes. Otherwise the wait stays a project-wide blocker
     * whose reason is shown. Returns whether the task was checkpointed.
     */
    private async checkpoint(record: ActiveRecord): Promise<boolean> {
        if (!this.repositoryRoot || record.worktree) return false;
        const owned = changedPaths(record.preSnapshot, await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot }, this.authoredPaths));
        if (owned.length) {
            this.setBlocker({
                kind: 'recovery',
                title: `"${record.taskTitle}" holds uncommitted changes while waiting`,
                reason: `It waits for a person and has uncommitted changes (${owned.slice(0, 4).join(', ')}${owned.length > 4 ? ', …' : ''}), so other tasks cannot run safely without mixing them into another result.`,
                action: record.waitingChat || record.recoveryChat ? `ptbk answer "${record.waitingChat ?? record.recoveryChat}"` : `ptbk recover ${record.taskRef}`,
            });
            return false;
        }
        await this.state.park(record);
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('checkpointed', { phase: record.phase, chat: record.waitingChat ?? record.recoveryChat });
        this.log(`"${record.taskTitle}" is checkpointed until you reply in {${record.waitingChat ?? record.recoveryChat}}; independent work continues.`);
        return true;
    }

    /**
     * Restores a checkpointed task whose request was resolved, so it resumes at the correct phase without another
     * Start/Run action. Returns whether one was restored.
     */
    private async resumeParked(): Promise<boolean> {
        if (!this.repositoryRoot) return false;
        for (const record of await this.state.readParked()) {
            if (record.phase === 'synchronizing' && record.worktree) {
                // An isolated result waits for integration: complete it once its commit is part of the project branch.
                if (record.commitSha && (await isIntegrated(this.repositoryRoot, record.commitSha))) {
                    await this.completeIntegratedRecord(record);
                    return true;
                }
                continue;
            }
            const chat = record.phase === 'awaiting-user' ? record.waitingChat : record.recoveryChat;
            if (chat && !(await this.chatReplyOf(chat, record.awaitedMessages, record.phase === 'failed' ? RECOVERY_CHOICES : undefined)).answered) continue;
            // The checkpoint held no changes; later commits by other tasks are the new baseline.
            const preSnapshot = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot }, this.authoredPaths);
            await this.state.unpark({ ...record, preSnapshot, instanceId: this.options.instanceId });
            this.log(`Resuming "${record.taskTitle}" after your reply${chat ? ` in {${chat}}` : ''}.`);
            return true;
        }
        return false;
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
    public async executeMaintenance(taskPath: string, check: string, options: { readonly tool?: string } = {}): Promise<ExecutionOutcome> {
        await this.refreshContext();
        const source = await readFile(taskPath, 'utf8');
        const task = readTaskBook({ source, path: taskPath, relativePath: toProjectRelative(this.options.project.root, taskPath), order: 0, timeZone: this.timeZone });
        if (!task) throw new PtbkError('The maintenance task could not be read.', { kind: 'internal' });
        let route = await this.route(task);
        // Explicit maintenance completes unresolved choices with plugin defaults within the agent's and task's MODEL.
        if ((route.kind === 'needs-assignment' || options.tool) && task.routing.agent) {
            route = await routeWithDefaults(await resolveEffectiveAgent(this.catalog, toReference(task.routing.agent)), task.routing.model, this.routing, { tool: options.tool, sources: { agent: 'maintenance (TASK AGENT)' } });
        }
        if (route.kind !== 'routable') throw new PtbkError(`The maintenance task cannot run: ${route.reason}`, { kind: 'setup', next: route.kind === 'blocked' && route.next ? [route.next] : [] });
        return await this.execute({ task, route, kind: 'maintenance', createdPaths: [taskPath], learning: false, check });
    }

    /** Applies a recovery action from `ptbk recover` through the running process. */
    public async recover(taskRef: string, action: 'resume' | 'retry' | 'acknowledge'): Promise<string> {
        const matches = (candidate: ActiveRecord | undefined): boolean =>
            Boolean(candidate && (candidate.taskRef === taskRef || (candidate.taskKey || nameKey(candidate.taskTitle)) === (parseReferenceValue(taskRef)?.normalized ?? nameKey(taskRef)) || candidate.sourcePath === taskRef.replace(/\\/g, '/')));
        const active = await this.state.readActive();
        const parked = matches(active) ? undefined : (await this.state.readParked()).find(matches);
        if (parked) await this.state.dropParked(parked.taskTitle);
        const record = matches(active) ? active : parked;
        if (!record) {
            const blockers = await this.state.readBlockers();
            if (blockers[taskRef]) {
                await this.state.setBlocker(taskRef, undefined);
                this.wake();
                return `Cleared the recovery blocker of ${taskRef}.`;
            }
            throw new PtbkError(`No interrupted or failed work is recorded for ${taskRef}.`, { kind: 'not-found' });
        }
        if (action === 'acknowledge') {
            await this.answerRecovery(record, RECOVERY_CHOICES[1]);
            await this.acknowledgeRecord(record);
        } else if (action === 'retry') {
            await this.answerRecovery(record, RECOVERY_CHOICES[0]);
            await this.retryRecord(record);
        } else {
            if (record.phase === 'failed') {
                if (parked) await this.state.park(parked);
                throw new PtbkError('A failed task cannot resume; use --action retry or --action acknowledge.', { kind: 'usage' });
            }
            if (parked) await this.state.unpark(parked);
            this.wake();
        }
        await this.refreshChats();
        this.wake();
        return `${action} applied to ${record.taskRef}.`;
    }

    /** Records an explicit recovery decision as the user's chat reply (so the chat shows how it was resolved). */
    private async answerRecovery(record: ActiveRecord, choice: string): Promise<void> {
        if (!record.recoveryChat) return;
        await this.chats.append(record.recoveryChat, { sender: '@User', text: choice }, { status: 'resolved', trailers: { 'Task-Name': record.taskTitle } }).catch(() => undefined);
    }
}

/**
 * Work kinds whose failure is handed to Fixer before a decision is asked (generated routing, learning and discovery
 * work have their own bounded handling).
 */
const HANDOVER_KINDS: ReadonlySet<ActiveRecord['kind']> = new Set(['task', 'maintenance', 'intent']);

/**
 * Briefing of Fixer taking over a failed task in the same record.
 */
function handoverPrompt(record: ActiveRecord, handover: NonNullable<ActiveRecord['handover']>): string {
    return [
        '## Taking over a failed task',
        '',
        `${formatAgentReference(handover.from)} could not complete this task: ${handover.failure}`,
        '',
        `Promptbook handed it to you before asking anyone (automatic repair). The working tree may contain the partial changes of the earlier attempts; their evidence is in \`${traceDirectoryOf(record.sourcePath)}/\` (harness.log, events.jsonl).`,
        '',
        '- Diagnose the cause from that evidence, the task and the project; do not repeat external actions without verifying their current state.',
        `- Resolve what you can within the task's authority and complete the requested outcome; consult other agents (for example ${formatAgentReference(handover.from)}) when their expertise helps.`,
        '- When a genuine decision or human-only action is needed, consult your team as your own instructions direct.',
        '- If the task cannot be completed safely, report `blocked` with the concrete reason; nothing is retried automatically and the decision is then asked in a chat.',
    ].join('\n');
}

/**
 * Repair briefing of a task no configured agent/combination can execute (its own source and requirements stay).
 */
function impossibleDescription(task: Task, reason: string): string {
    return [
        `The task {${task.title}} (\`${task.source.relativePath}\`) cannot be executed: ${reason}`,
        `Its MODEL requirement is ${describeModel(task.routing.model)}${task.routing.agent ? ` and its responsible agent is ${task.routing.agent}` : ''}. Promptbook keeps the task unfinished and blocked; it is reevaluated automatically once its source or the project's tools/agents change.`,
        'Diagnose why no compatible combination exists (contradictory agent/task MODEL, a harness, model, endpoint or origin that no enabled tool offers) and repair it within your authority, for example by correcting a mistaken MODEL or TASK AGENT. Ask User before changing an explicit requirement when the repair would alter their intent; do not mark the task done or delete it.',
    ].join('\n\n');
}

/**
 * Converts a history record into a result view.
 */
function resultView(result: ResultRecord): ResultView {
    return {
        ref: result.taskRef,
        trace: result.trace,
        occurrence: result.occurrence,
        title: result.title,
        outcome: result.outcome,
        agent: result.agent,
        harness: result.harness,
        model: result.model,
        commit: result.commit,
        summary: result.summary,
        endedAt: result.endedAt,
        attempts: result.attempts,
        kind: result.kind,
        source: result.source,
        thinkingLevel: result.thinkingLevel,
        modelReported: result.modelReported,
        harnessVersion: result.harnessVersion,
        startedAt: result.startedAt,
    };
}

/**
 * The execution context of one agent run: harness, model and thinking level with honest unknown/automatic/
 * not-applicable distinctions in the harness's own terminology.
 *
 * @private agenda supervisor
 */
export function executionContextView(input: {
    readonly role: ExecutionContextView['role'];
    readonly agent: string;
    readonly by?: string;
    readonly harness: string;
    /** Named tool instance actually used. */
    readonly tool?: string;
    readonly harnessVersion?: string;
    readonly model?: string;
    readonly modelReported?: boolean;
    readonly thinkingLevel?: string;
    readonly sources?: RoutingSelection['sources'];
    readonly state: ExecutionContextView['state'];
}): ExecutionContextView {
    const plugin = HARNESS_PLUGINS.find((candidate) => candidate.id === input.harness);
    const model: ExecutionContextView['model'] = input.model
        ? { value: input.model, status: input.modelReported ? 'reported' : 'requested', source: input.sources?.model }
        : plugin
          ? { status: 'automatic' }
          : { status: 'unknown' };
    const thinkingLevel: ExecutionContextView['thinkingLevel'] = !plugin
        ? { value: input.thinkingLevel, status: input.thinkingLevel ? 'requested' : 'unknown' }
        : !plugin.thinkingLevels.length
          ? { status: 'not-applicable', source: `${plugin.displayName} has no thinking-level setting` }
          : input.thinkingLevel
            ? { value: input.thinkingLevel, status: 'requested', term: plugin.thinkingLabel, source: input.sources?.thinkingLevel }
            : { status: 'automatic', term: plugin.thinkingLabel };
    return {
        role: input.role,
        agent: input.agent,
        by: input.by,
        harness: { id: input.harness, name: plugin?.displayName ?? input.harness, version: input.harnessVersion, ...(input.tool ? { tool: input.tool } : {}) },
        model,
        thinkingLevel,
        state: input.state,
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

