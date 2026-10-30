/**
 * Longest wait taken from a provider's reset message; a later reset (e.g. a monthly quota) is rechecked after this.
 */
const MAX_RESET_MS = 7 * 24 * 3_600_000;

/**
 * Milliseconds of one relative-duration unit (longer spellings first, so `ms` is not read as minutes).
 */
const UNITS: ReadonlyArray<readonly [RegExp, number]> = [
    [/^d(ays?)?$/, 24 * 3_600_000],
    [/^h(ours?|rs?)?$/, 3_600_000],
    [/^ms$/, 1],
    [/^m(in(ute)?s?)?$/, 60_000],
    [/^s(ec(ond)?s?)?$/, 1_000],
];

/**
 * A relative wait after a reset phrase: "try again in 2 days 3 hours 5 minutes", "retry in 41.79s", "1m30s".
 */
const RELATIVE = /(?:try again|retry|resets?|available again)\s+(?:in|after)\s+((?:\d+(?:\.\d+)?\s*(?:days?|d|hours?|hrs?|h|ms|minutes?|mins?|m|seconds?|secs?|s)(?![a-z])[\s,]*(?:and\s+)?)+)/i;

/**
 * One amount and unit of a relative wait.
 */
const RELATIVE_PART = /(\d+(?:\.\d+)?)\s*([a-z]+)/gi;

/**
 * A machine-readable delay: an HTTP `Retry-After` header (seconds) or a Google-style `"retryDelay": "41s"`.
 */
const DELAY_SECONDS = /(?:retry-after:?\s*(\d+(?:\.\d+)?)\b|"?retryDelay"?\s*:\s*"(\d+(?:\.\d+)?)s")/i;

/**
 * Claude Code's older machine-readable form: `Claude AI usage limit reached|<epoch seconds>`.
 */
const EPOCH = /limit reached\|(\d{10})\b/i;

/**
 * An ISO timestamp after a reset phrase.
 */
const ISO = /(?:try again|retry|resets?|available)[^\n]{0,40}?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)/i;

/**
 * A wall-clock reset, optionally with a date and an IANA zone: "resets 3pm", "will reset at 5pm (America/New_York)",
 * "try again at 15:45", "try again at Nov 3rd, 2026 2:28 PM".
 */
const CLOCK = /(?:try again|resets?|available again)\s+(?:at\s+|on\s+)?(?:([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(?:(\d{4}),?\s+)?(?:at\s+)?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*\(([A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+|UTC)\))?/i;

/**
 * English month names by their first three letters.
 */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Calendar fields of an instant as seen in a time zone (the host's own zone when undefined).
 */
function wallClock(epoch: number, zone: string | undefined): { readonly year: number; readonly month: number; readonly day: number; readonly hour: number; readonly minute: number } {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(epoch);
    const field = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return { year: field('year'), month: field('month') - 1, day: field('day'), hour: field('hour'), minute: field('minute') };
}

/**
 * The instant at which a time zone's wall clock shows the given date and time.
 */
function zonedInstant(year: number, month: number, day: number, hour: number, minute: number, zone: string | undefined): number {
    const guess = Date.UTC(year, month, day, hour, minute);
    const seen = wallClock(guess, zone);
    const offset = Date.UTC(seen.year, seen.month, seen.day, seen.hour, seen.minute) - guess;
    return guess - offset;
}

/**
 * The next reset of a wall-clock phrase after `now` (today, else tomorrow, unless a date is given).
 */
function clockReset(match: RegExpExecArray, now: number): number | undefined {
    const [, monthName, dayText, yearText, hourText, minuteText, meridiem, zoneText] = match;
    if (!minuteText && !meridiem) return undefined;
    let hour = Number(hourText);
    const minute = minuteText ? Number(minuteText) : 0;
    if (meridiem) {
        if (hour < 1 || hour > 12) return undefined;
        hour = (hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
    }
    if (hour > 23 || minute > 59) return undefined;
    let zone: string | undefined;
    try {
        zone = zoneText ? new Intl.DateTimeFormat('en-US', { timeZone: zoneText }).resolvedOptions().timeZone : undefined;
    } catch {
        zone = undefined;
    }
    const today = wallClock(now, zone);
    const month = monthName ? MONTHS.indexOf(monthName.slice(0, 3).toLowerCase()) : -1;
    if (monthName && month < 0) return undefined;
    if (monthName) return zonedInstant(yearText ? Number(yearText) : today.year, month, Number(dayText), hour, minute, zone);
    const reset = zonedInstant(today.year, today.month, today.day, hour, minute, zone);
    return reset > now ? reset : zonedInstant(today.year, today.month, today.day + 1, hour, minute, zone);
}

/**
 * When a provider's quota/rate-limit message says the limit resets, as epoch milliseconds: a relative wait ("try
 * again in 2 days 3 hours", "Please try again in 6.5s", `Retry-After: 30`), a wall-clock time with an optional date
 * and zone ("resets 3pm", "will reset at 5pm (America/New_York)", "try again at Nov 3rd, 2026 2:28 PM") or a
 * timestamp (ISO, Claude Code's `limit reached|<epoch>`). Undefined when the message states none or the stated time
 * is not in the future; a reset further than a week away is bounded to a week (it is rechecked then).
 *
 * @private harness execution
 */
export function parseQuotaReset(text: string, now: number = Date.now()): number | undefined {
    const bounded = (reset: number | undefined): number | undefined => (reset === undefined || !Number.isFinite(reset) || reset <= now ? undefined : Math.min(reset, now + MAX_RESET_MS));
    const epoch = EPOCH.exec(text);
    if (epoch) return bounded(Number(epoch[1]) * 1000);
    const relative = RELATIVE.exec(text);
    if (relative) {
        let total = 0;
        for (const [, amount, unit] of relative[1]!.matchAll(RELATIVE_PART)) total += Number(amount) * (UNITS.find(([pattern]) => pattern.test(unit!.toLowerCase()))?.[1] ?? 0);
        if (total > 0) return bounded(now + Math.ceil(total));
    }
    const delay = DELAY_SECONDS.exec(text);
    if (delay) return bounded(now + Math.ceil(Number(delay[1] ?? delay[2]) * 1000));
    const iso = ISO.exec(text);
    if (iso) return bounded(Date.parse(iso[1]!));
    const clock = CLOCK.exec(text);
    if (clock) return bounded(clockReset(clock, now));
    return undefined;
}
