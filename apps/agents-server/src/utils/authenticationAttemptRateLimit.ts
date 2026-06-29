import { NextResponse, type NextRequest } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { getRequestIp } from '../middleware/createMiddlewareRequestContext/getRequestIp';

/**
 * Supported password-checking surfaces protected by the shared authentication attempt limiter.
 *
 * @private internal Agents Server constant
 */
export const AUTHENTICATION_ATTEMPT_PURPOSES = {
    LOGIN: 'login',
    CHANGE_PASSWORD: 'change-password',
} as const;

/**
 * Sliding-window length for failed authentication attempts.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_ATTEMPT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Maximum failed authentication attempts allowed from one IP address inside the sliding window.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_ATTEMPT_MAX_FAILED_ATTEMPTS_PER_IP = 30;

/**
 * Maximum failed authentication attempts allowed against one username inside the sliding window.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_ATTEMPT_MAX_FAILED_ATTEMPTS_PER_USERNAME = 10;

/**
 * Base delay applied after the first failed password check for the same `(IP, username)` pair.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_ATTEMPT_BASE_BACKOFF_MS = 1_000;

/**
 * Maximum exponential backoff applied after repeated failures for the same `(IP, username)` pair.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_ATTEMPT_MAX_BACKOFF_MS = 5 * 60 * 1000;

/**
 * Failed attempt timestamps keyed by normalized request IP address.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_IP_FAILURE_TIMESTAMPS: Map<string, Array<number>> = new Map();

/**
 * Failed attempt timestamps keyed by normalized username.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_USERNAME_FAILURE_TIMESTAMPS: Map<string, Array<number>> = new Map();

/**
 * Failed attempt state keyed by normalized `(IP, username)` pair.
 *
 * @private internal Agents Server constant
 */
const AUTHENTICATION_PAIR_FAILURES: Map<string, AuthenticationPairFailureState> = new Map();

/**
 * Authentication attempt purpose.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptPurpose =
    (typeof AUTHENTICATION_ATTEMPT_PURPOSES)[keyof typeof AUTHENTICATION_ATTEMPT_PURPOSES];

/**
 * Reason why an authentication attempt was temporarily rejected.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRateLimitReason = 'pair-backoff' | 'ip-window' | 'username-window';

/**
 * Stored failure state for one `(IP, username)` pair.
 *
 * @private internal Agents Server type
 */
type AuthenticationPairFailureState = {
    readonly failureTimestampsMs: ReadonlyArray<number>;
    readonly lockedUntilMs: number;
};

/**
 * Successful authentication rate-limit decision.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRateLimitApproval = {
    readonly isAllowed: true;
};

/**
 * Rejected authentication rate-limit decision.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRateLimitRejection = {
    readonly isAllowed: false;
    readonly reason: AuthenticationAttemptRateLimitReason;
    readonly retryAfterSeconds: number;
};

/**
 * Authentication rate-limit decision.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRateLimitDecision =
    | AuthenticationAttemptRateLimitApproval
    | AuthenticationAttemptRateLimitRejection;

/**
 * Input for an authentication attempt rate-limit check.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRateLimitOptions = {
    readonly requestIp: string;
    readonly username: string;
    readonly nowMs?: number;
};

/**
 * Input for recording one authentication attempt outcome.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRecordOptions = {
    readonly requestIp: string;
    readonly username: string;
    readonly purpose: AuthenticationAttemptPurpose;
    readonly isSuccessful: boolean;
    readonly nowMs?: number;
};

/**
 * Input for logging one rate-limited authentication attempt.
 *
 * @private internal Agents Server type
 */
export type AuthenticationAttemptRateLimitedRecordOptions = {
    readonly requestIp: string;
    readonly username: string;
    readonly purpose: AuthenticationAttemptPurpose;
    readonly rejection: AuthenticationAttemptRateLimitRejection;
};

/**
 * Checks whether a password verification attempt is currently allowed.
 *
 * The limiter intentionally keeps in-memory state per server process. It is a
 * route-level defense against online guessing and complements any front-door
 * load balancer or CDN rate limits used by multi-instance deployments.
 *
 * @param options - Authentication attempt identity and optional clock override.
 * @returns Decision describing whether the attempt may proceed.
 *
 * @private internal Agents Server helper
 */
export function checkAuthenticationAttemptRateLimit(
    options: AuthenticationAttemptRateLimitOptions,
): AuthenticationAttemptRateLimitDecision {
    const nowMs = options.nowMs ?? Date.now();
    const normalizedRequestIp = normalizeAuthenticationAttemptBucketPart(options.requestIp);
    const normalizedUsername = normalizeAuthenticationAttemptBucketPart(options.username);
    const pairKey = createAuthenticationPairKey(normalizedRequestIp, normalizedUsername);

    pruneAuthenticationAttemptState(nowMs);

    const pairFailureState = AUTHENTICATION_PAIR_FAILURES.get(pairKey);
    if (pairFailureState && pairFailureState.lockedUntilMs > nowMs) {
        return createAuthenticationAttemptRejection('pair-backoff', pairFailureState.lockedUntilMs - nowMs);
    }

    const ipFailureTimestampsMs = AUTHENTICATION_IP_FAILURE_TIMESTAMPS.get(normalizedRequestIp) || [];
    if (ipFailureTimestampsMs.length >= AUTHENTICATION_ATTEMPT_MAX_FAILED_ATTEMPTS_PER_IP) {
        const oldestRelevantFailureMs = ipFailureTimestampsMs[0]!;
        return createAuthenticationAttemptRejection(
            'ip-window',
            oldestRelevantFailureMs + AUTHENTICATION_ATTEMPT_RATE_LIMIT_WINDOW_MS - nowMs,
        );
    }

    const usernameFailureTimestampsMs = AUTHENTICATION_USERNAME_FAILURE_TIMESTAMPS.get(normalizedUsername) || [];
    if (usernameFailureTimestampsMs.length >= AUTHENTICATION_ATTEMPT_MAX_FAILED_ATTEMPTS_PER_USERNAME) {
        const oldestRelevantFailureMs = usernameFailureTimestampsMs[0]!;
        return createAuthenticationAttemptRejection(
            'username-window',
            oldestRelevantFailureMs + AUTHENTICATION_ATTEMPT_RATE_LIMIT_WINDOW_MS - nowMs,
        );
    }

    return { isAllowed: true };
}

/**
 * Records one completed password verification attempt and logs it for forensics.
 *
 * @param options - Attempt identity, purpose, outcome, and optional clock override.
 *
 * @private internal Agents Server helper
 */
export function recordAuthenticationAttempt(options: AuthenticationAttemptRecordOptions): void {
    const nowMs = options.nowMs ?? Date.now();
    const normalizedRequestIp = normalizeAuthenticationAttemptBucketPart(options.requestIp);
    const normalizedUsername = normalizeAuthenticationAttemptBucketPart(options.username);
    const pairKey = createAuthenticationPairKey(normalizedRequestIp, normalizedUsername);

    pruneAuthenticationAttemptState(nowMs);

    if (options.isSuccessful) {
        AUTHENTICATION_PAIR_FAILURES.delete(pairKey);
        console.info('Authentication attempt succeeded', {
            purpose: options.purpose,
            username: normalizedUsername,
            requestIp: normalizedRequestIp,
        });
        return;
    }

    const pairFailureState = AUTHENTICATION_PAIR_FAILURES.get(pairKey);
    const pairFailureTimestampsMs = pruneFailureTimestamps(
        pairFailureState?.failureTimestampsMs || [],
        nowMs,
    ).concat(nowMs);
    const backoffMs = calculateAuthenticationAttemptBackoffMs(pairFailureTimestampsMs.length);

    AUTHENTICATION_PAIR_FAILURES.set(pairKey, {
        failureTimestampsMs: pairFailureTimestampsMs,
        lockedUntilMs: nowMs + backoffMs,
    });

    appendFailureTimestamp(AUTHENTICATION_IP_FAILURE_TIMESTAMPS, normalizedRequestIp, nowMs);
    appendFailureTimestamp(AUTHENTICATION_USERNAME_FAILURE_TIMESTAMPS, normalizedUsername, nowMs);

    console.warn('Authentication attempt failed', {
        purpose: options.purpose,
        username: normalizedUsername,
        requestIp: normalizedRequestIp,
        consecutiveFailures: pairFailureTimestampsMs.length,
        lockedUntilIso: new Date(nowMs + backoffMs).toISOString(),
    });
}

/**
 * Logs one authentication attempt that was blocked before password verification.
 *
 * @param options - Attempt identity, purpose, and rate-limit rejection.
 *
 * @private internal Agents Server helper
 */
export function recordRateLimitedAuthenticationAttempt(options: AuthenticationAttemptRateLimitedRecordOptions): void {
    const normalizedRequestIp = normalizeAuthenticationAttemptBucketPart(options.requestIp);
    const normalizedUsername = normalizeAuthenticationAttemptBucketPart(options.username);

    console.warn('Authentication attempt rate limited', {
        purpose: options.purpose,
        username: normalizedUsername,
        requestIp: normalizedRequestIp,
        reason: options.rejection.reason,
        retryAfterSeconds: options.rejection.retryAfterSeconds,
    });
}

/**
 * Creates the markdown error message returned to rate-limited authentication callers.
 *
 * @param rejection - Rate-limit rejection details.
 * @returns User-facing markdown error message.
 *
 * @private internal Agents Server helper
 */
export function createAuthenticationAttemptRateLimitErrorMessage(
    rejection: AuthenticationAttemptRateLimitRejection,
): string {
    return spaceTrim(`
        Too many authentication attempts.

        Try again in **${rejection.retryAfterSeconds}** seconds.
    `);
}

/**
 * Creates a standard HTTP 429 response for rate-limited authentication routes.
 *
 * @param rejection - Rate-limit rejection details.
 * @returns JSON response with a `Retry-After` header.
 *
 * @private internal Agents Server helper
 */
export function createAuthenticationAttemptRateLimitResponse(
    rejection: AuthenticationAttemptRateLimitRejection,
): NextResponse {
    return NextResponse.json(
        {
            error: createAuthenticationAttemptRateLimitErrorMessage(rejection),
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(rejection.retryAfterSeconds),
            },
        },
    );
}

/**
 * Resolves the client IP from a route handler request.
 *
 * @param request - Incoming route request.
 * @returns Best-effort request IP.
 *
 * @private internal Agents Server helper
 */
export function resolveAuthenticationAttemptRequestIp(request: NextRequest): string {
    return getRequestIp(request);
}

/**
 * Resolves the client IP from a server action header store.
 *
 * @param headerStore - Request headers available to the server action.
 * @returns Best-effort request IP.
 *
 * @private internal Agents Server helper
 */
export function resolveAuthenticationAttemptHeaderIp(headerStore: { get(name: string): string | null }): string {
    return resolveAuthenticationAttemptForwardedIp(headerStore) || '127.0.0.1';
}

/**
 * Clears in-memory authentication attempt buckets for focused unit tests.
 *
 * @private internal Agents Server test helper
 */
export function resetAuthenticationAttemptRateLimitForTests(): void {
    AUTHENTICATION_IP_FAILURE_TIMESTAMPS.clear();
    AUTHENTICATION_USERNAME_FAILURE_TIMESTAMPS.clear();
    AUTHENTICATION_PAIR_FAILURES.clear();
}

/**
 * Appends a failure timestamp to one sliding-window bucket.
 *
 * @param buckets - Sliding-window buckets.
 * @param bucketKey - Bucket identity.
 * @param nowMs - Current timestamp.
 *
 * @private internal helper of `recordAuthenticationAttempt`
 */
function appendFailureTimestamp(buckets: Map<string, Array<number>>, bucketKey: string, nowMs: number): void {
    const recentTimestampsMs = pruneFailureTimestamps(buckets.get(bucketKey) || [], nowMs).concat(nowMs);
    buckets.set(bucketKey, recentTimestampsMs);
}

/**
 * Removes expired failed-attempt entries from all buckets.
 *
 * @param nowMs - Current timestamp.
 *
 * @private internal helper of `checkAuthenticationAttemptRateLimit`
 */
function pruneAuthenticationAttemptState(nowMs: number): void {
    pruneTimestampBuckets(AUTHENTICATION_IP_FAILURE_TIMESTAMPS, nowMs);
    pruneTimestampBuckets(AUTHENTICATION_USERNAME_FAILURE_TIMESTAMPS, nowMs);

    for (const [pairKey, pairFailureState] of AUTHENTICATION_PAIR_FAILURES.entries()) {
        const failureTimestampsMs = pruneFailureTimestamps(pairFailureState.failureTimestampsMs, nowMs);
        if (failureTimestampsMs.length === 0 && pairFailureState.lockedUntilMs <= nowMs) {
            AUTHENTICATION_PAIR_FAILURES.delete(pairKey);
            continue;
        }

        AUTHENTICATION_PAIR_FAILURES.set(pairKey, {
            failureTimestampsMs,
            lockedUntilMs: pairFailureState.lockedUntilMs,
        });
    }
}

/**
 * Removes expired timestamps from every bucket in a timestamp map.
 *
 * @param buckets - Sliding-window buckets.
 * @param nowMs - Current timestamp.
 *
 * @private internal helper of `pruneAuthenticationAttemptState`
 */
function pruneTimestampBuckets(buckets: Map<string, Array<number>>, nowMs: number): void {
    for (const [bucketKey, timestampsMs] of buckets.entries()) {
        const recentTimestampsMs = pruneFailureTimestamps(timestampsMs, nowMs);
        if (recentTimestampsMs.length === 0) {
            buckets.delete(bucketKey);
            continue;
        }

        buckets.set(bucketKey, recentTimestampsMs);
    }
}

/**
 * Keeps only failed-attempt timestamps inside the configured sliding window.
 *
 * @param timestampsMs - Candidate timestamps.
 * @param nowMs - Current timestamp.
 * @returns Timestamps that still belong to the active window.
 *
 * @private internal helper of `pruneTimestampBuckets`
 */
function pruneFailureTimestamps(timestampsMs: ReadonlyArray<number>, nowMs: number): Array<number> {
    const windowStartMs = nowMs - AUTHENTICATION_ATTEMPT_RATE_LIMIT_WINDOW_MS;
    return timestampsMs.filter((timestampMs) => timestampMs > windowStartMs);
}

/**
 * Calculates exponential backoff duration for one `(IP, username)` pair.
 *
 * @param consecutiveFailureCount - Recent consecutive failure count.
 * @returns Backoff duration in milliseconds.
 *
 * @private internal helper of `recordAuthenticationAttempt`
 */
function calculateAuthenticationAttemptBackoffMs(consecutiveFailureCount: number): number {
    const exponentialBackoffMs =
        AUTHENTICATION_ATTEMPT_BASE_BACKOFF_MS * 2 ** Math.max(0, consecutiveFailureCount - 1);

    return Math.min(AUTHENTICATION_ATTEMPT_MAX_BACKOFF_MS, exponentialBackoffMs);
}

/**
 * Builds a normalized `(IP, username)` pair key.
 *
 * @param normalizedRequestIp - Normalized request IP.
 * @param normalizedUsername - Normalized username.
 * @returns Pair bucket key.
 *
 * @private internal helper of authentication attempt limiter
 */
function createAuthenticationPairKey(normalizedRequestIp: string, normalizedUsername: string): string {
    return `ip:${normalizedRequestIp}|username:${normalizedUsername}`;
}

/**
 * Normalizes one string used in authentication attempt buckets.
 *
 * @param value - Raw bucket value.
 * @returns Normalized non-empty bucket value.
 *
 * @private internal helper of authentication attempt limiter
 */
function normalizeAuthenticationAttemptBucketPart(value: string): string {
    return value.trim().toLowerCase() || '<empty>';
}

/**
 * Converts a retry delay in milliseconds into a rejection result.
 *
 * @param reason - Rejection reason.
 * @param retryAfterMs - Retry delay in milliseconds.
 * @returns Rejection result.
 *
 * @private internal helper of `checkAuthenticationAttemptRateLimit`
 */
function createAuthenticationAttemptRejection(
    reason: AuthenticationAttemptRateLimitReason,
    retryAfterMs: number,
): AuthenticationAttemptRateLimitRejection {
    return {
        isAllowed: false,
        reason,
        retryAfterSeconds: Math.ceil(Math.max(1_000, retryAfterMs) / 1_000),
    };
}

/**
 * Resolves the first `x-forwarded-for` value from a header-like object.
 *
 * @param headerStore - Header-like object.
 * @returns Forwarded IP or `null` when unavailable.
 *
 * @private internal helper of authentication attempt limiter
 */
function resolveAuthenticationAttemptForwardedIp(headerStore: { get(name: string): string | null }): string | null {
    const xForwardedFor = headerStore.get('x-forwarded-for');
    if (!xForwardedFor) {
        return null;
    }

    const forwardedIp = xForwardedFor.split(',')[0];
    return forwardedIp?.trim() || null;
}
