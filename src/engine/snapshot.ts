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
    | 'finished';

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
};

/**
 * The work currently owning execution.
 *
 * @private shared status view model
 */
export type CurrentWorkView = {
    readonly taskRef: string;
    readonly taskTitle: string;
    /** task, assignment, learning, discovery, ... */
    readonly kind: string;
    readonly agent: AgentView;
    readonly harness: string;
    readonly harnessName: string;
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
    /** Extra detail (check command, request id, ...). */
    readonly detail?: string;
};

/**
 * Honest explanation of a wait.
 *
 * @private shared status view model
 */
export type WaitView = {
    readonly kind: 'pacing' | 'error-backoff' | 'quota' | 'schedule' | 'setup' | 'recovery' | 'workspace' | 'user' | 'discovery' | 'idle' | 'paused' | 'persistence';
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
    readonly title: string;
    readonly outcome: string;
    readonly agent?: string;
    readonly harness?: string;
    readonly model?: string;
    readonly commit?: string;
    readonly summary: string;
    readonly endedAt: string;
    readonly attempts: number;
};

/**
 * A pending human request (highest visual priority).
 *
 * @private shared status view model
 */
export type RequestView = {
    readonly id: string;
    readonly kind: string;
    readonly reason: string;
    readonly question: string;
    readonly choices?: readonly string[];
    readonly blocking: boolean;
    readonly createdAt: string;
    readonly taskRef?: string;
    readonly taskTitle?: string;
    readonly agent?: string;
    readonly origin: string;
};

/**
 * A setup/recovery/persistence blocker with its recheck time.
 *
 * @private shared status view model
 */
export type BlockerView = {
    readonly kind: 'setup' | 'harness' | 'recovery' | 'persistence' | 'workspace' | 'configuration';
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
        readonly mode: 'daemon' | 'foreground' | 'run';
        readonly state: 'starting' | 'running' | 'pausing' | 'paused' | 'stopping' | 'stopped' | 'finished';
        readonly pid: number;
        readonly instanceId: string;
        readonly startedAt: string;
        readonly persistent: boolean | null;
        readonly persistenceNote?: string;
        readonly commitMode: 'commit' | 'no-commit';
        readonly stopRequested: boolean;
    };
    readonly phase: Phase;
    readonly current?: CurrentWorkView;
    readonly wait?: WaitView;
    readonly queue: readonly QueueItemView[];
    readonly queueTotal: number;
    readonly results: { readonly completed: number; readonly failed: number; readonly recent: readonly ResultView[] };
    readonly requests: readonly RequestView[];
    readonly blockers: readonly BlockerView[];
    readonly errors: readonly ErrorView[];
    readonly activity: readonly ActivityView[];
    readonly agents: readonly AgentView[];
    readonly harnesses: readonly HarnessView[];
    readonly settings: readonly SettingView[];
    readonly connection: ConnectionView;
};
