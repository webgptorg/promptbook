import { NextRequest, NextResponse } from 'next/server';
import { RESERVED_PATHS } from '../generated/reservedPaths';
import type { CustomDomainResolution } from '../utils/customDomainRouting';
import { applyEmbeddingHeader } from './applyEmbeddingHeader';

/**
 * Callback used to apply additional middleware headers before returning a response.
 *
 * @private function of resolveMiddlewareResponse
 */
type ApplyResponseHeaders = (response: NextResponse) => Promise<void>;

/**
 * Produces the final middleware response once access control has allowed the request through.
 *
 * @param options - Request state, routing context, and shared header callback.
 * @returns Final middleware response.
 *
 * @private function of middleware
 */
export async function resolveMiddlewareResponse(options: {
    readonly request: NextRequest;
    readonly customDomainResolution: CustomDomainResolution | null;
    readonly isEmbeddingAllowed: boolean;
    readonly applyResponseHeaders: ApplyResponseHeaders;
}): Promise<NextResponse> {
    const rootAgentRedirectResponse = createRootAgentRedirectResponse(options.request);
    if (rootAgentRedirectResponse) {
        await options.applyResponseHeaders(rootAgentRedirectResponse);
        return rootAgentRedirectResponse;
    }

    const customDomainRewriteResponse = createCustomDomainRewriteResponse(
        options.request,
        options.customDomainResolution,
    );
    if (customDomainRewriteResponse) {
        await options.applyResponseHeaders(customDomainRewriteResponse);
        return customDomainRewriteResponse;
    }

    const response = NextResponse.next();
    applyEmbeddingHeader(response, options.request.nextUrl, options.isEmbeddingAllowed);
    await options.applyResponseHeaders(response);
    return response;
}

/**
 * Creates the redirect from `/:agentName` to `/agents/:agentName` when the first path
 * segment is not reserved by the application.
 *
 * @param request - Incoming middleware request.
 * @returns Redirect response, or `null` when the path should not be redirected.
 *
 * @private function of resolveMiddlewareResponse
 */
function createRootAgentRedirectResponse(request: NextRequest): NextResponse | null {
    const pathParts = request.nextUrl.pathname.split('/');
    const potentialAgentName = pathParts[1];

    if (!potentialAgentName || RESERVED_PATHS.includes(potentialAgentName) || potentialAgentName.startsWith('.')) {
        return null;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/agents${request.nextUrl.pathname}`;
    const response = NextResponse.redirect(redirectUrl);

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
}

/**
 * Creates the custom-domain rewrite response when the request host resolves to an agent.
 *
 * @param request - Incoming middleware request.
 * @param customDomainResolution - Resolved custom-domain mapping.
 * @returns Rewrite response, or `null` when no custom-domain mapping exists.
 *
 * @private function of resolveMiddlewareResponse
 */
function createCustomDomainRewriteResponse(
    request: NextRequest,
    customDomainResolution: CustomDomainResolution | null,
): NextResponse | null {
    if (!customDomainResolution) {
        return null;
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${customDomainResolution.agentName}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-promptbook-server', customDomainResolution.server.domain);

    return NextResponse.rewrite(rewriteUrl, {
        request: {
            headers: requestHeaders,
        },
    });
}
