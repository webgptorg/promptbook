import { parseDateTime } from '../common/time.js';
import type { Task } from './model.js';

/**
 * Scheduling state of a recurring definition.
 *
 * @private recurrence
 */
export type RecurrenceState =
    | { readonly kind: 'due'; readonly slot: number; readonly catchUp: boolean }
    | { readonly kind: 'waiting'; readonly until: number }
    | { readonly kind: 'retired' };

/**
 * Latest time an occurrence of a task ended, successfully or by cancelling that run (unknown stamps are ignored).
 *
 * @private recurrence
 */
export function lastCompletion(task: Task, timeZone: string): number | undefined {
    let latest: number | undefined;
    for (const stamp of task.doneStamps) {
        const parsed = parseDateTime(stamp.split(/\s+/)[0] ?? '', timeZone);
        if (parsed.ok) latest = Math.max(latest ?? parsed.epochMs, parsed.epochMs);
    }
    for (const closed of task.closedOccurrences ?? []) latest = Math.max(latest ?? closed, closed);
    return latest;
}

/**
 * Computes the next occurrence of a recurring task.
 *
 * Slots are `anchor + k × interval`; completion never shifts them. Missed slots coalesce into at most one
 * catch-up occurrence. The anchor is `TASK AFTER`, otherwise the retained activation time.
 *
 * @private recurrence
 */
export function recurrenceState(task: Task, now: number, activation: number, timeZone: string): RecurrenceState {
    if (task.status === 'retired' || task.status === 'cancelled') return { kind: 'retired' };
    const interval = task.repeatMs!;
    const anchor = task.after ?? activation;
    if (now < anchor) return { kind: 'waiting', until: anchor };
    const latestSlotAtOrBefore = (time: number): number => anchor + Math.floor((time - anchor) / interval) * interval;
    const done = lastCompletion(task, timeZone);
    // A reopened occurrence continues its own slot instead of adding another run to the schedule.
    if (task.reopenedOccurrence && done !== undefined) return { kind: 'due', slot: latestSlotAtOrBefore(Math.max(done, anchor)), catchUp: false };
    if (done === undefined || done < anchor) {
        const slot = latestSlotAtOrBefore(now);
        return { kind: 'due', slot, catchUp: slot > anchor };
    }
    const next = latestSlotAtOrBefore(done) + interval;
    if (next > now) return { kind: 'waiting', until: next };
    const slot = latestSlotAtOrBefore(now);
    return { kind: 'due', slot, catchUp: slot > next };
}
