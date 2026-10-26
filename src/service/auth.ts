import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { PtbkError } from '../common/errors.js';

/**
 * Compares credentials without a content-dependent early exit.
 */
function matchesCredential(value: string | undefined, expected: string): boolean {
    if (!value) return false;
    const actual = Buffer.from(value);
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

/**
 * Rejects proxy traffic, DNS rebinding and cross-origin browser requests to the loopback service.
 * Forwarded headers never grant local authority. Both supported hostnames refer to this exact listener.
 *
 * @private local HTTP authentication
 */
export function assertLocalRequest(request: IncomingMessage, port: number): void {
    const host = request.headers.host;
    // Browsers omit the default HTTP port in Host and Origin, even if the reported link includes :80.
    const isLocalHost = host === `127.0.0.1:${port}` || host === `localhost:${port}` || (port === 80 && (host === '127.0.0.1' || host === 'localhost'));
    const expectedOrigin = isLocalHost ? new URL(`http://${host}`).origin : undefined;
    const isLoopback = request.socket.remoteAddress === '127.0.0.1' || request.socket.remoteAddress === '::ffff:127.0.0.1';
    const isForwarded = Object.keys(request.headers).some((name) => name === 'forwarded' || name.startsWith('x-forwarded-'));
    const origin = request.headers.origin;
    const site = request.headers['sec-fetch-site'];
    if (!isLocalHost || !isLoopback || isForwarded || (origin !== undefined && origin !== expectedOrigin) || (site !== undefined && site !== 'same-origin' && site !== 'none')) {
        throw new PtbkError('Only direct same-origin local requests are allowed.', { kind: 'conflict' });
    }
}

/**
 * Authenticates a direct API client using the owner-readable process credential, or the local browser using its
 * per-process CSRF capability. Legacy device cookies and persistent remote tokens have no authority.
 *
 * @private local HTTP authentication
 */
export function authenticateLocalRequest(request: IncomingMessage, apiToken: string, csrfToken: string): 'api' | 'browser' | undefined {
    const authorization = request.headers.authorization;
    if (authorization !== undefined) return matchesCredential(authorization, `Bearer ${apiToken}`) ? 'api' : undefined;
    const csrf = request.headers['x-ptbk-csrf'];
    return typeof csrf === 'string' && matchesCredential(csrf, csrfToken) ? 'browser' : undefined;
}
