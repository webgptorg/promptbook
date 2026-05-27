import { createHmac } from 'crypto';
import { cookies, headers } from 'next/headers';
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
};

/**
 * Request details used to decide whether the auth cookie may require HTTPS.
 */
export type SessionCookieSecurityContext = {
    /**
     * Current deployment mode.
     */
    readonly isProduction: boolean;
    /**
     * Raw `Host` header.
     */
    readonly host: string | null;
    /**
     * Raw forwarded host header emitted by the reverse proxy.
     */
    readonly forwardedHost: string | null;
    /**
     * Raw forwarded protocol header emitted by the reverse proxy.
     */
    readonly forwardedProto: string | null;
    /**
     * Comma-separated configured domain list from `SERVERS`.
     */
    readonly configuredServers: string | null | undefined;
    /**
     * Known standalone VPS public IP address.
     */
    readonly publicIpAddress: string | null | undefined;
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
 * Decides whether the session cookie should keep the `Secure` flag for the current request.
 *
 * This keeps production-domain logins protected by HTTPS while allowing the standalone
 * VPS bootstrap flow to authenticate over `http://<IP_ADDRESS>` before any domain exists.
 *
 * @param context - Request and deployment details used for the decision.
 * @returns `true` when the cookie should require HTTPS.
 */
export function shouldUseSecureSessionCookieForRequest(context: SessionCookieSecurityContext): boolean {
    if (!context.isProduction) {
        return false;
    }

    if (parseConfiguredServers(context.configuredServers).length > 0) {
        return true;
    }

    const requestHost = normalizeHost(context.forwardedHost ?? context.host);
    if (!requestHost || !isIpAddressHost(requestHost)) {
        return true;
    }

    const forwardedProtocol = (context.forwardedProto || '').split(',')[0]?.trim().toLowerCase() || '';
    if (forwardedProtocol === 'https') {
        return true;
    }

    const configuredPublicIpAddress = normalizeHost(context.publicIpAddress || '');
    if (configuredPublicIpAddress && requestHost !== configuredPublicIpAddress) {
        return true;
    }

    return false;
}

/**
 * Persists the provided session payload into the signed session cookie.
 *
 * @param user - Session payload to store.
 */
export async function setSession(user: SessionUser) {
    const token = serializeSessionToken(user);
    const secure = await shouldUseSecureSessionCookie();

    (await cookies()).set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure,
        path: '/',
        maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
    });
}

/**
 * Clears the current authenticated session cookie.
 */
export async function clearSession() {
    (await cookies()).delete(SESSION_COOKIE_NAME);
    // Also clear legacy adminToken
    (await cookies()).delete('adminToken');
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

/**
 * Resolves the runtime cookie security decision from the current request headers.
 *
 * @returns `true` when the session cookie should keep the `Secure` flag.
 */
async function shouldUseSecureSessionCookie(): Promise<boolean> {
    const headerStore = await headers();

    return shouldUseSecureSessionCookieForRequest({
        isProduction: process.env.NODE_ENV === 'production',
        host: headerStore.get('host'),
        forwardedHost: headerStore.get('x-forwarded-host'),
        forwardedProto: headerStore.get('x-forwarded-proto'),
        configuredServers: process.env.SERVERS,
        publicIpAddress: process.env.PTBK_PUBLIC_IP_ADDRESS,
    });
}

/**
 * Parses the configured `SERVERS` CSV into non-empty entries.
 *
 * @param configuredServers - Raw environment value.
 * @returns Normalized list of configured domains.
 */
function parseConfiguredServers(configuredServers: string | null | undefined): Array<string> {
    return (configuredServers || '')
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);
}

/**
 * Checks whether a host string points to a raw IPv4 or IPv6 address.
 *
 * @param host - Host header or hostname.
 * @returns `true` when the host is a raw IP address.
 */
function isIpAddressHost(host: string): boolean {
    return /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host) || host.includes(':');
}

/**
 * Removes ports and IPv6 brackets from host-like strings.
 *
 * @param host - Raw host header value.
 * @returns Normalized bare hostname or IP address.
 */
function normalizeHost(host: string | null | undefined): string {
    return (host || '')
        .trim()
        .replace(/^\[(.+)\](?::\d+)?$/u, '$1')
        .replace(/:\d+$/u, '');
}
