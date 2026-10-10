/** Public lifecycle stored in a task source. @private */
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'failed' | 'not-ready';

/** Original Markdown section recorded by a migration. @private */
export interface MigrationOrigin {
    sourcePath: string;
    sectionIndex: number;
    sourceChecksum: string;
    migrationVersion: number;
}

/** Immutable source identity used to reject concurrent edits. @private */
export interface SourceReference {
    format: 'markdown' | 'book';
    path: string;
    relativePath: string;
    sectionIndex: number;
    revision: string;
    sectionRevision?: string;
    projectPath?: string;
    statusLine?: number;
    origin?: MigrationOrigin;
}

/** A parsed task definition, shared by every source adapter. @private */
export interface TaskDefinition {
    id: string;
    title: string;
    payload: string;
    rules: string[];
    status: TaskStatus;
    priority: number;
    agent?: string;
    harness?: string;
    model?: string;
    runners: string[];
    after?: number;
    afterRaw?: string;
    scheduleTimezone?: string;
    repeat?: number;
    scheduleRevision: string;
    source: SourceReference;
    diagnostics: string[];
    metadata?: string[];
}

/** Resolved project and operational paths; no process-wide cwd is needed. @private */
export interface Workspace {
    projectPath: string;
    gitRoot?: string;
    tasksPath: string;
    legacyPath: string;
    statePath: string;
    timezone: string;
}

/** Injected selection context; evaluation has no side effects. @private */
export interface EligibilityContext {
    now: number;
    timezone: string;
    harness?: string;
    model?: string;
    agent?: string;
    agentAliases?: string[];
    minPriority?: number;
    maxPriority?: number;
}

/** Persisted recurrence state accepted by the pure schedule evaluator. @private */
export interface OccurrenceState {
    anchor?: number;
    scheduleRevision?: string;
    lastSlot?: number;
    lastConsumedSlot?: number;
    lastCompletedSlot?: number;
    status?: string;
    nextDue?: number;
    timezone?: string;
    afterRaw?: string;
    blocked?: boolean | string;
    claim?: unknown;
}

/** Selection outcome and optional scheduler wake-up. @private */
export interface EligibilityResult {
    kind: 'ready' | 'waiting-until' | 'blocked' | 'invalid' | 'unsupported' | 'filtered';
    reason: string;
    nextWakeUp?: number;
    dueSlot?: number;
}
