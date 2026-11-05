import { createHash } from 'node:crypto';
import { AttentionOwner, evidenceFingerprint, type RelevanceVerdict } from './attention-owner.js';
import { nextProgressiveWait, outcomeFingerprint, restoreProgressiveWait, WAITING_POLICIES, withInitialDelay, type ProgressiveSchedule, type WaitingPolicy } from './progressive-waiting.js';
import { watch, type FSWatcher } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { formatDuration } from '../common/duration.js';
import { confinePath, ensureDirectory, pathExists, toProjectRelative } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { creationTimestamp, formatIsoWithOffset, formatShortTime } from '../common/time.js';
import { ENGINE_VERSION, detectInstallation } from '../common/version.js';
import { appendCommitment } from '../book/edit.js';
import { formatAgentReference, normalizeAgentName, parseReferenceValue, referenceName, toReference } from '../book/references.js';
import { isCheckPlaceholder, loadSettings, setting, SETTING_SPECS, serializeSettingValue, updatePolicyOf, updateProjectConfig, type BrowserOverrides, type EffectiveSettings, type LoadedSettings } from '../project/config.js';
import { AgentCatalog, learningPolicyOf, resolveEffectiveAgent, validateAgents, type AgentDefinition } from '../project/agents.js';
import { readBookSource, type BookSource } from '../project/book-sources.js';
import { validateAttachments } from '../chats/store.js';
import { materializeAttachments } from '../ui/attachments.js';
import type { TaskInventoryItem } from '../tasks/views.js';
import { agentSubject, commitPaths, git, inspectGit, stageableFiles } from '../project/git.js';
import { ActionLog } from './action-log.js';
import type { MethodologyEvidence } from './knowledge.js';
import { appendBrief, findBrief, readLatestBrief, REPORT_AUTHOR, REPORT_FILE, REPORT_NAME, type ReportView } from './report.js';
import { classifySubject, readCommit, readHistory, type HistoryDetail, type HistoryView } from '../project/history.js';
import { listFolder, readProjectFile, type FileView, type FolderView } from '../project/files.js';
import { coreReconciliationDescription, prepareCoreAgents, type CorePreparation } from '../project/core-templates.js';
import { isCoreAgent } from '../project/defaults.js';
import { readUsage, summarizeUsage, type UsageFilter, type UsageGrouping, type UsageRow, type UsageSummary } from './usage.js';
import { observePriceLists, readPriceObservations } from './pricing.js';
import { ensureTraceIgnoreRules, traceIgnoreRulesMatch } from '../project/setup.js';
import { runCheck } from '../project/checks.js';
import { newTaskPath, renderTaskBook } from '../tasks/authoring.js';
import { ACTIONS_DIRECTORY, distinctName, generatedName, traceDirectoryOf } from '../tasks/identity.js';
import { BookIndex } from '../project/books.js';
import { parseBook } from '../book/parse.js';
import { renderDeclaration } from '../book/write.js';
import { ChatStore, type ChatSummary, type ChatWrite, type OutstandingRequest } from '../chats/store.js';
import { ChatCommitBatcher } from '../chats/batcher.js';
import { awaitsReply, isHumanFacing } from '../chats/chat-book.js';
import { appendUserMessage, chatAgentChoices, chatDetail, createUserChat, resolveChatInvitations, type ChatAgentChoice, type ChatDetail, type ChatRecheckView, type ChatRequestView } from '../chats/service.js';
import { chatOriginOf, chatTaskCommitments, questionAuthor, type ChatTaskCard, type ChatTaskInput } from '../chats/chat-tasks.js';
import { assessAttentionRelevance, composeProjectBrief, findLoginCode, replyInChat, type ConversationContext, type LiveReply, type RelevanceRequest } from '../chats/conversation.js';
import type { VoiceCallView } from '../chats/voice-call.js';
import { VoiceCalls, type VoiceAvailabilityReport } from './voice-calls.js';
import { migrateLegacyRequests } from '../chats/migration.js';
import type { Project } from '../project/workspace.js';
import { checkHarnessVersion, updateHarness } from '../harness/maintenance.js';
import { HARNESS_PLUGINS, harnessName } from '../harness/registry.js';
import { HarnessSessions, type SessionClientLaunch, type SessionEntryView } from '../harness/sessions.js';
import { isOutstandingReceipt, receiptLine, TaskControlStore, type TaskControlOperation, type TaskControlOrigin, type TaskControlOutcome, type TaskStatusView } from './task-control.js';
import { readTaskBook } from '../tasks/book-task.js';
import { WALLET_WAIT, evaluateQueue, isUnfinished, selectCandidates, type EvaluatedTask, type RouteCheck, type SelectedTask } from '../tasks/eligibility.js';
import { setMarkdownControl } from '../tasks/markdown.js';
import { isRecurring, nameKey, type Task } from '../tasks/model.js';
import { describePriority } from '../tasks/priority.js';
import { findTask, readTaskQueue } from '../tasks/sources.js';
import { agentView, type BadgeActivity } from '../ui/badges.js';
import type { BridgeTool } from './bridge.js';
import { HANDOVER_ATTEMPTS, captureSnapshot, executeWork, type ExecutionEnvironment, type ExecutionOutcome, type PrerequisiteInput, type WorkItem } from './executor.js';
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
import { HarnessPool, instanceEnvironment } from './harnesses.js';
import { domainAttention } from './attention.js';
import { HealthSubEngine, type CachePreview, type SwapPlan } from './health.js';
import { WalletSubEngine, type LoginContext } from '../wallet/wallet.js';
import { readOperatorIntent, saveOperatorIntent, type ManualPauseCause } from './operator-intent.js';
import { EngineUpdater } from './engine-update.js';
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
    ChatAttentionView,
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
    UsageOverview,
    WaitView,
} from './snapshot.js';
import { StateStore, isolationBranch, parkedReadiness, type ActiveRecord, type ChatReplyRecheck, type RecheckSchedule, type RecoverySchedule, type ResultRecord, type RoutingSelection } from './state.js';
import { TaskTrace, sourceRevision } from './task-trace.js';
import { recordDiagnostic } from './traces.js';
import { finishWorktree, isIntegrated } from './isolation.js';
import { FileOwnership, TurnWindows, type FileConflict } from './concurrency.js';
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
    readonly extraTools?: (task: Task, context: { readonly chats: TaskChats; readonly agent: string; readonly onUserChat: (chat: { chat: string; awaited: number }) => void; readonly onWalletWait: (action: string) => void; readonly trace: TaskTrace; readonly attempt: string; readonly occurrence?: string; readonly methodology?: MethodologyEvidence }) => BridgeTool[];
    /** Answers a user message in a human-led chat (an agent turn outside the task queue). */
    readonly chatReplies?: boolean;
    /** Finalizes a task's evidence produced outside the harness (its browser video) before its result commit. */
    readonly finalizeEvidence?: (task: Task, trace: TaskTrace) => Promise<void>;
    /** Releases a task's own resources (its browser tabs) after each of its executed runs, whatever the outcome. */
    readonly afterWork?: (task: Task) => Promise<void>;
    /** Named browser tools owned by the service: inspections for the dashboard pages and the names held by work. */
    readonly browsers?: { readonly primary: () => BrowserDetailView | undefined; readonly all: () => BrowserDetailView[]; readonly inUse: () => string[] };
    /** Opens a separate, fresh login context of the project browser for a Wallet credential test. */
    readonly walletLoginContext?: (origin: string) => Promise<LoginContext>;
    /** Browser tools of a short agent session looking for a Wallet test's one-time code, in their own scope of the project browser. */
    readonly walletCodeTools?: () => { readonly tools: readonly BridgeTool[]; readonly dispose: () => Promise<void> };
    /** Longest wait before records of one bulk external operation are committed together. */
    readonly actionGroupCommitMs?: number;
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
 * A pending lifecycle request applied once active work settles.
 *
 * @private agenda supervisor
 */
export type LifecycleIntent = 'pause' | 'stop' | 'restart';

/**
 * Outcome of a lifecycle operation, shared by CLI, terminal, browser and API.
 *
 * `accepted` means the request is pending (work is settling) or applied; `completed` that its effect already holds.
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
 * How often session leases and idle retention are reconciled.
 */
const SESSION_RECONCILE_MS = 5_000;

/**
 * Recheck interval of setup/workspace/recovery blockers.
 */
/**
 * Longest age of the cached usage overview of snapshots.
 */
const USAGE_REFRESH_MS = 60_000;

/**
 * First recheck of a setup/configuration blocker; repeated unchanged blockers back off through the shared setup policy.
 */
const BLOCKER_RECHECK_MS = WAITING_POLICIES.setup.initialMs;

/**
 * How often reassigned work looks again whether its new agent is free. Nothing is running meanwhile, so it stays cheap.
 */
const REASSIGNMENT_RECHECK_MS = 15_000;

/**
 * Longest idle sleep before reevaluating sources and time.
 */
const IDLE_RECHECK_MS = 10 * 60_000;

/**
 * Interval of automatic harness update checks.
 */
const HARNESS_MAINTENANCE_INTERVAL_MS = 12 * 3_600_000;

/**
 * How often the agenda looks at whether a price-list observation is due (its schedule survives restarts).
 */
const PRICE_CHECK_SPACING_MS = 3_600_000;

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
 * First delay of a cause-aware recheck once a task's immediate budgets (and Fixer's round) are exhausted
 * (`PTBK_RECOVERY_RECHECK_MS` overrides it, e.g. for fixtures); later rounds follow the shared task-recovery policy.
 */
const RECOVERY_RECHECK_MS = WAITING_POLICIES.taskRecovery.initialMs;

/**
 * Quiet period after chat or lifecycle changes before outstanding human requests are reconciled with their owners.
 */
const ATTENTION_REVIEW_DEBOUNCE_MS = 2_000;

/**
 * Changed conditions bring a recheck forward, but never sooner than this after it was scheduled (flapping readiness
 * cannot cause a burst of paid rechecks).
 */
const RECOVERY_MIN_SPACING_MS = 60_000;

/**
 * First delay of the automatic recheck of a failed chat reply (`PTBK_CHAT_REPLY_RECHECK_MS` overrides it, e.g. for
 * fixtures); someone waits in the chat, so it starts sooner than a task's and is capped lower.
 */
const CHAT_REPLY_RECHECK_MS = WAITING_POLICIES.chatReply.initialMs;

/**
 * The next round of a cause-aware recheck after a failure, shared by tasks, chat replies and Chatter's brief through
 * the engine's one [progressive-waiting](../../specs/concepts/progressive-waiting.md) policy: the failure's
 * fingerprint under its conditions, how often an equivalent failure repeated under unchanged conditions and the
 * spread, capped, growing delay of the domain.
 *
 * @private agenda supervisor
 */
export function nextRecheck(previous: RecheckSchedule | undefined, failure: { readonly cause: string; readonly conditions: string }, policy: WaitingPolicy, now: number = Date.now()): RecheckSchedule {
    return nextProgressiveWait(previous, failure, policy, now);
}

/**
 * Longest wait of the `claim_files` tool for a file another run holds (the agent then works on other files).
 */
const CLAIM_WAIT_MS = 10 * 60_000;

/**
 * Longest wait of a failing check for other runs' uncommitted files to settle before it counts as this run's failure.
 */
const FOREIGN_SETTLE_MS = 30 * 60_000;

/**
 * Retry interval of a failed result commit (persistence resumes without rerunning the agent).
 */
const PERSISTENCE_RETRY_MS = 120_000;

/**
 * Quiet period after the latest message of a chat before its saved messages are committed together
 * (`PTBK_CHAT_BATCH_QUIET_MS` overrides it, e.g. for fixtures).
 */
const CHAT_BATCH_QUIET_MS = 5_000;

/**
 * Longest time saved chat messages wait for their commit while the conversation continues.
 */
const CHAT_BATCH_MAX_AGE_MS = 60_000;

/**
 * Regular cadence of project briefs while results keep arriving (`PTBK_REPORT_INTERVAL_MS` overrides both bounds, e.g.
 * for fixtures).
 */
const REPORT_INTERVAL_MS = 6 * 3_600_000;

/**
 * Earliest new brief after a significant change (a blocker, failure, wait for the owner or pause appeared or resolved).
 */
const REPORT_EVENT_SPACING_MS = 30 * 60_000;

/**
 * First delay of the cause-aware recheck of a failed brief generation; later rounds follow the shared report policy
 * (repeated equivalent failures wait longest, so an unavailable provider causes no paid idle loop).
 */
const REPORT_RECHECK_MS = WAITING_POLICIES.report.initialMs;

/**
 * Summary of the manual pause reason by its cause (shown wherever pause reasons are listed).
 */
const MANUAL_PAUSE_SUMMARIES: Readonly<Record<ManualPauseCause, string>> = {
    operator: 'Paused by the operator (Pause).',
    'start-paused': 'Started paused (ptbk start --paused): queued work waits for Resume.',
    inactive: 'Started paused after a deliberate stop: queued work waits for Resume.',
    'unexpected-loss': 'Started paused because the previous process ended unexpectedly: queued work waits for Resume.',
};

/**
 * Log line of a restored manual pause by its cause.
 */
const MANUAL_PAUSE_RESTORED: Readonly<Record<ManualPauseCause, string>> = {
    operator: 'Restored the manual pause.',
    'start-paused': 'Started paused.',
    inactive: 'Started paused: the service was stopped deliberately before this start.',
    'unexpected-loss': 'Started paused: the previous process ended unexpectedly, which never resumes work by itself.',
};

/**
 * One unit of active work: a background task (its runs: Router prerequisite, the task itself,
 * a goal enquiry) or one chat turn. Units progress concurrently in the project's one working tree; each run owns the
 * files it changes.
 */
type WorkUnit = {
    /** Unit identity (a fresh id, or `chat:<name key>`). */
    readonly id: string;
    readonly kind: 'task' | 'chat';
    /** Task or chat name. */
    readonly label: string;
    /** Normalized task name claimed by this unit (never claimed twice). */
    readonly key?: string;
    /** When the unit started (epoch ms). */
    readonly startedAt: number;
    /** The run executing now (its run identifier owns files). */
    owner: string;
    /** Interruption of this unit's task work by an accepted pause (chat turns never receive it). */
    readonly interrupt: AbortController;
    /** Live view of the work. */
    current?: CurrentWorkView;
    /** Effective routing of the run and its consultation contexts (for the execution panel). */
    context?: { readonly selection: RoutingSelection; readonly harnessVersion?: string; readonly source: string; consultations: ExecutionContextView[] };
    /** A pacing/backoff wait inside the run (skippable) or its wait for files. */
    wait?: WaitView;
    /** Since when its failing check waits for other runs' uncommitted files to settle (orders mutual waits). */
    checkWaitingSince?: number;
    waiter?: { readonly skippable: boolean; readonly resolve: (reason: 'elapsed' | 'skipped' | 'cancelled' | 'woken') => void };
};

/**
 * The project supervisor: concurrent background tasks and chat turns in the project's one working tree, within the
 * one started unfinished task per agent and per-file ownership, without a shared work-count limit.
 *
 * @private agenda supervisor
 */
export class Agenda {
    private revision = 0;
    private readonly changeListeners = new Set<() => void>();
    private phase: Phase = 'starting';
    /** Observed outcome after the agenda ended (not a live state). */
    private exitState?: 'stopped';
    /** Active units of work (background tasks and chat turns). */
    private readonly units = new Map<string, WorkUnit>();
    /** The shared limit of active tasks and chat turns together. */
    /** Per-file mutation ownership of active (and checkpointed) runs. */
    private readonly ownership: FileOwnership;
    /** Harness-turn windows (attribution of changes nobody claimed). */
    private readonly turns = new TurnWindows();
    /** Normalized task names claimed by active units. */
    private readonly claimedKeys = new Set<string>();
    /** Active records whose resumption waits (quota, setup, failed commit) until this time (epoch ms), by run. */
    private readonly resumeAfter = new Map<string, number>();
    /** Due times (epoch ms) of scheduled automatic rechecks of failed tasks, by run: idle waits end when one is due. */
    private readonly recoveryDue = new Map<string, number>();
    /** Automatic rechecks of failed chat replies by normalized chat name; a timer is armed while the recheck waits. */
    private readonly chatRechecks = new Map<string, { readonly name: string; readonly schedule: ChatReplyRecheck; timer?: NodeJS.Timeout }>();
    /** Supervision of outstanding human requests by their responsible agents (created on first use). */
    private attentionOwnerInstance?: AttentionOwner;
    /** Debounce of attention reconciliation. */
    private attentionTimer?: NodeJS.Timeout;
    /**
     * Progressive waits of the supervisor loop (tools, setup blockers, a failing pre-work check) by condition key: an
     * unchanged condition rechecks less and less often; only a due round advances, so unrelated wake-ups neither
     * advance nor reset it, while a substantive change of its conditions restarts a short interval.
     */
    private readonly loopWaits = new Map<string, ProgressiveSchedule>();
    /** No new background claim before this time (pause between tasks). */
    private pacingUntil = 0;
    /** Listeners waiting for an active unit to finish (settling towards stop). */
    private readonly unitListeners = new Set<() => void>();
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
    /**
     * The ordinary manual pause reason (since when): set by Pause, removed by Resume. Pause is composed from this and the
     * Health sub-engine's reasons; scheduling continues only when no reason remains.
     */
    private manualPauseSince?: string;
    /** Why the manual pause reason is active (the operator's Pause, a paused start or a conservative restoration). */
    private manualPauseCause: ManualPauseCause = 'operator';
    /** A pause became effective while task work was still settling (logged once it has). */
    private pauseSettling = false;
    /** Pending stop/restart applied once active work settles. */
    private intent?: Exclude<LifecycleIntent, 'pause'>;
    /** When the pending request was accepted (ISO). */
    private intentSince?: string;
    /** Revision of the lifecycle decision; a confirmation made against an older revision is stale. */
    private intentRevision = 0;
    /** Irreversible shutdown has begun (cancellation is too late). */
    private shutdown?: 'stop' | 'restart' | 'force';
    /** Whether shutdown was requested by the operating system (not an intentional user stop). */
    private shutdownBySignal = false;
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
    private connection: ConnectionView = { local: { state: 'disabled' } };
    private readonly startedAt = new Date().toISOString();
    private lastHarnessMaintenance = 0;
    /** Whether a price-list observation is running in the background. */
    private observingPrices = false;
    /** No need to look at the schedule again before this time. */
    private nextPriceCheck = 0;
    private readonly watchers: FSWatcher[] = [];
    private wakeTimer?: NodeJS.Timeout;
    private configTimer?: NodeJS.Timeout;
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
    /** The project's Wallet sub-engine (encrypted website logins, protected login requests). */
    public readonly wallet: WalletSubEngine;
    /** Durable audit of external task actions (`actions/<task-file-basename>/`), independent of traces. */
    public readonly actions: ActionLog;
    /** The engine-owned self-update system task (low priority; it runs only when this engine has free hands). */
    private readonly updater: EngineUpdater;
    /** The self-update holds its maintenance boundary: nothing new starts until it ends. */
    private maintenance?: { readonly done: Promise<void>; readonly end: () => void };
    /** The saved latest project brief (read from `report.book`, never generated by reading). */
    private reportView: ReportView = { path: REPORT_FILE, state: 'missing' };
    /** Change key of the last read of `report.book` (size and modification time). */
    private reportStamp?: string;
    /** A brief is being generated now. */
    private reportGenerating = false;
    /** An explicit Refresh waiting for background scheduling (ISO). */
    private reportRequest?: string;
    /** The cause-aware automatic recheck of a failed brief (persisted in `.ptbk/state/report.json`). */
    private reportRecheck?: RecheckSchedule;
    /** A saved brief whose commit failed (only the commit is retried, never the generation). */
    private reportCommitPending = false;
    /** Timer of the next retry of a failed brief commit. */
    private reportCommitTimer?: NodeJS.Timeout;
    /** The newest commit of the current branch (History tile), refreshed at a bounded rate. */
    private lastCommit?: { readonly sha: string; readonly at: string; readonly summary: string; readonly kind: string };
    /** When the last commit was read (epoch ms). */
    private lastCommitReadAt = 0;

    /** The harness session inventory of this engine. */
    private readonly sessions: HarnessSessions;

    /** Accepted task control requests, instruction receipts and completion notifications. */
    private readonly taskControlStore: TaskControlStore;

    public constructor(private readonly options: AgendaOptions) {
        this.state = new StateStore(options.project.runtime.state);
        this.taskControlStore = new TaskControlStore(this.state);
        this.sessions = new HarnessSessions({
            save: async (records) => await this.state.writeHarnessSessions(records),
            changed: () => this.touch(),
            log: (message, level) => this.log(message, level),
        });
        this.ownership = new FileOwnership(options.project.root, { onChange: () => this.touch() });
        this.chatBatches = new ChatCommitBatcher(options.project, {
            repositoryRoot: () => this.repositoryRoot,
            commit: async (paths, subject, trailers) => await this.commitAuthoring(paths, subject, trailers),
            quietMs: Number(options.env.PTBK_CHAT_BATCH_QUIET_MS) || CHAT_BATCH_QUIET_MS,
            maxAgeMs: Math.max(Number(options.env.PTBK_CHAT_BATCH_QUIET_MS) || 0, CHAT_BATCH_MAX_AGE_MS),
            retryMs: 60_000,
            // Saved chat files are engine-authored until committed: never attributed to a task or seen as foreign edits.
            onPending: (paths, pending) => {
                for (const path of paths) {
                    if (pending) this.authoredPaths.add(path);
                    else this.authoredPaths.delete(path);
                }
            },
            onChange: () => void this.refreshChats().catch(() => undefined),
            log: (text, level) => this.log(text, level),
        });
        this.sync = new SyncCoordinator({
            repositoryRoot: () => this.repositoryRoot,
            env: options.env,
            gitLock: (action) => this.gitMutex.run(action),
            enabled: () => Boolean(this.settings && setting<boolean>(this.settings, 'isAutoSync') && this.commitMode),
            integrationBlocker: async (files) => await this.integrationBlocker(files),
            onConflict: async (conflict) => await this.scheduleSyncConflict(conflict),
            onIntegrated: async () => {
                await this.refreshContext();
                // Records of another machine arrive here as ordinary project files.
                await this.actions.refresh().catch(() => undefined);
                this.wake();
            },
            onChange: () => this.touch(),
            log: (text, level) => this.log(text, level),
            backoff: { load: async () => await this.state.readSyncBackoff(), save: async (schedule) => await this.state.writeSyncBackoff(schedule) },
        });
        this.actions = new ActionLog({
            project: options.project,
            env: options.env,
            timeZone: () => (this.settings ? this.timeZone : 'UTC'),
            persist: async (record) => await this.persistActionRecord(record),
            onChange: () => this.touch(),
            log: (text, level) => this.log(text, level),
            retryMs: PERSISTENCE_RETRY_MS,
            ...(options.actionGroupCommitMs === undefined ? {} : { groupCommitMs: options.actionGroupCommitMs }),
            reserve: (paths) => {
                for (const path of paths) this.authoredPaths.add(path);
            },
            sessionKnown: (handle) => this.sessions.byHandle(handle) !== undefined,
        });
        this.wallet = new WalletSubEngine({
            project: options.project,
            env: options.env,
            onChange: () => this.touch(),
            // A resolved login request lets its checkpointed task resume at the next iteration.
            onSettled: () => this.wake(),
            log: (text, level) => this.log(text, level),
            ...(options.walletLoginContext ? { loginContext: options.walletLoginContext } : {}),
            ...(options.walletCodeTools ? { findLoginCode: async (request) => await this.findWalletTestCode(request, options.walletCodeTools!) } : {}),
        });
        this.updater = new EngineUpdater({
            project: options.project,
            env: options.env,
            mode: options.mode,
            policy: () => (this.settings ? { ...updatePolicyOf(this.settings), source: this.settings.sources['updates.isAutoUpdateEnabled'] ?? 'default' } : { isAutoUpdateEnabled: true, source: 'default' }),
            log: (text, level) => this.log(text, level),
            changed: () => this.touch(),
            wake: () => this.wake(),
            // Changed versioned package files are a scoped system operation commit (no agent, no Task-Name).
            commit: async (paths, summary) => (this.commitMode && this.repositoryRoot ? await this.commitAuthoring(paths, summary) : undefined),
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

    /**
     * Batched commits of human-facing chats: every accepted message is saved to its Book at once, and compatible saves
     * of one chat share a bounded, debounced `ptbk: Chat - <name>` commit (never one per message).
     */
    private readonly chatBatches: ChatCommitBatcher;

    /** The project's chats (messages are saved at once; their commits are batched unless explicitly uncommitted). */
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
                    : { schedule: async (chat, paths, trailers) => await this.chatBatches.schedule(chat, paths, trailers) },
                takenNames: async () => await this.freshTakenNames(),
            });
        }
        return this.chatStore;
    }

    /**
     * Responsible-agent supervision of outstanding human requests: owners (Fixer for orphaned requests), progressive
     * relevance checks and verified withdrawal (one shared operation for every client).
     */
    private get attentionOwner(): AttentionOwner {
        if (!this.attentionOwnerInstance) {
            this.attentionOwnerInstance = new AttentionOwner({
                chats: this.chats,
                stateDirectory: this.options.project.runtime.state,
                agentsAllowed: () => this.claimable && !this.stopRequested,
                agentExists: (name) => !this.catalog || this.catalog.index.winnerOf(normalizeAgentName(name))?.kind === 'agent',
                obsolete: async (request) => await this.obsoleteRequest(request),
                evidence: async (request) => await this.requestEvidence(request),
                assess: async (owner, requests) => await this.assessRequests(owner, requests),
                onWithdrawn: async () => {
                    await this.refreshChats();
                    this.wake();
                },
                onChange: () => this.touch(),
                log: (text, level) => this.log(text, level ?? 'info'),
                // `PTBK_ATTENTION_RECHECK_MS` shortens the first check for fixtures; growth and the one-week cap stay.
                policy: withInitialDelay(WAITING_POLICIES.attention, Number(this.options.env.PTBK_ATTENTION_RECHECK_MS) || undefined),
            });
        }
        return this.attentionOwnerInstance;
    }

    /** Debounced reconciliation of attention ownership after chat and lifecycle changes. */
    private scheduleAttentionReview(): void {
        if (this.options.mode === 'maintenance' || this.stopRequested) return;
        clearTimeout(this.attentionTimer);
        this.attentionTimer = setTimeout(() => void this.attentionOwner.reconcile(), ATTENTION_REVIEW_DEBOUNCE_MS);
        this.attentionTimer.unref?.();
    }

    /**
     * Deterministic obsolescence of an outstanding request without a model: every task its chat serves was cancelled
     * or retired (the work was withdrawn). A request a checkpointed task waits for is handled by that checkpoint.
     */
    private async obsoleteRequest(request: OutstandingRequest): Promise<string | undefined> {
        if (await this.isAwaitedByTask(request.chat)) return undefined;
        const linked = request.links.map((link) => parseReferenceValue(link)?.normalized).filter((key): key is string => Boolean(key));
        if (!linked.length) return undefined;
        const tasks = (await this.readQueue()).tasks.filter((task) => !task.shadowedBy && linked.includes(task.key));
        if (!tasks.length || tasks.length !== linked.length) return undefined;
        if (!tasks.every((task) => task.status === 'cancelled' || task.status === 'retired')) return undefined;
        const task = tasks[0]!;
        return `${formatAgentReference(task.title)} was ${task.status === 'cancelled' ? 'cancelled' : 'retired'}, so I no longer need this.`;
    }

    /** Fingerprint of the evidence relevant to a request: its chat, linked tasks and the project's latest commit. */
    private async requestEvidence(request: OutstandingRequest): Promise<string> {
        const linked = request.links.map((link) => parseReferenceValue(link)?.normalized).filter((key): key is string => Boolean(key));
        const tasks = linked.length ? (await this.readQueue()).tasks.filter((task) => linked.includes(task.key)).map((task) => [task.key, task.status, task.doneStamps.length]) : [];
        await this.refreshLastCommit().catch(() => undefined);
        return evidenceFingerprint([request.messages, request.status, tasks, this.lastCommit?.sha ?? '', this.walletEvidence()]);
    }

    /** Nonsecret Wallet state relevant to login requests (pending requests and their steps). */
    private walletEvidence(): string {
        const wallet = this.wallet?.view();
        return wallet ? `${wallet.state}:${wallet.pending.map((action) => `${action.id}:${action.problem}:${action.step ?? 0}`).join(',')}:${wallet.records.length}` : '';
    }

    /** A bounded paid relevance assessment of one owner's related requests (read-only, attributed usage). */
    private async assessRequests(owner: string, requests: readonly OutstandingRequest[]): Promise<{ readonly verdicts: readonly RelevanceVerdict[] } | { readonly unavailable: string }> {
        if (!this.catalog || !this.settings) return { unavailable: 'The engine is still starting.' };
        const input: RelevanceRequest[] = [];
        for (const request of requests) {
            const stored = await this.chats.find(request.chat);
            const later = (stored?.chat.messages ?? []).slice(request.message).filter((message) => message.phase !== 'progress').slice(-12).map((message) => `${message.sender}: ${message.text.replace(/\s+/g, ' ')}`);
            input.push({ id: request.id, chat: request.chat, relativePath: request.relativePath, at: request.at, text: request.text, later, links: request.links });
        }
        return await assessAttentionRelevance(
            { project: this.options.project, settings: this.settings, catalog: this.catalog, pool: this.pool, env: this.options.env, signal: this.ownedWork.signal, onActivity: (text) => this.log(text), sessions: this.sessions },
            { agent: owner, requests: input, digest: this.reportDigest() },
        );
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
        // The operator's accepted manual pause (also one still settling, or one installed by a paused start) survives
        // crashes and reboots: it holds before any background claim. Health reasons are re-evaluated by the fresh
        // Health sub-engine instead.
        const restored = this.options.mode === 'maintenance' ? undefined : readOperatorIntent(project)?.manualPause;
        if (restored) {
            this.manualPauseSince = restored.since;
            this.manualPauseCause = restored.cause ?? 'operator';
            this.log(`${MANUAL_PAUSE_RESTORED[this.manualPauseCause]} No background task starts until you resume (ptbk resume).`);
        }
        // This owner now holds the intent: an earlier host termination no longer describes the last run.
        if (this.options.mode !== 'maintenance') {
            try {
                saveOperatorIntent(project, restored);
            } catch (error) {
                this.log(`The lifecycle intent could not be saved for crash/reboot recovery: ${errorMessage(error)}`, 'warning');
            }
        }
        await this.maintainConfiguration();
        await this.refreshContext(true);
        // A replacement started by the previous process is verified by the version this process actually loaded.
        await this.updater.load();
        // Chat messages an earlier process saved but did not commit (force stop, crash) are committed first.
        if (this.commitMode && this.repositoryRoot) {
            const recovered = await this.chatBatches.recover().catch((error: unknown) => {
                this.log(`Saved chat messages could not be committed yet: ${errorMessage(error)}`, 'warning');
                return [];
            });
            if (recovered.length) this.log(`Committed chat messages saved before the last stop (${recovered.map((sha) => sha.slice(0, 8)).join(', ')}).`);
            // External-action records saved but not committed before the last stop: only their persistence resumes.
            const actions = await this.actions.recover(await stageableFiles(project.root, ACTIONS_DIRECTORY)).catch(() => 0);
            if (actions) this.log(`Committed ${actions} external-action record(s) saved before the last stop.`);
        }
        await this.actions.refresh().catch(() => undefined);
        await this.actions.prune().catch(() => undefined);
        const report = await this.state.readReport().catch(() => undefined);
        this.reportRequest = report?.requestedAt;
        this.reportRecheck = report?.recheck;
        // A brief saved but not committed before the last stop: only its commit resumes, never the generation.
        if (report?.isCommitPending) await this.persistReport(join(project.root, REPORT_FILE));
        await this.refreshReportView();
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
        await this.restoreOwnership();
        // Automatic unlock through this host's protected secret: no words or master password at startup.
        await this.wallet.initialize().catch((error: unknown) => this.log(`The Wallet could not be loaded: ${errorMessage(error)}`, 'warning'));
        // Results finished before an interruption still reach their chat (once).
        if (this.options.mode !== 'maintenance') for (const result of results.slice(0, 50)) await this.deliverChatOutcome(result).catch(() => undefined);
        if (this.options.mode !== 'maintenance') {
            // User messages written while no service ran (or interrupted replies) still get their agent's reply, once.
            const rechecks = await this.state.readChatRechecks();
            const addresses = await this.state.readChatAddresses();
            const conditions = this.toolConditions();
            for (const stored of await this.chats.list().catch(() => [])) {
                // An accepted address keeps its routing across a restart: history is never interpreted again.
                const address = addresses[stored.chat.name];
                if (address?.agents.length && isHumanFacing(stored.chat) && stored.chat.status !== 'resolved') {
                    for (const agent of address.agents) this.queueChatReply(stored.chat.name, { agent, followUp: true });
                    continue;
                }
                if (!isHumanFacing(stored.chat) || !awaitsReply(stored.chat) || stored.chat.status === 'resolved') continue;
                // Speech the native voice path already accepted is never answered again in text.
                if ((await this.voiceCalls.nativelyAccepted(stored.chat.name)) >= stored.chat.messages.length) continue;
                // An answer a task waits for resumes the task; a clarifying question in a still-waiting chat gets a reply.
                const awaited = await this.isAwaitedByTask(stored.chat.name);
                if (!(awaited ? stored.chat.status === 'waiting-for-user' : stored.chat.status === 'open')) continue;
                // A reply that failed before the restart keeps its scheduled recheck unless its tools changed meanwhile.
                // Restored without resetting its backoff: an overdue round is one due check now, never a catch-up burst.
                const saved = rechecks[stored.chat.name];
                const recheck = saved ? { ...saved, ...restoreProgressiveWait(saved, WAITING_POLICIES.chatReply) } : undefined;
                if (recheck && Date.parse(recheck.nextAt) > Date.now() && recheck.conditions === conditions) {
                    this.armChatRecheck(stored.chat.name, recheck);
                    continue;
                }
                if (recheck) this.chatRechecks.set(nameKey(stored.chat.name), { name: stored.chat.name, schedule: recheck });
                this.queueChatReply(stored.chat.name, recheck?.agent ? { agent: recheck.agent } : {});
            }
            // Rechecks of chats that no longer owe a reply are dropped.
            if (Object.keys(rechecks).length) await this.saveChatRechecks();
        }
    }

    /** Whether a task waits for (or was just answered in) this chat: its reply resumes the task instead. */
    private async isAwaitedByTask(name: string): Promise<boolean> {
        return [...(await this.state.readParked()), ...(await this.state.readActiveRecords())].some((record) => record.waitingChat === name || record.recoveryChat === name);
    }

    /**
     * Restores per-file ownership of the previous engine's runs (active and checkpointed records). This engine holds
     * the project lock, so every record belongs to the verified previous owner; their files stay theirs until each
     * run completes, is acknowledged or resumes.
     */
    private async restoreOwnership(): Promise<void> {
        for (const record of [...(await this.state.readActiveRecords()), ...(await this.state.readParked())]) {
            if (!record.ownedFiles?.length) continue;
            const restored = this.ownership.tryAcquire(record.runId, record.taskTitle, record.ownedFiles);
            if (!restored.ok) this.log(`Ownership of ${restored.conflicts.map((conflict) => conflict.path).join(', ')} is recorded for both "${record.taskTitle}" and "${restored.conflicts[0]!.label}"; the first keeps it.`, 'warning');
        }
    }

    /**
     * Prepares the required core agents through the same operation as init: missing roles (e.g. a role introduced by
     * an engine upgrade) are created without another init, clean template updates are applied by a three-way merge
     * that preserves project and learned changes, and overlaps or unverifiable baselines become one ordinary,
     * deduplicated Fixer task. Changes are one scoped commit; a resolved reconciliation is never repeated.
     */
    private async ensureCoreAgents(): Promise<void> {
        if (!this.repositoryRoot) return;
        const agentsDirectory = setting<string>(this.settings, 'paths.agents');
        // A missing Router is created directly runnable: the first suitable enabled harness and its plugin defaults.
        const prepared = await prepareCoreAgents(this.options.project.root, agentsDirectory, {
            runtimeRoot: this.options.project.runtime.root,
            routerModel: async () => {
                const completed = await completeWithDefaults(UNCONSTRAINED, this.routing, { includeUnusable: true });
                return completed.row ? formatModelRow(completed.row) : undefined;
            },
        });
        const { created, updated } = prepared;
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
        const changed = [...created, ...updated];
        if (changed.length) {
            const summary = created.length && updated.length ? 'Prepare core agents' : created.length ? 'Add required core agents' : 'Update core agents from engine templates';
            const commit = this.commitMode ? await this.commitAuthoring(changed, summary).catch(() => undefined) : undefined;
            if (!this.commitMode) for (const path of changed) await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, path)]: null });
            const list = (paths: readonly string[]): string => paths.map((path) => toProjectRelative(this.options.project.root, path)).join(', ');
            this.log(`${created.length ? `Added missing core agent(s): ${list(created)}. ` : ''}${updated.length ? `Applied engine template updates, keeping project changes: ${list(updated)}. ` : ''}${commit ? `(${commit.slice(0, 8)})` : ''}`.trim());
            await this.refreshContext();
        }
        // A changed CLOSED core Book is the user's anchor: its template update is held and reported once, never sent
        // to Fixer.
        const unreported = prepared.held.filter((book) => !book.isReported);
        if (unreported.length) {
            this.log(
                `A newer engine template was not applied to ${unreported.map((book) => toProjectRelative(this.options.project.root, book.path)).join(', ')}: the project changed ${unreported.length === 1 ? 'this CLOSED Book' : 'these CLOSED Books'}, and CLOSED anchors ${unreported.length === 1 ? 'it' : 'them'} against automatic rewriting. Edit ${unreported.length === 1 ? 'it' : 'them'} yourself (or ask for the change in a chat) to adopt the template.`,
            );
            await prepared.markHeldReported();
        }
        await this.reconcileCoreTemplates(prepared, agentsDirectory);
    }

    /**
     * Sends core template updates that need judgment to one ordinary Fixer task. Once that task has finished (Fixer
     * merged, adapted or deliberately kept the project version), the new templates become the baselines, so the same
     * update is never requested again.
     */
    private async reconcileCoreTemplates(prepared: CorePreparation, agentsDirectory: string): Promise<void> {
        if (!prepared.conflicts.length) return;
        const key = 'core-templates';
        const previous = (await this.state.readRepairs())[key];
        if (previous?.fingerprint === shortHash(prepared.fingerprint, 16)) {
            const task = (await this.readQueue()).tasks.find((candidate) => nameKey(candidate.title) === nameKey(previous.task));
            if (!task || task.status === 'done' || task.status === 'retired' || task.status === 'cancelled') {
                await prepared.resolve(prepared.conflicts.map((conflict) => conflict.file));
                this.log(`Core template updates were reconciled by {${previous.task}}.`);
            }
            return;
        }
        const names = prepared.conflicts.map((conflict) => conflict.name).join(', ');
        await this.scheduleRepair({
            key,
            origin: 'maintenance: core agent template update',
            title: `Reconcile core agent template updates (${names})`,
            description: coreReconciliationDescription(prepared.conflicts, agentsDirectory),
            links: prepared.conflicts.map((conflict) => formatAgentReference(conflict.name)),
            fingerprint: prepared.fingerprint,
        });
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
        // Sessions are restored before any claim: retained context, never permission to continue.
        this.sessions.restore(await this.state.readHarnessSessions());
        await this.taskControlStore.load();
        const reconciling = setInterval(() => this.sessions.reconcile(), SESSION_RECONCILE_MS);
        reconciling.unref?.();
        // The host serves this engine now (control endpoint and process record): an update restart into it is verified.
        await this.updater.confirmServing();
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
            clearInterval(reconciling);
            await this.sessions.flush();
            // Voice calls end first, so their final recordings join the chat batch flushed below.
            await this.voiceCallsInstance?.endAll('The engine stopped.').catch(() => undefined);
            this.stopWatching();
            // A graceful stop or restart commits saved chat messages; a force stop leaves them to recovery.
            if (this.shutdown !== 'force') await this.chatBatches.flush().catch(() => undefined);
            // The same for saved records of a bulk external operation.
            if (this.shutdown !== 'force') await this.actions.flush().catch(() => 0);
            this.chatBatches.dispose();
        }
        this.exitState = 'stopped';
        this.phase = 'stopped';
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

    /** How the agenda is shutting down: an intentional stop or force stop, a restart, or an OS termination request. */
    public get shutdownReason(): 'stop' | 'force' | 'restart' | 'signal' | undefined {
        return this.shutdownBySignal ? 'signal' : this.shutdown;
    }

    /** Whether shutdown is a force stop (owned execution is interrupted, and killed if it does not end promptly). */
    public get forceStopped(): boolean {
        return this.shutdown === 'force';
    }

    /** Whether the stop that ended the agenda was an intentional user request (not a restart or an OS signal). */
    public get intentionalStop(): boolean {
        return (this.shutdown === 'stop' || this.shutdown === 'force') && !this.shutdownBySignal;
    }

    // ── Directing existing work (shared by chats, terminal, browser and API) ─

    /** The current state of work matching a description; it changes nothing and creates nothing. */
    public async taskStatus(query = ''): Promise<TaskStatusView[]> {
        const needle = query.trim().toLowerCase();
        // A status answer reads the Books as they are now, also while nothing is being scheduled.
        if (this.catalog) await this.evaluate().catch(() => undefined);
        const inventory = await this.taskInventory();
        const matching = inventory.filter((item) => !needle || item.title.toLowerCase().includes(needle) || (item.agent ?? '').toLowerCase().includes(needle));
        const sessions = this.sessions.view().open;
        return matching.slice(0, 40).map((item) => ({
            task: item.title,
            state: item.readiness,
            ...(item.reason ? { reason: item.reason } : {}),
            ...(item.agent ? { agent: item.agent } : {}),
            sessions: sessions.filter((session) => session.work.kind === 'task' && session.work.ref === item.ref).map((session) => `${session.agent}: ${session.state}${session.detail ? ` (${session.detail})` : ''}`),
            receipts: item.source ? this.taskControlStore.receiptsOf(item.source).filter(isOutstandingReceipt).map(receiptLine) : [],
            ...(this.recentResults.find((result) => nameKey(result.title) === nameKey(item.title)) ? { result: this.recentResults.find((result) => nameKey(result.title) === nameKey(item.title))!.summary } : {}),
        }));
    }

    /**
     * Accepts one change to existing work: appended to its Book under the same lock as result commits, then reconciled
     * with the running work. Saving alone is not delivery, and every receipt states what is actually known.
     */
    public async taskControl(request: { readonly task: string; readonly operation: TaskControlOperation; readonly instruction: string; readonly agent?: string; readonly scope?: 'task' | 'occurrence' | 'future'; readonly origin: TaskControlOrigin }): Promise<TaskControlOutcome> {
        if (request.origin.authority === 'agent') throw new PtbkError('Only a verified request of the user can change work; an agent\'s proposal stays advice.', { kind: 'usage', next: ['Ask the user, then act on their answer.'] });
        const instruction = request.instruction.replace(/\s+/g, ' ').trim();
        if (!instruction) throw new PtbkError('A change needs its instruction in words.', { kind: 'usage' });
        const task = await this.controlledTask(request.task);
        if (!task.source.relativePath.endsWith('.book')) throw new PtbkError(`{${task.title}} is written in a Markdown task list, which has no change history; edit it directly.`, { kind: 'usage' });
        const scope = request.scope ?? (request.operation === 'retire' ? 'future' : 'task');
        const now = formatIsoWithOffset(Date.now(), this.timeZone);
        const chat = request.origin.chat ? ` {${request.origin.chat}}` : '';
        const closed = task.status === 'done' || task.status === 'cancelled';
        const assignee = request.agent?.trim() ? await this.reassignmentTarget(task, request.agent, request.operation, scope) : undefined;
        const reopening = (request.operation === 'amend' || request.operation === 'reopen') && closed && scope !== 'future';
        const text = request.operation === 'accept' ? `The current result is accepted as sufficient: validate it against this revised goal and finish without further work beyond it. ${instruction}` : instruction;
        await this.gitMutex.run(async () => {
            let source = await readFile(task.source.path, 'utf8');
            if (reopening) source = appendCommitment(source, 'TASK REOPEN', `${now}${chat}`);
            source = appendCommitment(source, 'TASK CHANGE', `${now} ${scope}${chat}\n${text}`);
            // The new owner is a later layer: the previous one stays in the Book, and the last valid value is effective.
            if (assignee) source = appendCommitment(source, 'TASK AGENT', formatAgentReference(assignee));
            if (reopening && task.status === 'cancelled') source = appendCommitment(source, 'TASK STATUS', 'todo');
            if (request.operation === 'cancel') source = appendCommitment(source, 'TASK STATUS', 'cancelled');
            if (request.operation === 'retire') source = appendCommitment(source, 'TASK STATUS', 'retired');
            await writeFile(task.source.path, source);
        });
        const saved = readTaskBook({ source: await readFile(task.source.path, 'utf8'), path: task.source.path, relativePath: task.source.relativePath, order: 0, timeZone: this.timeZone })!;
        const change = saved.changes[saved.changes.length - 1]!;
        const sessions = this.sessions.view().open.filter((session) => session.work.kind === 'task' && session.work.source === task.source.relativePath);
        await this.taskControlStore.recordControl({ id: shortId(10), operation: request.operation, task: task.title, source: task.source.relativePath, scope, change: change.id, instruction, origin: request.origin, agent: task.routing.agent, sessions: sessions.map((session) => session.handle), at: now });
        const persistence = this.commitMode
            ? await this.commitAuthoring([task.source.path], `Change task - ${task.title}`, { 'Task-Name': task.title })
                  .then(() => 'committed' as const)
                  .catch((error: unknown) => {
                      this.log(`The change of {${task.title}} is saved; its commit waits: ${errorMessage(error)}`, 'warning');
                      return 'pending' as const;
                  })
            : ('pending' as const);
        if (request.origin.chat) await this.chats.annotate(request.origin.chat, { links: [formatAgentReference(task.title)] }, { trailers: { 'Task-Name': task.title } }).catch(() => undefined);
        const delivery = await this.reconcileChange(task, { change: change.id, task: task.title, source: task.source.relativePath, order: change.line }, request.operation, scope);
        if (reopening) {
            const cancelled = await this.state.readCancelled(task.title);
            if (cancelled && cancelled.sourcePath === task.source.relativePath && !this.runIsLive(cancelled.runId)) {
                await this.state.writeActive({ ...cancelled, phase: 'executing', attempt: 0, technicalRetries: 0, completionApplied: false, failure: undefined, feedback: 'The user reopened this cancelled task. Inspect its retained partial work and continue from the current Book; do not repeat external actions without verifying them.' });
                await this.state.clearCancelled(task.title);
                await this.restoreOwnership();
            }
        }
        this.log(`{${task.title}}: ${request.operation} accepted${request.origin.chat ? ` from {${request.origin.chat}}` : ''}. ${delivery}`);
        this.wake();
        this.touch();
        return { task: task.title, operation: request.operation, scope, change: change.id, reopened: reopening, persistence, delivery };
    }

    /** Remembers to report when work ends, without touching it and without anything staying open meanwhile. */
    public async taskNotify(input: { readonly task: string; readonly chat: string; readonly by: string }): Promise<{ readonly task: string; readonly state: string }> {
        const task = await this.controlledTask(input.task);
        await this.taskControlStore.subscribe({ id: shortId(10), task: task.title, source: task.source.relativePath, chat: input.chat, by: input.by, cycle: task.cycle, at: formatIsoWithOffset(Date.now(), this.timeZone) });
        await this.chats.annotate(input.chat, { links: [formatAgentReference(task.title)] }, { trailers: { 'Task-Name': task.title } }).catch(() => undefined);
        this.wake();
        return { task: task.title, state: task.status };
    }

    /**
     * The agent a change moves a task to. Anything that could not take effect is refused before the Book is touched, so
     * invalid input never changes active work.
     */
    private async reassignmentTarget(task: Task, requested: string, operation: TaskControlOperation, scope: string): Promise<string> {
        if (operation !== 'amend' && operation !== 'reopen') throw new PtbkError('Only an amendment or a reopening can also move work to another agent.', { kind: 'usage' });
        if (scope === 'future') throw new PtbkError('Moving only later occurrences to another agent is not supported.', { kind: 'usage', next: ['Use the scope `task`, which also moves any run in progress, or `occurrence` for this run only.'] });
        const resolved = await this.catalog.resolve(toReference(requested.replace(/^[@{]+|[}]+$/g, '').trim()));
        if (resolved.kind !== 'agent') throw new PtbkError(`No agent matches "${requested}".`, { kind: 'not-found', next: ['Name an existing agent.'] });
        const name = resolved.definition.name;
        if (task.routing.agent && agentKeyOf(task.routing.agent) === agentKeyOf(name)) throw new PtbkError(`{${task.title}} already belongs to ${formatAgentReference(name)}.`, { kind: 'usage' });
        return name;
    }

    /** The one task a request names. Ambiguity is the caller's to resolve, never a guess. */
    private async controlledTask(name: string): Promise<Task> {
        const wanted = name.replace(/^[@{]+|[}]+$/g, '').trim();
        const key = nameKey(wanted);
        const { tasks } = await this.readQueue();
        const exact = tasks.filter((task) => task.key === key && !task.shadowedBy);
        if (exact.length === 1) return exact[0]!;
        // Engine-made supporting work (routing, learning) names the task it serves: the task itself is what is meant.
        const matching = tasks.filter((task) => !task.shadowedBy && task.title.toLowerCase().includes(wanted.toLowerCase()));
        const ordinary = matching.filter((task) => workKindOf(task) === 'task');
        const partial = ordinary.length ? ordinary : matching;
        if (partial.length === 1) return partial[0]!;
        if (partial.length > 1) throw new PtbkError(`"${wanted}" matches several tasks: ${partial.slice(0, 8).map((task) => `{${task.title}}`).join(', ')}.`, { kind: 'usage', next: ['Name one of them.'] });
        throw new PtbkError(`No task matches "${wanted}".`, { kind: 'not-found', next: ['Look at the current tasks first.'] });
    }

    /**
     * Brings the running work in line with an accepted change and returns the plain statement of what happened. A running
     * turn cannot take input, so it is interrupted at its safe point and continued from the current Book; paused or
     * human-held work waits, and work no session runs receives it at its next start.
     */
    private async reconcileChange(task: Task, change: { readonly change: string; readonly task: string; readonly source: string; readonly order: number }, operation: TaskControlOperation, scope: string): Promise<string> {
        const openSessions = this.sessions.view().open.filter((session) => session.work.kind === 'task' && session.work.source === task.source.relativePath);
        const stopping = operation === 'cancel' || (operation === 'retire' && scope !== 'future');
        if (scope === 'future') {
            await this.taskControlStore.mark(change, undefined, 'saved', 'It applies only to later occurrences.', 'The next occurrence works from it; the current one is unaffected.');
            return 'Saved for later occurrences; the current one is unaffected.';
        }
        const running = [...this.units.values()].filter((unit) => unit.kind === 'task' && unit.current?.taskTitle && nameKey(unit.current.taskTitle) === nameKey(task.title));
        const held = openSessions.find((session) => session.lease);
        if (held) {
            await this.taskControlStore.mark(change, held.handle, 'queued', 'A person controls this session now.', 'It is delivered after control returns to Promptbook.');
            return `Saved. Delivery waits: a person controls the session of ${held.agent}.`;
        }
        if (running.length) {
            for (const unit of running) {
                const session = unit.owner ? this.sessions.byKey(`task:${unit.owner}`) : undefined;
                await this.taskControlStore.mark(change, session?.handle, 'queued', 'Its running turn is interrupted at its safe point; any action already under way may still finish.', stopping ? 'The run ends at that point.' : 'Work continues with this change.');
                unit.interrupt.abort();
                unit.waiter?.resolve('cancelled');
            }
            return stopping ? 'Saved. The running turn was asked to stop at its safe point; it has not necessarily stopped yet, and anything already under way may still finish.' : 'Saved. The running turn was asked to stop at its safe point and continues with this change; it is not applied yet.';
        }
        const checkpointed = [...(await this.state.readActiveRecords()), ...(await this.state.readParked())].filter((record) => record.sourcePath === task.source.relativePath);
        if (stopping) {
            for (const record of checkpointed) await this.endCancelledRun(record, task);
            await this.taskControlStore.mark(change, undefined, 'applied', checkpointed.length ? 'No turn was running; its checkpoint ended.' : 'Nothing was running; it does not start.');
            return 'Done: nothing was running, and this work does not start.';
        }
        if (this.pauseActive || this.stopRequested) {
            await this.taskControlStore.mark(change, openSessions[0]?.handle, 'deferred', 'The engine is paused: inputs that would advance task work wait.', 'It is delivered after Resume.');
            return 'Saved. Delivery waits until the engine resumes.';
        }
        await this.taskControlStore.mark(change, openSessions[0]?.handle, 'saved', 'No turn is running.', 'Its next start receives it.');
        return 'Saved. No turn is running; its next start receives it.';
    }

    /** Ends a run its task no longer wants: its partial work and Book stay, nothing is reverted, and no success is claimed. */
    private async endCancelledRun(record: ActiveRecord, task: Task): Promise<void> {
        if (task.status === 'cancelled') await this.state.saveCancelled({ ...record, ownedFiles: [...new Set([...(record.ownedFiles ?? []), ...this.ownership.owned(record.runId)])] });
        await this.state.clearActive(record.runId).catch(() => undefined);
        await this.state.dropParked(record.taskTitle).catch(() => undefined);
        await this.releaseUnlessRecorded(record.runId);
        this.sessions.close(`task:${record.runId}`, task.status === 'retired' ? 'Its work was retired.' : 'Its work was cancelled.');
        await this.taskControlStore.settleSource(task.source.relativePath, 'applied', 'The run ended at its checkpoint.');
        this.log(`"${task.title}" ended without completing (${task.status}); its Book and any partial changes stay.`);
    }

    /** Tells waiting chats about finished work, once each, also after a restart. */
    private async deliverTaskNotifications(): Promise<void> {
        const waiting = this.taskControlStore.waiting();
        if (!waiting.length) return;
        const { tasks } = await this.readQueue();
        for (const notification of waiting) {
            const task = tasks.find((candidate) => candidate.source.relativePath === notification.source);
            const result = this.recentResults.find((candidate) => nameKey(candidate.title) === nameKey(notification.task));
            const outcome = !task
                ? 'its task no longer exists'
                : task.cycle > notification.cycle || task.status === 'done'
                  ? `is done${result?.summary ? `: ${result.summary}` : ''}${result?.commit ? ` (result commit ${result.commit.slice(0, 8)})` : ''}`
                  : task.status === 'cancelled'
                    ? 'was cancelled without completing'
                    : task.status === 'failed'
                      ? 'failed'
                      : task.status === 'retired'
                        ? 'was retired'
                        : undefined;
            if (!outcome) continue;
            const stored = await this.chats.find(notification.chat);
            if (stored) {
                const marker = `Update on {${notification.task}}`;
                // The Book is the durable record: a restart between saving and bookkeeping never repeats the message.
                const already = stored.chat.messages.some((message) => message.text.startsWith(marker) && Date.parse(message.at) >= Date.parse(notification.at));
                if (!already) {
                    await this.chats.append(stored.chat.name, { sender: formatAgentReference(notification.by), text: `${marker}: it ${outcome}.` }, { trailers: { 'Task-Name': notification.task } });
                    await this.refreshChats();
                }
            }
            await this.taskControlStore.delivered(notification.id, outcome);
            this.log(`Told {${notification.chat}} that "${notification.task}" ${outcome}.`);
        }
    }

    // ── Harness session entry (shared by terminal, browser and API) ──────────

    /**
     * What entering one session can offer now. Inspecting it never needs this; everything is decided from the adapter's
     * observed capabilities and the session's current state, again at every confirmation.
     */
    public sessionEntry(handle: string): SessionEntryView {
        const session = this.sessions.byHandle(handle);
        if (!session || session.endedAt) return { available: false, reason: 'This session has ended; its evidence stays inspectable here.' };
        const unavailable = (reason: string): SessionEntryView => ({ available: false, reason });
        if (session.lease) return unavailable(`Another client controls this session since ${session.lease.acquiredAt}; control cannot be taken over silently.`);
        if (session.capabilities?.nativeClient !== true) return unavailable(`${session.harnessName}: no native client of this release can open this session, so the common view stays the way to inspect it.`);
        if (!session.providerIds.length) return unavailable(`${session.harnessName} reported no session identifier, so its client could only start something else.`);
        if (session.state === 'working' || session.state === 'opening' || session.state === 'interrupt-requested' || session.state === 'reconnecting') return unavailable('A turn is running in this session and its transport cannot be joined. Enter once it reached its boundary; the common view shows it meanwhile.');
        const tool = session.tool ? this.pool.instance(session.tool) : undefined;
        if (!tool) return unavailable('Its named tool is no longer configured, and no other account may continue this session.');
        if (tool.authentication !== 'NATIVE') return unavailable('This tool uses an API key, which is not handed to a terminal client; no other account or billing path may stand in for it.');
        if (tool.baseUrl) return unavailable('This tool uses a custom endpoint, which the native client would not keep; no other endpoint may stand in for it.');
        if (session.work.kind === 'task' && (this.pauseActive || this.shutdown || this.intent)) return unavailable('The engine is not running task work now, and control of a task session would advance that work. It stays inspectable; enter after Resume.');
        return {
            available: true,
            watch: { native: false, reason: 'Its client cannot be kept from sending input, so Watch only opens the common read-only event view.' },
            exclusive: { available: true },
            shared: session.capabilities.sharedControl ? { available: true } : { available: false, reason: 'Unavailable: this client and Promptbook cannot order their inputs.' },
            returnHint: session.nativeReturn ?? 'Leave the client normally; its effects on this session are not known.',
        };
    }

    /** Takes control of a session after a deliberate confirmation (revalidated here) and names its actual native client. */
    public acquireSession(handle: string, request: { readonly holder: string; readonly mode: 'exclusive' | 'shared'; readonly clientPid?: number }): { readonly ok: true; readonly client: SessionClientLaunch } | { readonly ok: false; readonly reason: string } {
        const entry = this.sessionEntry(handle);
        if (!entry.available) return { ok: false, reason: entry.reason };
        const session = this.sessions.byHandle(handle)!;
        const plugin = HARNESS_PLUGINS.find((candidate) => candidate.id === session.harness);
        const args = plugin?.sessions?.nativeClientArgs?.(session.providerIds[session.providerIds.length - 1]!);
        if (!plugin || !args) return { ok: false, reason: `${session.harnessName} has no verified native client.` };
        const taken = this.sessions.acquireLease(handle, request);
        if (!taken.ok) return taken;
        const tool = this.pool.instance(session.tool!)!;
        const environment = instanceEnvironment(plugin, tool, undefined, this.options.env);
        const account = plugin.accountHomeVariable && tool.accountProfile ? environment[plugin.accountHomeVariable] : undefined;
        this.log(`${request.holder} took ${request.mode} control of the session of ${session.agent}; automatic input to it waits.`);
        return { ok: true, client: { command: plugin.executable, args, cwd: this.options.project.root, env: account ? { [plugin.accountHomeVariable!]: account } : {}, returnHint: entry.returnHint } };
    }

    /** Keeps control while its client is alive; false: control was lost and this client must not write. */
    public renewSession(handle: string, holder: string, clientPid?: number): boolean {
        return this.sessions.renewLease(handle, holder, clientPid);
    }

    /** Returns control after the client left; automatic inputs are decided anew from the current state, never replayed. */
    public releaseSession(handle: string, holder: string, detail?: string): boolean {
        const released = this.sessions.releaseLease(handle, holder, detail);
        if (released) this.log(`Control of a session returned to Promptbook${detail ? `: ${detail}` : '.'}`);
        return released;
    }

    // ── Lifecycle controls (shared by CLI, terminal, browser and API) ────────

    /** Whether background task work is active (the claim boundary of pause/stop; chat turns are not background work). */
    private get executing(): boolean {
        for (const unit of this.units.values()) if (unit.kind === 'task') return true;
        return false;
    }

    /**
     * The live service state: `running`, `pausing` (a pause reason is active while task work is being interrupted and
     * settles), `pause` or `stopping` (settling into exit, including a restart's shutdown phase). After the agenda ended, the observed
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
        const manual: PauseReasonView[] = this.manualPauseSince ? [{ id: 'manual', kind: 'manual', owner: 'System', summary: MANUAL_PAUSE_SUMMARIES[this.manualPauseCause], since: this.manualPauseSince, removable: true }] : [];
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

    /**
     * Requests the supported interruption of all active task work: its turn ends at the nearest safe opportunity, keeping
     * its checkpoint and its agent's reservation. An operation that cannot be interrupted settles visibly (`pausing`) and
     * is never force-killed. Chat turns and the shared runtime stay untouched.
     */
    private interruptTaskWork(): void {
        for (const unit of this.units.values()) {
            if (unit.kind !== 'task' || unit.interrupt.signal.aborted) continue;
            unit.interrupt.abort();
            unit.waiter?.resolve('cancelled');
        }
    }

    /** The Health sub-engine added or removed a pause reason: re-evaluate scheduling immediately. */
    private pauseReasonsChanged(): void {
        if (this.pauseActive && this.executing) {
            this.pauseSettling = true;
            this.interruptTaskWork();
        }
        if (!this.pauseActive) this.pauseSettling = false;
        // Automatic owner checks waited during Pause; Resume reconciles current evidence (at most one due check).
        this.scheduleAttentionReview();
        // A paused wait ends so that a resolved reason resumes (or a new one holds) at once.
        this.waiter?.resolve('woken');
        this.touch();
    }

    /**
     * Sets or removes the ordinary manual pause reason and saves it as durable operator intent (a maintenance host keeps
     * it in memory only). A failed save is reported, never hidden: recovery would then miss the latest intent.
     */
    private setManualPause(since: string | undefined): void {
        this.manualPauseSince = since;
        this.manualPauseCause = 'operator';
        if (this.options.mode === 'maintenance') return;
        try {
            saveOperatorIntent(this.options.project, since ? { since, cause: 'operator' } : undefined);
        } catch (error) {
            this.log(`The ${since ? 'pause' : 'resume'} applies now, but it could not be saved for crash/reboot recovery: ${errorMessage(error)}`, 'warning');
        }
    }

    /** Whether a stop or restart is pending or under way (waits end early; no next task is claimed). */
    private get stopRequested(): boolean {
        return Boolean(this.shutdown) || Boolean(this.intent);
    }

    /** Whether a new task may be claimed now: only while `running` and outside the self-update's maintenance boundary. */
    private get claimable(): boolean {
        return this.serviceState === 'running' && !this.maintenance;
    }

    /**
     * Runs the claimed self-update inside its maintenance boundary: no task, brief or chat turn starts until it ends
     * (chat input stays accepted and is answered afterwards, or by the replacement). Its restart keeps the latest
     * manual pause; a stop accepted meanwhile wins over the update's restart.
     */
    private async runEngineUpdate(): Promise<void> {
        let end!: () => void;
        const done = new Promise<void>((resolvePromise) => (end = resolvePromise));
        this.maintenance = { done, end };
        this.phase = 'waiting';
        this.waitView = { kind: 'idle', reason: 'System task: updating the Promptbook engine (nothing new starts until it ends).', skippable: false };
        this.touch();
        try {
            await this.updater.run({
                stillFree: () => this.serviceState === 'running' && !this.units.size,
                restart: () => void this.requestStop({ restart: true, update: true }),
            });
        } finally {
            this.maintenance = undefined;
            this.waitView = undefined;
            end();
            this.touch();
        }
    }

    /** Waits until a running self-update leaves its maintenance boundary. */
    private async untilMaintenanceEnds(): Promise<void> {
        while (this.maintenance) await this.maintenance.done;
    }

    /**
     * Another engine replaced the shared installation this engine runs from: settle active work and restart into the
     * installed version, keeping the manual pause (a daemon only; a foreground engine keeps its loaded version).
     */
    public requestUpdateRestart(): LifecycleOutcome {
        if (this.options.mode !== 'daemon') return this.outcome('update-restart', false, 'Only the background service restarts for an update of its installation.');
        this.log('The shared installation was updated by another engine: restarting into it once active work settles (a manual pause is kept).');
        return this.requestStop({ restart: true, update: true });
    }

    /** The self-update state (shared by every client). */
    public get engineUpdate(): ReturnType<EngineUpdater['view']> {
        return this.updater.view();
    }

    /** Looks up engine releases now (bounded; it never installs by itself). */
    public async checkEngineUpdate(): Promise<ReturnType<EngineUpdater['view']>> {
        await this.updater.lookupIfDue(true);
        this.wake();
        return this.updater.view();
    }

    /** Turns automatic engine updates on or off: the shared policy operation of every client, committed on its own. */
    public async setAutoUpdate(enabled: boolean): Promise<{ applied: string[]; saved: boolean; commit?: string; restartRequired: string[] }> {
        return await this.updateSettings({ 'updates.isAutoUpdateEnabled': enabled }, true, `Turn automatic engine updates ${enabled ? 'on' : 'off'}`);
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
     * Applies pending intents once work settles: a pausing engine settles into `pause` when no task work remains;
     * stop/restart begin the irreversible orderly shutdown once every task and chat turn has settled (the run loop then
     * exits and the owner cleans up).
     */
    private settle(): void {
        if (this.shutdown) return;
        if (this.intent === 'stop' || this.intent === 'restart') {
            if (this.units.size) return;
            this.shutdown = this.intent;
            this.log(this.intent === 'restart' ? 'Restarting: shutting down so one replacement can start.' : 'Stopping: shutting down.');
            this.waiter?.resolve('cancelled');
        } else if (this.pauseSettling && !this.executing) {
            this.pauseSettling = false;
            if (this.pauseActive) this.log(this.manualPauseSince ? 'Paused: no task runs until you resume.' : 'Paused by Health: no task runs until the health condition is resolved.');
        }
        this.touch();
    }

    /**
     * Adds the ordinary manual pause reason: no new task is claimed and no open task work continues automatically. Active
     * task work is interrupted at its nearest safe opportunity and keeps its checkpoint (`pausing` until it has settled);
     * otherwise the service pauses immediately. Chats stay available. Replacing a pending stop/restart requires explicit confirmation
     * against the decision revision the caller saw (`replaceStop` + `revision`).
     */
    public pause(options: { readonly replaceStop?: boolean; readonly revision?: number } = {}): LifecycleOutcome {
        if (this.shutdown) return this.outcome('pause', false, 'Too late: the service is already shutting down.');
        if (this.manualPauseSince && !this.intent) return this.outcome('pause', true, this.executing ? 'Pause is already pending: active task work is settling at its nearest safe point.' : 'Already paused.');
        if (this.intent) {
            if (!options.replaceStop) {
                throw new PtbkError(`A ${this.intent} is pending; pausing instead would cancel it.`, {
                    kind: 'conflict',
                    reason: `Decision revision ${this.intentRevision}: ${this.intent} after active work.`,
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
            this.log(this.executing ? 'Pause requested: active task work is being interrupted at its nearest safe point and keeps its checkpoint; no task continues or starts until you resume. Chats stay available.' : 'Paused: no task runs until you resume.');
        }
        this.setManualPause(new Date().toISOString());
        if (this.executing) {
            this.pauseSettling = true;
            this.interruptTaskWork();
        }
        this.settle();
        // An idle wait (or a human wait outside task execution) re-evaluates so the pause holds immediately.
        if (!this.executing) this.waiter?.resolve('woken');
        this.touch();
        return this.outcome('pause', true, this.serviceState === 'pause' ? 'Paused.' : 'Pause pending: active task work is settling at its nearest safe point and keeps its checkpoint.');
    }

    /**
     * Removes the manual pause reason, or cancels a pending stop/restart (and a restart's planned replacement). Interrupted
     * task work continues from its checkpoint; nothing is replayed or started twice. Health pause reasons are never removed here: the service returns to
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
            this.decide(undefined, `The pending ${cancelled} was cancelled; the service keeps running${this.units.size ? ' (active work continues)' : ''}.`);
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
        if (!this.pauseActive) this.pauseSettling = false;
        this.log(this.pauseActive ? `Manual pause removed.${remaining()}` : pending ? 'The pending pause was cancelled; interrupted task work continues from its checkpoint.' : 'Resumed.');
        this.waiter?.resolve('woken');
        this.touch();
        if (this.pauseActive) return this.outcome('resume', true, `Manual pause removed; still paused.${remaining()}`);
        return this.outcome('resume', true, pending ? 'Cancelled the pending pause.' : 'Resumed.');
    }

    /** Skips pacing/backoff waits (of the loop and of active work); setup, schedule and human waits cannot be skipped. */
    public skipWait(): { applied: boolean; reason?: string } {
        const skippable = [...(this.waiter?.skippable ? [this.waiter] : []), ...[...this.units.values()].flatMap((unit) => (unit.waiter?.skippable ? [unit.waiter] : []))];
        if (!skippable.length) {
            if (!this.waiter || !this.waitView) return { applied: false, reason: 'Nothing is waiting.' };
            return { applied: false, reason: `This wait cannot be skipped: ${this.waitView.reason}` };
        }
        this.log(skippable.length === 1 ? 'Wait skipped.' : `${skippable.length} waits skipped.`);
        for (const waiter of skippable) waiter.resolve('skipped');
        return { applied: true };
    }

    /**
     * Requests a graceful stop (`stopping`: owned work finishes or checkpoints, then orderly shutdown; work suspended by a
     * pause is not revived), a graceful restart (the same transition, then exactly one replacement) or an immediate force
     * stop of owned work. Repeating a request is
     * idempotent; it never escalates to force.
     */
    public requestStop(options: { readonly force?: boolean; readonly restart?: boolean; readonly signal?: boolean; readonly update?: boolean } = {}): LifecycleOutcome {
        const action = options.force ? 'force-stop' : options.restart ? 'restart' : 'stop';
        // An OS termination request is not an intentional user stop (unless the user had already asked to stop).
        if (options.signal && !this.intent && !this.shutdown) this.shutdownBySignal = true;
        if (options.force) {
            if (this.shutdown === 'force') return this.outcome(action, true, 'Already force-stopping.');
            const busy = this.units.size > 0;
            if (!this.shutdownBySignal) this.setManualPause(undefined);
            this.shutdown = 'force';
            this.intent = 'stop';
            this.intentRevision++;
            this.log(busy ? 'Force stop: interrupting all owned work now (recovery records are kept; nothing is marked done).' : 'Force stop: no work is running; shutting down now.', 'warning');
            this.ownedWork.abort();
            this.waiter?.resolve('cancelled');
            for (const unit of this.units.values()) unit.waiter?.resolve('cancelled');
            this.touch();
            return this.outcome(action, true, busy ? 'Force-stopping: owned work is interrupted and recoverable.' : 'Stopping now.');
        }
        if (this.shutdown) return this.outcome(action, this.shutdown === (options.restart ? 'restart' : 'stop'), this.shutdown === 'restart' ? 'Already restarting.' : 'Already shutting down.');
        const wanted = options.restart ? 'restart' : 'stop';
        if (this.intent === wanted) return this.outcome(action, true, `${options.restart ? 'Restart' : 'Stop'} is already pending: active work finishes or checkpoints first.`);
        if (options.restart && this.options.mode === 'maintenance') throw new PtbkError('A finite maintenance operation cannot be restarted.', { kind: 'usage', next: ['Run it again when it has finished.'] });
        const previous = this.intent ?? (this.manualPauseSince && this.executing ? 'pause' : undefined);
        // An intentional stop replaces the manual pause (resume cancels the stop and returns to running, as before). An
        // OS termination request (e.g. a reboot) and an update's restart keep it, so the replacement restores it.
        if (!this.shutdownBySignal && !options.update) this.setManualPause(undefined);
        this.pauseSettling = false;
        this.decide(
            wanted,
            this.units.size
                ? `${options.restart ? 'Restart' : 'Stop'} requested${previous ? ` (instead of the pending ${previous})` : ''}: active work finishes or checkpoints first, then the service ${options.restart ? 'restarts' : 'stops'}.`
                : `${options.restart ? 'Restart' : 'Stop'} requested.`,
        );
        this.settle();
        // Waits between tasks end now; a wait inside active work ends with a recoverable checkpoint.
        this.waiter?.resolve('cancelled');
        for (const unit of this.units.values()) unit.waiter?.resolve('cancelled');
        this.touch();
        return this.outcome(action, true, this.shutdown ? (options.restart ? 'Restarting now.' : 'Stopping now.') : `${options.restart ? 'Restart' : 'Stop'} pending: active work finishes or checkpoints first.`);
    }

    /** Cancels a pending stop/restart that has not taken effect yet (compatibility alias of resume). */
    public cancelStop(): LifecycleOutcome {
        if (!this.intent) return this.outcome('cancel-stop', false, 'No stop is pending.');
        return this.resume();
    }

    /** Lifecycle details for every view: pending intent, its revision and whether work is still settling. */
    private lifecycleView(): ServiceSnapshot['service']['lifecycle'] {
        const pausing = !this.intent && !this.shutdown && this.pauseActive && this.executing;
        return {
            intent: this.shutdown ? (this.shutdown === 'force' ? 'force-stop' : this.shutdown) : (this.intent ?? (pausing ? 'pause' : undefined)),
            since: this.intent ? this.intentSince : pausing ? this.manualPauseSince : undefined,
            revision: this.intentRevision,
            settling: (Boolean(this.intent) && this.units.size > 0) || (pausing && this.executing),
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
        const detail = await chatDetail(this.chats, name);
        const pending = this.chatBatches.pending(detail.summary.name);
        const summary = pending ? { ...detail.summary, persistence: { state: pending.failure ? ('failed' as const) : ('pending' as const), since: pending.since, ...(pending.failure ? { failure: pending.failure } : {}) } } : detail.summary;
        const live = this.liveReplies.get(detail.summary.name);
        const recheck = this.chatRecheckViews().find((view) => nameKey(view.chat) === nameKey(detail.summary.name));
        const requests = await this.chatRequestViews(detail.summary.name);
        const voice = this.voiceCallsInstance?.view(detail.summary.name);
        return { ...detail, summary, tasks: await this.chatTaskCards(detail.summary.name, detail.summary.links), ...(live ? { live } : {}), ...(recheck ? { recheck } : {}), ...(requests.length ? { requests } : {}), ...(voice ? { voice } : {}) };
    }

    /** Outstanding human requests of one chat with their responsible agent and relevance checks (no check is triggered). */
    private async chatRequestViews(name: string): Promise<ChatRequestView[]> {
        const key = nameKey(name);
        const checks = this.attentionOwnerInstance?.views() ?? {};
        return (await this.chats.outstandingRequests().catch(() => []))
            .filter((request) => nameKey(request.chat) === key)
            .map((request) => ({ id: request.id, message: request.message, sender: request.sender, owner: request.owner, seen: Boolean(request.seenAt), ...(checks[request.id] ? { check: checks[request.id]! } : {}) }));
    }

    /** Failed chat replies waiting for their automatic recheck (shared by every client). */
    private chatRecheckViews(): ChatRecheckView[] {
        return [...this.chatRechecks.values()].filter((entry) => entry.timer).map((entry) => ({ chat: entry.name, cause: entry.schedule.cause, nextAt: entry.schedule.nextAt, rounds: entry.schedule.rounds }));
    }

    /**
     * Live cards of the tasks a chat created (`TASK ORIGIN Chat`) or links: queued, running, waiting, blocked,
     * completed or failed, observed from the same engine state as the Tasks view (presentation, not new states).
     */
    private async chatTaskCards(chat: string, links: readonly string[]): Promise<ChatTaskCard[]> {
        const inventory = await this.taskInventory().catch(() => this.inventory);
        const linked = new Set(links.map((link) => parseReferenceValue(link)?.normalized).filter((key): key is string => Boolean(key)));
        const chatKey = nameKey(chat);
        const tasks = inventory.filter((item) => linked.has(nameKey(item.title)) || nameKey(chatOriginOf(item.origin) ?? '') === chatKey);
        const active = this.activeViews();
        const receipts = (item: TaskInventoryItem): Pick<ChatTaskCard, 'receipts'> => {
            const lines = item.source ? this.taskControlStore.receiptsOf(item.source).filter(isOutstandingReceipt).map(receiptLine) : [];
            return lines.length ? { receipts: lines } : {};
        };
        return tasks.map((item): ChatTaskCard => {
            const running = active.find((view) => view.kind !== 'chat' && nameKey(view.taskTitle) === nameKey(item.title));
            const result = this.recentResults.find((candidate) => nameKey(candidate.title) === nameKey(item.title));
            if (running) return { ...receipts(item), name: item.title, ref: item.ref, state: running.phase === 'awaiting-user' ? 'waiting' : 'running', detail: `${running.phase}${running.detail ? ` · ${running.detail}` : ''}`, agent: running.agent.name };
            switch (item.readiness) {
                case 'cancelled':
                    return { name: item.title, ref: item.ref, state: 'cancelled', detail: item.reason, agent: item.agent, ...receipts(item) };
                case 'retired':
                    return { name: item.title, ref: item.ref, state: 'retired', detail: item.reason, agent: item.agent, ...receipts(item) };
                case 'done':
                    return { name: item.title, ref: item.ref, state: 'completed', detail: result?.summary, agent: result?.agent ?? item.agent, commit: result?.commit };
                case 'awaiting-user':
                    return { name: item.title, ref: item.ref, state: 'waiting', detail: item.reason, agent: item.agent };
                case 'failed':
                    return { name: item.title, ref: item.ref, state: 'failed', detail: item.reason, agent: item.agent };
                case 'blocked':
                case 'needs-recovery':
                case 'incompatible':
                    return { name: item.title, ref: item.ref, state: 'blocked', detail: item.reason, agent: item.agent };
                default:
                    return { name: item.title, ref: item.ref, state: 'queued', detail: item.reason, agent: item.agent, ...receipts(item) };
            }
        });
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
     * Marks the explicit User pings whose calling messages an active viewer displayed as seen: shared by every client
     * and durable across restarts, without answering, resolving or releasing the waiting work.
     */
    public async chatSeen(name: string, messages: readonly number[]): Promise<{ readonly seen: number }> {
        const seen = await this.chats.markSeen(name, messages);
        if (seen) await this.refreshChats();
        return { seen };
    }

    /** Unseen explicit User pings across chats, oldest first (bounded). */
    private chatPings(): ChatAttentionView[] {
        return this.chatSummaries
            .flatMap((chat) => (chat.pings ?? []).map((ping): ChatAttentionView => ({ ...ping, chat: chat.name, title: chat.title, links: chat.links })))
            .sort((a, b) => a.at.localeCompare(b.at));
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
        const addressed = 'addressed' in written ? (written.addressed as readonly string[]) : [];
        if (addressed.length) {
            await this.state.addChatAddress(written.chat.name, { upTo: written.chat.messages.length, agents: addressed });
            for (const reference of addressed) this.queueChatReply(written.chat.name, { agent: reference, followUp: true });
        } else this.queueChatReply(written.chat.name);
        return written;
    }

    /**
     * Invites an agent into a chat and asks it to reply: the same operation as a `+@Name` address, for an invitation
     * expressed in natural language. An existing member is addressed without another join.
     */
    public async chatInvite(name: string, agent: string): Promise<{ readonly agent: string; readonly joined: boolean }> {
        const stored = await this.chats.find(name);
        if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
        if (!isHumanFacing(stored.chat)) throw new PtbkError('Agent↔agent consultation chats are task records; nobody can be invited into them.', { kind: 'usage' });
        const { addressed, joining } = await resolveChatInvitations(this.catalog, stored.chat, [toReference(agent)]);
        const reference = addressed[0]!;
        if (joining.length) await this.chats.annotate(stored.chat.name, { members: joining });
        await this.state.addChatAddress(stored.chat.name, { upTo: stored.chat.messages.length, agents: [reference] });
        this.log(`${reference} was invited into {${stored.chat.name}}.`);
        await this.refreshChats();
        this.queueChatReply(stored.chat.name, { agent: reference, followUp: true });
        return { agent: reference, joined: joining.length > 0 };
    }

    /**
     * Appends the user's message to a chat (one commit). A valid answer lets the waiting task resume; any other
     * message is a conversation turn the chat's agent replies to.
     */
    public async chatSend(name: string, text: string, options: { readonly expected?: number; readonly via?: string; readonly segments?: readonly ComposedSegment[] } = {}): Promise<ChatWrite> {
        const { written, needsReply, replyAgent, replyAgents, waitingTask, answered } = await appendUserMessage(this.chats, this.state, name, text, { expected: options.expected, segments: options.segments, catalog: this.catalog });
        this.log(`Message in {${written.chat.name}}${options.via ? ` via ${options.via}` : ''}${answered && waitingTask ? ` answers ${questionAuthor(waitingTask)}'s question of "${waitingTask.taskTitle}"` : ''}${written.commit ? ` (${written.commit.slice(0, 8)})` : ''}.`);
        await this.refreshChats();
        // Each addressed agent keeps its own request; an unaddressed message goes to the routed agent only.
        if (replyAgents.length) for (const agent of replyAgents) this.queueChatReply(written.chat.name, { agent, followUp: true });
        else if (needsReply) this.queueChatReply(written.chat.name, replyAgent ? { agent: replyAgent } : {});
        this.wake();
        return written;
    }

    /**
     * The shared context of conversation work (written chat replies and voice calls): the same tools, task control and
     * authority in both.
     */
    private conversationContext(): ConversationContext {
        return {
            project: this.options.project,
            settings: this.settings,
            catalog: this.catalog,
            pool: this.pool,
            chats: this.chats,
            env: this.options.env,
            signal: this.ownedWork.signal,
            sessions: this.sessions,
            taskControl: {
                status: async (query) => await this.taskStatus(query),
                change: async (input) => await this.taskControl(input),
                notify: async (input) => await this.taskNotify(input),
            },
            createTask: async (input) => await this.createChatTask(input),
            inviteAgent: async (input) => await this.chatInvite(input.chat, input.agent),
            scheduleLearning: async (input) => await this.scheduleChatLearning(input),
            establishedExecution: async (chat) => [...(await this.state.readActiveRecords()), ...(await this.state.readParked())].find((record) => record.waitingChat === chat || record.recoveryChat === chat)?.routing,
            onActivity: (text) => this.log(text),
        };
    }

    // ── Realtime voice (terminal-controlled, call-owned media bridge) ─────────

    /** Live voice calls of this engine. */
    private voiceCallsInstance?: VoiceCalls;

    /** The engine's voice calls (created on first use). */
    private get voiceCalls(): VoiceCalls {
        if (!this.voiceCallsInstance) {
            this.voiceCallsInstance = new VoiceCalls({
                conversation: () => this.conversationContext(),
                onChange: () => this.touch(),
                log: (text) => this.log(text),
                stateDirectory: this.options.project.runtime.state,
            });
        }
        return this.voiceCallsInstance;
    }

    /** Voice availability of a chat across every registered harness instance (never opens a paid call). */
    public async voiceAvailability(name: string): Promise<VoiceAvailabilityReport> {
        return await this.voiceCalls.availability(name, { fresh: true });
    }

    /**
     * Starts realtime voice in an existing chat for its controlling terminal (allowed during Pause like text chat; task
     * work stays paused). Returns the call and its private media page URL.
     */
    public async voiceStart(name: string): Promise<{ readonly call: VoiceCallView; readonly url: string }> {
        if (this.stopRequested) throw new PtbkError('The engine is stopping; voice cannot start now.', { kind: 'conflict', effect: 'Text chat keeps working.' });
        await this.pool.refresh();
        const started = await this.voiceCalls.start(name);
        this.touch();
        return started;
    }

    /** Ends or mutes the chat's live voice call. */
    public async voiceControl(name: string, action: 'end' | 'mute-mic' | 'unmute-mic' | 'mute-output' | 'unmute-output'): Promise<VoiceCallView> {
        const view = await this.voiceCalls.control(name, action);
        this.touch();
        return view;
    }

    /** Renews the controlling terminal's lease of the chat's call (a lost terminal ends it in bounded time). */
    public voiceHeartbeat(name: string): VoiceCallView | undefined {
        return this.voiceCalls.heartbeat(name);
    }

    /** Chats created per client request key (retries return the same chat). */
    private readonly createdChats = new Map<string, string>();

    /** Serializes chat creation so a retried request cannot race its original. */
    private readonly chatCreation = new Mutex();

    /** Replies being written now, by chat name (live progress shared with every client). */
    private readonly liveReplies = new Map<string, LiveReply>();

    /** Per-chat order of turns: one chat answers its messages in order, different chats progress concurrently. */
    private readonly chatTurns = new Map<string, Mutex>();

    /**
     * Runs the chat agent's reply as one unit (read-only; tasks only through ordinary authoring). Different chats reply
     * concurrently, without a shared work-count limit. User messages that arrive during a reply get one follow-up turn at
     * the next safe point.
     */
    private queueChatReply(name: string, options: { readonly followUp?: boolean; readonly agent?: string } = {}): void {
        if (this.options.chatReplies === false) return;
        const key = nameKey(name);
        let lock = this.chatTurns.get(key);
        if (!lock) this.chatTurns.set(key, (lock = new Mutex()));
        void lock
            .run(async () => {
                if (this.stopRequested) return;
                this.touch();
                // A running self-update replaces the loaded code: the reply starts after it (or in the replacement).
                await this.untilMaintenanceEnds();
                if (this.stopRequested) return;
                const unit = this.registerUnit({ id: `chat:${key}:${shortId(6)}`, kind: 'chat', label: name });
                let turn: Awaited<ReturnType<typeof replyInChat>> | undefined;
                let failure: string | undefined;
                try {
                    // A person controlling this agent's session in this chat holds its automatic input back.
                    const controlled = this.sessions.view().open.find((session) => session.lease && session.work.kind === 'chat' && session.work.chat === name && (!options.agent || normalizeAgentName(session.agent) === normalizeAgentName(options.agent.replace(/[@{}]/g, ''))));
                    if (controlled) await this.sessions.untilAutomaticInput(controlled.key, `Reply in {${name}}`, this.ownedWork.signal);
                    turn = await replyInChat(
                        {
                            ...this.conversationContext(),
                            onLive: (chat, live) => {
                                if (live) this.liveReplies.set(chat, live);
                                else this.liveReplies.delete(chat);
                                this.touch();
                            },
                        },
                        name,
                        options,
                    );
                    failure = turn.error;
                } catch (error) {
                    // A chat that no longer exists (or is no conversation) has no reply to owe.
                    if (error instanceof PtbkError && (error.details.kind === 'not-found' || error.details.kind === 'usage')) throw error;
                    failure = errorMessage(error);
                } finally {
                    this.liveReplies.delete(name);
                    this.finishUnit(unit);
                }
                if (failure) await this.chatReplyFailed(name, failure, options.agent);
                else await this.clearChatRecheck(name);
                if (turn?.reply) {
                    const notes = [
                        ...(turn.consultations?.length ? [`consulted in ${turn.consultations.map((consultation) => `{${consultation}}`).join(', ')}`] : []),
                        ...(turn.createdTasks.length ? [`created ${turn.createdTasks.map((task) => `{${task}}`).join(', ')}`] : []),
                    ];
                    this.log(`Reply in {${turn.reply.chat.name}}${notes.length ? ` (${notes.join('; ')})` : ''}.`);
                    // Messages written while the agent was replying are answered next, in order (never dropped); a message
                    // addressed to other agents is theirs to answer.
                    const covered = (await this.state.readChatAddresses())[turn.reply.chat.name]?.upTo ?? 0;
                    const later = turn.seen !== undefined ? turn.reply.chat.messages.slice(Math.max(turn.seen, covered)).filter((message) => message.senderKey === 'user') : [];
                    if (options.agent) await this.state.settleChatAddress(turn.reply.chat.name, options.agent);
                    if (later.length) this.queueChatReply(name, { followUp: true, agent: options.agent });
                }
                await this.refreshChats();
            })
            .catch((error: unknown) => this.log(`The reply in {${name}} failed: ${errorMessage(error)}`, 'warning'));
    }

    /**
     * The current round of one supervisor-loop wait under the shared progressive-waiting policy: a due (or first)
     * round schedules the next growing interval; an early wake-up keeps the scheduled time; changed conditions restart
     * a short interval. Returns the remaining wait and the next recheck time.
     */
    private loopWait(key: string, policy: WaitingPolicy, outcome: { readonly cause: string; readonly conditions: string }): { readonly waitMs: number; readonly nextAt: string } {
        const now = Date.now();
        let schedule = this.loopWaits.get(key);
        if (schedule && schedule.conditions !== outcome.conditions) schedule = undefined;
        if (!schedule || Date.parse(schedule.nextAt) <= now) {
            schedule = nextProgressiveWait(schedule, outcome, policy, now);
            this.loopWaits.set(key, schedule);
        }
        return { waitMs: Math.max(1_000, Date.parse(schedule.nextAt) - now), nextAt: schedule.nextAt };
    }

    /**
     * Fingerprint of what a chat reply or brief recheck depends on: the tools (a new or repaired tool brings it forward).
     */
    private toolConditions(): string {
        const tools = this.tools.items.map((item) => `${item.name}:${item.isEnabled ? item.state : 'disabled'}`).sort();
        return createHash('sha256').update(JSON.stringify({ tools })).digest('hex').slice(0, 16);
    }

    /**
     * A chat reply failed: while the user's message still waits for it, a cause-aware automatic recheck is scheduled
     * (exponential backoff with spreading, capped; the longest wait for an equivalent failure under unchanged tools)
     * and persisted across restarts. Nobody is asked to retry; writing again or a tool change brings it forward.
     */
    private async chatReplyFailed(name: string, cause: string, agent?: string): Promise<void> {
        // A turn interrupted by stopping is replied to after the restart.
        if (this.stopRequested || this.ownedWork.signal.aborted) return;
        const stored = await this.chats.find(name).catch(() => undefined);
        const owed = stored && agent ? (await this.state.readChatAddresses())[stored.chat.name]?.agents.includes(agent) : false;
        if (!stored || (!awaitsReply(stored.chat) && !owed) || stored.chat.status === 'resolved') {
            this.log(`No reply in {${name}}: ${cause}`, 'warning');
            await this.clearChatRecheck(name);
            return;
        }
        const now = Date.now();
        const schedule: ChatReplyRecheck = {
            ...nextRecheck(this.chatRechecks.get(nameKey(name))?.schedule, { cause, conditions: this.toolConditions() }, withInitialDelay(WAITING_POLICIES.chatReply, Number(this.options.env.PTBK_CHAT_REPLY_RECHECK_MS) || undefined), now),
            ...(agent ? { agent } : {}),
            ...(owed ? { followUp: true } : {}),
        };
        const { rounds, equivalent } = schedule;
        this.armChatRecheck(stored.chat.name, schedule);
        await this.saveChatRechecks();
        this.log(
            `No reply in {${stored.chat.name}} (${cause}). Nobody needs to retry it: automatic recheck ${rounds} is due ${formatShortTime(Date.parse(schedule.nextAt), now, this.timeZone)}${equivalent ? ' (the same failure repeated, so it waits longer)' : ''}, sooner when tools change or you write again.`,
            'warning',
        );
    }

    /** Keeps a chat reply recheck and arms its timer (chats reply during pause, so it never waits for the agenda loop). */
    private armChatRecheck(name: string, schedule: ChatReplyRecheck): void {
        const key = nameKey(name);
        clearTimeout(this.chatRechecks.get(key)?.timer);
        const reason = `scheduled after ${schedule.rounds === 1 ? 'the failure' : `${schedule.rounds} failed replies`}`;
        const timer = setTimeout(() => this.startChatRecheck(key, reason), Math.max(0, Date.parse(schedule.nextAt) - Date.now()));
        timer.unref?.();
        this.chatRechecks.set(key, { name, schedule, timer });
        this.touch();
    }

    /** Starts a due (or brought-forward) chat reply recheck: the agent replies to the still unanswered message again. */
    private startChatRecheck(key: string, reason: string): void {
        const entry = this.chatRechecks.get(key);
        if (!entry?.timer) return;
        clearTimeout(entry.timer);
        entry.timer = undefined;
        this.touch();
        if (this.stopRequested) return;
        this.log(`Automatic recheck ${entry.schedule.rounds} of the reply in {${entry.name}} (${reason}).`);
        this.queueChatReply(entry.name, { ...(entry.schedule.agent ? { agent: entry.schedule.agent } : {}), ...(entry.schedule.followUp ? { followUp: true } : {}) });
    }

    /** Changed tools bring waiting chat reply rechecks forward (never sooner than the minimum spacing after scheduling). */
    private reviewChatRechecks(): void {
        if (!this.chatRechecks.size) return;
        const conditions = this.toolConditions();
        const spacing = Math.min(RECOVERY_MIN_SPACING_MS, Number(this.options.env.PTBK_CHAT_REPLY_RECHECK_MS) || CHAT_REPLY_RECHECK_MS);
        for (const [key, entry] of this.chatRechecks) {
            if (entry.timer && entry.schedule.conditions !== conditions && Date.now() - Date.parse(entry.schedule.scheduledAt) >= spacing) this.startChatRecheck(key, 'its tools changed');
        }
    }

    /** Forgets a chat's reply recheck once its reply exists (or no reply is owed anymore). */
    private async clearChatRecheck(name: string): Promise<void> {
        const entry = this.chatRechecks.get(nameKey(name));
        if (!entry) return;
        clearTimeout(entry.timer);
        this.chatRechecks.delete(nameKey(name));
        await this.saveChatRechecks();
        this.touch();
    }

    /** Persists the chat reply rechecks (their rounds and next times survive restarts). */
    private async saveChatRechecks(): Promise<void> {
        await this.state.writeChatRechecks(Object.fromEntries([...this.chatRechecks.values()].map((entry) => [entry.name, entry.schedule]))).catch((error: unknown) => this.logOnce(`Chat reply rechecks could not be saved: ${errorMessage(error)}`, 'warning'));
    }

    /**
     * Creates an ordinary task requested in a chat: its own authoring commit (flushed before it can be dispatched) with
     * `TASK ORIGIN Chat {chat}` and a LINK back, and the chat links the task's final name. It returns at once; the task
     * runs later under the ordinary rules (and waits during pause).
     */
    private async createChatTask(input: ChatTaskInput): Promise<string> {
        if (!input.title) throw new PtbkError('A task needs a name.', { kind: 'usage' });
        const title = generatedName(input.title, { taken: await this.takenNames(), timeZone: this.timeZone });
        const commitments = chatTaskCommitments(input);
        const path = await newTaskPath(this.tasksDirectory, input.title, Date.now(), this.timeZone);
        // The final name (rechecked at publication) is what the chat reports and links.
        const published = await this.addTaskFile(path, renderTaskBook({ title, description: input.description || undefined, commitments }), `Add task - ${title}`, this.commitMode, [title]);
        const name = published.names[0] ?? title;
        await this.chats.annotate(input.chat, { links: [formatAgentReference(name)] }, { trailers: { 'Task-Name': name } }).catch((error: unknown) => this.log(`{${name}} could not be linked from {${input.chat}}: ${errorMessage(error)}`, 'warning'));
        return name;
    }

    /**
     * Publishes a technical prerequisite an executing task discovered as an ordinary task of its own (committed at once,
     * never part of the waiting task's result), linked to that task as its parent and inheriting its priority.
     */
    private async createPrerequisiteTask(input: PrerequisiteInput): Promise<string> {
        const title = generatedName(input.title, { taken: await this.takenNames(), timeZone: this.timeZone });
        const parent = formatAgentReference(input.parent);
        const commitments: string[] = [];
        if (input.agent) commitments.push(`TASK AGENT ${toReference(input.agent)}`);
        if (input.priority) commitments.push(`TASK PRIORITY ${input.priority}`);
        commitments.push(`TASK PURPOSE ${input.purpose.toUpperCase()}`, `TASK PARENT ${parent}`, `TASK ORIGIN prerequisite of ${parent}`);
        const path = await newTaskPath(this.tasksDirectory, input.title, Date.now(), this.timeZone);
        const published = await this.addTaskFile(path, renderTaskBook({ title, description: input.goal, commitments }), `Add task - ${title}`, this.commitMode, [title]);
        return published.names[0] ?? title;
    }

    /** Schedules one Teacher task for a chat correction, unless equivalent teaching work is still unresolved. */
    private async scheduleChatLearning(input: { readonly chat: string; readonly agent: string; readonly note: string }): Promise<string | undefined> {
        const learner = await this.catalog.resolve(formatAgentReference(input.agent));
        if (learner.kind !== 'agent' || !learningPolicyOf(learner.definition.document).open) return undefined;
        const chatKey = nameKey(input.chat);
        const pending = (await this.readQueue()).tasks.find((task) => !['done', 'failed', 'cancelled', 'retired'].includes(task.status) && workKindOf(task) === 'learning' && parseReferenceValue(originTarget(task) ?? '')?.normalized === chatKey);
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
    public async updateSettings(changes: Readonly<Record<string, unknown>>, save: boolean, summary = 'Update project configuration'): Promise<{ applied: string[]; saved: boolean; commit?: string; restartRequired: string[] }> {
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
            if (changed && this.commitMode) commit = await this.commitAuthoring([this.options.project.configPath], summary);
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

    /**
     * Persists one saved external-action record in its own scoped audit commit with the task's provenance, independently
     * of trace inclusion and of the task's later success (never absorbing other work). In an explicit no-commit workflow
     * it stays saved and visibly uncommitted. Until committed it is engine-authored, never attributed to a task.
     */
    private async persistActionRecord(record: { readonly path: string; readonly paths?: readonly string[]; readonly count?: number; readonly subject: { readonly agent: string; readonly taskName: string }; readonly operation: string; readonly service: string }): Promise<'committed' | 'uncommitted'> {
        const paths = record.paths ?? [record.path];
        for (const path of paths) this.authoredPaths.add(path);
        if (!this.repositoryRoot || !this.settings || !this.commitMode) {
            await this.state.addOwnedUncommitted(Object.fromEntries(paths.map((path) => [toProjectRelative(this.options.project.root, path), null])));
            return 'uncommitted';
        }
        // One bulk operation's records share a commit that says how many it covers.
        const count = record.count ?? 1;
        await this.commitAuthoring(paths, agentSubject(record.subject.agent || undefined, `Action - ${record.operation} · ${record.service}${count > 1 ? ` (${count} records)` : ''}`), { 'Task-Name': record.subject.taskName || undefined });
        for (const path of paths) this.authoredPaths.delete(path);
        return 'committed';
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
        this.wakePending = true;
        this.waiter?.resolve('woken');
    }

    /** A state change during evaluation must survive until the next wait is registered. */
    private wakePending = false;

    /** Adds an activity line (also used by the service for connection events). */
    public log(text: string, level: ActivityView['level'] = 'info'): void {
        this.activity.push({ at: new Date().toISOString(), text, level });
        if (this.activity.length > MAX_ACTIVITY) this.activity.splice(0, this.activity.length - MAX_ACTIVITY);
        this.options.onEvent?.(text, level);
        this.touch();
    }

    // ── Units of concurrent work ─────────────────────────────────────────────

    /** Registers an active unit. */
    private registerUnit(input: { readonly id: string; readonly kind: WorkUnit['kind']; readonly label: string; readonly key?: string }): WorkUnit {
        const unit: WorkUnit = { ...input, startedAt: Date.now(), owner: input.id, interrupt: new AbortController() };
        this.units.set(unit.id, unit);
        if (unit.key) this.claimedKeys.add(unit.key);
        this.touch();
        return unit;
    }

    /**
     * Ends a unit: releases the files of its last run unless that run is still recorded (failed,
     * waiting for a retry, or checkpointed with changes), and lets pause/stop settle.
     */
    private finishUnit(unit: WorkUnit): void {
        if (!this.units.delete(unit.id)) return;
        if (unit.key) this.claimedKeys.delete(unit.key);
        void this.releaseUnlessRecorded(unit.owner).finally(() => this.touch());
        for (const listener of [...this.unitListeners]) listener();
        this.settle();
        this.wake();
        this.touch();
    }

    /** Releases a run's files unless an active or checkpointed record still owns them. */
    private async releaseUnlessRecorded(runId: string): Promise<void> {
        const recorded = [...(await this.state.readActiveRecords()), ...(await this.state.readParked())].find((record) => record.runId === runId);
        if (!recorded) this.ownership.release(runId);
        else this.ownership.release(runId, this.ownership.owned(runId).filter((path) => !(recorded.ownedFiles ?? []).includes(path)));
    }

    /**
     * Runs background work as one unit, without waiting for it.
     */
    private launch(input: { readonly label: string; readonly key?: string }, work: (unit: WorkUnit) => Promise<void>): boolean {
        const unit = this.registerUnit({ id: shortId(10), kind: 'task', label: input.label, key: input.key });
        void (async () => {
            try {
                await work(unit);
            } catch (error) {
                await this.reportError('execution', error, input.label);
            } finally {
                this.finishUnit(unit);
            }
        })();
        return true;
    }

    /** Whether a live unit executes this run now. */
    private runIsLive(runId: string): boolean {
        for (const unit of this.units.values()) if (unit.owner === runId) return true;
        return false;
    }

    /** Waits until some active unit finishes (settling towards a stop). */
    private async untilUnitFinishes(): Promise<void> {
        if (!this.units.size) return;
        await new Promise<void>((resolvePromise) => {
            const done = (): void => {
                this.unitListeners.delete(done);
                resolvePromise();
            };
            this.unitListeners.add(done);
        });
    }

    /**
     * A pacing/backoff wait inside one unit (skippable; ends early on stop). The unit stays active: the wait is part
     * of its ordinary bounded execution.
     */
    private async unitWait(unit: WorkUnit, ms: number, view: Omit<WaitView, 'until'>): Promise<'elapsed' | 'skipped' | 'cancelled'> {
        if (this.stopRequested) return 'cancelled';
        unit.wait = { ...view, until: new Date(Date.now() + ms).toISOString() };
        this.touch();
        const reason = await new Promise<'elapsed' | 'skipped' | 'cancelled' | 'woken'>((resolvePromise) => {
            const timer = setTimeout(() => done('elapsed'), Math.max(0, Math.min(ms, 2_147_000_000)));
            const done = (result: 'elapsed' | 'skipped' | 'cancelled' | 'woken'): void => {
                clearTimeout(timer);
                unit.waiter = undefined;
                resolvePromise(result);
            };
            unit.waiter = { skippable: view.skippable, resolve: done };
        });
        unit.wait = undefined;
        this.touch();
        return reason === 'woken' ? 'elapsed' : reason;
    }

    /** Updates a unit's live view. */
    private updateUnit(unit: WorkUnit, change: Partial<CurrentWorkView>): void {
        if (!unit.current) return;
        unit.current = { ...unit.current, ...change };
        this.touch();
    }

    /**
     * Claims files for an agent before it changes them (the `claim_files` tool): waits (bounded) while another run
     * owns one of them, showing the blocker on the waiting unit. The claim is recorded for crash recovery at once.
     */
    private async claimFiles(unit: WorkUnit, label: string, paths: readonly string[]): Promise<{ readonly ok: boolean; readonly message: string }> {
        const relative: string[] = [];
        for (const path of paths) {
            try {
                relative.push(this.ownership.relativePath(await confinePath(this.options.project.root, resolve(this.options.project.root, path))));
            } catch {
                return { ok: false, message: `${path} is outside the project; only project files can be claimed.` };
            }
        }
        const before = unit.current;
        const outcome = await this.ownership.acquire(unit.owner, label, relative, {
            signal: AbortSignal.any([this.ownedWork.signal, unit.interrupt.signal]),
            timeoutMs: CLAIM_WAIT_MS,
            onWait: (conflicts) => {
                this.updateUnit(unit, { detail: `waits for ${describeConflicts(conflicts)}` });
                this.log(`"${label}" waits for ${describeConflicts(conflicts)}.`);
            },
        });
        if (before) this.updateUnit(unit, { detail: before.detail });
        if (!outcome.ok) return { ok: false, message: `Not claimed: ${describeConflicts(outcome.conflicts)}. Work on other files, or call claim_files again later.` };
        const record = await this.state.readActive(unit.owner);
        if (record) await this.state.writeActive({ ...record, ownedFiles: this.ownership.owned(unit.owner) });
        return { ok: true, message: `Claimed ${relative.join(', ')}; you own ${relative.length === 1 ? 'it' : 'them'} until this task's result is committed.` };
    }

    /**
     * Files the harness reported changing: they belong to the run (taken at once). A file another run owns was changed
     * against its ownership: that is reported, never silently merged into either result.
     */
    private reportedEdits(unit: WorkUnit, label: string, paths: readonly string[]): void {
        const inProject = paths.filter((path) => !this.ownership.relativePath(path).startsWith('..'));
        const taken = this.ownership.tryAcquire(unit.owner, label, inProject.filter((path) => !this.ownership.conflicts(unit.owner, [path]).length));
        void taken;
        const conflicts = this.ownership.conflicts(unit.owner, inProject);
        if (conflicts.length) this.log(`"${label}" changed ${describeConflicts(conflicts)} without owning it; the change stays with that work's file.`, 'warning');
    }

    /**
     * The changed paths that belong to a run: files it owns (claimed or reported by its harness), plus unowned changes
     * only this run can have made: no other run's turn overlapped, only its own turn covers the modification time, or
     * the agent itself named the file. Ambiguous changes stay unowned and visible (never committed with the wrong work)
     * and are handed to Fixer's health check instead of blocking new work.
     */
    private async attributeChanges(unit: WorkUnit, label: string, changed: readonly string[], reported = ''): Promise<string[]> {
        const mine: string[] = [];
        for (const path of changed) {
            const owner = this.ownership.ownerOf(path);
            if (owner?.owner === unit.owner) {
                mine.push(path);
                continue;
            }
            if (owner) continue;
            const absolute = resolve(this.options.project.root, path);
            // Engine authoring published meanwhile (after the run's exclusions were taken, before Git status returned).
            if (this.authoredPaths.has(absolute)) continue;
            const modified = await stat(absolute).then((stats) => stats.mtimeMs).catch(() => undefined);
            const named = reported.includes(path) || reported.includes(absolute);
            if ((this.turns.attributable(unit.owner, unit.startedAt, modified) || named) && this.ownership.tryAcquire(unit.owner, label, [path]).ok) {
                mine.push(path);
                this.unattributed.delete(absolute);
            } else if (!this.unattributed.has(absolute)) {
                this.unattributed.add(absolute);
                this.log(`${path} changed while several tasks worked and no task claimed or reported it, so it is not attributed to "${label}"; it stays uncommitted for review (Fixer's health check covers it).`, 'warning');
            }
        }
        return mine;
    }

    /** Changes of concurrent work that no run could be credited with (kept uncommitted; never "unrelated" user edits). */
    private readonly unattributed = new Set<string>();

    /**
     * Files other live units own now (a check failing meanwhile may see their partial state). With `blocking`, only
     * files of units a waiting check should wait for: units that are not themselves waiting for checks, or that started
     * waiting earlier. So runs waiting for each other never wait mutually: the earliest waiter proceeds.
     */
    private foreignChanges(unit: WorkUnit, options: { readonly blocking?: boolean } = {}): string[] {
        const since = unit.checkWaitingSince ?? Number.POSITIVE_INFINITY;
        const live = new Set(
            [...this.units.values()]
                .filter((other) => other !== unit && (!options.blocking || other.checkWaitingSince === undefined || other.checkWaitingSince < since))
                .map((other) => other.owner),
        );
        return this.ownership.entries().filter((entry) => live.has(entry.owner)).map((entry) => entry.path);
    }

    // ── Snapshot ─────────────────────────────────────────────────────────────

    /** Publishes a change of service-owned state (e.g. the project browser) to every view. */
    public notifyChange(): void {
        this.touch();
    }

    /** Active task units (with a live view), oldest first. */
    private activeTaskUnits(): WorkUnit[] {
        return [...this.units.values()].filter((unit) => unit.kind === 'task' && unit.current).sort((a, b) => a.startedAt - b.startedAt);
    }

    /** Live views of every active unit (tasks with their files and waits, chat turns), oldest first. */
    private activeViews(): CurrentWorkView[] {
        return [...this.units.values()]
            .sort((a, b) => a.startedAt - b.startedAt)
            .flatMap((unit): CurrentWorkView[] => {
                if (unit.current) return [{ ...unit.current, unit: unit.id, ...(unit.wait ? { wait: unit.wait } : {}), files: this.ownership.owned(unit.owner) }];
                if (unit.kind !== 'chat') return [];
                return [
                    {
                        unit: unit.id,
                        taskRef: `{${unit.label}}`,
                        taskTitle: unit.label,
                        kind: 'chat',
                        agent: agentView('Chat', 'working'),
                        harness: '',
                        harnessName: '',
                        modelSource: 'default',
                        phase: 'executing',
                        attempt: 0,
                        attemptBudget: 0,
                        startedAt: new Date(unit.startedAt).toISOString(),
                        detail: 'replying in the chat',
                    },
                ];
            });
    }

    /**
     * Effective execution configuration of every active task run (the first one in `execution`), or of the last
     * finished one labelled historical (never presented as currently running).
     */
    private executionViews(): ExecutionDetailView[] {
        const active = this.activeTaskUnits().flatMap((unit) => {
            const view = this.unitExecutionView(unit);
            return view ? [view] : [];
        });
        if (active.length) return active;
        const last = this.recentResults[0];
        if (!last?.harness) return [];
        return [
            {
                status: 'historical',
                task: { ref: last.ref, title: last.title, source: last.source, trace: last.trace, kind: last.kind ?? 'task' },
                agent: { name: last.agent ?? 'unknown' },
                startedAt: last.startedAt,
                endedAt: last.endedAt,
                outcome: last.outcome,
                attempt: last.attempts || undefined,
                contexts: [executionContextView({ role: 'task', agent: last.agent ?? 'unknown', harness: last.harness, harnessVersion: last.harnessVersion, model: last.model, modelReported: last.modelReported, thinkingLevel: last.thinkingLevel, state: 'finished' })],
            },
        ];
    }

    /** Effective execution configuration of one active task run. */
    private unitExecutionView(unit: WorkUnit): ExecutionDetailView | undefined {
        const current = unit.current;
        const context = unit.context;
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
        return undefined;
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
        const active = this.activeViews();
        const activityOf = (name: string): BadgeActivity => {
            const working = active.filter((view) => view.kind !== 'chat' && normalizeAgentName(view.agent.name) === normalizeAgentName(name));
            return working.find((view) => view.agent.activity === 'working')?.agent.activity ?? working[0]?.agent.activity ?? 'idle';
        };
        const current = active.find((view) => view.kind !== 'chat');
        const executions = this.executionViews();
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
        for (const view of active) if (view.kind !== 'chat' && !agents.some((agent) => agent.key === view.agent.key)) agents.unshift(view.agent);
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
            phase: this.pauseActive && !this.executing && !this.intent && !this.shutdown ? 'paused' : current ? current.phase : this.phase,
            current,
            active,
            workload: this.workloadView(),
            harnessSessions: this.sessions.view(),
            taskControl: this.taskControlStore.view(),
            execution: executions[0],
            executions: executions.filter((execution) => execution.status === 'active'),
            browser: this.options.browsers?.primary(),
            browsers: this.options.browsers?.all(),
            tools: this.settings && this.pool ? toolInventory({ project: this.options.project, settings: this.settings, env: this.options.env, pool: this.pool, browsers: this.browserReadiness, inUse: this.toolsInUse(), retained: this.retainedTools() }) : undefined,
            sync: this.sync.view(),
            health: this.health?.view(),
            wallet: this.wallet.view(),
            ...(this.actions.view ? { actions: this.actions.view } : {}),
            report: this.reportSnapshot(),
            ...(this.lastCommit ? { history: { last: this.lastCommit } } : {}),
            configuration: this.settings ? { promptbookVersion: typeof this.settings.interpreted.promptbookVersion === 'string' ? this.settings.interpreted.promptbookVersion : undefined, pending: this.configurationPending } : undefined,
            update: this.updater.view(),
            wait: this.waitView,
            ...this.queueWithSystemTasks(),
            // System task runs share the results feed with ordinary outcomes (newest first, same bound).
            results: { completed: this.completed, failed: this.failed, recent: [...this.recentResults, ...this.updater.resultViews()].sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt)).slice(0, 20) },
            chats: { waiting: this.waitingChats(), unread: this.chatSummaries.reduce((sum, chat) => sum + chat.unread, 0), total: this.chatSummaries.length, recent: this.chatSummaries.slice(0, 30), replying: [...this.liveReplies.keys()], rechecks: this.chatRecheckViews(), pings: this.chatPings() },
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
            ...(this.usageOverview() ? { usage: this.usageOverview() } : {}),
        };
        return { ...snapshot, attention: domainAttention(snapshot) };
    }

    /** The queue summary with pending engine-defined system tasks after ordinary work (they share one queue). */
    private queueWithSystemTasks(): Pick<ServiceSnapshot, 'queue' | 'queueTotal'> {
        const system = this.updater.queueItem();
        return system ? { queue: [...this.queueView, system], queueTotal: this.queueTotal + 1 } : { queue: this.queueView, queueTotal: this.queueTotal };
    }

    /** The cached usage overview and when its refresh started (raw records are only read, never written, by views). */
    private usageCache?: { readonly view?: UsageOverview; readonly refreshing?: boolean; readonly at: number };

    /**
     * The seven-day usage overview of snapshots: served from a cache refreshed in the background at most once a
     * minute, so building snapshots never blocks on reading evidence.
     */
    private usageOverview(): UsageOverview | undefined {
        const cache = this.usageCache;
        if (!cache || (!cache.refreshing && Date.now() - cache.at > USAGE_REFRESH_MS)) {
            this.usageCache = { view: cache?.view, refreshing: true, at: Date.now() };
            void this.usageSummary({ grouping: 'none' })
                .then(async (total) => {
                    const breakdown = async (grouping: UsageGrouping, scope: 'self' | 'inclusive' = 'self'): Promise<readonly UsageRow[]> => (await this.usageSummary({ grouping, scope })).rows;
                    const view: UsageOverview = {
                        days: total.days,
                        from: total.from,
                        to: total.to,
                        computedAt: new Date().toISOString(),
                        total: total.total,
                        breakdowns: { agent: await breakdown('agent'), agentInclusive: await breakdown('agent', 'inclusive'), harness: await breakdown('harness'), model: await breakdown('model'), work: await breakdown('work') },
                    };
                    this.usageCache = { view, at: Date.now() };
                    this.touch();
                })
                .catch(() => {
                    this.usageCache = { view: cache?.view, at: Date.now() };
                });
        }
        return this.usageCache?.view;
    }

    /**
     * The shared usage view over durable raw usage and the independent price observations (terminal, browser and API
     * derive the same results). It only reads evidence: no usage is manufactured and no paid probe runs.
     */
    public async usageSummary(options: { readonly days?: number; readonly grouping?: UsageGrouping; readonly scope?: 'self' | 'inclusive'; readonly filter?: UsageFilter } = {}): Promise<UsageSummary> {
        const [records, prices] = await Promise.all([readUsage(this.options.project), readPriceObservations(this.options.project)]);
        return summarizeUsage(records, { ...options, prices });
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

    /** Names of tools held by active work (each task's harness instance, active consultations, acquired browsers). */
    private toolsInUse(): Set<string> {
        const names = new Set<string>(this.options.browsers?.inUse() ?? []);
        for (const unit of this.units.values()) {
            if (unit.current && unit.context?.selection.tool) names.add(unit.context.selection.tool);
            for (const consultation of unit.context?.consultations ?? []) if (consultation.state === 'active' && consultation.harness.tool) names.add(consultation.harness.tool);
        }
        return names;
    }

    /** Tools whose acquired old configuration active work still uses (changed, disabled or removed meanwhile). */
    private retainedTools(): Set<string> {
        const retained = new Set((this.options.browsers?.all() ?? []).filter((browser) => browser.retained && browser.inUse).map((browser) => browser.name));
        for (const unit of this.units.values()) {
            const tool = unit.current ? unit.context?.selection.tool : undefined;
            if (tool && !this.settings.tools.some((record) => record.name === tool && record.isEnabled)) retained.add(tool);
        }
        return retained;
    }

    /** Ready/queued work that waits for its agent or for files, counted at the last evaluation. */
    private queuedWork = 0;

    /** Checkpointed runs waiting for a person or resource, counted at the last evaluation. */
    private waitingWork = 0;

    /** The counts of active, waiting and queued work. */
    private workloadView(): ServiceSnapshot['workload'] {
        if (!this.settings) return undefined;
        return {
            active: this.units.size,
            waiting: this.waitingWork,
            queued: this.queuedWork,
            files: this.ownership.entries().map((entry) => ({ path: entry.path, owner: entry.label })),
        };
    }

    /**
     * Re-reads the tool inventory and `.env`, reinspecting changed and new instances (no browser launch, no model
     * call). Runs before every task, while idle or waiting, and when ptbk.json/.env change during active work: a
     * new usable tool can serve active tasks at their next selection.
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
        this.reviewChatRechecks();
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

    /**
     * Keeps the task views current while a pause stops the loop from evaluating: tasks created or edited meanwhile (by
     * the user, a client, a chat or a save's repair) appear in the inventory and queue as pending work. Only the Book
     * catalog and readiness are reloaded, without configuration maintenance or claims, so nothing starts.
     */
    private async refreshTaskViews(): Promise<void> {
        if (!this.pauseActive || !this.settings) return;
        try {
            this.catalog = await AgentCatalog.load(this.options.project.root, setting<string>(this.settings, 'paths.agents'), setting<string>(this.settings, 'paths.tasks'));
            await this.evaluate();
            this.touch();
        } catch (error) {
            this.logOnce(`The paused task views could not be refreshed: ${errorMessage(error)}`, 'warning');
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
            blockers.push({
                kind: 'configuration',
                title: 'Invalid configuration',
                reason: configErrors.map((error) => `${error.location}: ${error.message}`).join('; '),
                action: loaded.migration.kind === 'older-engine' ? (setting<boolean>(loaded, 'updates.isAutoUpdateEnabled') ? 'The engine updates itself when its update policy allows a compatible release; otherwise update ptbk and restart the service.' : 'Update ptbk (automatic updates are off in ptbk.json), then restart the service.') : 'Fix ptbk.json.',
                ...(loaded.migration.kind === 'older-engine' && setting<boolean>(loaded, 'updates.isAutoUpdateEnabled') ? { automatic: true } : {}),
            });
        } else if (loaded.migration.kind === 'migrate' && this.configurationPending) {
            blockers.push({ kind: 'configuration', title: 'Configuration migration pending', reason: this.configurationPending, action: 'See the reason; ptbk retries automatically.', automatic: true });
        }
        this.blockers = [...blockers, ...this.blockers.filter((blocker) => !['workspace', 'configuration'].includes(blocker.kind))];
    }

    /** Reloads chat summaries (waiting-for-user first) into the view, with each chat's pending commit state. */
    private async refreshChats(): Promise<void> {
        const summaries = await this.chats.summaries().catch(() => this.chatSummaries);
        this.chatSummaries = summaries.map((summary) => {
            const pending = this.chatBatches.pending(summary.name);
            const { persistence: _previous, ...rest } = summary;
            void _previous;
            return pending ? { ...rest, persistence: { state: pending.failure ? 'failed' : 'pending', since: pending.since, ...(pending.failure ? { failure: pending.failure } : {}) } } : rest;
        });
        this.scheduleAttentionReview();
        // A live voice call learns about messages that arrived from elsewhere (typed text, written replies, results).
        for (const call of this.voiceCallsInstance?.live() ?? []) {
            const stored = await this.chats.find(call.chat).catch(() => undefined);
            if (stored) await this.voiceCalls.observe(call.chat, stored.chat.messages).catch(() => undefined);
        }
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
                            void this.refreshTaskViews();
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
        for (const entry of this.chatRechecks.values()) clearTimeout(entry.timer);
        clearTimeout(this.reportCommitTimer);
        clearTimeout(this.attentionTimer);
        this.attentionOwnerInstance?.stop();
        // Stop, force stop and panic end every voice call: microphone, playback, provider session and bridge.
        void this.voiceCallsInstance?.endAll('The engine stopped.');
        this.sync.end();
        this.health?.stop();
    }

    // ── Waiting ──────────────────────────────────────────────────────────────

    /**
     * Waits with an honest explanation; resolves on time, skip (skippable only), wake or stop.
     */
    private async wait(ms: number, view: Omit<WaitView, 'until'> & { until?: string }): Promise<'elapsed' | 'skipped' | 'cancelled' | 'woken'> {
        if (this.stopRequested) return 'cancelled';
        if (this.wakePending) {
            this.wakePending = false;
            this.waiterSkipped = false;
            return 'woken';
        }
        const until = view.kind === 'user' || view.kind === 'paused' ? undefined : Number.isFinite(ms) ? new Date(Date.now() + ms).toISOString() : view.until;
        this.waitView = { ...view, until };
        if (!this.executing) this.phase = view.kind === 'paused' ? 'paused' : ['setup', 'recovery', 'workspace', 'persistence'].includes(view.kind) ? 'blocked' : view.kind === 'user' ? 'awaiting-user' : view.kind === 'idle' || view.kind === 'schedule' || view.kind === 'discovery' ? 'idle' : 'waiting';
        this.touch();
        const reason = await new Promise<'elapsed' | 'skipped' | 'cancelled' | 'woken'>((resolvePromise) => {
            let timer: NodeJS.Timeout | undefined;
            const done = (result: 'elapsed' | 'skipped' | 'cancelled' | 'woken'): void => {
                if (timer) clearTimeout(timer);
                if (result === 'woken') this.wakePending = false;
                this.waiter = undefined;
                resolvePromise(result);
            };
            if (Number.isFinite(ms)) timer = setTimeout(() => done('elapsed'), Math.max(0, Math.min(ms, 2_147_000_000)));
            this.waiter = { skippable: view.skippable, resolve: done };
            // Publishing the wait can synchronously notify a listener that wakes the engine before registration.
            if (this.wakePending) done('woken');
        });
        this.waitView = undefined;
        this.waiterSkipped = reason === 'skipped';
        this.touch();
        return reason;
    }

    // ── Main iteration ───────────────────────────────────────────────────────

    /**
     * One supervisor step: handle recorded runs (failures, retries, recovery), claim eligible work while agents and
     * file ownership allow, discover goal work when nothing is left, or wait for a change. Claimed work runs as
     * concurrent units; the loop never waits for one of them.
     */
    private async iteration(): Promise<void> {
        this.settle();
        if (this.shutdown) return;
        await this.deliverTaskNotifications().catch((error: unknown) => this.log(`A completion notification waits: ${errorMessage(error)}`, 'warning'));
        if (this.stopRequested) {
            // Settling towards stop: nothing new starts; every active task and chat turn finishes or checkpoints first.
            this.waitView = { kind: 'settling', reason: `Stopping: ${this.units.size} active unit${this.units.size === 1 ? '' : 's'} finishing or checkpointing first.`, skippable: false };
            this.touch();
            await this.untilUnitFinishes();
            this.waitView = undefined;
            return;
        }
        if (this.pauseActive) {
            await this.wait(Infinity, { kind: 'paused', reason: this.pauseExplanation(), skippable: false });
            return;
        }
        this.phase = 'evaluating';
        await this.refreshContext();
        await this.refreshChats();
        // A configuration saved by a newer engine: the update its saved policy already allows is the fix (no confirmation);
        // otherwise the project is kept as it is and the real constraint is reported.
        const required = this.settings.migration.kind === 'older-engine' ? this.settings.migration.saved : undefined;
        this.updater.requireAtLeast(required);
        if (this.blockers.some((blocker) => blocker.kind === 'workspace' || blocker.kind === 'configuration')) {
            const blocker = this.blockers.find((item) => item.kind === 'workspace' || item.kind === 'configuration')!;
            if (required && this.claimable && !this.units.size && this.updater.isDue) {
                await this.runEngineUpdate();
                return;
            }
            const constraint = required && !this.updater.isDue ? ` Engine update: ${this.updater.view().reason}` : '';
            const setupWait = this.loopWait('setup', WAITING_POLICIES.setup, { cause: blocker.reason, conditions: `${blocker.kind}:${blocker.title}` });
            await this.wait(Math.min(setupWait.waitMs, Math.max(1_000, (this.updater.wakeAt() ?? Infinity) - Date.now())), { kind: 'setup', reason: `${blocker.title}: ${blocker.reason}${constraint}`, action: blocker.action, skippable: false });
            return;
        }
        this.loopWaits.delete('setup');
        // Shared harness executables are only updated while nothing runs them.
        if (!this.units.size) await this.maintainHarnesses();
        this.maintainPriceLists();
        if (await this.handleRecordedRuns()) return;
        if (await this.resumeParked()) return;
        this.blockers = this.blockers.filter((blocker) => blocker.kind !== 'recovery' && (blocker.kind !== 'persistence' || this.resumeAfter.size > 0));
        if (!(await this.checkBeforeWork())) return;
        // Opt-in synchronization before new work: an attempt, never a prerequisite of local progress.
        await this.sync.request('boundary');
        const evaluated = await this.evaluate();
        if (await this.scheduleHealthCheck(evaluated)) return;
        if (await this.scheduleRoutingRepairs(evaluated)) return;
        // Chatter's brief is ordinary background work: it never runs while paused.
        await this.refreshReportView();
        await this.refreshLastCommit();
        if (this.claimable && (await this.reportDue())) this.launch({ label: 'Project brief' }, async (unit) => await this.runReport(unit));
        // While Router cannot run, routing waits (bounded) and its repair or other ready work proceeds.
        const routerProblem = evaluated.some((item) => item.readiness.kind === 'needs-assignment') ? await this.routerProblem() : undefined;
        const now = Date.now();
        for (const [key, until] of this.claimDeferred) if (until <= now) this.claimDeferred.delete(key);
        const candidates = selectCandidates(evaluated, now, { assignable: !routerProblem }).filter((candidate) => !this.claimedKeys.has(candidate.task.key) && !this.claimDeferred.has(candidate.task.key));
        const waitingForTools = this.tools.waiting;
        // Unfinished work that cannot be routed for lack of tools is a running resource wait (never a plain idle).
        if (waitingForTools && (candidates.length || evaluated.some((item) => isUnfinished(item.readiness)))) {
            // A running engine waiting for resources (not a pause or stop): controls, refresh and rechecks stay alive.
            // Deterministic readiness rechecks back off (never paid); tool changes and commands wake the loop sooner.
            const toolsWait = this.loopWait('tools', WAITING_POLICIES.tools, { cause: waitingForTools.reason, conditions: this.toolConditions() });
            this.setBlocker({ kind: 'tools', title: 'Waiting for tools', reason: waitingForTools.reason, action: waitingForTools.action, recheckAt: toolsWait.nextAt, ...(waitingForTools.automatic ? { automatic: true } : {}) });
            await this.wait(toolsWait.waitMs, { kind: 'tools', reason: `Waiting for tools: ${waitingForTools.reason}`, action: waitingForTools.action, skippable: false });
            return;
        }
        this.loopWaits.delete('tools');
        if (candidates.length) {
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
            if (this.pacingUntil > Date.now()) {
                await this.wait(this.pacingUntil - Date.now(), { kind: 'pacing', reason: 'Pause between tasks (--wait-between-prompts).', skippable: true });
                if (this.waiterSkipped) this.pacingUntil = 0;
                return;
            }
            let launched = 0;
            const blockedByFiles: FileConflict[] = [];
            // One started unfinished task per agent: a busy (or waiting) agent's next task queues; other agents proceed.
            const reserved = await this.agentReservations();
            const router = candidates.some((candidate) => candidate.readiness.kind === 'needs-assignment') ? (await routerAgent(this.catalog))?.name : undefined;
            const blockedByAgents: Array<{ readonly agent: string; readonly holder: string }> = [];
            for (const candidate of candidates) {
                // A task whose source another run is changing waits for it (no whole-project serialization).
                const conflicts = this.ownership.conflicts('', [candidate.task.source.path]);
                if (conflicts.length) {
                    blockedByFiles.push(...conflicts);
                    continue;
                }
                const agent = candidate.readiness.kind === 'needs-assignment' ? router : this.routedAgents.get(candidate.task.key);
                const agentKey = agent ? normalizeAgentName(parseReferenceValue(agent)?.name ?? agent) : undefined;
                const reservation = agentKey ? reserved.get(agentKey) : undefined;
                if (agent && reservation && !reservation.prerequisites.has(candidate.task.key)) {
                    blockedByAgents.push({ agent, holder: reservation.holder });
                    continue;
                }
                if (!this.launch({ label: candidate.task.title, key: candidate.task.key }, async (unit) => await this.startTask(candidate, unit))) break;
                if (agentKey) reserved.set(agentKey, { holder: candidate.task.title, prerequisites: new Set() });
                launched++;
            }
            this.queuedWork = candidates.length - launched;
            if (launched) return;
            const reason = blockedByFiles.length
                ? `Ready work waits for files other work is changing: ${describeConflicts(blockedByFiles)}.`
                : `Ready work waits for its agents' unfinished tasks: ${[...new Map(blockedByAgents.map((item) => [item.agent, item.holder])).entries()].map(([agent, holder]) => `${agent} holds "${holder}"`).join('; ')}.`;
            this.phase = 'waiting';
            await this.wait(IDLE_RECHECK_MS, { kind: blockedByFiles.length ? 'files' : 'agent', reason, skippable: false });
            return;
        }
        this.queuedWork = 0;
        if (!this.executing && !evaluated.some((item) => isUnfinished(item.readiness)) && setting<boolean>(this.settings, 'discovery.isEnabled') && !waitingForTools && this.claimable) {
            const chosen = await this.discoveryDue();
            if (chosen && this.launch({ label: `Goal enquiry of ${chosen.name}` }, async (unit) => await this.runDiscovery(chosen, unit))) return;
        }
        // The engine's self-update is the lowest-priority system task: it claims its maintenance boundary only when this
        // engine has free hands (running, no active task or chat turn, nothing else eligible). Lookups never block.
        void this.updater.lookupIfDue()?.then(() => this.wake());
        if (this.claimable && !this.units.size && this.updater.isDue) {
            await this.runEngineUpdate();
            return;
        }
        const waiting = evaluated.filter((item) => item.readiness.kind === 'waiting-until').map((item) => (item.readiness as { until: number }).until);
        const earliest = (times: readonly number[]): number | undefined => times.filter((until) => until > Date.now()).reduce<number | undefined>((first, until) => (first === undefined || until < first ? until : first), undefined);
        const nextTime = earliest([...waiting, ...(this.nextKnownTime ? [this.nextKnownTime] : [])]);
        this.nextKnownTime = nextTime;
        // Internal retries (resumable runs, deferred claims, a failed brief's recheck) also wake the loop, without being
        // presented as scheduled work.
        const wakeAt = earliest([...(nextTime ? [nextTime] : []), ...this.resumeAfter.values(), ...this.claimDeferred.values(), ...this.recoveryDue.values(), ...(this.reportRecheck ? [Date.parse(this.reportRecheck.nextAt)] : []), ...(this.updater.wakeAt() ? [this.updater.wakeAt()!] : [])]);
        const blocked = evaluated.filter((item) => ['blocked', 'needs-recovery', 'failed'].includes(item.readiness.kind));
        const reason = this.executing
            ? `${this.units.size} unit${this.units.size === 1 ? '' : 's'} working; no other eligible work now.`
            : nextTime
              ? `No eligible work now; next scheduled work at ${formatShortTime(nextTime, Date.now(), this.timeZone)}.`
              : blocked.length
                ? `No eligible work; ${blocked.length} task(s) blocked (${blocked[0]!.task.title}: ${blocked[0]!.readiness.reason}).`
                : waitingForTools && !evaluated.some((item) => isUnfinished(item.readiness))
                  ? `No unfinished work. Waiting for tools: ${waitingForTools.reason}`
                  : (this.idleReason ?? 'No unfinished work.');
        this.phase = 'idle';
        await this.wait(wakeAt ? Math.min(Math.max(1_000, wakeAt - Date.now()), IDLE_RECHECK_MS) : IDLE_RECHECK_MS, { kind: nextTime ? 'schedule' : 'idle', reason, skippable: false });
    }

    /** Whether the last loop wait was skipped by the operator. */
    private waiterSkipped = false;

    /**
     * Handles recorded runs that no live unit executes: a failed run goes to Fixer or asks how to continue, a run
     * waiting for a person is checkpointed, and a resumable run (crash recovery, retry after quota/setup/commit
     * problems) is resumed as its own unit when its retry time has come. A run left in an older
     * engine's task worktree is checkpointed with an explanation. Returns whether the loop should reevaluate at once.
     */
    private async handleRecordedRuns(): Promise<boolean> {
        let changed = false;
        for (let record of await this.state.readActiveRecords()) {
            if (this.runIsLive(record.runId)) continue;
            if (record.worktree) {
                this.log(`"${record.taskTitle}" was running in a task worktree of an older engine (${record.worktree}); task worktrees were removed, so it is kept for you to merge or discard (ptbk recover).`, 'warning');
                await this.state.park(record);
                changed = true;
                continue;
            }
            if (record.phase === 'failed') {
                if (this.options.mode === 'maintenance') continue;
                await this.handleFailedRecord(record);
                changed = true;
                continue;
            }
            if ((this.resumeAfter.get(record.runId) ?? 0) > Date.now()) continue;
            if (record.phase === 'awaiting-user' && ((record.waitingChat && !(await this.chatReplyOf(record.waitingChat, record.awaitedMessages, undefined, record.answerMessage)).answered) || this.walletPending(record))) {
                await this.checkpoint(record);
                changed = true;
                continue;
            }
            if (record.phase === 'awaiting-task') {
                const settled = await this.prerequisitesSettled(record);
                if (!settled) {
                    await this.checkpoint(record);
                    changed = true;
                    continue;
                }
                record = { ...record, feedback: settled };
                await this.state.writeActive(record);
            }
            if (!this.claimable || this.claimedKeys.has(record.taskKey || nameKey(record.taskTitle))) continue;
            this.resumeAfter.delete(record.runId);
            if (!this.launch({ label: record.taskTitle, key: record.taskKey || nameKey(record.taskTitle) }, async (unit) => await this.continueActive(record, unit))) break;
        }
        return changed;
    }

    /**
     * Current project health findings Fixer can act on: Book syntax, name collisions and shadowing, unresolved or
     * wrong-kind references, unreadable task sources, chat syntax and configuration problems (no model call).
     */
    private async healthFindings(evaluated: readonly EvaluatedTask[]): Promise<string[]> {
        const findings = new Set<string>();
        // Files an active run owns are its work in progress (it is validated before its result), not project problems.
        const settled = (path: string | undefined): boolean => !path || !this.ownership.ownerOf(path);
        for (const diagnostic of this.catalog.index.diagnostics) if (settled(diagnostic.path)) findings.add(`${diagnostic.severity}: ${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        // Problems of effective agents (inheritance, references, MODEL) and of every project Book's own content.
        for (const diagnostic of await validateAgents(this.catalog)) if (settled(diagnostic.path)) findings.add(`${diagnostic.severity}: ${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        for (const diagnostic of this.settings.diagnostics.filter((item) => !item.location.startsWith('--') && !item.location.startsWith('environment ›') && !/migration .* is pending/.test(item.message))) {
            findings.add(`${diagnostic.severity}: ${diagnostic.location} — ${diagnostic.message}`);
        }
        const inProgress = this.ownership.entries().map((entry) => entry.path);
        for (const problem of (await this.readQueue()).problems) if (!inProgress.some((path) => problem.includes(path))) findings.add(`error: ${problem}`);
        for (const { task } of evaluated) {
            if (!settled(task.source.relativePath)) continue;
            for (const diagnostic of task.diagnostics.filter((item) => item.severity === 'error')) findings.add(`error: ${task.source.relativePath}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        }
        for (const stored of await this.chats.list().catch(() => [])) {
            for (const diagnostic of stored.chat.diagnostics.filter((item) => item.severity === 'error')) findings.add(`error: ${stored.relativePath}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`);
        }
        // Changes of concurrent work nobody could be credited with stay uncommitted until someone reviews them.
        if (!this.units.size && this.repositoryRoot) {
            const dirty = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot });
            for (const absolute of [...this.unattributed]) {
                const path = toProjectRelative(this.options.project.root, absolute);
                if (dirty[path] === undefined || this.ownership.ownerOf(path)) this.unattributed.delete(absolute);
                else findings.add(`warning: ${path} — changed while several tasks worked concurrently, but no task claimed or reported it; review it and commit (or revert) it as appropriate.`);
            }
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
        await this.addTaskFile(path, renderTaskBook({ title, description, commitments: ['TASK AGENT @Fixer', 'TASK PURPOSE SYSTEM', `TASK ORIGIN ${HEALTH_ORIGIN}`] }), `Add task - ${title}`, this.commitMode, [title]);
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
        const parkedRecords = await this.state.readParked();
        this.waitingWork = parkedRecords.length;
        const { awaitingUser, integrations, prerequisites } = parkedReadiness(parkedRecords);
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
        const active = await this.state.readActiveRecords();
        const evaluated = await evaluateQueue(queue.tasks, {
            now: Date.now(),
            timeZone: this.timeZone,
            activeKeys: new Set([...active.map((record) => record.taskKey || normalizeAgentName(record.taskTitle)), ...this.claimedKeys]),
            awaitingUser,
            prerequisites,
            recovery: new Map([...Object.entries(blockers).map(([key, blocker]) => [key, blocker.reason] as const), ...integrations]),
            uncommittedSources: uncommitted,
            activation: (task) => activations[task.key] ?? Date.now(),
            route,
            assignmentFor,
            routingBlocks,
        });
        this.routedAgents = new Map(evaluated.flatMap(({ task }) => {
            const resolution = routeCache.get(task.ref);
            return resolution?.kind === 'routable' ? [[task.key, resolution.selection.agent] as const] : [];
        }));
        this.inventory = evaluated.map(({ task, readiness }) => {
            const resolution = routeCache.get(task.ref);
            const agent = resolution?.kind === 'routable' ? resolution.selection.agent : task.routing.agent;
            return {
                ref: task.ref,
                title: task.title,
                readiness: readiness.kind,
                reason: readiness.reason,
                priority: task.priority.value,
                priorityText: task.priority.raw ? describePriority(task.priority) : undefined,
                agent,
                model: task.routing.model.explicit ? formatModelContent(task.routing.model) : undefined,
                until: readiness.kind === 'waiting-until' ? new Date(readiness.until).toISOString() : readiness.kind === 'needs-assignment' && readiness.ahead?.until ? new Date(readiness.ahead.until).toISOString() : undefined,
                repeat: task.repeatRaw,
                lastDone: task.doneStamps.filter((stamp) => !stamp.startsWith('unknown')).at(-1)?.split(/\s+/)[0],
                doneCount: task.doneStamps.length,
                source: task.source.relativePath,
                origin: task.origin,
                // Purpose and core provenance are independent descriptive properties (presentation only).
                ...(task.purpose ? { purpose: task.purpose } : {}),
                ...(agent && isCoreAgent(agent) ? { core: true } : {}),
                ...(readiness.kind === 'awaiting-user' && readiness.chat !== 'checkpoint' && readiness.chat !== WALLET_WAIT ? { waitingChat: readiness.chat } : {}),
            } satisfies TaskInventoryItem;
        });
        this.queueTotal = evaluated.filter((item) => item.readiness.kind !== 'done' && item.readiness.kind !== 'retired' && item.readiness.kind !== 'cancelled').length;
        this.queueView = evaluated
            .filter((item) => item.readiness.kind !== 'done' && item.readiness.kind !== 'retired' && item.readiness.kind !== 'cancelled')
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
                    // Presentation only: views mute supporting system work.
                    ...(item.task.purpose ? { purpose: item.task.purpose } : {}),
                    // What an awaiting task waits for (its attention is that request's, never a second occurrence).
                    ...(item.readiness.kind === 'awaiting-user' && item.readiness.chat === WALLET_WAIT ? { waitingWallet: true as const } : {}),
                    ...(item.readiness.kind === 'awaiting-user' && item.readiness.chat !== 'checkpoint' && item.readiness.chat !== WALLET_WAIT ? { waitingChat: item.readiness.chat } : {}),
                };
            });
        this.touch();
        return evaluated;
    }

    /** The complete task inventory of the last evaluation (every state; views sort it, execution never does). */
    private inventory: TaskInventoryItem[] = [];

    /** The executing agent each routable task of the last evaluation would run as (task key → agent name). */
    private routedAgents = new Map<string, string>();

    /**
     * Agents holding a started unfinished task (normalized agent → that task's title and the prerequisites it waits
     * for): every active run and every checkpointed one (waiting for the user, Wallet, a resource, a decision or its
     * prerequisite tasks). A wait releases its execution resources, never this reservation; it is rebuilt from the persisted
     * records, so it survives restarts. Chat turns are not tasks and never reserve an agent. The supporting work a
     * checkpointed task waits for is part of its chain, not a second independent task of that agent.
     */
    private async agentReservations(): Promise<Map<string, { readonly holder: string; readonly prerequisites: ReadonlySet<string> }>> {
        const reserved = new Map<string, { readonly holder: string; readonly prerequisites: ReadonlySet<string> }>();
        for (const record of [...(await this.state.readActiveRecords()), ...(await this.state.readParked())]) {
            const agent = record.routing?.agent;
            const prerequisites = new Set(record.phase === 'awaiting-task' ? (record.waitingTasks ?? []).map((name) => nameKey(name)) : []);
            if (agent) reserved.set(normalizeAgentName(parseReferenceValue(agent)?.name ?? agent), { holder: record.taskTitle, prerequisites });
        }
        return reserved;
    }

    /** The complete task inventory (refreshed when stale, e.g. while the loop waits). */
    public async taskInventory(): Promise<TaskInventoryItem[]> {
        if (!this.inventory.length && this.catalog) await this.evaluate();
        // Engine-defined system tasks share the same inventory (a kind label and their actual executor, no source).
        const system = this.updater.inventoryItem();
        return system ? [...this.inventory, system] : this.inventory;
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
        const outcome = await this.publication.run(async (): Promise<BookSaveOutcome> => {
            const current = await readBookSource(this.options.project.root, this.catalog, { path: input.path });
            if (!current.editable) throw new PtbkError(`${current.path} cannot be edited here.`, { kind: 'usage', reason: current.reason });
            if (current.revision !== input.revision) {
                throw new PtbkError(`${current.path} changed since you opened it.`, { kind: 'conflict', effect: 'Nothing was saved; your draft is kept.', next: ['Reload the source, reconcile your draft and save again.'] });
            }
            const owner = this.ownership.ownerOf(current.path);
            const active = (await this.state.readActiveRecords()).find((record) => record.sourcePath === current.path || record.createdPaths.includes(current.path));
            if (owner || active) {
                throw new PtbkError(`${current.path} belongs to the active work "${owner?.label ?? active!.taskTitle}".`, { kind: 'conflict', effect: 'Nothing was saved; your draft is kept.', next: ['Save again after that work has finished.'] });
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
            return { path: current.path, saved: true, commit, revision: saved.revision, diagnostics: saved.diagnostics };
        });
        if (!outcome.saved) return outcome;
        // Detected problems go to the ordinary, deduplicated Fixer repair (created now, executed when work may run). Its
        // task is a publication of its own, so it is created after the save's publication ends; the save itself stands.
        const repair = outcome.diagnostics.length
            ? await this.scheduleHealthCheck(await this.evaluate(), { explicit: true }).catch((error: unknown) => {
                  this.log(`The repair of ${outcome.path} could not be scheduled yet: ${errorMessage(error)}`, 'warning');
                  return false;
              })
            : false;
        this.wake();
        return { ...outcome, repair };
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
        // Files active or checkpointed work owns are its own changes in progress, never "unrelated".
        const dirty = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot }, new Set([...this.authoredPaths, ...this.ownership.heldByOthers(undefined), ...this.unattributed]));
        // Explicit no-commit writes stay owned only within no-commit operation; committed operation must reconcile them.
        const owned = this.commitMode ? {} : await this.state.readOwnedUncommitted();
        return Object.entries(dirty)
            .filter(([path, hash]) => owned[path] === undefined || (owned[path] !== hash && owned[path] !== null))
            .map(([path]) => path);
    }

    /** Execution environment of one run inside a unit (its events update that unit's view). */
    private environment(task: Task, unit: WorkUnit): ExecutionEnvironment {
        if (!this.repositoryRoot) throw new PtbkError('The project is not in a Git working tree.', { kind: 'setup', next: ['Run `ptbk init`.'] });
        this.ownedWork = this.ownedWork.signal.aborted && !this.stopRequested ? new AbortController() : this.ownedWork;
        const label = task.title;
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
            signal: AbortSignal.any([this.ownedWork.signal, unit.interrupt.signal]),
            forceSignal: this.ownedWork.signal,
            interruptSignal: unit.interrupt.signal,
            sessions: this.sessions,
            env: this.options.env,
            hooks: {
                instructions: (evidence, changes, source) => {
                    const session = unit.owner ? this.sessions.byKey(`task:${unit.owner}`)?.handle : undefined;
                    const reason = evidence === 'delivered' ? 'The harness accepted the turn that contains it.' : evidence === 'applied' ? 'The turn that received it completed.' : 'The turn that received it ended without completing; whether it took effect is unknown.';
                    void this.taskControlStore.advance(source, changes, session, evidence, reason).catch(() => undefined);
                },
                emit: (event) => {
                    if (event.type === 'activity') this.log(event.text, event.level);
                    else if (event.type === 'phase' && unit.current) {
                        const phase: Phase = event.phase === 'repairing' ? 'repairing' : event.phase === 'awaiting-user' ? 'awaiting-user' : (event.phase as Phase);
                        this.updateUnit(unit, { phase, detail: event.detail, agent: agentView(unit.current.agent.name, phase === 'awaiting-user' ? 'waiting-user' : 'working') });
                    } else if (event.type === 'attempt') this.updateUnit(unit, { attempt: event.attempt, attemptBudget: event.budget });
                    else if (event.type === 'model') this.updateUnit(unit, { model: event.model, modelSource: 'reported' });
                    else if (event.type === 'consultation' && unit.context) {
                        const consultations = unit.context.consultations;
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
                wait: async (ms, info) => await this.unitWait(unit, ms, { kind: info.kind, reason: info.reason, skippable: true }),
                gitLock: (action) => this.gitMutex.run(action),
                // Engine-authored files and every file another run owns are never attributed to this run.
                excludedPaths: () => new Set([...this.authoredPaths, ...this.ownership.heldByOthers(unit.owner)]),
                extraTools: (context) => [
                    // External mutations are recorded durably by the engine, whatever trace policy applies.
                    ...this.actions.tools({ taskName: task.title, source: task.source.relativePath, occurrence: context.occurrence, agent: context.agent, attempt: context.attempt, trace: context.trace.relativeDirectory, ...(context.methodology ? { methodology: context.methodology } : {}) }, { session: () => (unit.owner ? this.sessions.byKey(`task:${unit.owner}`)?.handle : undefined) }),
                    ...(this.options.extraTools?.(task, context) ?? []),
                ],
                actionContext: async () => await this.actions.taskContext(task.source.relativePath).catch(() => undefined),
                walletAction: (id) => this.wallet.action(id),
                finalizeEvidence: this.options.finalizeEvidence ? async (trace) => await this.options.finalizeEvidence!(task, trace) : undefined,
                beforeCommit: async () => void (await this.sync.request('pre-commit')),
                attribute: async (changed, evidence) => await this.attributeChanges(unit, label, changed, evidence.reported),
                own: (paths) => void this.ownership.tryAcquire(unit.owner, label, paths),
                edited: (paths) => this.reportedEdits(unit, label, paths),
                claimFiles: async (paths) => await this.claimFiles(unit, label, paths),
                createPrerequisite: async (input) => await this.createPrerequisiteTask(input),
                turn: (state) => (state === 'begin' ? this.turns.begin(unit.owner) : this.turns.end(unit.owner)),
                ownedFiles: () => this.ownership.owned(unit.owner),
                foreignChanges: () => this.foreignChanges(unit),
                waitForForeign: async (signal) => {
                    const deadline = Date.now() + FOREIGN_SETTLE_MS;
                    unit.checkWaitingSince ??= Date.now();
                    this.updateUnit(unit, { detail: 'check waits for other work to settle' });
                    try {
                        while (this.foreignChanges(unit, { blocking: true }).length && Date.now() < deadline && !signal.aborted) await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
                    } finally {
                        unit.checkWaitingSince = undefined;
                    }
                },
            },
        };
    }

    // ── Starting work ────────────────────────────────────────────────────────

    /** Claims of tasks deferred after a setup problem (task key → epoch ms), so a blocked claim is not retried at once. */
    private readonly claimDeferred = new Map<string, number>();

    /** Starts the selected task (or its Router prerequisite) inside its unit. */
    private async startTask(next: SelectedTask, unit: WorkUnit): Promise<void> {
        const task = next.task;
        if (next.readiness.kind === 'needs-assignment') {
            await this.assign(task, next.rank, unit);
            return;
        }
        const route = await this.route(task);
        if (route.kind !== 'routable') return;
        const item = await this.buildWorkItem(task, route, { slot: next.readiness.kind === 'ready' ? next.readiness.slot : undefined });
        if (!item) return;
        await this.execute(item, unit);
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
                this.claimDeferred.set(task.key, Date.now() + BLOCKER_RECHECK_MS);
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
    private async assign(target: Task, priority: number, unit: WorkUnit, options: { readonly createdPaths?: readonly string[] } = {}): Promise<void> {
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
            this.claimDeferred.set(target.key, Date.now() + BLOCKER_RECHECK_MS);
            return;
        }
        if (router.legacy) this.logOnce('Manager is the former name of Router: it routes until the project migration converts agents/.core/manager.book into router.book.', 'info');
        let reservedPath: string | undefined;
        try {
            const created = await createAssignmentTask({
                target, tasksDirectory: this.tasksDirectory, router: router.name, priority, timeZone: this.timeZone, taken: await this.takenNames(),
                reservePath: (path) => { reservedPath = path; this.authoredPaths.add(path); },
            });
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
            // Router changes the target's source: its run owns that file too.
            if (item) await this.execute({ ...item, relatedTaskNames: [target.title] }, unit, [target.source.path]);
        } finally {
            if (reservedPath) this.authoredPaths.delete(reservedPath);
        }
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
        // Fixer repairs it through the common repair path; it is inspectable, not a question for the operator.
        this.setBlocker({ kind: 'setup', title: `${router} cannot route`, reason, action, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString(), automatic: true });
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
        const unfinished = queue.tasks.some((task) => task.origin === input.origin && !['done', 'failed', 'cancelled', 'retired'].includes(task.status));
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

    /**
     * The agent whose goal enquiry is due now, if any. Otherwise `idleReason` (and the next known time) explains why
     * none runs.
     */
    private async discoveryDue(): Promise<AgentDefinition | undefined> {
        const candidates = this.catalog.ordinary().filter((definition) => definition.document.commitments.some((commitment) => commitment.keyword === 'GOAL' && commitment.body.trim()));
        if (!candidates.length) {
            this.idleReason = 'No unfinished work, and no ordinary agent has a GOAL for goal discovery. Add tasks or goals.';
            return undefined;
        }
        if (!this.pool.usable().length) {
            this.idleReason = 'No unfinished work; goal discovery needs a usable harness.';
            return undefined;
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
            return undefined;
        }
        return due[0]!.definition;
    }

    /** Creates and executes one goal enquiry of the chosen agent inside its unit. */
    private async runDiscovery(chosen: AgentDefinition, unit: WorkUnit): Promise<void> {
        if (!this.claimable) return;
        const { path } = await createDiscoveryTask({ tasksDirectory: this.tasksDirectory, agentName: chosen.name, timeZone: this.timeZone, taken: await this.takenNames() });
        this.log(`Goal discovery: asking ${chosen.name} whether its goals justify new work.`);
        let task = readTaskBook({ source: await readFile(path, 'utf8'), path, relativePath: toProjectRelative(this.options.project.root, path), order: 0, timeZone: this.timeZone })!;
        let route = await this.route(task);
        // Files this claim still owns (withdrawn when the claim does not happen).
        let createdPaths = [path];
        if (route.kind === 'needs-assignment') {
            // The enquiry is ordinary work: Router specializes its MODEL first (one prerequisite, then the enquiry).
            await this.assign(task, task.priority.value, unit, { createdPaths: [path] });
            if (!(await pathExists(path))) return;
            task = readTaskBook({ source: await readFile(path, 'utf8'), path, relativePath: toProjectRelative(this.options.project.root, path), order: 0, timeZone: this.timeZone })!;
            route = await this.route(task);
            // Router's result committed the enquiry: from now on it is an ordinary queued task, never withdrawn.
            createdPaths = this.commitMode ? [] : [path];
            if (route.kind === 'routable' && !this.claimable) return;
        }
        if (route.kind !== 'routable') {
            this.log(`Goal enquiry cannot run: ${route.reason}`, 'warning');
            const { rm } = await import('node:fs/promises');
            await rm(path, { force: true });
            await this.recordDiscovery(chosen.normalized, 'failed');
            return;
        }
        const item = await this.buildWorkItem(task, route, { createdPaths });
        if (!item) return;
        const outcome = await this.execute(item, unit);
        // Not claimed (pause/stop accepted meanwhile) or interrupted by a force stop: no enquiry outcome to record.
        if ((outcome.kind === 'interrupted' || outcome.kind === 'deferred') && !this.claimable) return;
        const tasksRelative = toProjectRelative(this.options.project.root, this.tasksDirectory);
        const created = outcome.kind === 'completed' ? outcome.changedPaths.filter((changed) => changed !== task.source.relativePath && changed.startsWith(`${tasksRelative}/`) && /\.(book|md)$/i.test(changed)) : [];
        const work = created.filter((changed) => !/learn-/.test(changed));
        await this.recordDiscovery(chosen.normalized, outcome.kind === 'completed' ? (work.length ? 'work' : 'no-work') : 'failed');
        this.log(work.length ? `${chosen.name} recorded ${work.length} new task(s).` : `${chosen.name} found no new work; next enquiry after the cooldown.`);
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
     * Runs one work item through the executor inside a unit and handles its outcome. The claim boundary: once
     * pause/stop is accepted, nothing new starts (the work stays queued with its record intact). The run owns its task
     * source, its engine-created files and `files` (e.g. the target of a routing decision); when another run owns one of
     * them, nothing starts and the claim is retried once that run releases it.
     */
    private async execute(item: WorkItem, unit: WorkUnit, files: readonly string[] = []): Promise<ExecutionOutcome> {
        const withdraw = async (): Promise<void> => {
            // Engine-created Books prepared for this very claim (a Router or discovery task) are withdrawn; they are
            // created again when work resumes. A resumed record keeps everything.
            if (item.resume) return;
            const { rm } = await import('node:fs/promises');
            for (const path of item.createdPaths) await rm(path, { force: true });
        };
        if (!this.claimable) {
            this.log(`Not starting "${item.task.title}": the service is ${this.serviceState}.`);
            await withdraw();
            return { kind: 'interrupted' };
        }
        const runId = item.resume?.runId ?? item.runId ?? shortId(10);
        // A person controlling this run's session holds its automatic input back; other work continues.
        if (!this.sessions.automaticInputAllowed(`task:${runId}`)) {
            const reason = `"${item.task.title}" waits: a person is controlling its session.`;
            this.logOnce(reason, 'info');
            await withdraw();
            this.claimDeferred.set(item.task.key, Date.now() + 5_000);
            return { kind: 'deferred', reason };
        }
        unit.owner = runId;
        const taken = this.ownership.tryAcquire(runId, item.task.title, [item.task.source.path, ...item.createdPaths, ...files]);
        if (!taken.ok) {
            const reason = `"${item.task.title}" waits: ${describeConflicts(taken.conflicts)}.`;
            this.logOnce(reason, 'info');
            await withdraw();
            this.claimDeferred.set(item.task.key, Date.now() + 5_000);
            return { kind: 'deferred', reason };
        }
        // Ownership now protects these published helper Books; include their completion in this run's result.
        for (const path of item.createdPaths) this.authoredPaths.delete(path);
        try {
            return await this.executeClaimed({ ...item, runId }, unit);
        } finally {
            await this.releaseUnlessRecorded(runId);
            unit.current = undefined;
            unit.context = undefined;
            this.touch();
        }
    }

    /** Executes claimed work inside its unit (the service owns it until its outcome is handled). */
    private async executeClaimed(item: WorkItem & { readonly runId: string }, unit: WorkUnit): Promise<ExecutionOutcome> {
        const selection = item.route.selection;
        const targetRef = item.kind === 'assignment' ? originTarget(item.task) : undefined;
        unit.current = {
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
            phase: item.kind === 'assignment' ? 'assigning' : item.kind === 'learning' ? 'learning' : item.kind === 'discovery' ? 'discovering' : 'executing',
            attempt: item.resume?.attempt ?? 0,
            attemptBudget: setting<number>(this.settings, 'execution.repairAttempts'),
            startedAt: new Date().toISOString(),
            target: targetRef ? { ref: targetRef, title: targetRef } : undefined,
        };
        unit.context = { selection, harnessVersion: item.route.inspection.version, source: item.task.source.relativePath, consultations: [] };
        this.touch();
        const others = this.units.size - 1;
        this.log(`${item.resume ? 'Resuming' : 'Starting'} ${item.kind === 'task' ? '' : `${item.kind} `}"${item.task.title}" with ${selection.agent} on ${harnessName(selection.harness)}${selection.tool ? ` [${selection.tool}]` : ''}${selection.model ? ` (${selection.model})` : ''}${others > 0 ? ` alongside ${others} other active unit${others === 1 ? '' : 's'}` : ''}`);
        let outcome: ExecutionOutcome;
        try {
            outcome = await executeWork(this.environment(item.task, unit), item);
        } catch (error) {
            await this.reportError('execution', error, item.task.ref);
            outcome = { kind: 'failed', reason: errorMessage(error) };
            const record = await this.state.readActive(item.runId);
            if (record) await this.state.writeActive({ ...record, phase: 'failed', failure: errorMessage(error) });
        } finally {
            await this.options.afterWork?.(item.task).catch(() => undefined);
        }
        this.settleSession(item, outcome);
        // A finished run's unreported intents may have taken effect: they become durable uncertain records.
        if (outcome.kind === 'completed' || outcome.kind === 'failed' || outcome.kind === 'persistence-failed') await this.actions.settle(item.task.source.relativePath).catch(() => undefined);
        switch (outcome.kind) {
            case 'completed': {
                this.completed++;
                await this.state.setBlocker(item.task.key, undefined);
                const results = await this.state.recentResults(20);
                this.recentResults = results.map(resultView);
                // A task created in a chat reports its result there, once.
                const result = results.find((candidate) => candidate.runId === item.runId);
                if (result) await this.deliverChatOutcome(result);
                if (outcome.commit) void this.publish({ name: item.task.title, source: item.task.source.relativePath });
                // The pause between tasks holds new claims; other active work continues meanwhile.
                const pacing = setting<number>(this.settings, 'execution.waitBetweenPrompts');
                if (pacing > 0) this.pacingUntil = Math.max(this.pacingUntil, Date.now() + pacing);
                break;
            }
            case 'awaiting-user': {
                this.log(`"${item.task.title}" waits for your reply in the chat {${outcome.chat}} (ptbk chat --open "${outcome.chat}").`, 'warning');
                await this.refreshChats();
                const record = await this.state.readActive(item.runId);
                if (record) await this.checkpoint(record);
                break;
            }
            case 'awaiting-wallet':
            case 'awaiting-task': {
                const record = await this.state.readActive(item.runId);
                if (record) await this.checkpoint(record);
                break;
            }
            case 'failed':
                // The record stays active as failed: the supervisor hands it to Fixer or asks how to continue.
                this.failed++;
                this.recentResults = (await this.state.recentResults(20)).map(resultView);
                this.addError({
                    at: new Date().toISOString(),
                    summary: `"${item.task.title}" failed: ${outcome.reason}`,
                    phase: 'task execution',
                    task: item.task.ref,
                    trace: outcome.trace,
                    next: this.options.mode !== 'maintenance' && !item.resume?.handover && HANDOVER_KINDS.has(item.kind) ? 'Fixer takes over automatically; if it cannot finish either, an automatic recheck is scheduled (no reply is needed).' : `An automatic recheck is scheduled (no reply is needed); \`ptbk recover "${item.task.title}"\` can retry or acknowledge it now.`,
                });
                break;
            case 'setup': {
                const fallback = this.sameVariantFallback(item, outcome.tool);
                if (fallback) {
                    this.log(`${outcome.reason}; continuing with the next ${harnessName(selection.harness)} instance "${fallback.name}" (same-variant fallback).`, 'warning');
                    break;
                }
                this.setBlocker({ kind: 'harness', title: `${harnessName(selection.harness)} needs setup`, reason: outcome.reason, action: outcome.next, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
                this.resumeAfter.set(item.runId, Date.now() + BLOCKER_RECHECK_MS);
                break;
            }
            case 'quota': {
                // An authorized later instance of the same variant serves the retry at once (no wait through this reset).
                const fallback = this.sameVariantFallback(item, outcome.tool);
                if (fallback) {
                    this.log(`${outcome.reason}; continuing with the next ${harnessName(selection.harness)} instance "${fallback.name}" (same-variant fallback).`, 'warning');
                    break;
                }
                // A resource wait blocks nothing else: other work continues and this run resumes after the reset.
                this.log(`${outcome.reason}; "${item.task.title}" resumes in ${formatDuration(outcome.retryAfterMs)}.`, 'warning');
                this.resumeAfter.set(item.runId, Date.now() + outcome.retryAfterMs);
                break;
            }
            case 'persistence-failed':
                this.setBlocker({ kind: 'persistence', title: 'Commit failed', reason: outcome.reason, action: 'Fix the Git hook/signing/identity problem; ptbk retries persistence without rerunning the agent.', recheckAt: new Date(Date.now() + PERSISTENCE_RETRY_MS).toISOString() });
                this.addError({ at: new Date().toISOString(), summary: `Commit of "${item.task.title}" failed: ${outcome.reason}`, phase: 'commit', task: item.task.ref, next: 'Fix the cause; persistence resumes automatically.' });
                this.resumeAfter.set(item.runId, Date.now() + PERSISTENCE_RETRY_MS);
                break;
            case 'interrupted':
                if (unit.interrupt.signal.aborted && !this.ownedWork.signal.aborted && !this.pauseActive) this.log(`"${item.task.title}" stopped at its safe point for a change to the task; it continues from its checkpoint.`);
                else if (unit.interrupt.signal.aborted && !this.ownedWork.signal.aborted) this.log(`"${item.task.title}" was interrupted by the pause; it keeps its checkpoint and its agent, and continues after resume.`);
                else this.log(`"${item.task.title}" was interrupted; its recovery record is preserved.`, 'warning');
                break;
            case 'deferred':
                break;
        }
        return outcome;
    }

    /** Records what a run's outcome means for its harness session: finished work ends it, a wait keeps it open. */
    private settleSession(item: WorkItem & { readonly runId: string }, outcome: ExecutionOutcome): void {
        const key = `task:${item.runId}`;
        switch (outcome.kind) {
            case 'completed':
                this.sessions.close(key, 'Its task work finished.');
                break;
            case 'failed':
                this.sessions.close(key, outcome.reason, true);
                break;
            case 'interrupted':
                this.sessions.waiting(key, 'Interrupted: it keeps its checkpoint and continues only when work may resume.', 'interrupted');
                break;
            case 'awaiting-user':
                this.sessions.waiting(key, `Waiting for your reply in the chat {${outcome.chat}}.`);
                break;
            case 'awaiting-wallet':
            case 'awaiting-task':
            case 'quota':
            case 'setup':
            case 'persistence-failed':
                this.sessions.waiting(key, 'reason' in outcome && outcome.reason ? outcome.reason : 'Waiting for what it needs before it continues.');
                break;
            case 'deferred':
                break;
        }
    }

    /**
     * Reports a completed task's concise result in the chat it was created in, once per run (also after a restart or
     * reconnect): its agent joins the chat and says what was done, with the result commit. A failure or an unfinished
     * task never announces success here.
     */
    private async deliverChatOutcome(result: ResultRecord): Promise<void> {
        if (!result.originChat || !result.runId || result.outcome !== 'completed' || this.options.mode === 'maintenance') return;
        if ((await this.state.readChatOutcomes())[result.runId]) return;
        const stored = await this.chats.find(result.originChat);
        const agent = formatAgentReference(result.agent ?? 'Developer');
        const marker = `Completed {${result.title}}`;
        // The Book itself is the durable record: a restart between saving and bookkeeping never repeats the message.
        const already = stored?.chat.messages.some((message) => message.text.startsWith(marker) && (!result.commit || message.text.includes(result.commit.slice(0, 8))));
        if (stored && isHumanFacing(stored.chat) && !already) {
            const text = [`${marker}: ${result.summary}`, result.commit ? `Result commit ${result.commit.slice(0, 8)}.` : 'Completed without changes to commit.'].join('\n');
            await this.chats.annotate(stored.chat.name, { members: [agent], links: [formatAgentReference(result.title)] }, { trailers: { 'Task-Name': result.title } });
            await this.chats.append(stored.chat.name, { sender: agent, text }, { trailers: { 'Task-Name': result.title } });
            this.log(`Reported the result of "${result.title}" in {${stored.chat.name}}.`);
            await this.refreshChats();
        }
        await this.state.markChatOutcome(result.runId);
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
     * Continues a recorded run inside its unit (crash recovery, a retry after quota/setup/commit problems, an answered
     * question). A run that still waits for a person is checkpointed; one that cannot be routed waits visibly.
     */
    private async continueActive(initialRecord: ActiveRecord, unit: WorkUnit): Promise<void> {
        let record = initialRecord;
        unit.owner = record.runId;
        if (record.phase === 'awaiting-user' && record.waitingChat) {
            const reply = await this.chatReplyOf(record.waitingChat, record.awaitedMessages, undefined, record.answerMessage);
            if (!reply.answered) {
                await this.checkpoint(record);
                return;
            }
        }
        if (this.walletPending(record)) {
            await this.checkpoint(record);
            return;
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
        // Cancelled or retired while it was running: its checkpoint ends here, its Book and partial work stay.
        if ((task.status === 'cancelled' || task.status === 'retired') && task.statusScope !== 'future' && record.phase !== 'committed' && record.phase !== 'synchronizing') {
            await this.endCancelledRun(record, task);
            return;
        }
        // The Book names another owner than the one this run started with: the previous agent has checkpointed, and the new
        // one takes the work only when it is free, so a task never has two owners and an agent never holds two tasks.
        const reassignedFrom = task.routing.agent && record.routing.agent && agentKeyOf(task.routing.agent) !== agentKeyOf(record.routing.agent) ? record.routing.agent : undefined;
        if (reassignedFrom) {
            const reservation = (await this.agentReservations()).get(agentKeyOf(task.routing.agent!));
            if (reservation && reservation.holder !== record.taskTitle) {
                this.logOnce(`"${record.taskTitle}" moves to ${formatAgentReference(task.routing.agent!)} once "${reservation.holder}" is finished; it stays checkpointed until then.`, 'info');
                this.resumeAfter.set(record.runId, Date.now() + REASSIGNMENT_RECHECK_MS);
                return;
            }
            record = { ...record, routing: { ...record.routing, agent: task.routing.agent! }, handover: undefined };
            await this.state.writeActive(record);
            this.log(`"${record.taskTitle}" moved from ${formatAgentReference(reassignedFrom)} to ${formatAgentReference(task.routing.agent!)}.`);
        }
        // After a takeover, Fixer continues the task within the task's own MODEL constraints.
        const agent = record.handover ? record.handover.agent : (task.routing.agent ?? record.routing.agent);
        const route = await this.resumeRoute(task, agent, record);
        if (route.kind !== 'routable') {
            const reason = `"${record.taskTitle}" cannot resume: ${route.reason}`;
            this.setBlocker({ kind: 'harness', title: 'Interrupted work cannot resume', reason, action: route.kind === 'blocked' ? route.next : undefined, recheckAt: new Date(Date.now() + BLOCKER_RECHECK_MS).toISOString() });
            this.logOnce(reason, 'warning');
            await this.pool.refresh(undefined, true);
            this.resumeAfter.set(record.runId, Date.now() + BLOCKER_RECHECK_MS);
            return;
        }
        this.clearBlocker('harness');
        const item = await this.buildWorkItem(task, route, { resume: record, createdPaths: record.createdPaths.map((path) => resolve(this.options.project.root, path)), slot: record.occurrence ? Date.parse(record.occurrence) : undefined });
        const takeover = record.handover ? handoverPrompt(record, record.handover) : reassignedFrom ? reassignmentPrompt(record, reassignedFrom) : undefined;
        if (item) await this.execute(takeover ? { ...item, extraPrompt: [item.extraPrompt, takeover].filter(Boolean).join('\n\n') } : item, unit);
    }

    /**
     * Automatic repair before any recheck: a task that exhausted its budgets in the ongoing agenda is handed to the
     * ordinary Fixer, which continues the same record (its partial changes, trace and eventual single result commit)
     * for one bounded round and consults its team only as its own Book directs. Not repeated for Fixer's own failure,
     * for work Fixer itself owns, without a usable Fixer, or in a finite run (whose agent was chosen explicitly).
     * Returns whether the task was handed over.
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
        this.log(`"${record.taskTitle}" failed with ${from} (${failure}); ${name} takes over for at most ${Math.min(HANDOVER_ATTEMPTS, setting<number>(this.settings, 'execution.repairAttempts'))} attempt(s) before an automatic recheck is scheduled.`, 'warning');
        this.wake();
        return true;
    }

    /**
     * Cause-aware recovery of a failed task beyond its immediate budgets: Fixer takes over once per distinct failure,
     * then the task is checkpointed with its cause, the remedies already tried and its next automatic recheck. An
     * exhausted counter never asks anyone whether to retry; an answer to a question an older engine asked is still
     * applied.
     */
    private async handleFailedRecord(record: ActiveRecord): Promise<void> {
        if (record.recoveryChat && (await this.chats.find(record.recoveryChat))) {
            const reply = await this.chatReplyOf(record.recoveryChat, record.awaitedMessages, RECOVERY_CHOICES, record.answerMessage);
            if (reply.answered) {
                if (reply.answer === RECOVERY_CHOICES[0]) await this.retryRecord(record);
                else await this.acknowledgeRecord(record);
                return;
            }
        }
        const assessment = await this.assessFailure(record);
        // Fixer already took over this exact failure under the same conditions: wait for a change instead.
        if (!assessment.equivalent && (await this.handOverToFixer(record))) return;
        await this.scheduleRecovery(record, assessment);
    }

    // ── Project inspection (History, Files): shared read-only readers ────────

    /** Reads the newest commit for the History tile (at most every 15 seconds; never fetches). */
    private async refreshLastCommit(): Promise<void> {
        if (!this.repositoryRoot || Date.now() - this.lastCommitReadAt < 15_000) return;
        this.lastCommitReadAt = Date.now();
        const result = await git(this.repositoryRoot, ['log', '-1', '--format=%H%x1f%aI%x1f%s']).catch(() => undefined);
        const [sha, at, subject] = result?.exitCode === 0 ? result.stdout.trim().split('\u001f') : [];
        const next = sha && at && subject !== undefined ? { sha, at, ...classifySubject(subject) } : undefined;
        if (next?.sha !== this.lastCommit?.sha) {
            this.lastCommit = next ? { sha: next.sha, at: next.at, summary: next.summary, kind: next.kind } : undefined;
            this.touch();
        }
    }

    /** A bounded window of the current branch's Git history with its topology (read-only). */
    public async history(options: { readonly limit?: number; readonly skip?: number } = {}): Promise<HistoryView> {
        if (!this.repositoryRoot) return { rows: [], more: false, shallow: false, problem: 'The project is not in a Git working tree.' };
        return await readHistory(this.repositoryRoot, options);
    }

    /**
     * One commit's original message with its provenance links verified against the current project: a `Task-Name` or
     * `Chat-Name` that no longer resolves stays a historical name, never a guessed target.
     */
    public async historyCommit(sha: string): Promise<HistoryDetail & { readonly links: { readonly tasks: ReadonlyArray<{ readonly name: string; readonly path?: string }>; readonly chats: ReadonlyArray<{ readonly name: string; readonly exists: boolean }> } }> {
        if (!this.repositoryRoot) throw new PtbkError('The project is not in a Git working tree.', { kind: 'setup' });
        const detail = await readCommit(this.repositoryRoot, sha);
        const queue = await this.readQueue().catch(() => undefined);
        const tasks = detail.trailers.tasks.map((name) => {
            const found = queue ? findTask(queue.tasks, formatAgentReference(name)).task : undefined;
            return found && normalizeAgentName(found.title) === normalizeAgentName(name) ? { name, path: found.source.relativePath } : { name };
        });
        const chats = await Promise.all(detail.trailers.chats.map(async (name) => ({ name, exists: name === REPORT_NAME ? Boolean(this.reportView.brief) : Boolean(await this.chats.find(name).catch(() => undefined)) })));
        return { ...detail, links: { tasks, chats } };
    }

    /** One nonhidden project folder for Files (confined, read-only; agent Book folders such as agents/.core are shown). */
    public async files(path: string): Promise<FolderView> {
        return await listFolder(this.options.project.root, path, { agentsDirectory: this.agentsDirectory() });
    }

    /** One project file for Files (bounded, confined, read-only; formatting is presentation only). */
    public async file(path: string): Promise<FileView> {
        return await readProjectFile(this.options.project.root, path, { agentsDirectory: this.agentsDirectory() });
    }

    /** The configured agents directory (project-relative). */
    private agentsDirectory(): string {
        return this.settings ? setting<string>(this.settings, 'paths.agents') : 'agents';
    }

    // ── Project brief (Chatter's report feed) ────────────────────────────────

    /** Rereads the latest saved brief when `report.book` changed (only its tail is parsed). */
    private async refreshReportView(): Promise<void> {
        const stats = await stat(join(this.options.project.root, REPORT_FILE)).catch(() => undefined);
        const stamp = stats ? `${stats.size}:${stats.mtimeMs}` : 'missing';
        if (stamp === this.reportStamp) return;
        this.reportStamp = stamp;
        this.reportView = await readLatestBrief(this.options.project.root);
        this.touch();
    }

    /**
     * The shared report state of snapshots: the saved brief, its generation, an explicit request waiting, the automatic
     * recheck of a failed generation and a saved brief whose commit is still pending.
     */
    public reportSnapshot(): ReportView {
        const recheck = this.reportRecheck && !this.reportGenerating ? this.reportRecheck : undefined;
        const waiting =
            this.reportRequest && !this.reportGenerating
                ? !this.claimable
                    ? 'Background work is paused; the brief is written when it resumes.'
                    : recheck && Date.parse(recheck.nextAt) > Date.now()
                      ? 'it waits for the automatic retry of the failed update'
                      : 'Waiting for a usable harness.'
                : undefined;
        return {
            ...this.reportView,
            ...(this.reportGenerating ? { generating: true } : {}),
            ...(this.reportRequest ? { requestedAt: this.reportRequest } : {}),
            ...(waiting ? { waiting } : {}),
            ...(recheck ? { recheck: { cause: recheck.cause, nextAt: recheck.nextAt, rounds: recheck.rounds } } : {}),
            ...(this.reportCommitPending ? { isCommitPending: true } : {}),
        };
    }

    /** What a brief covers: significant conditions and recent results (an unchanged project needs no new brief). */
    private reportFingerprints(): { readonly significant: string; readonly results: string } {
        const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
        return {
            significant: hash({
                blockers: this.blockers.map((blocker) => `${blocker.kind}:${blocker.title}`).sort(),
                waiting: this.waitingChats().map((chat) => chat.name).sort(),
                wallet: this.wallet.view().pending.map((action) => action.id).sort(),
                pause: this.pauseReasons.map((reason) => reason.id).sort(),
                failed: this.recentResults.filter((result) => result.outcome === 'failed').map((result) => `${result.title}:${result.endedAt}`).slice(0, 5),
            }),
            results: hash(this.recentResults.slice(0, 10).map((result) => `${result.title}:${result.endedAt}:${result.outcome}`)),
        };
    }

    /**
     * Whether Chatter should write a brief now: an explicit Refresh, the first brief once there is something to report,
     * a significant change after a short spacing, or new results after the regular cadence. Nothing changed means no
     * generation (no paid idle work). A failed generation waits for its cause-aware recheck, which changed tools or a
     * newer explicit Refresh bring forward; a recheck whose brief is no longer owed is retired.
     */
    private async reportDue(): Promise<boolean> {
        if (this.reportGenerating || this.options.mode === 'maintenance' || !this.pool.usable().length) return false;
        if ((await this.catalog.resolve(REPORT_AUTHOR)).kind !== 'agent') return false;
        const state = await this.state.readReport();
        const now = Date.now();
        const recheck = this.reportRecheck;
        if (recheck && Date.parse(recheck.nextAt) > now) {
            const scheduled = Date.parse(recheck.scheduledAt);
            const requested = this.reportRequest !== undefined && Date.parse(this.reportRequest) > scheduled;
            const changed = recheck.conditions !== this.toolConditions() && now - scheduled >= Math.min(RECOVERY_MIN_SPACING_MS, this.reportRecheckBase());
            if (!requested && !changed) return false;
        }
        if (this.reportRequest) return true;
        const current = this.reportFingerprints();
        const last = this.reportView.brief ? Date.parse(this.reportView.brief.at) : undefined;
        const interval = Number(this.options.env.PTBK_REPORT_INTERVAL_MS);
        const due =
            last === undefined || Number.isNaN(last)
                ? this.recentResults.length > 0
                : (current.significant !== state.significant && now - last >= (interval || REPORT_EVENT_SPACING_MS)) || (current.results !== state.results && now - last >= (interval || REPORT_INTERVAL_MS));
        if (!due && recheck) await this.writeReportRecheck(undefined);
        return due;
    }

    /** First delay of a failed brief's recheck (`PTBK_REPORT_RECHECK_MS` overrides it, e.g. for fixtures). */
    private reportRecheckBase(): number {
        return Number(this.options.env.PTBK_REPORT_RECHECK_MS) || REPORT_RECHECK_MS;
    }

    /** Keeps (or clears) the recheck of a failed brief, persisted with the pending explicit request across restarts. */
    private async writeReportRecheck(recheck: RecheckSchedule | undefined): Promise<void> {
        this.reportRecheck = recheck;
        await this.state.writeReport({ ...(await this.state.readReport()), requestedAt: this.reportRequest, recheck });
        this.touch();
    }

    /**
     * A brief could not be written: the saved brief stays readable, an explicit Refresh stays requested and a
     * cause-aware automatic recheck is scheduled (spread, capped backoff; the longest wait for an equivalent failure
     * under unchanged tools), so an unavailable provider causes no paid idle loop. Nobody is asked to retry it.
     */
    private async reportFailed(cause: string, requested: string | undefined): Promise<void> {
        this.reportRequest ??= requested;
        // A generation interrupted by stopping or a pause is no failure: a pending request is written after the restart or resume.
        if (this.stopRequested || this.ownedWork.signal.aborted || this.pauseActive) return;
        const now = Date.now();
        const recheck = nextRecheck(this.reportRecheck, { cause, conditions: this.toolConditions() }, withInitialDelay(WAITING_POLICIES.report, this.reportRecheckBase()), now);
        await this.writeReportRecheck(recheck);
        this.log(
            `The project brief was not written (${cause}); the saved brief stays. Nobody needs to retry it: automatic recheck ${recheck.rounds} is due ${formatShortTime(Date.parse(recheck.nextAt), now, this.timeZone)}${recheck.equivalent ? ' (the same failure repeated, so it waits longer)' : ''}, sooner when tools change or on Refresh.`,
            'warning',
        );
    }

    /** The engine's facts Chatter turns into a brief (the shared status, never a secret). */
    private reportDigest(): string {
        const snapshot = this.snapshot();
        const lines: string[] = [`Project: ${snapshot.project.name}`, `Service: ${snapshot.service.state}${snapshot.service.pauseReasons?.length ? ` (${snapshot.service.pauseReasons.map((reason) => reason.summary).join('; ')})` : ''}`];
        const active = snapshot.active ?? (snapshot.current ? [snapshot.current] : []);
        lines.push(active.length ? `Working now: ${active.map((item) => `${item.agent.name} on "${item.taskTitle}" (${item.phase})`).join('; ')}` : 'Working now: nothing.');
        lines.push(`Queue: ${snapshot.queueTotal} unfinished task(s)${snapshot.queue.length ? `; next: ${snapshot.queue.slice(0, 5).map((item) => `"${item.title}" (${item.readiness})`).join(', ')}` : ''}.`);
        if (snapshot.wait) lines.push(`Waiting: ${snapshot.wait.reason}`);
        if (snapshot.results.recent.length) lines.push('Recent results:', ...snapshot.results.recent.slice(0, 8).map((result) => `- ${result.endedAt} ${result.outcome}: "${result.title}"${result.agent ? ` by ${result.agent}` : ''} — ${result.summary}`));
        if (snapshot.blockers.length) lines.push('Blockers:', ...snapshot.blockers.map((blocker) => `- ${blocker.title}: ${blocker.reason}`));
        if (snapshot.chats.waiting.length) lines.push('Waiting for the owner in chats:', ...snapshot.chats.waiting.map((chat) => `- {${chat.name}}: ${(chat.awaiting?.text ?? '').replace(/\s+/g, ' ').slice(0, 300)}`));
        if (snapshot.wallet?.pending.length) lines.push(`Wallet: ${snapshot.wallet.pending.length} login request(s) wait for the owner.`);
        if (snapshot.tools?.waiting) lines.push(`Tools: ${snapshot.tools.waiting.reason}`);
        if (snapshot.health?.incidents.length) lines.push(`Health: ${snapshot.health.incidents.map((incident) => incident.summary).join('; ')}`);
        if (snapshot.errors.length) lines.push('Recent errors:', ...snapshot.errors.slice(-3).map((error) => `- ${error.summary}`));
        if (snapshot.actions?.recent.length) lines.push('Recent external actions:', ...snapshot.actions.recent.slice(0, 5).map((action) => `- ${action.at ?? ''} ${action.outcome}: ${action.operation}${action.service ? ` on ${action.service}` : ''}`));
        return lines.join('\n');
    }

    /**
     * Generates and appends one brief as ordinary background Chatter work (shared harness, usage and Git):
     * Chatter's paragraph becomes a new timestamped message of root `report.book` with its own scoped commit. Requests
     * made before or during it are covered by this one generation; the previous brief stays readable meanwhile.
     */
    private async runReport(unit: WorkUnit): Promise<void> {
        this.reportGenerating = true;
        const requested = this.reportRequest;
        this.reportRequest = undefined;
        this.touch();
        const covered = this.reportFingerprints();
        try {
            const author = await this.catalog.resolve(REPORT_AUTHOR);
            const agent = author.kind === 'agent' ? formatAgentReference(author.definition.name) : REPORT_AUTHOR;
            const composed = await composeProjectBrief(
                { project: this.options.project, settings: this.settings, catalog: this.catalog, pool: this.pool, env: this.options.env, signal: AbortSignal.any([this.ownedWork.signal, unit.interrupt.signal]), onActivity: (text) => this.log(text) },
                { agent, digest: this.reportDigest(), previous: this.reportView.brief, reportPath: join(this.options.project.root, REPORT_FILE) },
            );
            if (!composed.text) {
                await this.reportFailed(composed.error ?? 'Chatter wrote no text', requested);
                return;
            }
            const path = await appendBrief(this.options.project.root, { text: composed.text, at: formatIsoWithOffset(Date.now(), this.timeZone) });
            this.reportRecheck = undefined;
            await this.state.writeReport({ significant: covered.significant, results: covered.results, ...(this.reportCommitPending ? { isCommitPending: true } : {}) });
            await this.persistReport(path);
            this.log(`${referenceName(agent)} wrote a new project brief${requested ? ' (requested)' : ''}.`);
        } catch (error) {
            await this.reportFailed(errorMessage(error), requested).catch(() => undefined);
        } finally {
            this.reportGenerating = false;
            await this.refreshReportView();
            this.touch();
        }
    }

    /**
     * A credential test waits for a one-time code: Fixer, the role that offloads such work from the owner, looks for it in
     * a channel it can already read while the owner's protected input stays open. Not a task, chat, trace or commit.
     */
    private async findWalletTestCode(request: { readonly origin: string; readonly account: string; readonly signal: AbortSignal }, codeTools: NonNullable<AgendaOptions['walletCodeTools']>): Promise<string | undefined> {
        if (!this.settings) return undefined;
        const session = codeTools();
        try {
            return await findLoginCode(
                { project: this.options.project, settings: this.settings, catalog: this.catalog, pool: this.pool, env: this.options.env, signal: AbortSignal.any([request.signal, this.ownedWork.signal]), onActivity: (text) => this.log(text) },
                { agent: formatAgentReference('Fixer'), origin: request.origin, account: request.account, tools: session.tools },
            );
        } finally {
            await session.dispose();
        }
    }

    /**
     * Commits `report.book` (and its usage evidence when traces are committed) as Chatter's scoped report commit. A
     * failed commit keeps the brief saved and retries only the commit on its own schedule (also after a restart), never
     * the generation.
     */
    private async persistReport(path: string): Promise<void> {
        this.authoredPaths.add(path);
        if (!this.repositoryRoot || !this.commitMode) {
            await this.state.addOwnedUncommitted({ [toProjectRelative(this.options.project.root, path)]: null });
            await this.setReportCommitPending(false);
            return;
        }
        clearTimeout(this.reportCommitTimer);
        this.reportCommitTimer = undefined;
        try {
            const evidence = setting<boolean>(this.settings, 'traces.isCommitted') ? await stageableFiles(this.options.project.root, 'traces/.chats/report') : [];
            await this.commitAuthoring([path, ...evidence], agentSubject(REPORT_AUTHOR, `Chat - ${REPORT_NAME}`), { 'Chat-Name': REPORT_NAME });
            this.authoredPaths.delete(path);
            await this.setReportCommitPending(false);
        } catch (error) {
            this.log(`The project brief is saved, but its commit failed (${errorMessage(error)}); only the commit is retried.`, 'warning');
            await this.setReportCommitPending(true);
            if (this.stopRequested) return;
            this.reportCommitTimer = setTimeout(() => {
                this.reportCommitTimer = undefined;
                void this.persistReport(path);
            }, PERSISTENCE_RETRY_MS);
            this.reportCommitTimer.unref?.();
        }
    }

    /** Records whether a saved brief still waits for its commit (it survives restarts). */
    private async setReportCommitPending(pending: boolean): Promise<void> {
        const { isCommitPending, ...rest } = await this.state.readReport();
        if (this.reportCommitPending === pending && Boolean(isCommitPending) === pending) return;
        this.reportCommitPending = pending;
        await this.state.writeReport({ ...rest, ...(pending ? { isCommitPending: true } : {}) }).catch((error: unknown) => this.logOnce(`The pending brief commit could not be recorded: ${errorMessage(error)}`, 'warning'));
        this.touch();
    }

    /**
     * Explicit Refresh report: one shared generation request, coalesced across clients and subject to pause and
     * resources (it never resumes Chatter secretly). The saved brief stays readable meanwhile.
     */
    public async requestReport(): Promise<{ readonly applied: boolean; readonly outcome: string }> {
        if (this.reportGenerating) return { applied: true, outcome: 'A brief is being written now; this request is covered by it.' };
        // After a failed generation, a new explicit Refresh is newer than its recheck and brings it forward.
        const failed = Boolean(this.reportRecheck);
        const already = Boolean(this.reportRequest) && !failed;
        if (!this.reportRequest || failed) this.reportRequest = new Date().toISOString();
        await this.state.writeReport({ ...(await this.state.readReport()), requestedAt: this.reportRequest });
        this.wake();
        this.touch();
        if (!this.claimable) return { applied: true, outcome: `${already ? 'A refresh is already requested' : 'Refresh requested'}; the service is paused, so Chatter writes it when background work resumes.` };
        if (failed) return { applied: true, outcome: 'Refresh requested; Chatter tries again now instead of waiting for the automatic recheck of the failed brief.' };
        return { applied: true, outcome: already ? 'A refresh is already requested.' : 'Refresh requested; Chatter writes the brief shortly.' };
    }

    /**
     * Discuss report: a new ordinary chat in `chats/` whose first Chatter message is the exact displayed brief, with its
     * original time and a link to the report (a fixed snapshot; later briefs never change it). No model call.
     */
    public async discussReport(input: { readonly at?: string }): Promise<{ readonly chat: string; readonly outcome: string }> {
        const at = input.at ?? this.reportView.brief?.at;
        const brief = at ? ((this.reportView.brief?.at === at ? this.reportView.brief : undefined) ?? (await findBrief(this.options.project.root, at))) : undefined;
        if (!brief) throw new PtbkError('No such project brief to discuss.', { kind: 'not-found', next: ['Refresh the report first, or open report.book through Files.'] });
        const author = await this.catalog.resolve(REPORT_AUTHOR);
        const chatter = author.kind === 'agent' ? formatAgentReference(author.definition.name) : REPORT_AUTHOR;
        const created = await this.chats.create({ name: 'Project brief discussion', members: ['@User', chatter], status: 'open', links: [formatAgentReference(REPORT_NAME)], messages: [{ sender: chatter, text: brief.text, at: brief.at }] });
        await this.refreshChats();
        return { chat: created.chat.name, outcome: `Started {${created.chat.name}} with the brief of ${brief.at}.` };
    }

    /** Fingerprint of what an automatic recheck depends on: the task source revision, the tools and the project check. */
    private async recoveryConditions(record: ActiveRecord): Promise<string> {
        const source = await readFile(resolve(this.options.project.root, record.sourcePath)).catch(() => undefined);
        const tools = this.tools.items.map((item) => `${item.name}:${item.isEnabled ? item.state : 'disabled'}`).sort();
        const check = this.settings ? setting<string>(this.settings, 'execution.check') : '';
        return createHash('sha256')
            .update(JSON.stringify({ source: source ? sourceRevision(source) : null, tools, check }))
            .digest('hex')
            .slice(0, 16);
    }

    /** Compares a failure with the previous recovery round: the same cause under unchanged conditions is no new evidence. */
    private async assessFailure(record: ActiveRecord): Promise<{ readonly cause: string; readonly conditions: string; readonly equivalent: boolean }> {
        const cause = record.failure ?? 'unknown reason';
        const conditions = await this.recoveryConditions(record);
        return { cause, conditions, equivalent: record.recovery?.fingerprint === outcomeFingerprint({ cause, conditions }) };
    }

    /**
     * Checkpoints a failed task until its next cause-aware recheck (exponential backoff with spreading, capped; the
     * longest wait for repeated equivalent failures), persisted across restarts. Its files stay owned and independent
     * work continues; nobody is asked to retry.
     */
    private async scheduleRecovery(record: ActiveRecord, assessment: Awaited<ReturnType<Agenda['assessFailure']>>): Promise<void> {
        const previous = record.recovery;
        const schedule = nextRecheck(previous, assessment, withInitialDelay(WAITING_POLICIES.taskRecovery, Number(this.options.env.PTBK_RECOVERY_RECHECK_MS) || undefined));
        const { rounds, equivalent, nextAt } = schedule;
        const agent = referenceName(record.routing.agent ?? setting<string>(this.settings, 'routing.defaultAgent'));
        const tried = `${record.handover ? `${referenceName(record.handover.from)}, then ${record.handover.agent},` : agent} used ${record.attempt} attempt(s) and ${record.technicalRetries} technical retr${record.technicalRetries === 1 ? 'y' : 'ies'}: ${assessment.cause}`;
        const recovery: RecoverySchedule = { ...schedule, remedies: [...(previous?.remedies ?? []), tried].slice(-6) };
        const files = this.ownership.owned(record.runId);
        await this.state.park({ ...record, recovery, ownedFiles: files.length ? files : record.ownedFiles });
        this.recoveryDue.set(record.runId, Date.parse(nextAt));
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('recovery-scheduled', { runId: record.runId, round: rounds, nextAt, cause: assessment.cause, equivalent }).catch(() => undefined);
        this.log(
            `"${record.taskTitle}" could not be completed (${assessment.cause}). Nobody needs to retry it: automatic recheck ${rounds} is due ${formatShortTime(Date.parse(nextAt), Date.now(), this.timeZone)}${equivalent ? ' (the same failure repeated, so it waits longer)' : ''}, sooner when its source, tools or check change; independent work continues.`,
            'warning',
        );
    }

    /**
     * Starts a due automatic recheck of a checkpointed failed task with a fresh immediate budget and the history of
     * remedies already tried. A recovery question an older engine left unanswered is retired (resolved with the
     * reason), never asked again.
     */
    private async startRecheck(record: ActiveRecord, recovery: RecoverySchedule, reason: string): Promise<void> {
        this.recoveryDue.delete(record.runId);
        if (record.recoveryChat) {
            const agent = record.handover?.agent ?? record.routing.agent ?? setting<string>(this.settings, 'routing.defaultAgent');
            await this.chats
                .append(record.recoveryChat, { sender: formatAgentReference(referenceName(agent)), text: `No reply is needed anymore: Promptbook rechecks {${record.taskTitle}} automatically (${reason}). \`ptbk recover\` can still acknowledge the failure.` }, { status: 'resolved' })
                .catch(() => undefined);
        }
        const preSnapshot = await this.resumedPreSnapshot(record);
        await this.state.unpark({
            ...record,
            phase: 'executing',
            attempt: 0,
            technicalRetries: 0,
            completionApplied: false,
            failure: undefined,
            handover: undefined,
            recoveryChat: undefined,
            awaitedMessages: undefined,
            answerMessage: undefined,
            preSnapshot,
            instanceId: this.options.instanceId,
            recovery,
            feedback: `Automatic recheck ${recovery.rounds} (${reason}). Earlier rounds failed; already tried:\n${recovery.remedies.map((remedy) => `- ${remedy}`).join('\n')}\nInspect the current state and complete the task, changing the approach where the same one failed. Reconcile external actions before repeating any of them.`,
        });
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('recovery-recheck', { runId: record.runId, round: recovery.rounds, reason }).catch(() => undefined);
        this.log(`Automatic recheck ${recovery.rounds} of "${record.taskTitle}" (${reason}).`);
    }

    /**
     * Whether the user replied in a chat after the awaited message (a reply among `choices` when they are required,
     * otherwise among the awaited message's own offered choices, or any reply when none were offered).
     */
    private async chatReplyOf(name: string, awaitedMessages: number | undefined, choices?: readonly string[], answerMessage?: number): Promise<{ readonly answered: boolean; readonly answer?: string; readonly missing?: boolean; readonly withdrawn?: string }> {
        const stored = await this.chats.find(name);
        if (!stored) return { answered: !choices, missing: true };
        const messages = stored.chat.messages;
        // The reply routed to this question (several questions may wait in one chat).
        const routed = answerMessage !== undefined ? messages[answerMessage - 1] : undefined;
        if (routed?.senderKey === 'user' && (!choices || choices.includes(routed.text.trim()))) return { answered: true, answer: routed.text.trim() };
        const awaited = awaitedMessages ?? messages.length;
        // A question its responsible agent withdrew (verified obsolete) is settled without a synthetic answer.
        const withdrawn = (await this.chats.attention.list().catch(() => [])).find((ping) => ping.key === stored.chat.key && ping.message === awaited && ping.withdrawn);
        if (withdrawn) return { answered: true, withdrawn: withdrawn.withdrawn!.reason };
        const question = messages[awaited - 1];
        const offered = choices ?? question?.choices;
        for (const message of messages.slice(awaited)) {
            if (message.senderKey !== 'user') continue;
            if (!offered?.length || offered.includes(message.text.trim())) return { answered: true, answer: message.text.trim() };
        }
        // Resolving an ordinary question without a reply lets the task continue with what it has.
        return { answered: !choices && stored.chat.status === 'resolved' };
    }

    /** Resets a failed record for a deliberate retry (its run keeps the files it owns). */
    public async retryRecord(record: ActiveRecord): Promise<void> {
        this.resumeAfter.delete(record.runId);
        // A deliberate retry starts a fresh chain with the task's own agent (Fixer may take over again if it fails).
        this.recoveryDue.delete(record.runId);
        await this.state.writeActive({ ...record, phase: 'executing', attempt: 0, technicalRetries: 0, completionApplied: false, failure: undefined, recoveryChat: undefined, awaitedMessages: undefined, handover: undefined, recovery: undefined, feedback: `A previous run failed: ${record.failure ?? 'unknown'}. Inspect the current state and complete the task.` });
        this.log(`Retrying "${record.taskTitle}".`);
        this.wake();
    }

    /** Records an acknowledged failure in the task source (its own commit) and releases its record and files. */
    public async acknowledgeRecord(record: ActiveRecord): Promise<void> {
        const path = resolve(this.options.project.root, record.sourcePath);
        try {
            const source = await readFile(path, 'utf8');
            const updated = path.endsWith('.book')
                ? appendCommitment(source, 'TASK STATUS', 'failed')
                : setMarkdownControl(source, { hash: record.sectionHash }, '!', `failed ${formatIsoWithOffset(Date.now(), this.timeZone)}: ${(record.failure ?? '').slice(0, 160)}`);
            await writeFile(path, updated);
            await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('failure-acknowledged', { runId: record.runId, failure: record.failure, chat: record.recoveryChat });
            if (this.commitMode) await this.commitAuthoring([path, ...(await this.traceFiles(record.sourcePath))], `Mark failed - ${record.taskTitle}`, { 'Task-Name': record.taskTitle });
        } catch (error) {
            this.log(`Could not mark "${record.taskTitle}" as failed in its source: ${errorMessage(error)}`, 'warning');
        }
        await this.state.clearActive(record.runId);
        await this.state.dropParked(record.taskTitle);
        // Its partial changes stay for review, no longer owned by anyone (they count as uncommitted changes).
        this.ownership.release(record.runId);
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

    /**
     * Keeps the current price lists of the enabled harnesses observed, in the background: a download is never a
     * prerequisite of work, and an unavailable list only leaves usage unpriced.
     */
    private maintainPriceLists(): void {
        const now = Date.now();
        if (this.observingPrices || now < this.nextPriceCheck) return;
        this.observingPrices = true;
        this.nextPriceCheck = now + PRICE_CHECK_SPACING_MS;
        const plugins = this.pool.enabled().flatMap((id) => this.pool.plugin(id) ?? []);
        void observePriceLists(this.options.project, plugins, { env: this.options.env })
            .then((outcome) => {
                if (outcome.kind === 'unavailable') this.logOnce(`Current model prices could not be read (${outcome.reason}). Usage is kept and its cost stays unknown; ptbk tries again later.`, 'info');
                else if (outcome.kind === 'observed' && outcome.recorded.length) this.log(`Observed the current model prices of ${outcome.recorded.join(', ')}.`);
            })
            .catch((error: unknown) => this.logOnce(`Current model prices could not be saved: ${errorMessage(error)}`, 'info'))
            .finally(() => {
                this.observingPrices = false;
            });
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
            this.loopWaits.delete('pre-work-check');
            return true;
        }
        if (mode === 'yes-and-fail') {
            const reason = `The project check \`${check}\` fails before work (exit ${String(result.exitCode)}).`;
            const checkWait = this.loopWait('pre-work-check', WAITING_POLICIES.setup, { cause: reason, conditions: check });
            this.setBlocker({ kind: 'setup', title: 'Pre-work check fails', reason, action: 'Fix the project (or run `ptbk fix`); ptbk rechecks automatically.', recheckAt: checkWait.nextAt });
            await this.wait(checkWait.waitMs, { kind: 'setup', reason, skippable: false });
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
     * Why integrating remote changes now would be unsafe: a running check or result commit (its validated content must
     * not change underneath it), or incoming files that active work owns or that have uncommitted local edits (never
     * overwritten, stashed or reset). Other concurrent work does not prevent integration.
     */
    private async integrationBlocker(incomingFiles: readonly string[]): Promise<string | undefined> {
        const validating = [...this.units.values()].find((unit) => unit.current && ['checking', 'finalizing', 'committing'].includes(unit.current.phase));
        if (validating) return `"${validating.label}" is validating or committing its result; integration happens after it`;
        if (!this.repositoryRoot) return 'the project is not in a Git working tree';
        const dirty = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot });
        const base = toProjectRelative(this.repositoryRoot, this.options.project.root);
        const incoming = incomingFiles.map((file) => (base && base !== '.' && file.startsWith(`${base}/`) ? file.slice(base.length + 1) : file));
        const owned = incoming.filter((file) => this.ownership.ownerOf(file));
        if (owned.length) return `active work owns incoming files (${owned.slice(0, 5).join(', ')}); integration happens once it releases them`;
        const overlap = incoming.filter((file) => dirty[file] !== undefined);
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
        if (queue.tasks.some((task) => task.origin === origin && !task.doneStamps.length && task.status !== 'done' && task.status !== 'failed' && task.status !== 'cancelled')) return;
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
                    `Integrate the remote changes with a visible merge: run \`git merge --no-ff --no-commit ${conflict.upstream}\`, resolve each conflict so that both intents are kept (inspect \`git log ${conflict.branch}...${conflict.upstream}\`), consult your team only when a genuine judgment is needed, then \`git add\` the resolved files and finish with \`git commit --no-edit -m "ptbk: Merge ${conflict.upstream} into ${conflict.branch} (conflicts resolved by Fixer)"\`. This merge commit is the one exception to "do not commit yourself".`,
                    'Never rebase, reset, amend, force-push or discard either side. If the conflict cannot be resolved safely, abort the merge (`git merge --abort`) and explain why.',
                ].join('\n\n'),
                commitments: ['TASK AGENT @Fixer', 'TASK PURPOSE SYSTEM', `TASK ORIGIN ${origin}`],
            }),
            { flag: 'wx' },
        );
        const commit = this.commitMode ? await this.commitAuthoring([path], `Ask Fixer to resolve the synchronization conflict with ${conflict.upstream}`).catch(() => undefined) : undefined;
        this.log(`Synchronization conflict with ${conflict.upstream} handed to Fixer (${toProjectRelative(this.options.project.root, path)}${commit ? `, ${commit.slice(0, 8)}` : ''}).`, 'warning');
        this.wake();
    }

    /**
     * Records a checkpointed result of an older engine's task worktree as completed once it was merged into the project
     * branch (task worktrees were removed; their pending results are never deleted).
     */
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
     * Reinspects every tool now (no browser launch, no model call), e.g. after an attended native sign-in in another
     * terminal: cached readiness would otherwise hide the new login until its next periodic inspection.
     */
    public async recheckTools(): Promise<ToolsView> {
        await this.refreshTools(true);
        this.wake();
        return this.tools;
    }

    /**
     * Feedback for a run waiting for its prerequisite tasks once all of them are settled (completed, retired, cancelled, marked
     * failed or removed), or `undefined` while one still needs work. Failure recovery of a prerequisite keeps the wait:
     * the dependency is real, and its problem is surfaced on the prerequisite itself.
     */
    private async prerequisitesSettled(record: ActiveRecord): Promise<string | undefined> {
        const tasks = (await this.readQueue()).tasks;
        const completed: string[] = [];
        const other: string[] = [];
        for (const name of record.waitingTasks ?? []) {
            const task = findTask(tasks, formatAgentReference(name)).task;
            if (!task) other.push(`{${name}} was removed`);
            else if (task.status === 'done' || (isRecurring(task) && task.doneStamps.length > 0)) completed.push(`{${task.title}}`);
            else if (task.status === 'retired' || task.status === 'cancelled' || task.status === 'failed') other.push(`{${task.title}} was ${task.status === 'retired' ? 'retired' : task.status === 'cancelled' ? 'cancelled' : 'marked failed'}`);
            else return undefined;
        }
        return [
            completed.length ? `The prerequisite ${completed.join(', ')} you created was completed and committed.` : '',
            other.length ? `The prerequisite ${other.join(', ')} without being completed; continue without it if the task allows it, otherwise report the task as blocked with the reason.` : '',
            'Continue this task from the current state of the files and its recorded external actions; do not repeat completed steps or confirmed actions.',
        ]
            .filter(Boolean)
            .join(' ');
    }

    /** Whether a run waits for a Wallet login request that is still pending (an unknown request never blocks). */
    private walletPending(record: ActiveRecord): boolean {
        return record.phase === 'awaiting-user' && Boolean(record.waitingWallet) && this.wallet.action(record.waitingWallet!)?.state === 'pending';
    }

    /**
     * Checkpoints a run waiting for a person (an answer or a recovery decision): its resources are released so independent
     * work continues, while the files it already changed stay owned by it (work needing them waits visibly, nothing is
     * mixed into another result). Returns whether the run was checkpointed.
     */
    private async checkpoint(record: ActiveRecord): Promise<boolean> {
        const files = this.ownership.owned(record.runId);
        const parked = { ...record, ownedFiles: files.length ? files : record.ownedFiles };
        await this.state.park(parked);
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('checkpointed', { phase: record.phase, chat: record.waitingChat ?? record.recoveryChat, ...(record.waitingWallet ? { wallet: record.waitingWallet } : {}), ...(record.waitingTasks ? { tasks: record.waitingTasks } : {}), ownedFiles: parked.ownedFiles ?? [] });
        const kept = parked.ownedFiles?.length ? ` It keeps its changes in ${parked.ownedFiles.slice(0, 4).join(', ')}${parked.ownedFiles.length > 4 ? ', …' : ''}; other work on those files waits.` : '';
        const waiting = record.waitingWallet ? this.wallet.action(record.waitingWallet) : undefined;
        const needed = `${waiting?.problem === 'code' ? 'a one-time code' : 'a login'}${waiting?.origin ? ` for ${waiting.origin}` : ''}`;
        const until =
            record.phase === 'awaiting-task'
                ? `its prerequisite ${(record.waitingTasks ?? []).map((name) => `{${name}}`).join(', ')} is completed (no reply is needed)`
                : record.waitingWallet
                  ? `${needed} is ${waiting?.problem === 'code' ? 'entered' : 'added'} in the Wallet (protected input, never in a chat)`
                  : `you reply in {${record.waitingChat ?? record.recoveryChat}}`;
        this.log(`"${record.taskTitle}" is checkpointed until ${until}; independent work continues.${kept}`);
        return true;
    }

    /**
     * The baseline of a resumed checkpoint: later commits of other work are the new baseline, while the run's own kept
     * changes keep their original baseline.
     */
    private async resumedPreSnapshot(record: ActiveRecord): Promise<Record<string, string | null>> {
        const fresh = await captureSnapshot({ project: this.options.project, repositoryRoot: this.repositoryRoot! }, new Set([...this.authoredPaths, ...this.ownership.heldByOthers(record.runId)]));
        const preSnapshot: Record<string, string | null> = { ...fresh };
        for (const path of record.ownedFiles ?? []) {
            if (Object.hasOwn(record.preSnapshot, path)) preSnapshot[path] = record.preSnapshot[path]!;
            else delete preSnapshot[path];
        }
        return preSnapshot;
    }

    /**
     * Restores a checkpointed task whose request was resolved, or whose automatic recheck is due, so it resumes at the
     * correct phase without another Start/Run action. Returns whether one was restored.
     */
    private async resumeParked(): Promise<boolean> {
        if (!this.repositoryRoot) return false;
        const parked = await this.state.readParked();
        // Rechecks of tasks no longer checkpointed (acknowledged, retried, resumed) no longer wake the loop.
        for (const runId of [...this.recoveryDue.keys()]) if (!parked.some((record) => record.runId === runId)) this.recoveryDue.delete(runId);
        let queue: Awaited<ReturnType<Agenda['readQueue']>> | undefined;
        for (const record of parked) {
            // A question or recheck whose task was completed, retired, marked failed or removed meanwhile is no longer
            // needed: the checkpoint is retired with that reason (the question stays in the chat's history).
            if (!record.worktree && (record.phase === 'awaiting-user' || record.phase === 'awaiting-task' || record.phase === 'failed')) {
                const closed = await this.closedTaskReason(record, (queue ??= await this.readQueue()).tasks);
                if (closed) {
                    await this.retireCheckpoint(record, closed);
                    return true;
                }
            }
            if (record.worktree) {
                // A result of an older engine's task worktree waits for its merge: complete it once its commit is part
                // of the project branch. Unmerged work stays checkpointed and explained, never deleted or resumed here.
                if (record.phase === 'synchronizing' && record.commitSha && (await isIntegrated(this.repositoryRoot, record.commitSha))) {
                    await this.completeIntegratedRecord(record);
                    return true;
                }
                continue;
            }
            if (record.phase === 'failed') {
                // A failed task recovers through automatic rechecks; a question an older engine asked may still be answered.
                const answered = record.recoveryChat ? (await this.chatReplyOf(record.recoveryChat, record.awaitedMessages, RECOVERY_CHOICES, record.answerMessage)).answered : false;
                if (!answered) {
                    const recovery = record.recovery;
                    if (!recovery) {
                        await this.scheduleRecovery(record, await this.assessFailure(record));
                        continue;
                    }
                    const spacing = Math.min(RECOVERY_MIN_SPACING_MS, Number(this.options.env.PTBK_RECOVERY_RECHECK_MS) || RECOVERY_RECHECK_MS);
                    const changed = Date.now() - Date.parse(recovery.scheduledAt ?? recovery.since) >= spacing && (await this.recoveryConditions(record)) !== recovery.conditions;
                    const due = Date.parse(recovery.nextAt) <= Date.now();
                    if (!due && !changed) {
                        this.recoveryDue.set(record.runId, Date.parse(recovery.nextAt));
                        continue;
                    }
                    await this.startRecheck(record, recovery, changed ? 'its source, tools or check changed' : `scheduled after ${recovery.rounds === 1 ? 'the failure' : `${recovery.rounds} failed rounds`}`);
                    return true;
                }
            }
            if (record.phase === 'awaiting-task') {
                // Resumed at its phase once the supporting work is settled; the run's kept changes are its own.
                const settled = await this.prerequisitesSettled(record);
                if (!settled) continue;
                await this.state.unpark({ ...record, feedback: settled, preSnapshot: await this.resumedPreSnapshot(record), instanceId: this.options.instanceId });
                this.log(`Resuming "${record.taskTitle}": its prerequisite ${(record.waitingTasks ?? []).map((name) => `{${name}}`).join(', ')} is settled.`);
                return true;
            }
            const chat = record.phase === 'awaiting-user' ? record.waitingChat : record.recoveryChat;
            if (chat && !(await this.chatReplyOf(chat, record.awaitedMessages, record.phase === 'failed' ? RECOVERY_CHOICES : undefined, record.answerMessage)).answered) continue;
            if (this.walletPending(record)) continue;
            const preSnapshot = await this.resumedPreSnapshot(record);
            const wallet = record.waitingWallet ? this.wallet.action(record.waitingWallet) : undefined;
            // The waiting agent learns truthfully how its Wallet request ended: a rejection is never a sign-in.
            const walletFeedback =
                wallet?.state === 'dismissed'
                    ? `The owner rejected the Wallet request for ${wallet.origin}: nothing was provided and it will not be asked again for this task. You are not signed in. Continue with another authorized route that does not need it, or report the task as blocked by this unmet prerequisite.`
                    : wallet?.state === 'resolved'
                      ? `The owner completed the Wallet request for ${wallet.origin}. Saved input is not yet a verified sign-in: open the page again and call wallet_login, then verify the access you need.`
                      : undefined;
            await this.state.unpark({ ...record, preSnapshot, instanceId: this.options.instanceId, ...(walletFeedback ? { feedback: walletFeedback } : {}) });
            this.log(record.waitingWallet ? `Resuming "${record.taskTitle}": its Wallet request was ${wallet?.state === 'dismissed' ? 'rejected' : 'settled'}.` : `Resuming "${record.taskTitle}" after your reply${chat ? ` in {${chat}}` : ''}.`);
            return true;
        }
        return false;
    }

    /**
     * Why a checkpointed task verifiably no longer needs its question or recheck: its source marks it completed, retired,
     * cancelled or failed, or the source was removed and the task exists nowhere else. An unclear source (e.g. a Markdown task
     * renamed while edited) keeps the checkpoint.
     */
    private async closedTaskReason(record: ActiveRecord, tasks: readonly Task[]): Promise<string | undefined> {
        const key = record.taskKey || nameKey(record.taskTitle);
        if (!(await pathExists(resolve(this.options.project.root, record.sourcePath)))) {
            return tasks.some((task) => task.key === key) ? undefined : `its task source ${record.sourcePath} was removed`;
        }
        const inSource = tasks.filter((task) => task.source.relativePath === record.sourcePath);
        // A task Book holds one task, whatever its current title; a Markdown file is matched by the task's name.
        const task = inSource.find((candidate) => candidate.key === key) ?? (record.sourcePath.endsWith('.book') && inSource.length === 1 ? inSource[0] : undefined);
        if (task?.status === 'done') return `{${task.title}} was completed`;
        // A future-scoped transition leaves the current occurrence to finish.
        if (task?.statusScope === 'future') return undefined;
        if (task?.status === 'retired') return `{${task.title}} was retired`;
        if (task?.status === 'cancelled') return `{${task.title}} was cancelled`;
        if (task?.status === 'failed') return `{${task.title}} was marked failed`;
        return undefined;
    }

    /**
     * Retires a checkpoint its task no longer needs: the checkpoint and its file ownership are released, and a question
     * still waiting in its chat is closed with the reason in every client, while the question stays in the history.
     */
    private async retireCheckpoint(record: ActiveRecord, reason: string): Promise<void> {
        const chat = record.phase === 'awaiting-user' ? record.waitingChat : record.recoveryChat;
        const answered = chat ? (await this.chatReplyOf(chat, record.awaitedMessages, record.phase === 'failed' ? RECOVERY_CHOICES : undefined, record.answerMessage).catch(() => ({ answered: true }))).answered : true;
        await this.state.dropParked(record.taskTitle);
        this.recoveryDue.delete(record.runId);
        this.ownership.release(record.runId);
        if (chat && !answered) {
            // Another question waiting in the same chat keeps it waiting for the owner.
            const others = (await this.state.readParked()).some((other) => other.waitingChat === chat || other.recoveryChat === chat);
            const agent = record.handover?.agent ?? record.routing.agent ?? setting<string>(this.settings, 'routing.defaultAgent');
            // The responsible agent withdraws exactly the awaited question (other dependencies keep waiting) and
            // explains it once; history and the original ping stay.
            const awaited = record.awaitedMessages ?? (await this.chats.find(chat))?.chat.messages.length;
            await this.chats
                .withdrawRequests(chat, { ...(awaited ? { messages: [awaited] } : {}), by: referenceName(agent), reason: `No reply is needed anymore: ${reason}. The question stays here for reference.`, trailers: { 'Task-Name': record.taskTitle } })
                .then(async (written) => {
                    // A failure-recovery question resolves its chat; an ordinary question leaves it open.
                    if (!others && !written.remaining && record.phase === 'failed') await this.chats.setStatus(chat, 'resolved');
                })
                .catch((error: unknown) => this.log(`The question in {${chat}} could not be closed: ${errorMessage(error)}`, 'warning'));
        }
        await (await TaskTrace.open(this.options.project, { name: record.taskTitle, source: record.sourcePath })).event('checkpoint-retired', { runId: record.runId, phase: record.phase, reason, chat: chat ?? null }, { local: true }).catch(() => undefined);
        this.log(`"${record.taskTitle}" no longer waits: ${reason}.${chat && !answered ? ` Its question in {${chat}} is closed.` : ''}`);
        await this.refreshChats();
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
        // An explicit maintenance operation is one unit of active work.
        const unit = this.registerUnit({ id: shortId(10), kind: 'task', label: task.title, key: task.key });
        try {
            return await this.execute({ task, route, kind: 'maintenance', createdPaths: [taskPath], learning: false, check }, unit);
        } finally {
            this.finishUnit(unit);
        }
    }

    /** Applies a recovery action from `ptbk recover` through the running process. */
    public async recover(taskRef: string, action: 'resume' | 'retry' | 'acknowledge'): Promise<string> {
        const matches = (candidate: ActiveRecord | undefined): boolean =>
            Boolean(candidate && (candidate.taskRef === taskRef || (candidate.taskKey || nameKey(candidate.taskTitle)) === (parseReferenceValue(taskRef)?.normalized ?? nameKey(taskRef)) || candidate.sourcePath === taskRef.replace(/\\/g, '/')));
        const active = (await this.state.readActiveRecords()).find(matches);
        if (active && this.runIsLive(active.runId)) throw new PtbkError(`"${active.taskTitle}" is executing now; recovery applies to interrupted, failed or waiting work.`, { kind: 'conflict', next: ['Wait until it finishes or fails, then recover it.'] });
        const parked = active ? undefined : (await this.state.readParked()).find(matches);
        if (parked) await this.state.dropParked(parked.taskTitle);
        const record = active ?? parked;
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
 * Normalized identity of an agent named as `@Name`, `{Full Name}` or plainly.
 */
function agentKeyOf(agent: string): string {
    return normalizeAgentName(parseReferenceValue(agent)?.name ?? agent);
}

/**
 * What an agent is told when work moves to it from another agent.
 */
function reassignmentPrompt(record: ActiveRecord, from: string): string {
    return [
        '## Taking over a reassigned task',
        '',
        `This task was moved to you from ${formatAgentReference(from)}, who stopped at a checkpoint. The working tree may contain its partial changes; the evidence of its attempts is in \`${traceDirectoryOf(record.sourcePath)}/\`.`,
        '',
        '- Continue from that state instead of starting over, and do not repeat an external action without verifying its current state first.',
    ].join('\n');
}

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
 * Human description of files held by other runs.
 */
function describeConflicts(conflicts: readonly FileConflict[]): string {
    const byOwner = new Map<string, string[]>();
    for (const conflict of conflicts) byOwner.set(conflict.label, [...(byOwner.get(conflict.label) ?? []), conflict.path]);
    return [...byOwner].map(([label, paths]) => `${paths.join(', ')} (being changed by "${label}")`).join('; ');
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

