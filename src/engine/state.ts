import { appendFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
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
 * Selected execution configuration.
 *
 * @private runtime state
 */
export type RoutingSelection = {
    /** Agent display name. */
    readonly agent: string;
    /** Harness identifier. */
    readonly harness: string;
    /** Requested model (undefined = harness default). */
    readonly model?: string;
    /** Requested thinking level. */
    readonly thinkingLevel?: ThinkingLevel;
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
};

/**
 * Recovery record of the task currently owning execution (`.ptbk/state/active.json`).
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
    /** Pending user request. */
    readonly requestId?: string;
    /** Answered user requests delivered to later attempts. */
    readonly answeredRequests?: readonly string[];
    /** Failure explanation when the phase is `failed`. */
    readonly failure?: string;
    /** Recovery request asking how to continue after a failure. */
    readonly recoveryRequestId?: string;
    /** Feedback for the next attempt. */
    readonly feedback?: string;
    /** Explicit no-commit mode. */
    readonly noCommit: boolean;
    /** Worktree path when isolated. */
    readonly worktree?: string;
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
    /** Trace path. */
    readonly trace?: string;
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

    /** Reads the active recovery record. */
    public async readActive(): Promise<ActiveRecord | undefined> {
        return await readJsonIfExists<ActiveRecord>(this.file('active.json'));
    }

    /** Persists the active recovery record. */
    public async writeActive(record: ActiveRecord): Promise<void> {
        await writeJsonAtomic(this.file('active.json'), { ...record, updatedAt: new Date().toISOString() });
    }

    /** Removes the active record after the task's outcome is fully recorded. */
    public async clearActive(): Promise<void> {
        await rm(this.file('active.json'), { force: true });
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
