import { NextRequest, NextResponse } from 'next/server';
import { applyVisibilityHeaders } from './middleware/applyVisibilityHeaders';
import { createMiddlewareRequestContext } from './middleware/createMiddlewareRequestContext';
import { resolveAccessControlResponse } from './middleware/resolveAccessControlResponse';
import { resolveMiddlewareResponse } from './middleware/resolveMiddlewareResponse';

/**
 * Main Next.js middleware coordinating request context loading, access control,
 * and routing rewrites while delegating focused details to helper modules.
 *
 * @param request - Incoming middleware request.
 * @returns Middleware response.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
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
         * - api/health (standalone VPS readiness probe)
         * - api/internal (worker/cron routes are authorized separately)
         */
        '/((?!_next/static|_next/image|favicon.ico|logo-|fonts/|robots.txt|api/health|api/internal).*)',
    ],
};
