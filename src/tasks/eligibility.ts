import { formatShortTime } from '../common/time.js';
import { hasBlockingDiagnostics, isRecurring, type Task } from './model.js';
import { recurrenceState } from './recurrence.js';
import { findTask } from './sources.js';

/**
 * Readiness of one task, shared by list, dry-run, dashboards, API and execution.
 *
 * @private task eligibility
 */
export type Readiness =
    | { readonly kind: 'ready'; readonly slot?: number; readonly reason: string }
    | { readonly kind: 'needs-assignment'; readonly reason: string }
    | { readonly kind: 'assigning'; readonly reason: string; readonly via: string }
    | { readonly kind: 'active'; readonly reason: string }
    | { readonly kind: 'waiting-until'; readonly until: number; readonly reason: string }
    | { readonly kind: 'waiting-dependency'; readonly reason: string; readonly on: readonly string[] }
    | { readonly kind: 'awaiting-user'; readonly reason: string; readonly requestId: string }
    | { readonly kind: 'blocked'; readonly reason: string; readonly next?: string }
    | { readonly kind: 'incompatible'; readonly reason: string }
    | { readonly kind: 'not-ready'; readonly reason: string }
    | { readonly kind: 'placeholder'; readonly reason: string }
    | { readonly kind: 'needs-recovery'; readonly reason: string }
    | { readonly kind: 'failed'; readonly reason: string }
    | { readonly kind: 'done'; readonly reason: string }
    | { readonly kind: 'retired'; readonly reason: string };

/**
 * Routing outcome supplied by the engine (agent resolution and harness availability).
 *
 * @private task eligibility
 */
export type RouteCheck =
    | { readonly kind: 'routable' }
    | { readonly kind: 'needs-assignment'; readonly reason: string }
    | { readonly kind: 'blocked'; readonly reason: string; readonly next?: string }
    | { readonly kind: 'incompatible'; readonly reason: string };

/**
 * Runtime facts used to evaluate readiness.
 *
 * @private task eligibility
 */
export type EligibilityContext = {
    /** Current time. */
    readonly now: number;
    /** Time zone for display. */
    readonly timeZone: string;
    /** Reference of the task currently owning execution. */
    readonly activeRef?: string;
    /** Pending human requests per task reference. */
    readonly awaitingUser: ReadonlyMap<string, string>;
    /** Runtime recovery/failure blockers per task reference. */
    readonly recovery: ReadonlyMap<string, string>;
    /** Task source files that are not committed (only relevant with automatic commits). */
    readonly uncommittedSources: ReadonlySet<string>;
    /** Retained activation time (recurrence anchor) per task reference. */
    readonly activation: (task: Task) => number;
    /** Routing check. */
    readonly route: (task: Task) => Promise<RouteCheck>;
    /** Unfinished Manager assignment task per target reference. */
    readonly assignmentFor: ReadonlyMap<string, string>;
};

/**
 * Whether a prerequisite counts as complete.
 */
function isComplete(task: Task): boolean {
    if (isRecurring(task)) return task.doneStamps.length > 0;
    return task.status === 'done';
}

/**
 * Detects whether a task participates in a dependency cycle.
 */
function inDependencyCycle(start: Task, tasks: readonly Task[]): boolean {
    const visiting = new Set<string>();
    const visit = (task: Task): boolean => {
        if (visiting.has(task.ref)) return task.ref === start.ref;
        visiting.add(task.ref);
        for (const reference of task.dependsOn) {
            const found = findTask(tasks, reference).task;
            if (found && visit(found)) return true;
        }
        visiting.delete(task.ref);
        return false;
    };
    return visit(start);
}

/**
 * Evaluates the readiness of one task.
 *
 * @private task eligibility
 */
export async function evaluateTask(task: Task, tasks: readonly Task[], context: EligibilityContext): Promise<Readiness> {
    if (context.activeRef === task.ref) return { kind: 'active', reason: 'Currently executing.' };
    if (task.status === 'retired') return { kind: 'retired', reason: 'Recurring work retired.' };
    if (task.status === 'done') return { kind: 'done', reason: `Completed ${task.doneStamps[task.doneStamps.length - 1] ?? ''}`.trim() };
    if (hasBlockingDiagnostics(task)) {
        return {
            kind: 'blocked',
            reason: task.diagnostics
                .filter((diagnostic) => diagnostic.severity === 'error')
                .map((diagnostic) => diagnostic.message)
                .join(' '),
            next: `Fix ${task.source.relativePath}.`,
        };
    }
    if (task.placeholder) return { kind: 'placeholder', reason: 'Unwritten placeholder (@@@); write the task before it can run.' };
    if (task.status === 'not-ready') return { kind: 'not-ready', reason: 'Held as not ready.' };
    if (task.status === 'failed') return { kind: 'failed', reason: 'Marked as failed; use `ptbk recover` to retry or acknowledge.' };
    if (task.status === 'needs-recovery') return { kind: 'needs-recovery', reason: 'Interrupted work requires recovery (`ptbk recover`).' };
    const recovery = context.recovery.get(task.ref);
    if (recovery) return { kind: 'needs-recovery', reason: recovery };
    const request = context.awaitingUser.get(task.ref);
    if (request) return { kind: 'awaiting-user', reason: `Waiting for your answer to request ${request}.`, requestId: request };
    const waitingOn: string[] = [];
    for (const reference of task.dependsOn) {
        const found = findTask(tasks, reference);
        if (found.ambiguous) return { kind: 'blocked', reason: `Dependency ${reference} is ambiguous (${found.ambiguous.map((item) => item.source.relativePath).join(', ')}).` };
        if (!found.task) return { kind: 'blocked', reason: `Dependency ${reference} was not found.`, next: 'Fix the TASK DEPENDS ON reference.' };
        if (!isComplete(found.task)) waitingOn.push(found.task.ref);
    }
    if (task.dependsOn.length && inDependencyCycle(task, tasks)) return { kind: 'blocked', reason: 'The task is part of a dependency cycle.', next: 'Remove one TASK DEPENDS ON in the cycle.' };
    if (waitingOn.length) return { kind: 'waiting-dependency', reason: `Waiting for ${waitingOn.join(', ')}.`, on: waitingOn };
    let slot: number | undefined;
    if (isRecurring(task)) {
        const state = recurrenceState(task, context.now, context.activation(task), context.timeZone);
        if (state.kind === 'retired') return { kind: 'retired', reason: 'Recurring work retired.' };
        if (state.kind === 'waiting') return { kind: 'waiting-until', until: state.until, reason: `Next occurrence at ${formatShortTime(state.until, context.now, context.timeZone)}.` };
        slot = state.slot;
    } else if (task.after !== undefined && task.after > context.now) {
        return { kind: 'waiting-until', until: task.after, reason: `Earliest start ${formatShortTime(task.after, context.now, context.timeZone)}.` };
    }
    if (context.uncommittedSources.has(task.source.path)) {
        return {
            kind: 'blocked',
            reason: `The task source ${task.source.relativePath} is not committed.`,
            next: 'Commit it (or create tasks with `ptbk add`, which commits automatically).',
        };
    }
    const assignment = context.assignmentFor.get(task.ref);
    if (assignment) return { kind: 'assigning', reason: `Manager is assigning routing (${assignment}).`, via: assignment };
    const route = await context.route(task);
    if (route.kind === 'needs-assignment') return { kind: 'needs-assignment', reason: route.reason };
    if (route.kind === 'blocked') return { kind: 'blocked', reason: route.reason, next: route.next };
    if (route.kind === 'incompatible') return { kind: 'incompatible', reason: route.reason };
    return { kind: 'ready', slot, reason: slot !== undefined ? 'Occurrence due.' : 'Ready.' };
}

/**
 * A task with its readiness.
 *
 * @private task eligibility
 */
export type EvaluatedTask = { readonly task: Task; readonly readiness: Readiness };

/**
 * Display/selection rank of readiness kinds.
 */
const KIND_RANK: Readonly<Record<Readiness['kind'], number>> = {
    active: 0,
    'awaiting-user': 1,
    ready: 2,
    'needs-assignment': 3,
    assigning: 4,
    'needs-recovery': 5,
    blocked: 6,
    'waiting-dependency': 7,
    'waiting-until': 8,
    incompatible: 9,
    'not-ready': 10,
    placeholder: 11,
    failed: 12,
    done: 13,
    retired: 14,
};

/**
 * Evaluates all tasks and orders them: state, then priority (higher first), then stable source order.
 *
 * @private task eligibility
 */
export async function evaluateQueue(tasks: readonly Task[], context: EligibilityContext): Promise<EvaluatedTask[]> {
    const evaluated: EvaluatedTask[] = [];
    for (const task of tasks) evaluated.push({ task, readiness: await evaluateTask(task, tasks, context) });
    return evaluated.sort(
        (a, b) =>
            KIND_RANK[a.readiness.kind] - KIND_RANK[b.readiness.kind] ||
            b.task.priority.value - a.task.priority.value ||
            a.task.source.order - b.task.source.order,
    );
}

/**
 * Whether a readiness counts as unfinished work (present or future), for goal discovery.
 *
 * @private task eligibility
 */
export function isUnfinished(readiness: Readiness): boolean {
    return !['done', 'retired', 'placeholder'].includes(readiness.kind);
}

/**
 * Selects the next task to work on: the highest-priority ready or assignable task.
 *
 * @private task eligibility
 */
export function selectNext(evaluated: readonly EvaluatedTask[]): EvaluatedTask | undefined {
    const candidates = evaluated.filter((item) => item.readiness.kind === 'ready' || item.readiness.kind === 'needs-assignment');
    return candidates.sort((a, b) => b.task.priority.value - a.task.priority.value || a.task.source.order - b.task.source.order)[0];
}
