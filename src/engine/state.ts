import { appendFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirectory, listDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { normalizeAgentName } from '../book/references.js';
import { nameKeyPath } from '../tasks/identity.js';
import type { ThinkingLevel } from '../project/config.js';

/**
 * Phases of the active task's lifecycle, persisted for recovery.
 *
 * @private runtime state
 */
export type ActivePhase = 'claimed' | 'executing' | 'awaiting-user' | 'checking' | 'finalizing' | 'committing' | 'committed' | 'synchronizing' | 'failed';

/**
 * Kind of automatic/explicit work.
 *
 * @private runtime state
 */
export type WorkKind = 'task' | 'assignment' | 'learning' | 'discovery' | 'intent' | 'maintenance';

/**
 * A task Router judged impossible to execute: blocked until its source changes.
 *
 * @private runtime state
 */
export type RoutingBlock = { readonly reason: string; readonly sourceHash: string; readonly at: string };

/**
 * One created repair task for a problem condition (no duplicate repair for the same unchanged problem).
 *
 * @private runtime state
 */
export type RepairRecord = { readonly fingerprint: string; readonly task: string; readonly at: string };

/**
 * Selected execution configuration.
 *
 * @private runtime state
 */
export type RoutingSelection = {
    /** Agent display name. */
    readonly agent: string;
    /** Harness variant (plugin identifier, e.g. `openai-codex`). */
    readonly harness: string;
    /** Named harness tool instance actually serving the work (same-variant fallback picks it at selection). */
    readonly tool?: string;
    /** Requested model (undefined = harness default). */
    readonly model?: string;
    /** Requested thinking level. */
    readonly thinkingLevel?: ThinkingLevel;
    /** Resolved endpoint of the serving tool: `official`, `local` or a base URL. */
    readonly runtime?: string;
    /** Base URL the harness is pointed at (local/custom endpoints only). */
    readonly baseUrl?: string;
    /** Where each value came from (task/agent/chat MODEL, CLI requirement, plugin default, tool order). */
    readonly sources?: Readonly<Partial<Record<'agent' | 'harness' | 'tool' | 'model' | 'thinkingLevel' | 'runtime', string>>>;
};

/**
 * One attempt in the active record's history.
 *
 * @private runtime state
 */
export type AttemptRecord = {
    /** 1-based attempt number. */
    readonly attempt: number;
    /** Outcome. */
    readonly outcome: string;
    /** Diagnostic text. */
    readonly diagnostic: string;
    /** Trace path (project-relative). */
    readonly trace?: string;
    /** Time (ISO). */
    readonly at: string;
    /** Recurring occurrence of this attempt (ISO). */
    readonly occurrence?: string;
};

/**
 * Recovery record of one active run (`.ptbk/state/active/<run>.json`); several runs can be active at once.
 *
 * @private runtime state
 */
export type ActiveRecord = {
    /** Schema version. */
    readonly version: 1;
    /** Unique identifier of this execution (commit trailer for crash reconciliation). */
    readonly runId: string;
    /** Task reference. */
    readonly taskRef: string;
    /** Normalized task name: the task's identity (records written by older engines may lack it). */
    readonly taskKey: string;
    /** Task title. */
    readonly taskTitle: string;
    /** Project-relative source path. */
    readonly sourcePath: string;
    /** Markdown section identity. */
    readonly sectionHash?: string;
    /** Recurring occurrence slot (ISO). */
    readonly occurrence?: string;
    /** Work kind. */
    readonly kind: WorkKind;
    /** Current phase. */
    readonly phase: ActivePhase;
    /** Implementation/repair attempts used. */
    readonly attempt: number;
    /** Technical retries used. */
    readonly technicalRetries: number;
    /** Routing in use. */
    readonly routing: RoutingSelection;
    /** Dirty paths (project-relative) with content hashes before the task started. */
    readonly preSnapshot: Readonly<Record<string, string | null>>;
    /** Engine-created files belonging to this task (project-relative). */
    readonly createdPaths: readonly string[];
    /** Completion stamp/follow-ups were written. */
    readonly completionApplied: boolean;
    /** Task source before the completion edits and the follow-ups they created (to revert after a failed check). */
    readonly completionBackup?: { readonly source: string; readonly created: readonly string[] };
    /** Result commit. */
    readonly commitSha?: string;
    /** Chat waiting for the user's reply (agent-authored question of this task). */
    readonly waitingChat?: string;
    /** Message count of that chat when the question was asked: a later User message is the reply. */
    readonly awaitedMessages?: number;
    /** Chats with the user that belong to this task (their transcripts are given to later attempts). */
    readonly chats?: readonly string[];
    /** Failure explanation when the phase is `failed`. */
    readonly failure?: string;
    /** Chat in which the task's agent asks how to continue after a failure. */
    readonly recoveryChat?: string;
    /**
     * The failed task was handed to Fixer, which continues it in the same record (same ownership, trace and result
     * commit) for one bounded round before anyone is asked how to continue.
     */
    readonly handover?: { readonly agent: string; readonly from: string; readonly failure: string; readonly at: string };
    /** Feedback for the next attempt. */
    readonly feedback?: string;
    /** Explicit no-commit mode. */
    readonly noCommit: boolean;
    /**
     * Task worktree of an older engine's isolated run (task worktrees were removed; such a run is preserved and
     * explained, never resumed in the shared working tree).
     */
    readonly worktree?: string;
    /**
     * Project-relative files this run owns (per-file ownership), kept while it works, waits or is checkpointed with
     * changes, so a restart restores the same ownership and other work never mixes them into its result.
     */
    readonly ownedFiles?: readonly string[];
    /** Owning process instance. */
    readonly instanceId: string;
    /** Start time (ISO). */
    readonly startedAt: string;
    /** Last update (ISO). */
    readonly updatedAt: string;
    /** Attempt history. */
    readonly history: readonly AttemptRecord[];
};

/**
 * Temporary branch name of an isolated run.
 *
 * @private runtime state
 */
export function isolationBranch(runId: string): string {
    return `ptbk/${runId}`;
}

/**
 * Readiness contributions of checkpointed tasks, keyed by normalized task name: the chat each one waits on, or (for
 * work left in an older engine's task worktree, which is no question for the user) a recovery explanation.
 *
 * @private runtime state
 */
export function parkedReadiness(records: readonly ActiveRecord[]): { readonly awaitingUser: Map<string, string>; readonly integrations: Map<string, string> } {
    const awaitingUser = new Map<string, string>();
    const integrations = new Map<string, string>();
    for (const record of records) {
        const key = record.taskKey || normalizeAgentName(record.taskTitle);
        if (record.phase === 'synchronizing' && record.worktree) integrations.set(key, `Its isolated result waits on ${isolationBranch(record.runId)} for a visible merge into the project branch; the task completes once it is merged.`);
        else if (record.worktree) {
            integrations.set(key, `It was running in a task worktree of an older engine (${record.worktree}, branch ${isolationBranch(record.runId)}); task worktrees were removed. Merge or discard that branch yourself, then run \`ptbk recover ${record.taskRef} --action retry\` or \`--action acknowledge\`.`);
        } else awaitingUser.set(key, record.waitingChat ?? record.recoveryChat ?? 'checkpoint');
    }
    return { awaitingUser, integrations };
}

/**
 * A durable blocker attached to one task (needs explicit recovery).
 *
 * @private runtime state
 */
export type TaskBlocker = {
    /** Explanation. */
    readonly reason: string;
    /** Category. */
    readonly kind: 'failed' | 'ambiguous' | 'persistence' | 'blocked-by-agent';
    /** Time (ISO). */
    readonly at: string;
    /** Trace path. */
    readonly trace?: string;
};

/**
 * One finished piece of work for statistics and status views.
 *
 * @private runtime state
 */
export type ResultRecord = {
    /** Task reference. */
    readonly taskRef: string;
    /** Task name at the time of the operation. */
    readonly taskName?: string;
    /** Title. */
    readonly title: string;
    /** Kind. */
    readonly kind: WorkKind;
    /** Outcome. */
    readonly outcome: 'completed' | 'completed-uncommitted' | 'failed' | 'blocked' | 'awaiting-user' | 'skipped' | 'interrupted';
    /** Agent. */
    readonly agent?: string;
    /** Harness. */
    readonly harness?: string;
    /** Effective model when known. */
    readonly model?: string;
    /** Whether `model` was reported by the harness (otherwise only requested). */
    readonly modelReported?: boolean;
    /** Project-relative task source. */
    readonly source?: string;
    /** Thinking level. */
    readonly thinkingLevel?: string;
    /** Result commit. */
    readonly commit?: string;
    /** Attempts used. */
    readonly attempts: number;
    /** Summary. */
    readonly summary: string;
    /** Start (ISO). */
    readonly startedAt: string;
    /** End (ISO). */
    readonly endedAt: string;
    /** Trace path (`traces/<task-file-basename>/harness.log`). */
    readonly trace?: string;
    /** Recurring occurrence (ISO). */
    readonly occurrence?: string;
    /** Engine version. */
    readonly engineVersion: string;
    /** Harness version. */
    readonly harnessVersion?: string;
    /** Usage. */
    readonly usage?: Readonly<Record<string, number>>;
    /** Cost (reported by the harness). */
    readonly costUsd?: number;
};

/**
 * Goal-discovery bookkeeping.
 *
 * @private runtime state
 */
export type DiscoveryState = {
    /** Per normalized agent: last enquiry and cooldown. */
    readonly agents: Readonly<Record<string, { readonly lastAt: string; readonly outcome: 'work' | 'no-work' | 'failed'; readonly cooldownUntil?: string }>>;
};

/**
 * Bookkeeping of Fixer's bounded project health checks.
 *
 * @private runtime state
 */
export type HealthState = {
    /** Fingerprint of the diagnostics the last check was scheduled for. */
    readonly fingerprint?: string;
    /** When the last health-check task was scheduled (ISO). */
    readonly scheduledAt?: string;
    /** Name of that task. */
    readonly task?: string;
};

/**
 * Accessor of `.ptbk/state/`.
 *
 * @private runtime state
 */
export class StateStore {
    public constructor(private readonly directory: string) {}

    /** Absolute path of a state file. */
    private file(name: string): string {
        return join(this.directory, name);
    }

    /** Path of one run's active record. */
    private activeFile(runId: string): string {
        return join(this.file('active'), `${runId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
    }

    /**
     * Every active recovery record (oldest first). The single `active.json` of an older engine is adopted into the
     * per-run directory first, so recovery never loses it.
     */
    public async readActiveRecords(): Promise<ActiveRecord[]> {
        const legacy = await readJsonIfExists<ActiveRecord>(this.file('active.json')).catch(() => undefined);
        if (legacy) {
            await ensureDirectory(this.file('active'));
            await writeJsonAtomic(this.activeFile(legacy.runId), legacy);
            await rm(this.file('active.json'), { force: true });
        }
        const records: ActiveRecord[] = [];
        for (const entry of await listDirectory(this.file('active'))) {
            if (!entry.isFile || !entry.name.endsWith('.json')) continue;
            const record = await readJsonIfExists<ActiveRecord>(join(this.file('active'), entry.name)).catch(() => undefined);
            if (record) records.push(record);
        }
        return records.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    }

    /** Reads one run's active record. */
    public async readActive(runId: string): Promise<ActiveRecord | undefined> {
        return (await this.readActiveRecords()).find((record) => record.runId === runId);
    }

    /** Persists one run's active recovery record. */
    public async writeActive(record: ActiveRecord): Promise<void> {
        await ensureDirectory(this.file('active'));
        await writeJsonAtomic(this.activeFile(record.runId), { ...record, updatedAt: new Date().toISOString() });
    }

    /** Removes one run's active record after its outcome is fully recorded. */
    public async clearActive(runId: string): Promise<void> {
        await rm(this.activeFile(runId), { force: true });
    }

    /**
     * Checkpointed tasks that released execution while waiting for a person (answer or recovery decision), keyed by
     * normalized task name, so independent work can continue (`.ptbk/state/parked/`).
     */
    public async readParked(): Promise<ActiveRecord[]> {
        const records: ActiveRecord[] = [];
        for (const entry of await listDirectory(this.file('parked'))) {
            if (!entry.isFile || !entry.name.endsWith('.json')) continue;
            const record = await readJsonIfExists<ActiveRecord>(join(this.file('parked'), entry.name)).catch(() => undefined);
            if (record) records.push(record);
        }
        return records.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    }

    /** Checkpoints a waiting task and releases its active record (its owned files stay recorded). */
    public async park(record: ActiveRecord): Promise<void> {
        await ensureDirectory(this.file('parked'));
        await writeJsonAtomic(join(this.file('parked'), `${nameKeyPath(record.taskTitle)}.json`), { ...record, updatedAt: new Date().toISOString() });
        await this.clearActive(record.runId);
    }

    /** Rewrites a checkpoint in place (the active record is untouched). */
    public async writeParked(record: ActiveRecord): Promise<void> {
        await ensureDirectory(this.file('parked'));
        await writeJsonAtomic(join(this.file('parked'), `${nameKeyPath(record.taskTitle)}.json`), { ...record, updatedAt: new Date().toISOString() });
    }

    /** Restores a checkpointed task as an active run. */
    public async unpark(record: ActiveRecord): Promise<void> {
        await this.writeActive(record);
        await rm(join(this.file('parked'), `${nameKeyPath(record.taskTitle)}.json`), { force: true });
    }

    /** Removes a checkpoint (its task was acknowledged or disappeared). */
    public async dropParked(taskTitle: string): Promise<void> {
        await rm(join(this.file('parked'), `${nameKeyPath(taskTitle)}.json`), { force: true });
    }

    /** Reads task blockers. */
    public async readBlockers(): Promise<Record<string, TaskBlocker>> {
        return (await readJsonIfExists<Record<string, TaskBlocker>>(this.file('blockers.json'))) ?? {};
    }

    /** Sets or clears a task blocker. */
    public async setBlocker(taskRef: string, blocker: TaskBlocker | undefined): Promise<void> {
        const blockers = await this.readBlockers();
        if (blocker) blockers[taskRef] = blocker;
        else delete blockers[taskRef];
        await writeJsonAtomic(this.file('blockers.json'), blockers);
    }

    /** Reads recurrence activation anchors. */
    public async readActivations(): Promise<Record<string, number>> {
        return (await readJsonIfExists<Record<string, number>>(this.file('activation.json'))) ?? {};
    }

    /** Records an activation anchor once. */
    public async ensureActivation(key: string, at: number): Promise<number> {
        const activations = await this.readActivations();
        if (activations[key] !== undefined) return activations[key]!;
        activations[key] = at;
        await writeJsonAtomic(this.file('activation.json'), activations);
        return at;
    }

    /** Reads goal-discovery state. */
    public async readDiscovery(): Promise<DiscoveryState> {
        return (await readJsonIfExists<DiscoveryState>(this.file('discovery.json'))) ?? { agents: {} };
    }

    /** Persists goal-discovery state. */
    public async writeDiscovery(state: DiscoveryState): Promise<void> {
        await writeJsonAtomic(this.file('discovery.json'), state);
    }

    /** Reads Fixer's health-check bookkeeping. */
    public async readHealth(): Promise<HealthState> {
        return (await readJsonIfExists<HealthState>(this.file('health.json')).catch(() => undefined)) ?? {};
    }

    /** Persists Fixer's health-check bookkeeping. */
    public async writeHealth(state: HealthState): Promise<void> {
        await ensureDirectory(this.directory);
        await writeJsonAtomic(this.file('health.json'), state);
    }

    /** Reads tasks judged to have no compatible execution (task key → reason and the source revision it applies to). */
    public async readRoutingBlocks(): Promise<Record<string, RoutingBlock>> {
        return (await readJsonIfExists<Record<string, RoutingBlock>>(this.file('routing-blocks.json')).catch(() => undefined)) ?? {};
    }

    /** Records (or clears) a judged routing impossibility of one task. */
    public async setRoutingBlock(key: string, block: RoutingBlock | undefined): Promise<void> {
        const blocks = await this.readRoutingBlocks();
        if (block) blocks[key] = block;
        else delete blocks[key];
        await ensureDirectory(this.directory);
        await writeJsonAtomic(this.file('routing-blocks.json'), blocks);
    }

    /** Reads repair-task bookkeeping (condition key → fingerprint of the problem a repair task was created for). */
    public async readRepairs(): Promise<Record<string, RepairRecord>> {
        return (await readJsonIfExists<Record<string, RepairRecord>>(this.file('repairs.json')).catch(() => undefined)) ?? {};
    }

    /** Persists repair-task bookkeeping. */
    public async writeRepairs(repairs: Readonly<Record<string, RepairRecord>>): Promise<void> {
        await ensureDirectory(this.directory);
        await writeJsonAtomic(this.file('repairs.json'), repairs);
    }

    /** Appends a result to the history log. */
    public async appendResult(result: ResultRecord): Promise<void> {
        await ensureDirectory(this.directory);
        await appendFile(this.file('history.jsonl'), `${JSON.stringify(result)}\n`);
    }

    /** Reads the newest results (bounded). */
    public async recentResults(limit = 50): Promise<ResultRecord[]> {
        let text: string;
        try {
            text = await readFile(this.file('history.jsonl'), 'utf8');
        } catch {
            return [];
        }
        const lines = text.trim().split('\n').filter(Boolean).slice(-limit);
        const results: ResultRecord[] = [];
        for (const line of lines) {
            try {
                results.push(JSON.parse(line) as ResultRecord);
            } catch {
                // ignore a torn line
            }
        }
        return results.reverse();
    }

    /** Paths written by this project's explicit no-commit work (project-relative path → hash). */
    public async readOwnedUncommitted(): Promise<Record<string, string | null>> {
        return (await readJsonIfExists<Record<string, string | null>>(this.file('owned-uncommitted.json'))) ?? {};
    }

    /** Records no-commit owned paths. */
    public async addOwnedUncommitted(paths: Readonly<Record<string, string | null>>): Promise<void> {
        const owned = { ...(await this.readOwnedUncommitted()), ...paths };
        await writeJsonAtomic(this.file('owned-uncommitted.json'), owned);
    }

    /** Clears no-commit ownership (after reconciliation). */
    public async clearOwnedUncommitted(): Promise<void> {
        await rm(this.file('owned-uncommitted.json'), { force: true });
    }
}
