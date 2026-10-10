import { createHash } from 'node:crypto';
import type { EligibilityContext, EligibilityResult, OccurrenceState, TaskDefinition } from './domain.js';

/** Millisecond lengths of supported fixed units. */
const UNITS: Record<string, number> = {
    s: 1000, second: 1000, seconds: 1000,
    m: 60000, minute: 60000, minutes: 60000,
    h: 3600000, hour: 3600000, hours: 3600000,
    d: 86400000, day: 86400000, days: 86400000,
    w: 604800000, week: 604800000, weeks: 604800000,
};

/** Parse a positive integer fixed interval, rejecting calendar durations. @private */
export function parseInterval(value: string): number {
    const text = value.trim();
    const simple = /^(?:every\s+)?([1-9]\d*)\s*(s|m|h|d|w|seconds?|minutes?|hours?|days?|weeks?)$/i.exec(text);
    const iso = /^(?:PT([1-9]\d*)([SMH])|P([1-9]\d*)([DW]))$/.exec(text);
    const amount = Number(simple?.[1] ?? iso?.[1] ?? iso?.[3]);
    const unit = (simple?.[2] ?? iso?.[2] ?? iso?.[4] ?? '').toLowerCase();
    const duration = amount * (UNITS[unit] ?? NaN);
    if (!Number.isSafeInteger(duration) || duration <= 0) {
        throw new Error(`Invalid fixed interval ${JSON.stringify(value)}; use 30m, every 2 weeks, PT30M or P7D.`);
    }
    return duration;
}

/** Return local Gregorian components at an instant in an explicit IANA timezone. */
function components(instant: number, timezone: string): number[] {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    return ['year', 'month', 'day', 'hour', 'minute', 'second'].map(
        (key) => Number(parts.find((part) => part.type === key)?.value),
    );
}

/** Construct a UTC instant without JavaScript's special handling of years 0–99. */
function utc(parts: number[], millisecond = 0): number {
    const date = new Date(0);
    date.setUTCFullYear(parts[0]!, parts[1]! - 1, parts[2]!);
    date.setUTCHours(parts[3]!, parts[4]!, parts[5]!, millisecond);
    return date.getTime();
}

/** Parse the documented date grammar, rejecting invalid or ambiguous local times. @private */
export function parseDate(value: string, timezone: string): number {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value.trim());
    if (!match) throw new Error(`Invalid AFTER date ${JSON.stringify(value)}.`);
    const parts = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4] ?? 0), Number(match[5] ?? 0), Number(match[6] ?? 0)];
    const millisecond = Number((match[7] ?? '').padEnd(3, '0'));
    const naive = utc(parts, millisecond);
    const checked = new Date(naive);
    if (parts[0]! < 1 || checked.getUTCFullYear() !== parts[0] || checked.getUTCMonth() + 1 !== parts[1] || checked.getUTCDate() !== parts[2]
        || parts[3]! > 23 || parts[4]! > 59 || parts[5]! > 59) {
        throw new Error(`Invalid calendar date ${JSON.stringify(value)}.`);
    }
    const zone = match[8];
    if (zone) {
        if (zone === 'Z') return naive;
        const hours = Number(zone.slice(1, 3));
        const minutes = Number(zone.slice(4, 6));
        if (hours > 23 || minutes > 59) throw new Error(`Invalid UTC offset in ${JSON.stringify(value)}.`);
        return naive - (zone[0] === '+' ? 1 : -1) * (hours * 60 + minutes) * 60000;
    }
    if (!timezone) throw new Error('A resolved IANA timezone is required for a date without an offset.');
    const offsets = new Set<number>();
    for (let hour = -48; hour <= 48; hour += 6) {
        const sample = naive + hour * 3600000;
        offsets.add(utc(components(sample, timezone)) - sample + millisecond);
    }
    const candidates = [...offsets].map((offset) => naive - offset).filter(
        (candidate) => components(candidate, timezone).every((part, index) => part === parts[index]),
    );
    if (candidates.length !== 1) {
        throw new Error(`${candidates.length ? 'Ambiguous' : 'Nonexistent'} local time ${JSON.stringify(value)} in ${timezone}; provide an explicit UTC offset.`);
    }
    return candidates[0]!;
}

/** Stable semantic schedule identity, independent of spelling and task path. @private */
export function scheduleRevision(after?: number, repeat?: number): string {
    return createHash('sha256').update(JSON.stringify([after ?? null, repeat ?? null])).digest('hex');
}

/** Normalize equivalent local spellings without interpreting them in a timezone. */
function localAfterKey(value?: string): string | undefined {
    if (!value) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(value.trim());
    if (!match) return undefined;
    return `${match[1]}-${match[2]}-${match[3]}T${match[4] ?? '00'}:${match[5] ?? '00'}:${match[6] ?? '00'}.${(match[7] ?? '').padEnd(3, '0')}`;
}

/** Preserve an activated local trigger's timezone while keeping evaluation pure.
 * @private Internal persisted schedule binding.
 */
export function bindSchedule(task: TaskDefinition, state: OccurrenceState | undefined, invocationTimezone: string): TaskDefinition {
    const localKey = localAfterKey(task.afterRaw);
    const priorKey = localAfterKey(state?.afterRaw);
    const timezone = localKey && localKey === priorKey && state?.timezone ? state.timezone : invocationTimezone;
    if (!localKey) return { ...task, scheduleTimezone: timezone };
    try {
        const after = parseDate(task.afterRaw!, timezone);
        return {
            ...task, after, scheduleTimezone: timezone, scheduleRevision: scheduleRevision(after, task.repeat),
            diagnostics: task.diagnostics.filter((message) => !/(?:Ambiguous|Nonexistent) local time/.test(message)),
        };
    } catch { return { ...task, scheduleTimezone: timezone }; }
}

/** Evaluate lifecycle, routing, filters and fixed recurrence without I/O. @private */
export function evaluateEligibility(task: TaskDefinition, context: EligibilityContext, state?: OccurrenceState): EligibilityResult {
    task = bindSchedule(task, state, context.timezone);
    if (task.diagnostics.length) {
        return { kind: task.diagnostics.some((message) => /unsupported/i.test(message)) ? 'unsupported' : 'invalid', reason: task.diagnostics.join('; ') };
    }
    if (task.status !== 'todo') return { kind: 'blocked', reason: `Task status is ${task.status}; explicit review or recovery is required.` };
    if (task.payload.includes('@@@')) return { kind: 'blocked', reason: 'Task contains an authoring placeholder (@@@).' };
    if (state?.claim || state?.blocked || ['failed', 'interrupted', 'recovery-required', 'running', 'claimed', 'checking', 'finalizing'].includes(state?.status ?? '')) {
        return { kind: 'blocked', reason: 'An existing occurrence requires completion or explicit recovery.' };
    }
    if (task.priority < (context.minPriority ?? 0) || task.priority > (context.maxPriority ?? Infinity)) {
        return { kind: 'filtered', reason: 'Priority is outside the inclusive configured range.' };
    }
    const agentNames = [context.agent, ...(context.agentAliases ?? [])].filter((name): name is string => Boolean(name));
    if (task.harness && context.harness && task.harness.toLowerCase() !== context.harness.toLowerCase()) {
        return { kind: 'filtered', reason: `Task requires harness ${task.harness}.` };
    }
    if (task.model && context.model && task.model.toLowerCase() !== context.model.toLowerCase()) {
        return { kind: 'filtered', reason: `Task requires model ${task.model}.` };
    }
    if (task.agent && agentNames.length && !agentNames.some((name) => name.toLowerCase() === task.agent!.toLowerCase())) {
        return { kind: 'filtered', reason: `Task requires agent ${task.agent}.` };
    }
    const routing = [context.harness ?? task.harness, context.model ?? task.model, ...agentNames, !agentNames.length ? task.agent : undefined]
        .filter(Boolean).join('\n').toLowerCase();
    if (task.runners.length && !task.runners.some((token) => routing.includes(token.toLowerCase()))) {
        return { kind: 'filtered', reason: `No RUNNER selector matches (${task.runners.join(' OR ')}).` };
    }
    if (!task.repeat) {
        if (task.after !== undefined && context.now < task.after) return { kind: 'waiting-until', reason: 'The inclusive AFTER boundary has not arrived.', nextWakeUp: task.after };
        return { kind: 'ready', reason: 'Task is ready.', dueSlot: task.after ?? context.now };
    }
    const sameRevision = state?.scheduleRevision === task.scheduleRevision;
    const anchor = task.after ?? (sameRevision ? state?.anchor : undefined);
    if (anchor === undefined) return { kind: 'ready', reason: 'First occurrence is ready; its anchor will be saved when claimed.', dueSlot: context.now };
    if (context.now < anchor) return { kind: 'waiting-until', reason: 'The first recurrence slot has not arrived.', nextWakeUp: anchor };
    const dueSlot = anchor + Math.floor((context.now - anchor) / task.repeat) * task.repeat;
    const consumed = sameRevision ? state?.lastConsumedSlot ?? state?.lastCompletedSlot ?? state?.lastSlot : undefined;
    if (consumed !== undefined && dueSlot <= consumed) {
        const next = consumed + task.repeat;
        return { kind: 'waiting-until', reason: 'The latest due slot has already been consumed.', nextWakeUp: next };
    }
    return { kind: 'ready', reason: 'The latest due recurrence slot is ready; missed slots are coalesced.', dueSlot };
}
