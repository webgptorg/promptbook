import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { authenticateUserWithRateLimit } from '../../../../utils/authenticateUser';
import { setSession } from '../../../../utils/session';
import { POST } from './route';

jest.mock('../../../../utils/authenticateUser', () => ({
    authenticateUserWithRateLimit: jest.fn(),
}));

jest.mock('../../../../utils/session', () => ({
    setSession: jest.fn(),
}));

/**
 * Mocked rate-limited authentication helper used by the login route tests.
 */
const authenticateUserWithRateLimitMock = authenticateUserWithRateLimit as jest.MockedFunction<
    typeof authenticateUserWithRateLimit
>;

/**
 * Mocked session writer used by the login route tests.
 */
const setSessionMock = setSession as jest.MockedFunction<typeof setSession>;

describe('POST /api/auth/login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sets the session after successful authentication', async () => {
        authenticateUserWithRateLimitMock.mockResolvedValue({
            isRateLimited: false,
            user: {
                username: 'admin',
                isAdmin: true,
                isGlobalAdmin: true,
            },
        });

        const response = await POST(createLoginRequest('admin', 'correct-password'));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(authenticateUserWithRateLimitMock).toHaveBeenCalledWith('admin', 'correct-password', {
            requestIp: '203.0.113.50',
        });
        expect(setSessionMock).toHaveBeenCalledWith({
            username: 'admin',
            isAdmin: true,
            isGlobalAdmin: true,
        });
    });

    it('returns 429 with Retry-After when authentication attempts are rate limited', async () => {
        authenticateUserWithRateLimitMock.mockResolvedValue({
            isRateLimited: true,
            rateLimitRejection: {
                isAllowed: false,
                reason: 'pair-backoff',
                retryAfterSeconds: 4,
            },
            message: 'Too many authentication attempts.',
        });

        const response = await POST(createLoginRequest('admin', 'wrong-password'));

        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('4');
        await expect(response.json()).resolves.toEqual({
            error: 'Too many authentication attempts.\n\nTry again in **4** seconds.',
        });
        expect(setSessionMock).not.toHaveBeenCalled();
    });
});

/**
 * Creates a JSON login request with a deterministic forwarded IP address.
 *
 * @param username - Submitted username.
 * @param password - Submitted password.
 * @returns Login route request.
 */
function createLoginRequest(username: string, password: string): NextRequest {
    return new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '203.0.113.50, 198.51.100.1',
        },
    });
}
