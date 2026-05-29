import { NextRequest, NextResponse } from 'next/server';
import { applyVisibilityHeaders } from './middleware/applyVisibilityHeaders';
import { createMiddlewareRequestContext } from './middleware/createMiddlewareRequestContext';
import { resolveAccessControlResponse } from './middleware/resolveAccessControlResponse';
import { resolveMiddlewareResponse } from './middleware/resolveMiddlewareResponse';
import { writeShibbolethAuthenticationLog } from './utils/shibboleth/writeShibbolethAuthenticationLog';

/**
 * Main Next.js middleware coordinating request context loading, access control,
 * and routing rewrites while delegating focused details to helper modules.
 *
 * @param request - Incoming middleware request.
 * @returns Middleware response.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
    if (shouldLogShibbolethRequestFromMiddleware(request)) {
        writeShibbolethAuthenticationLog(request.headers, {
            event: 'middleware-request',
            pathname: request.nextUrl.pathname,
            method: request.method,
            hasSessionCookie: request.cookies.has('sessionToken'),
        });
    }

    const middlewareRequestContext = await createMiddlewareRequestContext(request);
    const applyResponseHeaders = async (response: NextResponse): Promise<void> => {
        await applyVisibilityHeaders({
            canQueryServerTables: middlewareRequestContext.canQueryServerTables,
            request,
            response,
            serverVisibility: middlewareRequestContext.serverVisibility,
            supabase: middlewareRequestContext.supabase,
            tablePrefixForRequest: middlewareRequestContext.tablePrefixForRequest,
        });
    };
    const accessControlResponse = await resolveAccessControlResponse({
        applyResponseHeaders,
        isAccessRestricted: middlewareRequestContext.isAccessRestricted,
        request,
    });

    if (accessControlResponse) {
        return accessControlResponse;
    }

    return resolveMiddlewareResponse({
        applyResponseHeaders,
        customDomainResolution: middlewareRequestContext.customDomainResolution,
        isEmbeddingAllowed: middlewareRequestContext.isEmbeddingAllowed,
        request,
    });
}

/**
 * Next.js matcher configuration for this middleware.
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - robots.txt (should not block on middleware DB lookups)
         * - public folder
         * - api/internal (worker/cron routes are authorized separately)
         */
        '/((?!_next/static|_next/image|favicon.ico|logo-|fonts/|robots.txt|api/internal).*)',
    ],
};

/**
 * Decides whether the current middleware request should emit Shibboleth diagnostics.
 *
 * We log the first anonymous request plus explicit auth/SAML routes so standalone VPS
 * pm2 logs show the incoming Shibboleth attributes without flooding every authenticated
 * page load once the browser already carries a session cookie.
 *
 * @param request - Incoming middleware request.
 * @returns `true` when the request is useful for Shibboleth diagnostics.
 */
function shouldLogShibbolethRequestFromMiddleware(request: NextRequest): boolean {
    const pathname = request.nextUrl.pathname.toLowerCase();
    const isAuthenticationPath = pathname.startsWith('/api/auth');
    const isShibbolethPath = pathname.includes('shibboleth') || pathname.includes('saml');

    if (isAuthenticationPath || isShibbolethPath) {
        return true;
    }

    return !request.cookies.has('sessionToken');
}
