import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { verifyPassword } from '../../../../utils/auth';
import {
    AUTHENTICATION_ATTEMPT_PURPOSES,
    recordAuthenticationAttempt,
    resetAuthenticationAttemptRateLimitForTests,
} from '../../../../utils/authenticationAttemptRateLimit';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import { POST } from './route';

jest.mock('../../../../utils/auth', () => ({
    getPasswordValidationMessage: jest.fn(() => null),
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
}));

jest.mock('../../../../utils/getCurrentUser', () => ({
    getCurrentUser: jest.fn(),
}));

/**
 * Mocked password verifier used by the change-password route tests.
 */
const verifyPasswordMock = verifyPassword as jest.MockedFunction<typeof verifyPassword>;

/**
 * Mocked current-user loader used by the change-password route tests.
 */
const getCurrentUserMock = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('POST /api/auth/change-password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetAuthenticationAttemptRateLimitForTests();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns 429 before verifying the current password when the user is rate limited', async () => {
        getCurrentUserMock.mockResolvedValue({
            id: 42,
            username: 'alice',
            isAdmin: false,
            profileImageUrl: null,
        });

        recordAuthenticationAttempt({
            requestIp: '198.51.100.20',
            username: 'alice',
            purpose: AUTHENTICATION_ATTEMPT_PURPOSES.CHANGE_PASSWORD,
            isSuccessful: false,
            nowMs: Date.now(),
        });

        const response = await POST(
            new NextRequest('http://localhost/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: 'wrong-password',
                    newPassword: 'new-secure-password',
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'x-forwarded-for': '198.51.100.20',
                },
            }),
        );

        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toMatch(/^\d+$/);
        await expect(response.json()).resolves.toEqual({
            error: expect.stringContaining('Too many authentication attempts.'),
        });
        expect(verifyPasswordMock).not.toHaveBeenCalled();
    });
});
