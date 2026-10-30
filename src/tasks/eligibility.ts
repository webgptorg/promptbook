import { formatShortTime } from '../common/time.js';
import { traceBasenameOf, traceDirectoryConflicts } from './identity.js';
import { hasBlockingDiagnostics, isRecurring, type Task } from './model.js';
import { recurrenceState } from './recurrence.js';
import { findTask } from './sources.js';

/**
 * Marker of a checkpointed task waiting for a Wallet login request instead of a chat (never a chat name).
 *
 * @private task eligibility
 */
export const WALLET_WAIT = '\u0000wallet';

/**
 * Readiness of one task, shared by list, dry-run, dashboards, API and execution.
 *
 * @private task eligibility
 */
export type Readiness =
    | { readonly kind: 'ready'; readonly slot?: number; readonly reason: string }
    /** Router must choose; `ahead` marks routing before the task's own start (future, recurring or dependent work). */
    | { readonly kind: 'needs-assignment'; readonly reason: string; readonly ahead?: { readonly until?: number } }
    | { readonly kind: 'assigning'; readonly reason: string; readonly via: string }
    | { readonly kind: 'active'; readonly reason: string }
    | { readonly kind: 'waiting-until'; readonly until: number; readonly reason: string }
    | { readonly kind: 'waiting-dependency'; readonly reason: string; readonly on: readonly string[] }
    | { readonly kind: 'awaiting-user'; readonly reason: string; readonly chat: string }
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
    /** Normalized names of the tasks executing now (several run concurrently). */
    readonly activeKeys?: ReadonlySet<string>;
    /** Chat waiting for the user, per task name key. */
    readonly awaitingUser: ReadonlyMap<string, string>;
    /** Prerequisite tasks a checkpointed run created and waits for, per task name key (it resumes, never restarts). */
    readonly prerequisites?: ReadonlyMap<string, readonly string[]>;
    /** Runtime recovery/failure blockers per task name key. */
    readonly recovery: ReadonlyMap<string, string>;
    /** Task source files that are not committed (only relevant with automatic commits). */
    readonly uncommittedSources: ReadonlySet<string>;
    /** Retained activation time (recurrence anchor) per task name key. */
    readonly activation: (task: Task) => number;
    /** Routing check. */
    readonly route: (task: Task) => Promise<RouteCheck>;
    /** Unfinished Router assignment task per target name key. */
    readonly assignmentFor: ReadonlyMap<string, string>;
    /** Judged routing impossibilities per task name key (they apply while the source is unchanged). */
    readonly routingBlocks?: ReadonlyMap<string, { readonly reason: string; readonly sourceHash: string }>;
    /** Other task sources sharing a source's literal trace directory, per project-relative source path. */
    readonly traceConflicts?: ReadonlyMap<string, readonly string[]>;
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
        if (visiting.has(task.key)) return task.key === start.key;
        visiting.add(task.key);
        for (const reference of task.dependsOn) {
            const found = findTask(tasks, reference).task;
            if (found && visit(found)) return true;
        }
        visiting.delete(task.key);
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
    if (task.shadowedBy) {
        return { kind: 'blocked', reason: `Shadowed: ${task.shadowedBy} wins the same name "${task.title}", so this copy is not a separate task.`, next: 'Rename one of them (Fixer can propose a correction).' };
    }
    if (context.activeKeys?.has(task.key)) return { kind: 'active', reason: 'Currently executing.' };
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
    if (!traceBasenameOf(task.source.relativePath)) {
        return { kind: 'blocked', reason: `The source filename ${task.source.relativePath} cannot name its trace directory.`, next: 'Rename the task source to a readable filename.' };
    }
    const sharing = context.traceConflicts?.get(task.source.relativePath);
    if (sharing?.length) {
        return {
            kind: 'blocked',
            reason: `Its evidence directory traces/${traceBasenameOf(task.source.relativePath)}/ would be shared with ${sharing.join(', ')} (same source basename).`,
            next: 'Rename one of the task sources so each has its own trace directory.',
        };
    }
    if (task.status === 'not-ready') return { kind: 'not-ready', reason: 'Held as not ready.' };
    if (task.status === 'failed') return { kind: 'failed', reason: 'Marked as failed; use `ptbk recover` to retry or acknowledge.' };
    if (task.status === 'needs-recovery') return { kind: 'needs-recovery', reason: 'Interrupted work requires recovery (`ptbk recover`).' };
    const recovery = context.recovery.get(task.key);
    if (recovery) return { kind: 'needs-recovery', reason: recovery };
    const chat = context.awaitingUser.get(task.key);
    if (chat === WALLET_WAIT) return { kind: 'awaiting-user', reason: 'Waiting for a website login the owner adds in the Wallet.', chat };
    if (chat) return { kind: 'awaiting-user', reason: `Waiting for your reply in the chat {${chat}}.`, chat };
    const prerequisites = context.prerequisites?.get(task.key);
    if (prerequisites) {
        // A checkpointed run continues where it stopped once the supporting work it created is complete.
        const unfinished = prerequisites.flatMap((reference) => {
            const found = findTask(tasks, reference).task;
            return found && !isComplete(found) && found.status !== 'retired' && found.status !== 'failed' ? [found.ref] : [];
        });
        return unfinished.length
            ? { kind: 'waiting-dependency', reason: `Checkpointed until its prerequisite ${unfinished.join(', ')} is completed; it then continues where it stopped.`, on: unfinished }
            : { kind: 'waiting-dependency', reason: 'Its prerequisites are settled; it continues where it stopped.', on: [] };
    }
    const waitingOn: string[] = [];
    for (const reference of task.dependsOn) {
        const found = findTask(tasks, reference);
        if (!found.task) return { kind: 'blocked', reason: `Dependency ${reference} was not found.`, next: 'Fix the TASK DEPENDS ON reference (dependencies name tasks).' };
        if (!isComplete(found.task)) waitingOn.push(found.task.ref);
    }
    if (task.dependsOn.length && inDependencyCycle(task, tasks)) return { kind: 'blocked', reason: 'The task is part of a dependency cycle.', next: 'Remove one TASK DEPENDS ON in the cycle.' };
    // A task that cannot run yet may still be routed ahead of its own start (it keeps its date and dependencies).
    let waiting: Extract<Readiness, { kind: 'waiting-until' | 'waiting-dependency' }> | undefined;
    let slot: number | undefined;
    if (waitingOn.length) waiting = { kind: 'waiting-dependency', reason: `Waiting for ${waitingOn.join(', ')}.`, on: waitingOn };
    else if (isRecurring(task)) {
        const state = recurrenceState(task, context.now, context.activation(task), context.timeZone);
        if (state.kind === 'retired') return { kind: 'retired', reason: 'Recurring work retired.' };
        if (state.kind === 'waiting') waiting = { kind: 'waiting-until', until: state.until, reason: `Next occurrence at ${formatShortTime(state.until, context.now, context.timeZone)}.` };
        else slot = state.slot;
    } else if (task.after !== undefined && task.after > context.now) {
        waiting = { kind: 'waiting-until', until: task.after, reason: `Earliest start ${formatShortTime(task.after, context.now, context.timeZone)}.` };
    }
    if (context.uncommittedSources.has(task.source.path)) {
        return (
            waiting ?? {
                kind: 'blocked',
                reason: `The task source ${task.source.relativePath} is not committed.`,
                next: 'Commit it (or create tasks with `ptbk add`, which commits automatically).',
            }
        );
    }
    const block = context.routingBlocks?.get(task.key);
    if (block && block.sourceHash === task.source.fileHash) return { kind: 'blocked', reason: block.reason, next: 'Fixer has a repair task; it is reevaluated when the task source changes.' };
    const assignment = context.assignmentFor.get(task.key);
    if (assignment) return waiting ?? { kind: 'assigning', reason: `Router is assigning routing (${assignment}).`, via: assignment };
    const route = await context.route(task);
    if (route.kind === 'needs-assignment') {
        if (!waiting) return { kind: 'needs-assignment', reason: route.reason };
        return { kind: 'needs-assignment', reason: `${route.reason} Routing ahead of its start (${waiting.reason.replace(/\.$/, '')}).`, ahead: { until: waiting.kind === 'waiting-until' ? waiting.until : undefined } };
    }
    if (route.kind === 'incompatible') return { kind: 'incompatible', reason: route.reason };
    if (waiting) return waiting;
    if (route.kind === 'blocked') return { kind: 'blocked', reason: route.reason, next: route.next };
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
    const withConflicts: EligibilityContext = { ...context, traceConflicts: context.traceConflicts ?? sourceTraceConflicts(tasks) };
    for (const task of tasks) evaluated.push({ task, readiness: await evaluateTask(task, tasks, withConflicts) });
    return evaluated.sort(
        (a, b) =>
            KIND_RANK[a.readiness.kind] - KIND_RANK[b.readiness.kind] ||
            b.task.priority.value - a.task.priority.value ||
            a.task.source.order - b.task.source.order,
    );
}

/**
 * Task sources whose literal trace directories collide (different sources, same basename): each maps to the others.
 *
 * @private task eligibility
 */
export function sourceTraceConflicts(tasks: readonly Task[]): Map<string, string[]> {
    const conflicts = new Map<string, string[]>();
    for (const sources of traceDirectoryConflicts(tasks.map((task) => task.source.relativePath)).values()) {
        for (const source of sources) conflicts.set(source, sources.filter((other) => other !== source));
    }
    return conflicts;
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
 * A selectable task with the priority its work runs at: a ready task its own; routing work the target's effective
 * priority, one numeric step higher when the target could run now.
 *
 * @private task eligibility
 */
export type SelectedTask = EvaluatedTask & { readonly rank: number };

/**
 * Selects the next work: the highest-ranked ready task or Router assignment (see {@link selectCandidates}).
 *
 * @private task eligibility
 */
export function selectNext(evaluated: readonly EvaluatedTask[], now: number = Date.now(), options: { readonly assignable?: boolean } = {}): SelectedTask | undefined {
    return selectCandidates(evaluated, now, options)[0];
}

/**
 * Every claimable work in claim order: ready tasks and Router assignments by rank. Routing ahead of a task's own start
 * waits behind ready work of the same rank and nearer targets come first, so distant routing never delays urgent
 * executable work. The concurrent scheduler claims from the front while capacity and file ownership allow. Execution
 * order never depends on how a viewer sorts its task list.
 *
 * @private task eligibility
 */
export function selectCandidates(evaluated: readonly EvaluatedTask[], now: number = Date.now(), options: { readonly assignable?: boolean } = {}): SelectedTask[] {
    const candidates = evaluated
        .filter((item) => item.readiness.kind === 'ready' || (item.readiness.kind === 'needs-assignment' && options.assignable !== false))
        .map((item) => {
            const ahead = item.readiness.kind === 'needs-assignment' ? item.readiness.ahead : undefined;
            const rank = item.readiness.kind === 'needs-assignment' && !ahead ? item.task.priority.value + 1 : item.task.priority.value;
            // Ready work first among equals, then routing of the nearest future work (unknown times last).
            const tier = ahead ? 1 : 0;
            const distance = ahead ? (ahead.until ?? Number.MAX_SAFE_INTEGER) - now : 0;
            return { item, rank, tier, distance };
        });
    candidates.sort((a, b) => b.rank - a.rank || a.tier - b.tier || a.distance - b.distance || a.item.task.source.order - b.item.task.source.order);
    return candidates.map((candidate) => ({ ...candidate.item, rank: candidate.rank }));
}
