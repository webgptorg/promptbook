import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { CustomDomainResolution } from '../utils/customDomainRouting';
import { isIpAllowed } from '../utils/isIpAllowed';
import type { ServerVisibility } from '../utils/serverVisibility';
import { getMiddlewareSupabase } from './createMiddlewareRequestContext/getMiddlewareSupabase';
import { getRequestIp } from './createMiddlewareRequestContext/getRequestIp';
import { isRequestAuthorizedByApiToken } from './createMiddlewareRequestContext/isRequestAuthorizedByApiToken';
import { loadRegisteredServers } from './createMiddlewareRequestContext/loadRegisteredServers';
import { resolveMiddlewareServerRouting } from './createMiddlewareRequestContext/resolveMiddlewareServerRouting';
import { resolveMiddlewareSettings } from './createMiddlewareRequestContext/resolveMiddlewareSettings';

/**
 * Derived request-scoped middleware context used by the top-level middleware.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareRequestContext = {
    readonly canQueryServerTables: boolean;
    readonly customDomainResolution: CustomDomainResolution | null;
    readonly isAccessRestricted: boolean;
    readonly isEmbeddingAllowed: boolean;
    readonly serverVisibility: ServerVisibility;
    readonly supabase: SupabaseClient | null;
    readonly tablePrefixForRequest: string;
};

/**
 * Builds the derived middleware context needed for access checks and routing.
 *
 * @param request - Incoming middleware request.
 * @returns Request-scoped middleware context.
 *
 * @private function of middleware
 */
export async function createMiddlewareRequestContext(request: NextRequest): Promise<MiddlewareRequestContext> {
    const requestIp = getRequestIp(request);
    const host = request.headers.get('host');
    const supabase = getMiddlewareSupabase();
    const registeredServers = supabase || process.env.SERVERS ? await loadRegisteredServers() : [];
    const { canQueryServerTables, customDomainResolution, tablePrefixForRequest } = await resolveMiddlewareServerRouting(
        {
            host,
            pathname: request.nextUrl.pathname,
            registeredServers,
            supabase,
        },
    );
    const { allowedIps, isEmbeddingAllowed, serverVisibility } = await resolveMiddlewareSettings({
        supabase,
        canQueryServerTables,
        tablePrefixForRequest,
    });
    const isValidToken = await isRequestAuthorizedByApiToken({
        canQueryServerTables,
        request,
        supabase,
        tablePrefixForRequest,
    });
    const isLoggedIn = request.cookies.has('sessionToken');
    const isAccessRestricted = !isIpAllowed(requestIp, allowedIps) && !isLoggedIn && !isValidToken;

    return {
        canQueryServerTables,
        customDomainResolution,
        isAccessRestricted,
        isEmbeddingAllowed,
        serverVisibility,
        supabase,
        tablePrefixForRequest,
    };
}
