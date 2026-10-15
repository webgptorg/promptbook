/**
 * Milliseconds per supported fixed unit.
 */
const UNIT_MILLISECONDS: Readonly<Record<string, number>> = {
    ms: 1,
    millisecond: 1,
    milliseconds: 1,
    s: 1000,
    sec: 1000,
    secs: 1000,
    second: 1000,
    seconds: 1000,
    m: 60_000,
    min: 60_000,
    mins: 60_000,
    minute: 60_000,
    minutes: 60_000,
    h: 3_600_000,
    hr: 3_600_000,
    hrs: 3_600_000,
    hour: 3_600_000,
    hours: 3_600_000,
    d: 86_400_000,
    day: 86_400_000,
    days: 86_400_000,
    w: 604_800_000,
    wk: 604_800_000,
    week: 604_800_000,
    weeks: 604_800_000,
};

/**
 * Calendar units that are not fixed intervals.
 */
const CALENDAR_UNITS = /^(mo|mon|month|months|y|yr|yrs|year|years)$/i;

/**
 * Single-word interval aliases.
 */
const WORD_INTERVALS: Readonly<Record<string, number>> = {
    hourly: 3_600_000,
    daily: 86_400_000,
    weekly: 604_800_000,
};

/**
 * Upper bound guarding against overflowing intervals (100 years).
 */
const MAX_DURATION_MS = 100 * 365 * 86_400_000;

/**
 * Result of parsing a duration.
 *
 * @private shared parsing helper
 */
export type DurationParseResult = { readonly ok: true; readonly ms: number } | { readonly ok: false; readonly reason: string };

/**
 * Parses an ISO-8601 duration restricted to fixed units (weeks, days, hours, minutes, seconds).
 */
function parseIsoDuration(text: string): DurationParseResult {
    const match = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(text);
    if (!match || text.toUpperCase() === 'P' || text.toUpperCase().endsWith('T')) return { ok: false, reason: `"${text}" is not a valid ISO-8601 duration.` };
    const [, weeks, years, months, days, hours, minutes, seconds] = match;
    if (years || months) return { ok: false, reason: 'Calendar months and years are not fixed intervals; use days or weeks.' };
    const ms =
        Number(weeks ?? 0) * UNIT_MILLISECONDS.w! +
        Number(days ?? 0) * UNIT_MILLISECONDS.d! +
        Number(hours ?? 0) * UNIT_MILLISECONDS.h! +
        Number(minutes ?? 0) * UNIT_MILLISECONDS.m! +
        Number(seconds ?? 0) * UNIT_MILLISECONDS.s!;
    return { ok: true, ms: Math.round(ms) };
}

/**
 * Parses a duration such as `0`, `30m`, `1h30m`, `7d`, `every 2 weeks`, `P1W` or `daily`.
 *
 * A plain number means seconds. Calendar months/years are rejected because they are not fixed intervals.
 *
 * @private shared parsing helper
 */
export function parseDuration(input: string): DurationParseResult {
    const text = input.trim();
    if (!text) return { ok: false, reason: 'The duration is empty.' };
    if (/^p/i.test(text) && !/\s/.test(text)) return checkBounds(parseIsoDuration(text));
    let body = text.toLowerCase().replace(/^every\s+/, '');
    if (WORD_INTERVALS[body] !== undefined) return { ok: true, ms: WORD_INTERVALS[body]! };
    if (/^\d+(?:\.\d+)?$/.test(body)) return checkBounds({ ok: true, ms: Math.round(Number(body) * 1000) });
    if (/^[a-z]+$/.test(body)) body = `1 ${body}`;
    const pattern = /(\d+(?:\.\d+)?)\s*([a-z]+)\s*,?\s*(?:and\s+)?/gy;
    let total = 0;
    let consumed = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
        const [, amount, unit] = match;
        if (CALENDAR_UNITS.test(unit!)) return { ok: false, reason: 'Calendar months and years are not fixed intervals; use days or weeks.' };
        const multiplier = UNIT_MILLISECONDS[unit!];
        if (multiplier === undefined) return { ok: false, reason: `Unknown duration unit "${unit}".` };
        total += Number(amount) * multiplier;
        consumed = pattern.lastIndex;
    }
    if (consumed !== body.length) return { ok: false, reason: `"${input}" is not a valid duration (examples: 30m, 1h30m, 7d, every 2 weeks, P1W).` };
    return checkBounds({ ok: true, ms: Math.round(total) });
}

/**
 * Rejects overflowing durations.
 */
function checkBounds(result: DurationParseResult): DurationParseResult {
    if (!result.ok) return result;
    if (!Number.isFinite(result.ms) || result.ms > MAX_DURATION_MS) return { ok: false, reason: 'The duration is too large.' };
    return result;
}

/**
 * Parses a strictly positive recurrence interval.
 *
 * @private shared parsing helper
 */
export function parseInterval(input: string): DurationParseResult {
    const result = parseDuration(input);
    if (result.ok && result.ms <= 0) return { ok: false, reason: 'A recurrence interval must be positive.' };
    return result;
}

/**
 * Formats milliseconds as a compact human duration (`1h 30m`, `45s`, `0s`).
 *
 * @private shared parsing helper
 */
export function formatDuration(ms: number): string {
    if (!Number.isFinite(ms)) return 'unknown';
    const negative = ms < 0;
    let rest = Math.round(Math.abs(ms) / 1000);
    if (rest === 0) return ms === 0 ? '0s' : '<1s';
    const parts: string[] = [];
    const units: Array<[string, number]> = [
        ['w', 604_800],
        ['d', 86_400],
        ['h', 3600],
        ['m', 60],
        ['s', 1],
    ];
    for (const [label, seconds] of units) {
        if (rest >= seconds) {
            parts.push(`${Math.floor(rest / seconds)}${label}`);
            rest %= seconds;
        }
        if (parts.length === 2) break;
    }
    return `${negative ? '-' : ''}${parts.join(' ')}`;
}
