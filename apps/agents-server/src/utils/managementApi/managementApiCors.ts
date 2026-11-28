import { getMetadata } from '../../database/getMetadata';

/**
 * Supported HTTP methods for the management API CORS preflight.
 */
const MANAGEMENT_API_ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';

/**
 * Supported request headers for the management API CORS preflight.
 */
const MANAGEMENT_API_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Request-Id';

/**
 * Resolves allowed CORS origins for management endpoints and OpenAPI routes.
 *
 * Metadata takes precedence so admins can adjust it at runtime, while the
 * environment variable remains a deployment fallback.
 *
 * @returns Raw configured origin list.
 */
async function getConfiguredManagementApiOrigins(): Promise<string> {
    const metadataValue = await getMetadata('MANAGEMENT_API_CORS_ORIGINS');
    return metadataValue || process.env.MANAGEMENT_API_CORS_ORIGINS || '*';
}

/**
 * Builds CORS headers for one incoming management request.
 *
 * @param request - Incoming request used to inspect the `Origin` header.
 * @returns Response headers that should be applied to the outgoing response.
 */
export async function getManagementApiCorsHeaders(request: Request): Promise<Record<string, string>> {
    const configuredOrigins = await getConfiguredManagementApiOrigins();
    const origin = request.headers.get('origin');

    if (configuredOrigins.trim() === '*') {
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': MANAGEMENT_API_ALLOWED_METHODS,
            'Access-Control-Allow-Headers': MANAGEMENT_API_ALLOWED_HEADERS,
        };
    }

    const allowedOrigins = configuredOrigins
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': MANAGEMENT_API_ALLOWED_METHODS,
            'Access-Control-Allow-Headers': MANAGEMENT_API_ALLOWED_HEADERS,
            Vary: 'Origin',
        };
    }

    return {
        'Access-Control-Allow-Methods': MANAGEMENT_API_ALLOWED_METHODS,
        'Access-Control-Allow-Headers': MANAGEMENT_API_ALLOWED_HEADERS,
        Vary: 'Origin',
    };
}
