import { PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import { NextRequest } from 'next/server';
import { getMetadata } from '@/src/database/getMetadata';
import { $provideServer } from '@/src/tools/$provideServer';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Handles CORS preflight requests for `GET /api/v1/instance`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Returns static metadata describing the current Agents Server instance.
 *
 * @param request - Incoming instance request.
 * @returns Instance metadata payload.
 */
export async function GET(request: NextRequest) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    try {
        const { publicUrl } = await $provideServer();
        const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';

        return createManagementApiJsonResponse(request, {
            baseUrl: publicUrl.origin,
            serverName,
            serverVersion: process.env.npm_package_version || PROMPTBOOK_ENGINE_VERSION,
            managementApiBasePath: '/api/v1',
            openApiUrl: new URL('/openapi.json', publicUrl).href,
            swaggerUrl: new URL('/swagger', publicUrl).href,
            supportedFeatures: ['management-api-v1', 'agent-folders', 'swagger-ui', 'openai-compatible-chat'],
        });
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to resolve instance metadata.',
        );
    }
}
