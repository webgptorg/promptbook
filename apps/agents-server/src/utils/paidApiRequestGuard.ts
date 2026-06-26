import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { getRequestIp } from '../middleware/createMiddlewareRequestContext/getRequestIp';
import { getSession } from './session';
import { validateApiKey } from './validateApiKey';

/**
 * Categorizes the kind of paid third-party AI call a route performs.
 *
 * Each tier maps to its own per-identity sliding-window budget because the
 * marginal cost (and therefore acceptable rate) differs significantly between
 * speech-to-text, text-to-speech, and image generation.
 *
 * @private internal helper of paid AI proxy routes
 */
export type PaidApiRequestTier = 'AUDIO_TRANSCRIPTION' | 'TEXT_TO_SPEECH' | 'IMAGE_GENERATION';

/**
 * Per-tier rate limit definition.
 *
 * @private internal helper of paid AI proxy routes
 */
type PaidApiRateLimitDefinition = {
    /**
     * Maximum number of paid calls permitted per identity in a single window.
     */
    readonly maxRequestsPerWindow: number;
    /**
     * Length of the sliding window in milliseconds.
     */
    readonly windowMs: number;
};

/**
 * Per-identity, per-tier sliding-window budgets for paid third-party calls.
 *
 * Numbers are intentionally generous for normal interactive UI use while still
 * blocking sustained abuse — e.g. an attacker who has obtained a valid API key
 * or signed-in account cannot loop millions of image generations.
 *
 * @private internal constant of paid AI proxy routes
 */
const PAID_API_RATE_LIMITS: Readonly<Record<PaidApiRequestTier, PaidApiRateLimitDefinition>> = {
    AUDIO_TRANSCRIPTION: { maxRequestsPerWindow: 60, windowMs: 60_000 },
    TEXT_TO_SPEECH: { maxRequestsPerWindow: 60, windowMs: 60_000 },
    IMAGE_GENERATION: { maxRequestsPerWindow: 20, windowMs: 60_000 },
};

/**
 * In-memory map of request timestamps keyed by `tier|identity`.
 *
 * In-memory state is intentional: the sliding window is a defense in depth on
 * top of authentication, and we do not want to add a Redis dependency just for
 * this guard. Operators who run multiple replicas should still configure a
 * front-door rate limiter; this layer prevents single-process abuse.
 *
 * @private internal constant of paid AI proxy routes
 */
const PAID_API_REQUEST_TIMESTAMPS: Map<string, Array<number>> = new Map();

/**
 * Successful guard outcome describing the authenticated identity.
 *
 * @private internal helper of paid AI proxy routes
 */
export type PaidApiRequestGuardSuccess = {
    readonly ok: true;
    /**
     * Stable identity key used for rate limiting and audit logs.
     *
     * Derived from (in order): the signed session username, the bearer API key
     * hash, and finally the request IP for anonymous fallbacks (which should
     * not happen because `authenticatedOnly` rejects them).
     */
    readonly identityKey: string;
};

/**
 * Failure outcome containing the response that should be returned verbatim.
 *
 * @private internal helper of paid AI proxy routes
 */
export type PaidApiRequestGuardFailure = {
    readonly ok: false;
    readonly response: NextResponse;
};

/**
 * Guard outcome returned by `guardPaidApiRequest`.
 *
 * @private internal helper of paid AI proxy routes
 */
export type PaidApiRequestGuardResult = PaidApiRequestGuardSuccess | PaidApiRequestGuardFailure;

/**
 * Combined authentication and per-identity rate-limit check for routes that
 * proxy directly to paid third-party AI providers (OpenAI, ElevenLabs, ...).
 *
 * The guard enforces two invariants in a single place so that every paid
 * endpoint stays consistent (DRY) and no new endpoint accidentally forgets
 * authentication or rate limiting:
 *
 * 1. The caller must be authenticated via a signed session cookie or a valid
 *    `Authorization: Bearer ptbk_...` API key.
 * 2. The caller must stay within the per-tier sliding-window budget defined
 *    in `PAID_API_RATE_LIMITS`.
 *
 * @param request - Incoming HTTP request.
 * @param tier - Paid call category determining the applicable budget.
 * @returns Either `{ ok: true, identityKey }` or `{ ok: false, response }`.
 *
 * @private internal helper of paid AI proxy routes
 */
export async function guardPaidApiRequest(
    request: NextRequest,
    tier: PaidApiRequestTier,
): Promise<PaidApiRequestGuardResult> {
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.isValid) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: {
                        message: apiKeyValidation.error || 'Authentication required',
                        type: 'authentication_error',
                    },
                },
                { status: 401 },
            ),
        };
    }

    const identityKey = await resolvePaidApiIdentityKey(request, apiKeyValidation.token);

    const rateLimitCheck = checkPaidApiRateLimit(tier, identityKey);
    if (!rateLimitCheck.isAllowed) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: {
                        message: spaceTrim(`
                            Rate limit exceeded for paid AI proxy.

                            **Tier:** \`${tier}\`
                            **Limit:** ${rateLimitCheck.maxRequestsPerWindow} requests per ${Math.round(
                            rateLimitCheck.windowMs / 1000,
                        )} seconds.

                            Try again in **${rateLimitCheck.retryAfterSeconds}** seconds.
                        `),
                        type: 'rate_limit_exceeded',
                    },
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimitCheck.retryAfterSeconds),
                    },
                },
            ),
        };
    }

    return { ok: true, identityKey };
}

/**
 * Resolves a stable per-identity key used to bucket rate-limit counts.
 *
 * @param request - Incoming HTTP request.
 * @param apiKeyToken - Optional bearer token recovered by `validateApiKey`.
 * @returns Identity key prefixed with the source kind (`user:`, `apikey:`, or `ip:`).
 *
 * @private internal helper of `guardPaidApiRequest`
 */
async function resolvePaidApiIdentityKey(request: NextRequest, apiKeyToken: string | undefined): Promise<string> {
    const session = await getSession();
    if (session?.username) {
        return `user:${session.username}`;
    }

    if (apiKeyToken) {
        return `apikey:${createHash('sha256').update(apiKeyToken).digest('hex')}`;
    }

    return `ip:${getRequestIp(request)}`;
}

/**
 * Sliding-window rate-limit check shared by all paid AI proxy tiers.
 *
 * @param tier - Paid call category determining the applicable budget.
 * @param identityKey - Stable per-identity key from `resolvePaidApiIdentityKey`.
 * @returns Decision describing whether the request is allowed and, if not, how long to wait.
 *
 * @private internal helper of `guardPaidApiRequest`
 */
function checkPaidApiRateLimit(
    tier: PaidApiRequestTier,
    identityKey: string,
): {
    readonly isAllowed: boolean;
    readonly maxRequestsPerWindow: number;
    readonly windowMs: number;
    readonly retryAfterSeconds: number;
} {
    const { maxRequestsPerWindow, windowMs } = PAID_API_RATE_LIMITS[tier];
    const bucketKey = `${tier}|${identityKey}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const existingTimestamps = PAID_API_REQUEST_TIMESTAMPS.get(bucketKey) || [];
    const recentTimestamps = existingTimestamps.filter((timestamp) => timestamp > windowStart);

    if (recentTimestamps.length >= maxRequestsPerWindow) {
        const oldestRelevantTimestamp = recentTimestamps[0]!;
        const retryAfterMs = Math.max(1_000, oldestRelevantTimestamp + windowMs - now);
        PAID_API_REQUEST_TIMESTAMPS.set(bucketKey, recentTimestamps);
        return {
            isAllowed: false,
            maxRequestsPerWindow,
            windowMs,
            retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
        };
    }

    recentTimestamps.push(now);
    PAID_API_REQUEST_TIMESTAMPS.set(bucketKey, recentTimestamps);

    return {
        isAllowed: true,
        maxRequestsPerWindow,
        windowMs,
        retryAfterSeconds: 0,
    };
}

// Note: [🟢] Code for the Agents Server paid AI request guard should never be published into packages that could be imported into browser environment
