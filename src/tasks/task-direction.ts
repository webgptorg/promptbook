import { parseInterval } from '../common/duration.js';
import { sha256 } from '../common/fs.js';
import { parseDateTime } from '../common/time.js';
import { parseReferenceValue } from '../book/references.js';
import type { BookCommitment, BookDocument } from '../book/parse.js';
import type { DeclaredStatus, TaskChange, TaskChangeScope, TaskDiagnostic } from './model.js';
import { parsePriority } from './priority.js';

/**
 * Scopes of a `TASK CHANGE` amendment.
 *
 * @private task direction
 */
export const TASK_CHANGE_SCOPES: readonly TaskChangeScope[] = ['task', 'occurrence', 'future'];

/**
 * Valid `TASK STATUS` values, written as appended transitions.
 *
 * @private task direction
 */
export const TASK_STATUS_VALUES = ['todo', 'not-ready', 'failed', 'cancelled', 'retired'] as const;

/**
 * Task controls whose effective value is the last valid applicable one in source order.
 */
const LAYERED_CONTROLS = ['TASK AGENT', 'TASK PRIORITY', 'TASK AFTER', 'TASK DUE DATE', 'TASK REPEAT'] as const;

/**
 * Task control whose effective value is layered through `TASK CHANGE`.
 *
 * @private task direction
 */
export type LayeredControl = (typeof LAYERED_CONTROLS)[number];

/**
 * A parsed `TASK CHANGE` or `TASK REOPEN` heading.
 */
type EventHeader = { readonly at: string; readonly epochMs: number; readonly chat?: string };

/**
 * Parses a required timestamp with an explicit timezone and an optional trailing source-chat reference.
 */
function parseEventHeader(keyword: string, timestamp: string, chat: string | undefined, timeZone: string): EventHeader | { readonly error: string } {
    const parsed = parseDateTime(timestamp, timeZone);
    if (!parsed.ok) return { error: `\`${keyword}\` needs a timestamp with an explicit timezone: ${parsed.reason}` };
    if (!parsed.explicitOffset) return { error: `\`${keyword}\` needs a timestamp with an explicit timezone, not "${timestamp}".` };
    if (chat !== undefined && (!/^[@{]/.test(chat) || !parseReferenceValue(chat))) return { error: `\`${keyword}\` may only end with a source-chat reference (@Name or {Full chat name}), not "${chat}".` };
    return { at: timestamp, epochMs: parsed.epochMs, ...(chat ? { chat } : {}) };
}

/**
 * Parses the heading of a `TASK CHANGE <timestamp> <scope> [<chat-reference>]` amendment.
 *
 * @private task direction
 */
export function parseTaskChangeHeader(value: string, timeZone: string): (EventHeader & { readonly scope: TaskChangeScope }) | { readonly error: string } {
    const match = /^(\S+)\s+(\S+)(?:\s+(.+))?$/.exec(value.trim());
    if (!match) return { error: '`TASK CHANGE` needs `<timestamp> <task|occurrence|future> [<chat reference>]`.' };
    const scope = match[2] as TaskChangeScope;
    if (!TASK_CHANGE_SCOPES.includes(scope)) return { error: `\`TASK CHANGE\` scope "${match[2]}" is not one of ${TASK_CHANGE_SCOPES.join(', ')}.` };
    const header = parseEventHeader('TASK CHANGE', match[1]!, match[3]?.trim(), timeZone);
    return 'error' in header ? header : { ...header, scope };
}

/**
 * Parses the heading of a `TASK REOPEN <timestamp> [<chat-reference>]` event.
 *
 * @private task direction
 */
export function parseTaskReopenHeader(value: string, timeZone: string): EventHeader | { readonly error: string } {
    const match = /^(\S+)(?:\s+(.+))?$/.exec(value.trim());
    if (!match) return { error: '`TASK REOPEN` needs `<timestamp> [<chat reference>]`.' };
    return parseEventHeader('TASK REOPEN', match[1]!, match[2]?.trim(), timeZone);
}

/**
 * Explains why a layered control value is not usable, if it is not.
 */
function controlProblem(keyword: LayeredControl, value: string, timeZone: string): string | undefined {
    if (!value.trim()) return `\`${keyword}\` has no value.`;
    if (keyword === 'TASK PRIORITY') return parsePriority(value).error;
    if (keyword === 'TASK AFTER') {
        const parsed = parseDateTime(value, timeZone);
        return parsed.ok ? undefined : `TASK AFTER: ${parsed.reason}`;
    }
    if (keyword === 'TASK DUE DATE') return parseDateTime(value, timeZone).ok ? undefined : `TASK DUE DATE "${value}" is not a valid date.`;
    if (keyword === 'TASK REPEAT') {
        const parsed = parseInterval(value);
        return parsed.ok ? undefined : `TASK REPEAT: ${parsed.reason}`;
    }
    return undefined;
}

/**
 * One typed control value with the source layer it belongs to.
 */
type LayeredValue = {
    readonly commitment: BookCommitment;
    readonly value: string;
    /** Index of the source layer; a `TASK CHANGE`, `TASK REOPEN` or `TASK DONE` begins a new one. */
    readonly layer: number;
    readonly scope: TaskChangeScope;
    /** Work cycle the value was written in. */
    readonly cycle: number;
    /** Epoch of the amendment the value belongs to. */
    readonly at?: number;
};

/**
 * The effective direction of a task reconstructed from its Book in source order.
 *
 * @private task direction
 */
export type TaskDirection = {
    /** Valid amendments in source order. */
    readonly changes: readonly TaskChange[];
    /** Effective value of each layered control (last valid applicable one). */
    readonly controls: Readonly<Partial<Record<LayeredControl, string>>>;
    /** Effective declared status. */
    readonly status: DeclaredStatus;
    /** Scope of the amendment that set the effective status. */
    readonly statusScope?: TaskChangeScope;
    /** Completed cycles so far (every `TASK DONE`). */
    readonly cycle: number;
    /** The work was reopened and has not been completed since. */
    readonly reopened: boolean;
    /** A completed occurrence of a recurring task was reopened and is due again. */
    readonly reopenedOccurrence: boolean;
    /** When an occurrence of a recurring task was closed without success (epoch ms). */
    readonly closedOccurrences: readonly number[];
    /** Problems of the direction history. */
    readonly diagnostics: readonly TaskDiagnostic[];
};

/**
 * Reconstructs a task's effective direction from its Book: amendments, typed controls and DONE/REOPEN/status events in
 * source order. The same pure projection serves reading, scheduling, restart and completion validation, so the effective
 * meaning never depends on a transient process.
 *
 * @private task direction
 */
export function taskDirectionOf(document: BookDocument, timeZone: string): TaskDirection {
    const diagnostics: TaskDiagnostic[] = [];
    const changes: TaskChange[] = [];
    const layered = new Map<LayeredControl, LayeredValue[]>(LAYERED_CONTROLS.map((keyword) => [keyword, []]));
    const statuses: LayeredValue[] = [];
    type Event = { readonly kind: 'done' } | { readonly kind: 'reopen'; readonly occurrence: boolean; readonly line: number } | { readonly kind: 'status'; readonly entry: LayeredValue };
    const events: Event[] = [];
    let layer = 0;
    let scope: TaskChangeScope = 'task';
    let cycle = 0;
    /** The typed controls under a malformed amendment must not take effect silently. */
    let rejectedLayer = false;
    let changeEpoch: number | undefined;
    for (const commitment of document.commitments) {
        const line = commitment.startLine + 1;
        if (commitment.keyword === 'TASK CHANGE') {
            layer++;
            const header = parseTaskChangeHeader(commitment.value, timeZone);
            if ('error' in header) {
                diagnostics.push({ line, message: header.error, severity: 'error' });
                rejectedLayer = true;
                scope = 'task';
                changeEpoch = undefined;
                continue;
            }
            rejectedLayer = false;
            scope = header.scope;
            changeEpoch = header.epochMs;
            const text = commitment.continuation.trim();
            if (!text) {
                diagnostics.push({ line, message: '`TASK CHANGE` has no content: the lines below it must state the requested change.', severity: 'error' });
                continue;
            }
            const identity = `${header.at}|${header.scope}|${header.chat ?? ''}|${text}`;
            const repeats = changes.filter((change) => change.identity === identity).length;
            changes.push({ id: sha256(`${identity}|${repeats}`).slice(0, 16), identity, line, at: header.at, epochMs: header.epochMs, scope: header.scope, ...(header.chat ? { chat: header.chat } : {}), text, cycle });
        } else if (commitment.keyword === 'TASK REOPEN') {
            const header = parseTaskReopenHeader(commitment.value, timeZone);
            if ('error' in header) diagnostics.push({ line, message: header.error, severity: 'error' });
            else events.push({ kind: 'reopen', occurrence: !rejectedLayer && scope === 'occurrence', line });
            layer++;
            scope = 'task';
            rejectedLayer = false;
            changeEpoch = undefined;
        } else if (commitment.keyword === 'TASK DONE') {
            events.push({ kind: 'done' });
            cycle++;
            layer++;
            scope = 'task';
            rejectedLayer = false;
            changeEpoch = undefined;
        } else if (!rejectedLayer) {
            const entry: LayeredValue = { commitment, value: commitment.value, layer, scope, cycle, ...(changeEpoch !== undefined ? { at: changeEpoch } : {}) };
            if (commitment.keyword === 'TASK STATUS') {
                statuses.push(entry);
                events.push({ kind: 'status', entry });
            } else layered.get(commitment.keyword as LayeredControl)?.push(entry);
        }
    }
    const applicable = (entry: LayeredValue): boolean => entry.scope !== 'occurrence' || entry.cycle === cycle;
    const controls: Partial<Record<LayeredControl, string>> = {};
    for (const keyword of LAYERED_CONTROLS) {
        const entries = layered.get(keyword)!;
        let effective: LayeredValue | undefined;
        for (const [index, entry] of entries.entries()) {
            const earlier = entries.slice(0, index).find((other) => other.layer === entry.layer && other.value.trim() !== entry.value.trim());
            // Distinct values in one layer have no chronological change that resolves them.
            if (earlier) diagnostics.push({ line: entry.commitment.startLine + 1, message: `\`${keyword}\` has conflicting values ("${earlier.value}", "${entry.value}"); append a change with \`TASK CHANGE\` to replace a value.`, severity: 'error' });
            if (!applicable(entry)) continue;
            const problem = controlProblem(keyword, entry.value, timeZone);
            if (!problem) effective = entry;
            else {
                const superseded = entries.slice(index + 1).some((later) => applicable(later) && !controlProblem(keyword, later.value, timeZone));
                // An unusable due date is informational; any other unusable value stops the task unless a later one replaces it.
                diagnostics.push({ line: entry.commitment.startLine + 1, message: problem, severity: superseded || keyword === 'TASK DUE DATE' ? 'warning' : 'error' });
                if (keyword === 'TASK DUE DATE' && !effective) effective = entry;
            }
        }
        if (effective) controls[keyword] = effective.value;
    }
    const recurring = controls['TASK REPEAT'] !== undefined;
    const validStatus = (value: string): boolean => (TASK_STATUS_VALUES as readonly string[]).includes(value.trim().toLowerCase());
    for (const [index, entry] of statuses.entries()) {
        if (validStatus(entry.value)) continue;
        const superseded = statuses.slice(index + 1).some((later) => validStatus(later.value));
        diagnostics.push({ line: entry.commitment.startLine + 1, message: `TASK STATUS "${entry.value}" is not one of ${TASK_STATUS_VALUES.join(', ')}.`, severity: superseded ? 'warning' : 'error' });
    }
    const invalidLast = statuses.length > 0 && !validStatus(statuses[statuses.length - 1]!.value);
    // Completion, cancellation and reopening are processed in source order; wall-clock sorting cannot rewrite them.
    let status: (typeof TASK_STATUS_VALUES)[number] = 'todo';
    let statusScope: TaskChangeScope | undefined;
    let statusEvent = -1;
    let doneEvent = -1;
    let closure: 'done' | 'cancelled' | undefined;
    let reopened = false;
    let reopenedOccurrence = false;
    const closedOccurrences: number[] = [];
    for (const [index, event] of events.entries()) {
        if (event.kind === 'done') {
            closure = 'done';
            doneEvent = index;
            reopened = false;
            reopenedOccurrence = false;
        } else if (event.kind === 'reopen') {
            if (recurring) {
                if (event.occurrence) reopenedOccurrence = closure === 'done';
                else diagnostics.push({ line: event.line, message: '`TASK REOPEN` of a recurring task must follow an occurrence-scoped `TASK CHANGE` that selects the occurrence.', severity: 'warning' });
                continue;
            }
            // An already open cycle stays open: reopening records no new closure and needs no second event.
            if (closure) reopened = true;
            closure = undefined;
        } else {
            const { entry } = event;
            const value = entry.value.trim().toLowerCase() as (typeof TASK_STATUS_VALUES)[number];
            if (!validStatus(value) || !applicable(entry)) {
                // A cancelled occurrence has ended even when a later occurrence has begun.
                if (validStatus(value) && recurring && value === 'cancelled' && entry.at !== undefined) closedOccurrences.push(entry.at);
                continue;
            }
            // Cancelling one recurring occurrence closes only that run; the schedule continues.
            if (recurring && entry.scope === 'occurrence' && value === 'cancelled') {
                if (entry.at !== undefined) closedOccurrences.push(entry.at);
                continue;
            }
            status = value;
            statusScope = entry.scope === 'task' ? undefined : entry.scope;
            statusEvent = index;
            if (value === 'cancelled' && !recurring) closure = 'cancelled';
        }
    }
    const effective = ((): DeclaredStatus => {
        if (invalidLast && status === 'todo') return 'not-ready';
        if (recurring) return status;
        // A closed cycle stays closed for `todo`; only a later REOPEN begins another one.
        if (closure === 'cancelled' && status === 'todo') return 'cancelled';
        // The later of a completion and a blocking status decides: a stale status cannot erase a later success.
        if (closure === 'done' && (status === 'todo' || doneEvent > statusEvent)) return 'done';
        return status;
    })();
    return {
        changes,
        controls,
        status: effective,
        ...(statusScope ? { statusScope } : {}),
        cycle,
        reopened,
        reopenedOccurrence,
        closedOccurrences,
        diagnostics,
    };
}

/**
 * The amendments that apply to a task's current work: task-wide ones always, occurrence ones only until that occurrence
 * ended, and future ones only for runs that began after them.
 *
 * @private task direction
 */
export function applicableChanges(task: { readonly changes: readonly TaskChange[]; readonly cycle: number }, run: { readonly startedAt?: number } = {}): TaskChange[] {
    return task.changes.filter((change) => {
        if (change.scope === 'occurrence') return change.cycle === task.cycle;
        if (change.scope === 'future') return change.cycle < task.cycle || run.startedAt === undefined || change.epochMs <= run.startedAt;
        return true;
    });
}
