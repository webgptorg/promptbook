import { createHmac } from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'sessionToken';
const SECRET_KEY = process.env.ADMIN_PASSWORD || 'default-secret-key-change-me';

type SessionUser = {
    username: string;
    isAdmin: boolean;
};

export async function setSession(user: SessionUser) {
    const payload = JSON.stringify(user);
    const signature = createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
    const token = `${Buffer.from(payload).toString('base64')}.${signature}`;

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

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;

    const payload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const expectedSignature = createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    if (signature !== expectedSignature) return null;

    try {
        return JSON.parse(payload) as SessionUser;
    } catch {
        return null;
    }
}
