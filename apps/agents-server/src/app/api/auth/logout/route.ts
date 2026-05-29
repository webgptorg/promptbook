import { NextResponse } from 'next/server';
import { clearSession } from '../../../../utils/session';
import { writeShibbolethAuthenticationLog } from '../../../../utils/shibboleth/writeShibbolethAuthenticationLog';

/**
 * Handles post.
 */
export async function POST(request: Request) {
    writeShibbolethAuthenticationLog(request.headers, {
        event: 'logout-route-request',
        pathname: '/api/auth/logout',
        method: request.method,
        hasSessionCookie: (request.headers.get('cookie') || '').includes('sessionToken='),
    });

    await clearSession();
    return NextResponse.json({ success: true });
}
