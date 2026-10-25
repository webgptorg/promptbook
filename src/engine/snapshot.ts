import type { ChatSummary } from '../chats/store.js';
import type { ProfileSource } from '../tools/model.js';
import type { BadgeActivity } from '../ui/badges.js';

/**
 * Operating phase shown by every view.
 *
 * @private shared status view model
 */
export type Phase =
    | 'starting'
    | 'idle'
    | 'evaluating'
    | 'assigning'
    | 'executing'
    | 'repairing'
    | 'checking'
    | 'finalizing'
    | 'committing'
    | 'synchronizing'
    | 'learning'
    | 'discovering'
    | 'awaiting-user'
    | 'waiting'
    | 'blocked'
    | 'paused'
    | 'stopping'
    | 'stopped'
    | 'finished'
    /** A live engine of another ptbk version whose details this client cannot read. */
    | 'unknown';

/**
 * Agent identity and observed activity (badge appearance derives from `key`).
 *
 * @private shared status view model
 */
export type AgentView = {
    /** Display name. */
    readonly name: string;
    /** Normalized identity. */
    readonly key: string;
    /** Observed activity. */
    readonly activity: BadgeActivity;
    /** Mascot face for the activity. */
    readonly face: string;
    /** Working gesture frame (equal to `face` when not working). */
    readonly gesture: string;
    /** Identity hue for the browser. */
    readonly hue: number;
    /** A core role (`agents/.core/`) or the engine-provided Expert, listed in the complete team inventory. */
    readonly role?: 'core' | 'engine';
};

/**
 * The work currently owning execution.
 *
 * @private shared status view model
 */
export type CurrentWorkView = {
    readonly taskRef: string;
    /** Project-relative audit directory (`traces/<task-file-basename>/`). */
    readonly trace?: string;
    readonly taskTitle: string;
    /** task, assignment, learning, discovery, ... */
    readonly kind: string;
    readonly agent: AgentView;
    readonly harness: string;
    readonly harnessName: string;
    /** Named harness tool instance serving the work. */
    readonly tool?: string;
    /** Model actually reported, else requested; undefined = harness default (unknown). */
    readonly model?: string;
    /** Whether `model` was reported by the harness or only requested. */
    readonly modelSource: 'reported' | 'requested' | 'default';
    readonly thinkingLevel?: string;
    readonly phase: Phase;
    readonly attempt: number;
    readonly attemptBudget: number;
    readonly startedAt: string;
    /** For assignment work: the target task. */
    readonly target?: { readonly ref: string; readonly title: string };
    /** Extra detail (check command, waiting chat, ...). */
    readonly detail?: string;
};

/**
 * Honest explanation of a wait.
 *
 * @private shared status view model
 */
export type WaitView = {
    /** `tools`: the running engine waits for a usable browser/harness (not a lifecycle state, technical pause or stop). */
    readonly kind: 'pacing' | 'error-backoff' | 'quota' | 'schedule' | 'setup' | 'recovery' | 'workspace' | 'user' | 'discovery' | 'idle' | 'paused' | 'persistence' | 'tools';
    readonly reason: string;
    /** Next action/opportunity time (ISO). */
    readonly until?: string;
    /** Only execution/pacing waits can be skipped. */
    readonly skippable: boolean;
    /** Concrete next action. */
    readonly action?: string;
};

/**
 * One queue entry with its readiness.
 *
 * @private shared status view model
 */
export type QueueItemView = {
    readonly ref: string;
    readonly title: string;
    readonly readiness: string;
    readonly reason: string;
    readonly priority: number;
    readonly priorityText?: string;
    readonly agent?: string;
    readonly harness?: string;
    readonly source: string;
    readonly until?: string;
    readonly origin?: string;
};

/**
 * A finished piece of work.
 *
 * @private shared status view model
 */
export type ResultView = {
    readonly ref: string;
    /** Consolidated harness log of the task. */
    readonly trace?: string;
    /** Recurring occurrence (ISO). */
    readonly occurrence?: string;
    readonly title: string;
    readonly outcome: string;
    readonly agent?: string;
    readonly harness?: string;
    readonly model?: string;
    readonly commit?: string;
    readonly summary: string;
    readonly endedAt: string;
    readonly attempts: number;
    /** Kind of work (task, assignment, learning, …). */
    readonly kind?: string;
    /** Project-relative task source. */
    readonly source?: string;
    readonly thinkingLevel?: string;
    /** Whether `model` was reported by the harness (otherwise it was only requested). */
    readonly modelReported?: boolean;
    readonly harnessVersion?: string;
    readonly startedAt?: string;
};

/**
 * One chat in status views: waiting-for-user chats are the highest-priority attention items.
 *
 * @private shared status view model
 */
export type ChatView = ChatSummary;

/**
 * Chat attention: chats awaiting the user (agent-authored questions), unread counts and recent threads.
 *
 * @private shared status view model
 */
export type ChatsView = {
    /** Chats whose agent waits for the user's answer or action, most urgent first. */
    readonly waiting: readonly ChatView[];
    /** Unread messages across chats (not necessarily actionable). */
    readonly unread: number;
    /** All chats. */
    readonly total: number;
    /** Recently active chats (bounded). */
    readonly recent: readonly ChatView[];
};

/**
 * A setup/recovery/persistence blocker with its recheck time.
 *
 * @private shared status view model
 */
export type BlockerView = {
    readonly kind: 'setup' | 'harness' | 'tools' | 'recovery' | 'persistence' | 'workspace' | 'configuration' | 'synchronization';
    readonly title: string;
    readonly reason: string;
    readonly action?: string;
    readonly recheckAt?: string;
};

/**
 * An actionable error.
 *
 * @private shared status view model
 */
export type ErrorView = {
    readonly at: string;
    readonly summary: string;
    readonly phase?: string;
    readonly task?: string;
    readonly next?: string;
    readonly trace?: string;
};

/**
 * One activity line.
 *
 * @private shared status view model
 */
export type ActivityView = { readonly at: string; readonly text: string; readonly level: 'info' | 'warning' | 'error' };

/**
 * Harness availability.
 *
 * @private shared status view model
 */
export type HarnessView = {
    readonly id: string;
    readonly name: string;
    readonly featured: boolean;
    readonly enabled: boolean;
    readonly usable: boolean;
    readonly summary: string;
    readonly version?: string;
};

/**
 * One effective setting.
 *
 * @private shared status view model
 */
export type SettingView = {
    readonly key: string;
    readonly value: string;
    readonly source: string;
    readonly application: string;
    readonly description: string;
};

/**
 * Local HTTP and remote tunnel state.
 *
 * @private shared status view model
 */
export type ConnectionView = {
    readonly local: { readonly state: 'disabled' | 'starting' | 'ready' | 'failed'; readonly url?: string; readonly port?: number; readonly error?: string };
    readonly remote: {
        readonly state: 'disabled' | 'connecting' | 'ready' | 'degraded' | 'failed';
        readonly provider?: string;
        readonly url?: string;
        readonly error?: string;
        readonly checkedAt?: string;
    };
    /** Whether an unused pairing capability exists (never the secret itself). */
    readonly pairing?: { readonly available: boolean; readonly expiresAt?: string };
};

/**
 * Pending lifecycle intent of the engine (shared by every client).
 *
 * @private shared status view model
 */
export type LifecycleView = {
    /** What happens when the current task settles (or is happening: `force-stop`). */
    readonly intent?: 'pause' | 'stop' | 'restart' | 'force-stop';
    /** When the pending request was accepted (ISO). */
    readonly since?: string;
    /** Decision revision; a stop-to-pause confirmation must name the revision it was made against. */
    readonly revision: number;
    /** The current task is still settling before the intent applies. */
    readonly draining: boolean;
    /** Irreversible shutdown has begun (cancellation is too late). */
    readonly shutdown: boolean;
    /** The pending intent can still be cancelled (resume). */
    readonly cancellable: boolean;
    /** Restart is available (not for a finite run). */
    readonly restartable: boolean;
};

/**
 * One active reason why background scheduling is paused (reasons compose; scheduling resumes only when none remains).
 *
 * @private shared status view model
 */
export type PauseReasonView = {
    /** Stable identity of the reason (`manual`, or `health:<incident>`). */
    readonly id: string;
    /** `manual`: the operator's ordinary Pause; `health`: created and removed by the Health sub-engine. */
    readonly kind: 'manual' | 'health';
    /** Owning domain that removes it: System (manual Resume) or Health (resolution or soft override). */
    readonly owner: 'System' | 'Health';
    /** Health reasons only: `soft` (preventive limit, incident-scoped override allowed) or `hard` (actual exhaustion). */
    readonly severity?: 'soft' | 'hard';
    /** Human summary. */
    readonly summary: string;
    /** When it became active (ISO). */
    readonly since: string;
    /** Health incident behind the reason. */
    readonly incident?: string;
    /** Whether the operator may remove it (manual Resume, or the soft Health override). */
    readonly removable: boolean;
};

/**
 * One open health incident of the Health sub-engine.
 *
 * @private shared status view model
 */
export type HealthIncidentView = {
    /** Stable incident identity (a recovered and later repeated drop is a new incident). */
    readonly id: string;
    readonly resource: 'disk' | 'memory' | 'cpu' | 'network';
    /** `soft`/`hard` incidents pause new background work; `warning` only marks attention. */
    readonly severity: 'soft' | 'hard' | 'warning';
    readonly summary: string;
    /** When the incident opened (ISO). */
    readonly openedAt: string;
    /** A soft incident the operator chose to continue below (ISO), until it recovers. */
    readonly overriddenAt?: string;
    /** Whether it currently contributes a pause reason. */
    readonly pauses: boolean;
};

/**
 * Host health observed by the engine's Health sub-engine (one per engine, independent of any viewer).
 *
 * @private shared status view model
 */
export type HealthView = {
    /** `ok` healthy; `warning` attention without pause; `soft`/`hard` a health pause applies; `unknown` before the first sample. */
    readonly status: 'ok' | 'warning' | 'soft' | 'hard' | 'unknown';
    /** Terse bounded summary for the home tile. */
    readonly summary: string;
    /** Time of the last measurement (ISO) and the polling interval. */
    readonly observedAt?: string;
    readonly intervalMs: number;
    /** Effective preventive limits in MiB (0 disables that soft threshold) and where they come from. */
    readonly limits: { readonly disk: number; readonly memory: number; readonly source: string };
    /** Free disk capacity of the filesystem(s) holding the project and its runtime storage. */
    readonly disk: { readonly freeMiB?: number; readonly totalMiB?: number; readonly paths: readonly { readonly path: string; readonly freeMiB?: number; readonly totalMiB?: number }[]; readonly error?: string };
    /** RAM and swap reported separately; `availableMiB` (RAM + swap) is what `limit.memory` applies to. */
    readonly memory: {
        readonly ramAvailableMiB?: number;
        readonly ramTotalMiB?: number;
        readonly swapFreeMiB?: number;
        readonly swapTotalMiB?: number;
        readonly availableMiB?: number;
        readonly note?: string;
    };
    /** CPU load relative to the available cores (no automatic pause threshold). */
    readonly cpu: { readonly cores: number; readonly load1?: number; readonly load5?: number; readonly load15?: number; readonly state: 'normal' | 'high' | 'unknown' };
    /** Basic Internet reachability of external work. */
    readonly network: { readonly state: 'reachable' | 'unreachable' | 'unknown'; readonly target?: string; readonly checkedAt?: string; readonly error?: string };
    readonly incidents: readonly HealthIncidentView[];
    /** Remediation the Health sub-engine offers on this host. */
    readonly remediation: { readonly cache: { readonly path: string }; readonly swap: { readonly supported: boolean; readonly note: string } };
    /** Last remediation/override operation and its outcome. */
    readonly lastAction?: { readonly action: string; readonly outcome: string; readonly at: string };
};

/**
 * One execution context: the task's own agent run or a task-/conversation-scoped consultation.
 *
 * @private shared status view model
 */
export type ExecutionContextView = {
    /** `task`: the task's agent; `consultation`: an advisor consulted within it. */
    readonly role: 'task' | 'consultation';
    readonly agent: string;
    /** Who consulted this advisor. */
    readonly by?: string;
    /** Harness variant (`id`, display `name`) and the named tool instance actually used. */
    readonly harness: { readonly id: string; readonly name: string; readonly version?: string; readonly tool?: string };
    /**
     * Model identifier: `reported` by the harness, `requested` (not yet confirmed), `automatic` (harness default whose
     * concrete resolution is not reported yet) or `unknown`.
     */
    readonly model: { readonly value?: string; readonly status: 'reported' | 'requested' | 'automatic' | 'unknown'; readonly source?: string };
    /**
     * Thinking level in the harness's own terminology: `requested`, `automatic` (harness default), `not-applicable`
     * (the harness has no such setting) or `unknown`.
     */
    readonly thinkingLevel: { readonly value?: string; readonly status: 'requested' | 'automatic' | 'not-applicable' | 'unknown'; readonly term?: string; readonly source?: string };
    readonly state: 'active' | 'finished';
};

/**
 * Detailed effective configuration of the current (or, labelled historical, the last) execution.
 *
 * @private shared status view model
 */
export type ExecutionDetailView = {
    /** `active`: the running execution; `historical`: the last finished one, never shown as currently running. */
    readonly status: 'active' | 'historical';
    readonly task: { readonly ref: string; readonly title: string; readonly source?: string; readonly trace?: string; readonly kind: string };
    readonly agent: { readonly name: string; readonly source?: string };
    readonly phase?: string;
    readonly attempt?: number;
    readonly attemptBudget?: number;
    readonly startedAt?: string;
    readonly endedAt?: string;
    readonly outcome?: string;
    /** The task's own context first, then consultations (several harnesses/models stay distinguishable). */
    readonly contexts: readonly ExecutionContextView[];
};

/**
 * One named browser tool as the engine sees it: effective profile, health, ownership, retained use and recovery.
 *
 * @private shared status view model
 */
export type BrowserDetailView = {
    /** Browser tool name. */
    readonly name: string;
    /** Browser adapter. */
    readonly variant: string;
    /** Saved enabled state (a disabled or removed tool may still serve the task that acquired it: `retained`). */
    readonly isEnabled: boolean;
    /** Effective profile source of the active (or next) process. */
    readonly source: ProfileSource;
    readonly sourceLabel: string;
    /** Resolved profile path (diagnostic data only; never its contents). */
    readonly profilePath: string;
    /** The effective record differs from the saved one (temporary overrides). */
    readonly savedProfile?: string;
    /** A changed setting applies at the next task boundary. */
    readonly pending?: string;
    /** The current task keeps its originally acquired configuration (draining/current-work-only). */
    readonly retained?: boolean;
    /** A task holds this browser now. */
    readonly inUse?: boolean;
    readonly mode: { readonly requested: 'headless' | 'headful'; readonly actual?: 'headless' | 'headful'; readonly note?: string };
    readonly executable?: string;
    readonly state: 'not-started' | 'starting' | 'running' | 'failed' | 'recovering' | 'stopped';
    readonly pid?: number;
    /** Known ownership of a shared profile (another project or browser holds it). */
    readonly ownership: { readonly state: 'owned' | 'free' | 'busy' | 'unknown'; readonly holder?: string };
    readonly lastFailure?: { readonly at: string; readonly summary: string; readonly evidence?: string };
    readonly recovery?: { readonly attempts: number; readonly nextRetryAt?: string; readonly state: 'idle' | 'retrying' | 'blocked'; readonly blocker?: string };
    /** Last manual/automatic browser action and its observed outcome. */
    readonly lastAction?: { readonly action: string; readonly at: string; readonly outcome: string; readonly state: 'accepted' | 'deferred' | 'succeeded' | 'failed' };
    readonly checkedAt?: string;
};

/**
 * One named tool in the shared inventory: canonical saved record (secrets only as references) and actual state.
 *
 * @private shared status view model
 */
export type ToolView = {
    readonly name: string;
    readonly type: 'BROWSER' | 'HARNESS';
    readonly variant: string;
    /** Display name of the adapter (e.g. OpenAI Codex). */
    readonly variantLabel: string;
    readonly description?: string;
    /** Position in the ordered array (1-based). */
    readonly order: number;
    readonly isEnabled: boolean;
    /** `usable`: enabled and ready; `unavailable`: enabled but not usable now; `disabled`; `unknown`: not inspected yet. */
    readonly state: 'usable' | 'unavailable' | 'disabled' | 'unknown';
    readonly summary: string;
    readonly nextAction?: string;
    /** Held by active work right now. */
    readonly inUse: boolean;
    /** Active work keeps an acquired old configuration of this (changed/disabled/removed) tool. */
    readonly retained?: boolean;
    /** Changed only for this invocation (command-line overrides), not saved. */
    readonly overridden?: boolean;
    /** Non-secret configuration fields (an API key appears only as its `${{ env.NAME }}` reference and source). */
    readonly fields: Readonly<Record<string, string>>;
};

/**
 * The ordered tool inventory with the baseline readiness of new work.
 *
 * @private shared status view model
 */
export type ToolsView = {
    readonly items: readonly ToolView[];
    /** What new work waits for (no enabled usable browser/harness), with the concrete action. */
    readonly waiting?: { readonly reason: string; readonly action: string };
    /** Configuration problems of `tools` (collisions, unknown variants, inline secrets) awaiting repair. */
    readonly problems: readonly string[];
};

/**
 * Git synchronization state (present only while autosync is enabled).
 *
 * @private shared status view model
 */
export type SyncView = {
    /** Redacted origin URL and the tracked destination of the started branch. */
    readonly origin?: string;
    readonly branch?: string;
    readonly upstream?: string;
    /** Current activity. */
    readonly phase: 'idle' | 'fetching' | 'integrating' | 'publishing';
    /** Outcome of the last cycle. */
    readonly state: 'never' | 'synchronized' | 'pending' | 'deferred' | 'conflict' | 'failed' | 'unconfigured';
    readonly lastAttemptAt?: string;
    /** Last successful integration of remote changes (or confirmation that nothing was incoming). */
    readonly lastIntegrationAt?: string;
    readonly lastPublicationAt?: string;
    /** Known commits to integrate / to publish (unknown when fetch failed). */
    readonly incoming?: number;
    readonly outgoing?: number;
    /** Human explanation of a pending/deferred/failed/conflict state. */
    readonly reason?: string;
    readonly nextAttemptAt?: string;
    /** Last manual cycle request and its observed outcome. */
    readonly manual?: { readonly at: string; readonly outcome: string };
};

/**
 * Operational domains of the dashboards (home tiles and their pages).
 *
 * @private shared status view model
 */
export type DashboardDomain = 'work' | 'system' | 'health' | 'chats' | 'tasks' | 'agents' | 'tools' | 'results' | 'connection' | 'sync';

/**
 * Why a domain needs the operator's attention: `key` identifies the current actionable items (a changed key is a new
 * event) and `tone` their severity.
 *
 * @private shared status view model
 */
export type DomainAttention = { readonly key: string; readonly tone: 'warning' | 'error' };

/**
 * The shared project status, identical for terminal, browser and API.
 *
 * @private shared status view model
 */
export type ServiceSnapshot = {
    /** Monotonic revision for live updates. */
    readonly revision: number;
    /** Observation time (ISO). */
    readonly observedAt: string;
    readonly project: { readonly name: string; readonly path: string };
    readonly engine: { readonly version: string; readonly installation: string; readonly scope: string };
    readonly service: {
        /** Placement (`run` is reported only by older engines that still had a finite run). */
    readonly mode: 'daemon' | 'foreground' | 'maintenance' | 'run';
        /**
         * Live states `running`, `pausing`, `pause` and `stopping`; `stopped`/`finished` are observed outcomes after the
         * engine ended (never a fifth live state).
         */
        readonly state: 'running' | 'pausing' | 'pause' | 'stopping' | 'stopped' | 'finished';
        readonly pid: number;
        readonly instanceId: string;
        readonly startedAt: string;
        readonly persistent: boolean | null;
        readonly persistenceNote?: string;
        readonly commitMode: 'commit' | 'no-commit';
        readonly stopRequested: boolean;
        /** Pending lifecycle intent (absent for an observed stopped service). */
        readonly lifecycle?: LifecycleView;
        /** Every active pause reason (manual and Health); absent from engines that predate composed pause. */
        readonly pauseReasons?: readonly PauseReasonView[];
    };
    readonly phase: Phase;
    readonly current?: CurrentWorkView;
    /** Effective execution configuration for the expandable execution panel. */
    readonly execution?: ExecutionDetailView;
    /** The browser serving (or next serving) work, for the expandable browser panel. */
    readonly browser?: BrowserDetailView;
    /** Every named browser tool. */
    readonly browsers?: readonly BrowserDetailView[];
    /** The shared named tool inventory. */
    readonly tools?: ToolsView;
    /** Git synchronization, present only while autosync is enabled. */
    readonly sync?: SyncView;
    /** Host health of the engine's Health sub-engine (absent for stopped services and older engines). */
    readonly health?: HealthView;
    /** Saved configuration version and pending configuration work. */
    readonly configuration?: { readonly promptbookVersion?: string; readonly pending?: string };
    readonly wait?: WaitView;
    readonly queue: readonly QueueItemView[];
    readonly queueTotal: number;
    readonly results: { readonly completed: number; readonly failed: number; readonly recent: readonly ResultView[] };
    /** Chat attention summary (agent-authored waiting chats first). */
    readonly chats: ChatsView;
    readonly blockers: readonly BlockerView[];
    readonly errors: readonly ErrorView[];
    readonly activity: readonly ActivityView[];
    readonly agents: readonly AgentView[];
    readonly harnesses: readonly HarnessView[];
    readonly settings: readonly SettingView[];
    readonly connection: ConnectionView;
    /** Domains with an actionable event (absent from older engines; viewers then derive it the same way). */
    readonly attention?: Partial<Record<DashboardDomain, DomainAttention>>;
};
