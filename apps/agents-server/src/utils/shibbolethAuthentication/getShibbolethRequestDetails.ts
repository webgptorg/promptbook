import type { ShibbolethRequestDetails } from './shibbolethAuthenticationTypes';

/**
 * Extracts audit metadata from an incoming request.
 *
 * @param request - Incoming route-handler request.
 * @returns Request details safe to store in the Shibboleth audit log.
 *
 * @private function of `shibbolethAuthentication`
 */
export function getShibbolethRequestDetails(request: Request): ShibbolethRequestDetails {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;

    return {
        ip,
        userAgent: request.headers.get('user-agent'),
    };
}
