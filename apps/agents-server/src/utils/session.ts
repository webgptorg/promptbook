import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';

/**
 * Cookie name used to store the signed user session.
 */
export const SESSION_COOKIE_NAME = 'sessionToken';

/**
 * Secret key used for signing session payloads.
 */
const SECRET_KEY = process.env.ADMIN_PASSWORD || 'default-secret-key-change-me';

/**
 * Signed session payload persisted in the authentication cookie.
 */
export type SessionUser = {
    /**
     * Authenticated username.
     */
    readonly username: string;
    /**
     * Whether the current session has admin access inside the active server.
     */
    readonly isAdmin: boolean;
    /**
     * Whether the session belongs to the environment-backed super-admin.
     */
    readonly isGlobalAdmin?: boolean;
    /**
     * Optional same-instance server override selected by the super-admin.
     */
    readonly activeServerId?: number | null;
};

/**
 * Signs a session payload and serializes it into the cookie token format.
 *
 * @param user - Session payload to sign.
 * @returns Signed token value.
 */
export function serializeSessionToken(user: SessionUser): string {
    const payload = JSON.stringify(user);
    const signature = createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
    return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

/**
 * Parses and verifies a signed session token.
 *
 * @param token - Raw cookie token.
 * @returns Verified session payload or `null` when invalid.
 */
export function parseSessionToken(token: string | null | undefined): SessionUser | null {
    if (!token) {
        return null;
    }

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
        return null;
    }

    const payload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const expectedSignature = createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    if (signature !== expectedSignature) {
        return null;
    }

    try {
        const parsed = JSON.parse(payload) as SessionUser;
        if (typeof parsed.username !== 'string' || typeof parsed.isAdmin !== 'boolean') {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

/**
 * Persists the provided session payload into the signed session cookie.
 *
 * @param user - Session payload to store.
 */
export async function setSession(user: SessionUser) {
    const token = serializeSessionToken(user);

    (await cookies()).set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
    });
}

export async function clearSession() {
    (await cookies()).delete(SESSION_COOKIE_NAME);
    // Also clear legacy adminToken
    (await cookies()).delete('adminToken');
}

/**
 * Updates the active same-instance server override in the current session.
 *
 * @param activeServerId - Selected server identifier, or `null` to clear the override.
 * @returns Updated session or `null` when the request is anonymous.
 */
export async function setSessionActiveServerId(activeServerId: number | null): Promise<SessionUser | null> {
    const currentSession = await getSession();
    if (!currentSession) {
        return null;
    }

    const nextSession: SessionUser = {
        ...currentSession,
        activeServerId,
    };
    await setSession(nextSession);
    return nextSession;
}

/**
 * Resolves and verifies the session cookie for the current request.
 *
 * @returns Signed session payload or `null` when the request is anonymous.
 */
const getCachedSession = cache(async (): Promise<SessionUser | null> => {
    const cookieStore = await cookies();
    return parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
});

/**
 * Returns the authenticated session for the current request.
 *
 * @returns Signed session payload or `null` when the request is anonymous.
 */
export async function getSession(): Promise<SessionUser | null> {
    return getCachedSession();
}
