import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    AUTHENTICATION_ATTEMPT_PURPOSES,
    checkAuthenticationAttemptRateLimit,
    createAuthenticationAttemptRateLimitResponse,
    recordAuthenticationAttempt,
    resetAuthenticationAttemptRateLimitForTests,
} from './authenticationAttemptRateLimit';

/**
 * Shared request IP used by authentication attempt limiter tests.
 */
const TEST_REQUEST_IP = '203.0.113.10';

/**
 * Shared username used by authentication attempt limiter tests.
 */
const TEST_USERNAME = 'Admin';

describe('authenticationAttemptRateLimit', () => {
    beforeEach(() => {
        resetAuthenticationAttemptRateLimitForTests();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('applies exponential backoff to repeated failures for the same IP and username', () => {
        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: TEST_REQUEST_IP,
                username: TEST_USERNAME,
                nowMs: 1_000,
            }),
        ).toEqual({ isAllowed: true });

        recordAuthenticationAttempt({
            requestIp: TEST_REQUEST_IP,
            username: TEST_USERNAME,
            purpose: AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN,
            isSuccessful: false,
            nowMs: 1_000,
        });

        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: TEST_REQUEST_IP,
                username: TEST_USERNAME,
                nowMs: 1_000,
            }),
        ).toEqual({
            isAllowed: false,
            reason: 'pair-backoff',
            retryAfterSeconds: 1,
        });

        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: TEST_REQUEST_IP,
                username: TEST_USERNAME,
                nowMs: 2_000,
            }),
        ).toEqual({ isAllowed: true });

        recordAuthenticationAttempt({
            requestIp: TEST_REQUEST_IP,
            username: TEST_USERNAME,
            purpose: AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN,
            isSuccessful: false,
            nowMs: 2_000,
        });

        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: TEST_REQUEST_IP,
                username: TEST_USERNAME,
                nowMs: 2_000,
            }),
        ).toEqual({
            isAllowed: false,
            reason: 'pair-backoff',
            retryAfterSeconds: 2,
        });
    });

    it('clears pair backoff after a successful authentication attempt', () => {
        recordAuthenticationAttempt({
            requestIp: TEST_REQUEST_IP,
            username: TEST_USERNAME,
            purpose: AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN,
            isSuccessful: false,
            nowMs: 1_000,
        });

        recordAuthenticationAttempt({
            requestIp: TEST_REQUEST_IP,
            username: TEST_USERNAME,
            purpose: AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN,
            isSuccessful: true,
            nowMs: 1_100,
        });

        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: TEST_REQUEST_IP,
                username: TEST_USERNAME,
                nowMs: 1_100,
            }),
        ).toEqual({ isAllowed: true });
    });

    it('blocks a username after too many failed attempts across different IP addresses', () => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            recordAuthenticationAttempt({
                requestIp: `203.0.113.${attempt + 1}`,
                username: TEST_USERNAME,
                purpose: AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN,
                isSuccessful: false,
                nowMs: 1_000,
            });
        }

        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: '203.0.113.200',
                username: TEST_USERNAME,
                nowMs: 1_000,
            }),
        ).toEqual({
            isAllowed: false,
            reason: 'username-window',
            retryAfterSeconds: 900,
        });
    });

    it('blocks an IP address after too many failed attempts across different usernames', () => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
            recordAuthenticationAttempt({
                requestIp: TEST_REQUEST_IP,
                username: `user-${attempt + 1}`,
                purpose: AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN,
                isSuccessful: false,
                nowMs: 1_000,
            });
        }

        expect(
            checkAuthenticationAttemptRateLimit({
                requestIp: TEST_REQUEST_IP,
                username: 'another-user',
                nowMs: 1_000,
            }),
        ).toEqual({
            isAllowed: false,
            reason: 'ip-window',
            retryAfterSeconds: 900,
        });
    });

    it('returns a markdown 429 response with Retry-After for rejected attempts', async () => {
        const response = createAuthenticationAttemptRateLimitResponse({
            isAllowed: false,
            reason: 'pair-backoff',
            retryAfterSeconds: 7,
        });

        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('7');
        await expect(response.json()).resolves.toEqual({
            error: 'Too many authentication attempts.\n\nTry again in **7** seconds.',
        });
    });
});
