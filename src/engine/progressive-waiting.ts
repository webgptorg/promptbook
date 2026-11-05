import { createHash } from 'node:crypto';

/**
 * One minute in milliseconds.
 */
const MINUTE_MS = 60_000;

/**
 * One hour in milliseconds.
 */
const HOUR_MS = 60 * MINUTE_MS;

/**
 * One day in milliseconds.
 */
const DAY_MS = 24 * HOUR_MS;

/**
 * Timing bounds a domain supplies to the shared progressive-waiting (exponential backoff) policy. Intervals follow
 * `min(maximum, initial × multiplier^(round − 1))` with bounded spreading, so they actually grow instead of repeating a
 * short fixed poll forever; at the maximum, checks continue at that bounded cadence while the wait stays relevant.
 *
 * @private progressive waiting
 */
export type WaitingPolicy = {
    /** Domain-appropriate first delay. */
    readonly initialMs: number;
    /** Finite longest delay of the domain. */
    readonly maxMs: number;
    /** Growth factor per round (greater than one). */
    readonly multiplier: number;
    /** Spreading as a fraction of the planned delay (default 0.1 = ±10 %), avoiding synchronized bursts. */
    readonly jitter?: number;
    /**
     * After this many consecutive equivalent outcomes under unchanged conditions (no new evidence), the wait goes
     * straight to the maximum; unchanged unavailable providers never cause paid idle loops.
     */
    readonly equivalentCapAfter?: number;
};

/**
 * Every domain's policy: one engine-owned scheduling rule with domain bounds rather than copied timer logic. Explicit
 * recurring schedules, Health sampling, live transport and successful periodic maintenance keep their own cadence.
 *
 * @private progressive waiting
 */
export const WAITING_POLICIES = {
    /** Responsible-agent relevance checks of outstanding human attention: about a minute first, up to a week. */
    attention: { initialMs: MINUTE_MS, maxMs: 7 * DAY_MS, multiplier: 2 },
    /** Cause-aware rechecks of a failed task after its immediate budgets. */
    taskRecovery: { initialMs: 15 * MINUTE_MS, maxMs: DAY_MS, multiplier: 4, equivalentCapAfter: 2 },
    /** A failed chat reply someone waits for: sooner than a task, capped at an hour. */
    chatReply: { initialMs: MINUTE_MS, maxMs: HOUR_MS, multiplier: 4, equivalentCapAfter: 2 },
    /** Failed generation/persistence of Chatter's brief (its regular cadence is separate). */
    report: { initialMs: 15 * MINUTE_MS, maxMs: DAY_MS, multiplier: 4, equivalentCapAfter: 2 },
    /** Failed Git synchronization (the healthy 60-second cadence is separate). */
    sync: { initialMs: MINUTE_MS, maxMs: 30 * MINUTE_MS, multiplier: 2 },
    /** Recovery after a failed engine update (the successful update-check cadence is separate). */
    updateRecovery: { initialMs: HOUR_MS, maxMs: DAY_MS, multiplier: 3 },
    /** Immediate bounded relaunch burst of a shared browser. */
    browserLaunch: { initialMs: 3_000, maxMs: MINUTE_MS, multiplier: 2, jitter: 0 },
    /** Readiness rechecks while work waits for usable tools (deterministic, never paid). */
    tools: { initialMs: 2 * MINUTE_MS, maxMs: HOUR_MS, multiplier: 2 },
    /** Rechecks of a setup/configuration blocker (file changes wake it sooner). */
    setup: { initialMs: 5 * MINUTE_MS, maxMs: HOUR_MS, multiplier: 2 },
} as const satisfies Record<string, WaitingPolicy>;

/**
 * Names of the shared policies.
 *
 * @private progressive waiting
 */
export type WaitingDomain = keyof typeof WAITING_POLICIES;

/**
 * A policy with a different first delay (fixture/env overrides), keeping the domain's growth and cap.
 *
 * @private progressive waiting
 */
export function withInitialDelay(policy: WaitingPolicy, initialMs: number | undefined): WaitingPolicy {
    return initialMs && Number.isFinite(initialMs) && initialMs > 0 ? { ...policy, initialMs: Math.min(initialMs, policy.maxMs) } : policy;
}

/**
 * Delay before round `round` (1-based) of a progressive wait: exponential with bounded spreading, capped, and the
 * maximum once the same outcome repeated under unchanged conditions.
 *
 * @private progressive waiting
 */
export function progressiveDelay(policy: WaitingPolicy, round: number, options: { readonly equivalent?: number; readonly random?: () => number } = {}): number {
    const multiplier = Math.max(1.0001, policy.multiplier);
    const floor = Math.min(policy.initialMs, policy.maxMs);
    const equivalent = options.equivalent ?? 0;
    const planned = policy.equivalentCapAfter !== undefined && equivalent >= policy.equivalentCapAfter ? policy.maxMs : Math.min(policy.initialMs * multiplier ** Math.max(0, round - 1), policy.maxMs);
    const jitter = Math.max(0, Math.min(0.5, policy.jitter ?? 0.1));
    const spread = planned * (1 - jitter + (options.random ?? Math.random)() * 2 * jitter);
    return Math.round(Math.max(floor, Math.min(spread, policy.maxMs)));
}

/**
 * Persisted progressive wait of one condition: its progression, last outcome and next opportunity. Domains store it
 * with their existing recoverable state; restart restores it without resetting backoff or replaying missed rounds.
 *
 * @private progressive waiting
 */
export type ProgressiveSchedule = {
    /** Rounds scheduled so far. */
    readonly rounds: number;
    /** When this waiting condition began (ISO). */
    readonly since: string;
    /** When this round was scheduled (ISO). */
    readonly scheduledAt: string;
    /** Next check opportunity (ISO). */
    readonly nextAt: string;
    /** The last outcome/cause. */
    readonly cause: string;
    /** Fingerprint of the last outcome together with its conditions. */
    readonly fingerprint: string;
    /** Fingerprint of the conditions alone: a relevant change can bring the check forward. */
    readonly conditions: string;
    /** Consecutive rounds that ended in an equivalent outcome under unchanged conditions. */
    readonly equivalent: number;
};

/**
 * Comparison form of an outcome: equivalent outcomes differ only in counts, times and identifiers.
 */
function outcomeKey(outcome: string): string {
    return outcome
        .toLowerCase()
        .replace(/[0-9a-f]{8,}/g, '#')
        .replace(/\d+/g, '#')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Fingerprint of an outcome together with its conditions: equal fingerprints are an equivalent outcome.
 *
 * @private progressive waiting
 */
export function outcomeFingerprint(outcome: { readonly cause: string; readonly conditions: string }): string {
    return createHash('sha256').update(`${outcomeKey(outcome.cause)}\n${outcome.conditions}`).digest('hex').slice(0, 16);
}

/**
 * The next round of a progressive wait after an unsuccessful check/attempt. Known reset/not-before times take
 * precedence (never earlier), and a useful deadline is not silently missed (never later than it, when still ahead).
 *
 * @private progressive waiting
 */
export function nextProgressiveWait(
    previous: ProgressiveSchedule | undefined,
    outcome: { readonly cause: string; readonly conditions: string },
    policy: WaitingPolicy,
    now: number = Date.now(),
    constraints: { readonly notBefore?: number; readonly deadline?: number; readonly random?: () => number } = {},
): ProgressiveSchedule {
    const fingerprint = outcomeFingerprint(outcome);
    const equivalent = previous?.fingerprint === fingerprint ? previous.equivalent + 1 : 0;
    const rounds = (previous?.rounds ?? 0) + 1;
    let next = now + progressiveDelay(policy, rounds, { equivalent, ...(constraints.random ? { random: constraints.random } : {}) });
    if (constraints.deadline !== undefined && constraints.deadline > now) next = Math.min(next, constraints.deadline);
    if (constraints.notBefore !== undefined && Number.isFinite(constraints.notBefore)) next = Math.max(next, constraints.notBefore);
    return {
        rounds,
        since: previous?.since ?? new Date(now).toISOString(),
        scheduledAt: new Date(now).toISOString(),
        nextAt: new Date(next).toISOString(),
        cause: outcome.cause,
        fingerprint,
        conditions: outcome.conditions,
        equivalent,
    };
}

/**
 * Restores a saved schedule after a restart or clock change: a due (or long overdue) round yields at most **one**
 * currently useful check now, never a catch-up burst of every missed interval; a schedule saved "in the future" of
 * the current clock (the clock moved back) keeps its remaining interval measured from now, bounded by the domain
 * maximum. Rounds and equivalence are retained, so backoff never resets to its fastest cadence.
 *
 * @private progressive waiting
 */
export function restoreProgressiveWait(saved: ProgressiveSchedule, policy: WaitingPolicy, now: number = Date.now()): ProgressiveSchedule {
    const scheduledAt = Date.parse(saved.scheduledAt);
    const nextAt = Date.parse(saved.nextAt);
    if (!Number.isFinite(scheduledAt) || !Number.isFinite(nextAt)) return { ...saved, scheduledAt: new Date(now).toISOString(), nextAt: new Date(now).toISOString() };
    if (scheduledAt > now) {
        const remaining = Math.max(0, Math.min(nextAt - scheduledAt, policy.maxMs));
        return { ...saved, scheduledAt: new Date(now).toISOString(), nextAt: new Date(now + remaining).toISOString() };
    }
    if (nextAt - now > policy.maxMs) return { ...saved, nextAt: new Date(now + policy.maxMs).toISOString() };
    return nextAt < now ? { ...saved, nextAt: new Date(now).toISOString() } : saved;
}

/**
 * Whether relevant evidence may bring a scheduled check forward now: the conditions actually changed, and the round
 * was scheduled at least `minSpacingMs` ago (flapping readiness or a burst of unrelated events cannot create a fast
 * polling burst). Redraws, reads, reconnects and restarts are not evidence and never call this.
 *
 * @private progressive waiting
 */
export function mayBringForward(schedule: Pick<ProgressiveSchedule, 'scheduledAt' | 'conditions'>, conditions: string, minSpacingMs: number, now: number = Date.now()): boolean {
    return schedule.conditions !== conditions && now - Date.parse(schedule.scheduledAt) >= minSpacingMs;
}
