import { authenticateUserWithRateLimit } from '../../../../utils/authenticateUser';
import {
    createAuthenticationAttemptRateLimitResponse,
    resolveAuthenticationAttemptRequestIp,
} from '../../../../utils/authenticationAttemptRateLimit';
import { setSession } from '../../../../utils/session';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles post.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const authenticationResult = await authenticateUserWithRateLimit(username, password, {
            requestIp: resolveAuthenticationAttemptRequestIp(request),
        });

        if (authenticationResult.isRateLimited) {
            return createAuthenticationAttemptRateLimitResponse(authenticationResult.rateLimitRejection);
        }

        if (authenticationResult.user) {
            await setSession(authenticationResult.user);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
