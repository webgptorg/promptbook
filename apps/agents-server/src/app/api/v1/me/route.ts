import { NextRequest } from 'next/server';
import { getUserDataValue } from '@/src/utils/userData';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Handles CORS preflight requests for `GET /api/v1/me`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Returns the identity derived from the current API key.
 *
 * @param request - Incoming identity request.
 * @returns Authenticated user payload.
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
        const emailValue = await getUserDataValue({
            userId: identityResult.identity.userId,
            key: 'email',
        }).catch(() => null);
        const email = typeof emailValue === 'string' ? emailValue : null;

        return createManagementApiJsonResponse(request, {
            userId: identityResult.identity.userId,
            username: identityResult.identity.username,
            email,
            plan: null,
            limits: null,
            createdAt: identityResult.identity.userCreatedAt,
            apiKey: {
                id: identityResult.identity.apiKeyId,
                note: identityResult.identity.apiKeyNote,
                createdAt: identityResult.identity.apiKeyCreatedAt,
            },
        });
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to resolve API-key identity.',
        );
    }
}
