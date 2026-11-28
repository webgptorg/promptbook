import type { TODO_any } from '@promptbook-local/types';
import type { NextRequest } from 'next/server';

/**
 * Reads the client IP from the request using the same fallback order as before.
 *
 * @param request - Incoming middleware request.
 * @returns Best-effort client IP address.
 *
 * @private function of createMiddlewareRequestContext
 */
export function getRequestIp(request: NextRequest): string {
    let requestIp = (request as TODO_any).ip;
    const xForwardedFor = request.headers.get('x-forwarded-for');

    if (!requestIp && xForwardedFor) {
        const forwardedIp = xForwardedFor.split(',')[0];
        if (forwardedIp) {
            requestIp = forwardedIp.trim();
        }
    }

    return requestIp || '127.0.0.1';
}
