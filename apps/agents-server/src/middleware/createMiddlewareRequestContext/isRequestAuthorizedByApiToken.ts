import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * Options required to validate a bearer API token in middleware.
 *
 * @private function of createMiddlewareRequestContext
 */
type IsRequestAuthorizedByApiTokenOptions = {
    readonly canQueryServerTables: boolean;
    readonly request: NextRequest;
    readonly supabase: SupabaseClient | null;
    readonly tablePrefixForRequest: string;
};

/**
 * Validates a bearer API token against the current server tables.
 *
 * @param options - Token-validation dependencies.
 * @returns `true` when a non-revoked token exists for the request.
 *
 * @private function of createMiddlewareRequestContext
 */
export async function isRequestAuthorizedByApiToken(
    options: IsRequestAuthorizedByApiTokenOptions,
): Promise<boolean> {
    const token = readBearerApiToken(options.request);

    if (!token || !token.startsWith('ptbk_') || !options.supabase || !options.canQueryServerTables) {
        return false;
    }

    try {
        const { data } = await options.supabase
            .from(`${options.tablePrefixForRequest}ApiTokens`)
            .select('id')
            .eq('token', token)
            .eq('isRevoked', false)
            .single();

        return Boolean(data);
    } catch (error) {
        console.error('Error validating token in middleware:', error);
        return false;
    }
}

/**
 * Extracts one bearer token from the request authorization header.
 *
 * @param request - Incoming middleware request.
 * @returns Bearer token or `null` when the header is missing or malformed.
 *
 * @private function of createMiddlewareRequestContext
 */
function readBearerApiToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.split(' ')[1] || null;
}
