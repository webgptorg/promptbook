import type { AgentsServerSqliteDatabase } from '../../../apps/agents-server/src/database/sqlite/$provideAgentsServerSqliteDatabase';
import { $provideSqliteDatabaseAtPath } from '../../../apps/agents-server/src/database/sqlite/$provideAgentsServerSqliteDatabase';

/** Persistent states distinguish finished implementation from Git integration and ambiguous interrupted execution. */
export type WorkspaceJobStatus = 'ready' | 'blocked' | 'running' | 'completed' | 'failed' | 'recovery';

/** A recorded claim includes the exact Book and PRD snapshot used by this invocation. */
export type WorkspaceJob = {
    readonly id: string;
    readonly path: string;
    readonly section: number;
    readonly priority: number;
    readonly status: WorkspaceJobStatus;
    readonly agentId?: string;
    readonly agentName?: string;
    readonly harness?: string;
    readonly model?: string;
    readonly source?: string;
    readonly prompt?: string;
    readonly reason?: string;
    readonly commit?: string;
    readonly verification?: string;
    readonly updatedAt: string;
};

/** Recoverable file writes retain before/after content, a precise write set and their commit boundary. */
export type WorkspaceMutationRecord = {
    readonly id: string;
    readonly message: string;
    readonly status: 'prepared' | 'saved' | 'committed' | 'failed';
    readonly files: ReadonlyArray<{
        readonly path: string;
        readonly before: string | null;
        readonly after: string | null;
    }>;
    readonly commit?: string;
    readonly reason?: string;
};

/** Durable supervisor state, also consumed by the authenticated execution page and terminal controls. */
export type WorkspaceControl = {
    readonly isPaused: boolean;
    readonly isStopping: boolean;
    readonly synchronization: 'local-only' | 'ready' | 'push-pending' | 'blocked';
    readonly reason?: string;
    readonly lastAgentId?: string;
    readonly nextJobAt?: number;
    readonly isSynchronizationRequested?: boolean;
    readonly isRecoveryRequested?: boolean;
    readonly isCommitSynchronizationRequested?: boolean;
    readonly isWaitingSkipRequested?: boolean;
};

/**
 * Additive workspace schema in the existing per-server SQLite database. No operational data is versioned.
 */
export class WorkspaceState {
    public readonly database: AgentsServerSqliteDatabase;
    public constructor(databasePath: string) {
        this.database = $provideSqliteDatabaseAtPath(databasePath);
        this.database.exec(`
            CREATE TABLE IF NOT EXISTS WorkspaceJob (id TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS WorkspaceMutation (id TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS WorkspaceAgentFile (id TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS WorkspaceObservation (id TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS WorkspaceControl (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
        `);
    }
    /** Returns a durable control snapshot. */
    public getControl(): WorkspaceControl {
        return (
            this.readValues<WorkspaceControl>('WorkspaceControl')[0] ?? {
                isPaused: false,
                isStopping: false,
                synchronization: 'local-only',
            }
        );
    }
    /** Updates control in one SQLite transaction, preserving simultaneous UI and worker changes. */
    public updateControl(changes: Partial<WorkspaceControl>): WorkspaceControl {
        return this.database.transaction(() => {
            const value = { ...this.getControl(), ...changes };
            this.writeValue('WorkspaceControl', '1', value);
            return value;
        })();
    }
    /** Lists current and completed work for inspection. */
    public listJobs(): WorkspaceJob[] {
        return this.readValues<WorkspaceJob>('WorkspaceJob');
    }
    /** Records discovery without overwriting running, completed or ambiguous work. */
    public discoverJob(job: WorkspaceJob): void {
        const previous = this.listJobs().find(({ id }) => id === job.id);
        if (previous && !['ready', 'blocked'].includes(previous.status)) return;
        this.writeValue('WorkspaceJob', job.id, job);
    }
    /** Claims exactly one eligible task with an atomic compare-and-set transaction. */
    public claimJob(id: string, snapshot: Partial<WorkspaceJob>): WorkspaceJob | null {
        return this.database.transaction(() => {
            const job = this.listJobs().find((candidate) => candidate.id === id);
            const control = this.getControl();
            if (!job || job.status !== 'ready' || control.isPaused || control.isStopping) return null;
            const claimed: WorkspaceJob = {
                ...job,
                ...snapshot,
                status: 'running',
                updatedAt: new Date().toISOString(),
            };
            this.writeValue('WorkspaceJob', id, claimed);
            return claimed;
        })();
    }
    /** Persists a completed round or its recoverable failure. */
    public updateJob(id: string, changes: Partial<WorkspaceJob>): void {
        const job = this.listJobs().find((candidate) => candidate.id === id);
        if (job) this.writeValue('WorkspaceJob', id, { ...job, ...changes, updatedAt: new Date().toISOString() });
    }
    /** Reads one private index, journal or state table. Table names are internal constants. */
    public readValues<Value>(
        table:
            | 'WorkspaceAgentFile'
            | 'WorkspaceMutation'
            | 'WorkspaceControl'
            | 'WorkspaceJob'
            | 'WorkspaceObservation',
    ): Value[] {
        return this.database
            .prepare(`SELECT value FROM ${table} ORDER BY rowid`)
            .all()
            .map(({ value }) => JSON.parse(String(value)) as Value);
    }
    /** Saves JSON atomically in an internal table. */
    public writeValue(
        table:
            | 'WorkspaceAgentFile'
            | 'WorkspaceMutation'
            | 'WorkspaceControl'
            | 'WorkspaceJob'
            | 'WorkspaceObservation',
        id: string,
        value: unknown,
    ): void {
        this.database
            .prepare(
                `INSERT INTO ${table} (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value`,
            )
            .run(id, JSON.stringify(value));
    }
}

// Note: [🟡] Workspace state is only published in `@promptbook/cli`.
