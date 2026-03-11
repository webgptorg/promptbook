import { NextRequest } from 'next/server';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { findOwnedAgentByIdentifier, findOwnedFolderById } from '@/src/utils/agentOwnership';
import {
    getNextOwnedAgentSortOrder,
    mapOwnedAgentRowToManagementSummary,
} from '@/src/utils/managementApi/managementApiAgents';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import { ManagementFolderAgentPathParamsSchema } from '@/src/utils/managementApi/managementApiSchemas';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
} from '@/src/utils/managementApi/managementApiResponses';
import { $provideServer } from '@/src/tools/$provideServer';

/**
 * Handles CORS preflight requests for `POST /api/v1/folders/{folderId}/agents/{agentId}`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Moves one owned agent into the provided owned folder.
 *
 * @param request - Incoming move request.
 * @param params - Route params containing folder and agent identifiers.
 * @returns Updated agent summary.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ folderId: string; agentId: string }> },
) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedParams = ManagementFolderAgentPathParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return createManagementApiErrorResponse(
            request,
            400,
            'validation_error',
            'Invalid folder or agent identifier.',
        );
    }

    try {
        const folder = await findOwnedFolderById(identityResult.identity.userId, parsedParams.data.folderId);
        if (!folder || folder.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Target folder was not found.');
        }

        const agent = await findOwnedAgentByIdentifier(identityResult.identity.userId, parsedParams.data.agentId);
        if (!agent || agent.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Agent was not found.');
        }

        const sortOrder = await getNextOwnedAgentSortOrder(identityResult.identity.userId, folder.id);
        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('Agent');
        const updateResult = await supabase
            .from(tableName)
            .update({
                folderId: folder.id,
                sortOrder,
                updatedAt: new Date().toISOString(),
            } as never)
            .eq('permanentId', agent.permanentId || agent.agentName)
            .eq('userId', identityResult.identity.userId as never)
            .is('deletedAt', null);

        if (updateResult.error) {
            return createManagementApiErrorResponse(request, 500, 'server_error', updateResult.error.message);
        }

        const updatedAgent = await findOwnedAgentByIdentifier(
            identityResult.identity.userId,
            agent.permanentId || agent.agentName,
        );
        if (!updatedAgent) {
            return createManagementApiErrorResponse(
                request,
                500,
                'server_error',
                'Agent was moved but could not be loaded back.',
            );
        }

        const { publicUrl } = await $provideServer();
        return createManagementApiJsonResponse(request, {
            agent: mapOwnedAgentRowToManagementSummary(updatedAgent, publicUrl),
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('ambiguous')) {
            return createManagementApiErrorResponse(request, 409, 'conflict', error.message);
        }

        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to move agent.',
        );
    }
}
