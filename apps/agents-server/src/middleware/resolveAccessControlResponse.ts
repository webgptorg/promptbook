import { NextRequest, NextResponse } from 'next/server';

/**
 * Callback used to apply additional middleware headers before returning a response.
 *
 * @private function of resolveAccessControlResponse
 */
type ApplyResponseHeaders = (response: NextResponse) => Promise<void>;

/**
 * Produces the early middleware response for preflight and restricted-access cases.
 *
 * @param options - Request state and response-header callback.
 * @returns Early response, or `null` when the request may continue.
 * @private function of middleware
 */
export async function resolveAccessControlResponse(options: {
    readonly request: NextRequest;
    readonly isAccessRestricted: boolean;
    readonly applyResponseHeaders: ApplyResponseHeaders;
}): Promise<NextResponse | null> {
    if (options.request.method === 'OPTIONS') {
        return createOptionsResponse();
    }

    if (!options.isAccessRestricted) {
        return null;
    }

    const path = options.request.nextUrl.pathname;

    if (isAllowedPathWhileRestricted(path)) {
        const response = NextResponse.next();
        await options.applyResponseHeaders(response);
        return response;
    }

    if (options.request.headers.get('accept')?.includes('text/html')) {
        const restrictedUrl = options.request.nextUrl.clone();
        restrictedUrl.pathname = '/restricted';
        const response = NextResponse.rewrite(restrictedUrl);
        await options.applyResponseHeaders(response);
        return response;
    }

    const response = new NextResponse('Forbidden', { status: 403 });
    await options.applyResponseHeaders(response);
    return response;
}

/**
 * Creates the global preflight response used by the middleware.
 *
 * @returns Preflight response with permissive CORS headers.
 * @private function of resolveAccessControlResponse
 */
function createOptionsResponse(): NextResponse {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
        },
    });
}

/**
 * Returns whether a path remains available even when IP access is restricted.
 *
 * @param path - Request pathname.
 * @returns `true` when the restricted user may still access the path.
 * @private function of resolveAccessControlResponse
 */
function isAllowedPathWhileRestricted(path: string): boolean {
    return (
        path === '/' ||
        path === '/agents' ||
        path.startsWith('/api/agents') ||
        path.startsWith('/api/federated-agents') ||
        path.startsWith('/api/search') ||
        path.startsWith('/api/auth') ||
        path === '/restricted' ||
        path.startsWith('/docs') ||
        path === '/openapi.json' ||
        path === '/swagger' ||
        path === '/manifest.webmanifest' ||
        path === '/sw.js' ||
        path.startsWith('/system/utilities/mocked-chats/view')
    );
}
