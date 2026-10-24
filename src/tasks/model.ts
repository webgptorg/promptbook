import { UNCONSTRAINED, type ModelConstraint } from '../book/model.js';
import { formatAgentReference, normalizeAgentName } from '../book/references.js';

/**
 * Format of the file that defines a task.
 *
 * @private task model
 */
export type TaskSourceKind = 'book' | 'markdown';

/**
 * Declared (source-level) state of a task, before runtime eligibility.
 *
 * @private task model
 */
export type DeclaredStatus = 'todo' | 'not-ready' | 'failed' | 'retired' | 'done' | 'needs-recovery';

/**
 * A located problem in a task source.
 *
 * @private task model
 */
export type TaskDiagnostic = {
    /** 1-based line in the source file (0 when unknown). */
    readonly line: number;
    /** Explanation. */
    readonly message: string;
    /** Errors block execution. */
    readonly severity: 'error' | 'warning';
};

/**
 * Where a task is defined.
 *
 * @private task model
 */
export type TaskSource = {
    /** Book or Markdown section. */
    readonly kind: TaskSourceKind;
    /** Absolute file path. */
    readonly path: string;
    /** Project-relative POSIX path. */
    readonly relativePath: string;
    /** 1-based section number for Markdown. */
    readonly section?: number;
    /** Identity hash of a Markdown section (content without its control line). */
    readonly sectionHash?: string;
    /** SHA-256 of the whole file when read. */
    readonly fileHash: string;
    /** Order key for stable sorting. */
    readonly order: number;
};

/**
 * Interpreted priority.
 *
 * @private task model
 */
export type TaskPriority = {
    /** Effective numeric rank (higher first). */
    readonly value: number;
    /** Original wording, when given. */
    readonly raw?: string;
    /** Whether the wording was interpreted without Router. */
    readonly resolved: boolean;
};

/**
 * Explicit routing requirements of a task.
 *
 * @private task model
 */
export type TaskRouting = {
    /** Responsible agent reference. */
    readonly agent?: string;
    /** The task's single current MODEL (unconstrained when absent); Router specializes it in place. */
    readonly model: ModelConstraint;
    /** The requirement comes from former `TASK HARNESS`/`TASK MODEL`/`TASK THINKING LEVEL` controls (honored, diagnosed). */
    readonly legacyControls?: boolean;
    /** Opaque any-of selectors (Markdown backtick tokens / TASK RUNNER), never strict model IDs. */
    readonly runners: readonly string[];
};

/**
 * Routing of a task without any explicit requirement.
 *
 * @private task model
 */
export const NO_ROUTING: TaskRouting = { model: UNCONSTRAINED, runners: [] };

/**
 * A bounded unit of work read from a task source.
 *
 * @private task model
 */
export type Task = {
    /** Reference to the task by its name (`{Improve CSV export}` or `@Name`). */
    readonly ref: string;
    /** Normalized name: the task's identity (no separate ID). */
    readonly key: string;
    /** Legacy `TASK ID` / Markdown `ptbk-task-id` value, kept only as historical metadata. */
    readonly legacyId?: string;
    /** Display name: the first nonempty line (not enforced unique; the resolver picks one winner). */
    readonly title: string;
    /** Name of the Book that wins the same normalized name, when this task is shadowed by it. */
    readonly shadowedBy?: string;
    /** Natural-language description. */
    readonly description: string;
    /** Task-local rules. */
    readonly rules: readonly string[];
    /** Definition location. */
    readonly source: TaskSource;
    /** Declared state. */
    readonly status: DeclaredStatus;
    /** Completion stamps (ISO strings or `unknown`). */
    readonly doneStamps: readonly string[];
    /** Interpreted priority. */
    readonly priority: TaskPriority;
    /** Earliest start (epoch ms), when valid. */
    readonly after?: number;
    /** Original `TASK AFTER` text. */
    readonly afterRaw?: string;
    /** Deadline text (informational). */
    readonly due?: string;
    /** Recurrence interval in ms. */
    readonly repeatMs?: number;
    /** Original `TASK REPEAT` text. */
    readonly repeatRaw?: string;
    /** Prerequisite references. */
    readonly dependsOn: readonly string[];
    /** Parent reference. */
    readonly parent?: string;
    /** Routing requirements. */
    readonly routing: TaskRouting;
    /** Provenance. */
    readonly origin?: string;
    /** TASK NOTE texts. */
    readonly notes: readonly string[];
    /** Contains the unwritten-placeholder `@@@`. */
    readonly placeholder: boolean;
    /** Problems in the source. */
    readonly diagnostics: readonly TaskDiagnostic[];
    /** The task's source text (Book file or Markdown section). */
    readonly text: string;
};

/**
 * Whether a task's source has blocking diagnostics.
 *
 * @private task model
 */
export function hasBlockingDiagnostics(task: Task): boolean {
    return task.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

/**
 * Whether a task is recurring.
 *
 * @private task model
 */
export function isRecurring(task: Task): boolean {
    return task.repeatMs !== undefined;
}

/**
 * Descriptive assignment used as the result commit body: description plus task-local rules.
 *
 * @private task model
 */
export function assignmentText(task: Task): string {
    const parts = [task.description.trim()];
    if (task.rules.length) parts.push(task.rules.map((rule) => `RULE ${rule}`).join('\n'));
    return parts.filter(Boolean).join('\n\n');
}

/**
 * Reference to a named Book (`@Name` for one word, `{Name}` otherwise).
 *
 * @private task model
 */
export function nameReference(name: string): string {
    return formatAgentReference(name);
}

/**
 * Normalized name key of a task, agent or chat name (identity comparison).
 *
 * @private task model
 */
export function nameKey(name: string): string {
    return normalizeAgentName(name);
}
