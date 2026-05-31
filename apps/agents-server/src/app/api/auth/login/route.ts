import { authenticateUser } from '../../../../utils/authenticateUser';
import { setSession } from '../../../../utils/session';
import { NextResponse } from 'next/server';
import {
    AUTHENTICATION_METHODS_METADATA_KEY,
    isAuthenticationMethodEnabled,
} from '../../../../constants/authenticationMethods';
import { getMetadata } from '../../../../database/getMetadata';

/**
 * Handles post.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        if (!isAuthenticationMethodEnabled(await getMetadata(AUTHENTICATION_METHODS_METADATA_KEY), 'PASSWORD')) {
            console.info('Password login rejected because PASSWORD authentication is disabled in metadata.');
            return NextResponse.json({ error: 'Password login is disabled on this server' }, { status: 403 });
        }

        const user = await authenticateUser(username, password);

        if (user) {
            await setSession(user);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
