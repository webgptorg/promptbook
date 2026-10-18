/**
 * Result of interpreting a date/time boundary.
 *
 * @private shared parsing helper
 */
export type DateTimeParseResult =
    | { readonly ok: true; readonly epochMs: number; readonly explicitOffset: boolean; readonly dateOnly: boolean }
    | { readonly ok: false; readonly reason: string };

/**
 * Accepted shape: `YYYY-MM-DD`, optionally followed by ` ` or `T` and `HH:mm[:ss[.fraction]]`, optionally `Z` or `±HH[:]MM`.
 */
const DATE_TIME_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

/**
 * The time zone of this process (IANA name).
 *
 * @private shared parsing helper
 */
export function systemTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Cache of wall-clock formatters per time zone.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Returns the wall-clock components of an instant in a time zone.
 */
function wallClock(epochMs: number, timeZone: string): [number, number, number, number, number, number] {
    let formatter = formatterCache.get(timeZone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        formatterCache.set(timeZone, formatter);
    }
    const parts = Object.fromEntries(formatter.formatToParts(new Date(epochMs)).map((part) => [part.type, part.value]));
    return [Number(parts.year), Number(parts.month), Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)];
}

/**
 * Offset (ms) of a time zone at an instant: local wall clock minus UTC.
 *
 * @private shared parsing helper
 */
export function timeZoneOffsetMs(epochMs: number, timeZone: string): number {
    const [year, month, day, hour, minute, second] = wallClock(epochMs, timeZone);
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/**
 * Interprets a date/time used by `TASK AFTER`, Markdown time tokens and similar boundaries.
 *
 * Without an explicit offset the time is resolved in `timeZone`. A local time that does not exist (DST gap)
 * or occurs twice (DST overlap) is rejected so that the user supplies an explicit offset.
 *
 * @private shared parsing helper
 */
export function parseDateTime(input: string, timeZone: string = systemTimeZone()): DateTimeParseResult {
    const text = input.trim();
    const match = DATE_TIME_PATTERN.exec(text);
    if (!match) return { ok: false, reason: `"${input}" is not a supported date/time (use YYYY-MM-DD or YYYY-MM-DDTHH:mm[:ss][Z|±HH:MM]).` };
    const [, y, mo, d, h, mi, s, fraction, offset] = match;
    const year = Number(y);
    const month = Number(mo);
    const day = Number(d);
    const hour = Number(h ?? 0);
    const minute = Number(mi ?? 0);
    const second = Number(s ?? 0);
    const milliseconds = fraction ? Math.floor(Number(`0.${fraction}`) * 1000) : 0;
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const check = new Date(utcGuess);
    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day ||
        hour > 23 ||
        minute > 59 ||
        second > 59
    ) {
        return { ok: false, reason: `"${input}" is not a valid calendar date/time.` };
    }
    const dateOnly = h === undefined;
    if (offset) {
        if (offset.toUpperCase() === 'Z') return { ok: true, epochMs: utcGuess + milliseconds, explicitOffset: true, dateOnly };
        const sign = offset.startsWith('-') ? -1 : 1;
        const digits = offset.slice(1).replace(':', '');
        const offsetMs = sign * (Number(digits.slice(0, 2)) * 3_600_000 + Number(digits.slice(2, 4)) * 60_000);
        if (Math.abs(offsetMs) > 18 * 3_600_000) return { ok: false, reason: `"${offset}" is not a valid UTC offset.` };
        return { ok: true, epochMs: utcGuess + milliseconds - offsetMs, explicitOffset: true, dateOnly };
    }
    const candidates = new Set<number>();
    for (const probe of [utcGuess - 86_400_000, utcGuess, utcGuess + 86_400_000]) {
        const candidate = utcGuess - timeZoneOffsetMs(probe, timeZone);
        const [cy, cmo, cd, ch, cmi, cs] = wallClock(candidate, timeZone);
        if (cy === year && cmo === month && cd === day && ch === hour && cmi === minute && cs === second) candidates.add(candidate);
    }
    if (candidates.size === 0) {
        return { ok: false, reason: `"${input}" does not exist in time zone ${timeZone} (daylight-saving gap); add an explicit offset.` };
    }
    if (candidates.size > 1) {
        return { ok: false, reason: `"${input}" is ambiguous in time zone ${timeZone} (daylight-saving overlap); add an explicit offset.` };
    }
    return { ok: true, epochMs: [...candidates][0]! + milliseconds, explicitOffset: false, dateOnly };
}

/**
 * Pads a number with leading zeros.
 */
function pad(value: number, length = 2): string {
    return String(value).padStart(length, '0');
}

/**
 * Formats an instant as ISO-8601 with the time zone's explicit offset, e.g. `2026-10-14T23:45:12+02:00`.
 *
 * @private shared parsing helper
 */
export function formatIsoWithOffset(epochMs: number, timeZone: string = systemTimeZone()): string {
    const [year, month, day, hour, minute, second] = wallClock(epochMs, timeZone);
    const offsetMinutes = Math.round(timeZoneOffsetMs(epochMs, timeZone) / 60_000);
    const sign = offsetMinutes < 0 ? '-' : '+';
    const absolute = Math.abs(offsetMinutes);
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * Formats an instant as a short local time for status views (`23:45` today, otherwise `2026-10-15 09:00`).
 *
 * @private shared parsing helper
 */
export function formatShortTime(epochMs: number, now: number = Date.now(), timeZone: string = systemTimeZone()): string {
    const [year, month, day, hour, minute] = wallClock(epochMs, timeZone);
    const [nowYear, nowMonth, nowDay] = wallClock(now, timeZone);
    const time = `${pad(hour)}:${pad(minute)}`;
    if (year === nowYear && month === nowMonth && day === nowDay) return time;
    return `${year}-${pad(month)}-${pad(day)} ${time}`;
}

/**
 * Compact local timestamp for file names, e.g. `2026-10-14-2345`.
 *
 * @private shared parsing helper
 */
export function fileTimestamp(epochMs: number = Date.now(), timeZone: string = systemTimeZone()): string {
    const [year, month, day, hour, minute] = wallClock(epochMs, timeZone);
    return `${year}-${pad(month)}-${pad(day)}-${pad(hour)}${pad(minute)}`;
}

/**
 * Readable local creation date and time `YYYY-MM-DD HH:MM:SS` (used in generated task/chat names).
 *
 * @private shared parsing helper
 */
export function creationTimestamp(epochMs: number = Date.now(), timeZone: string = systemTimeZone()): string {
    const [year, month, day, hour, minute, second] = wallClock(epochMs, timeZone);
    return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/**
 * Local wall-clock time `HH:MM:SS` for plain event lines.
 *
 * @private shared parsing helper
 */
export function clockTime(epochMs: number = Date.now(), timeZone: string = systemTimeZone()): string {
    const [, , , hour, minute, second] = wallClock(epochMs, timeZone);
    return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
}
