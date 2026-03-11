import { NextRequest } from 'next/server';
import { string_book } from '@promptbook-local/types';
import { renameAgentSource } from '@/src/utils/renameAgentSource';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { findOwnedAgentByIdentifier, findOwnedFolderById } from '@/src/utils/agentOwnership';
import {
    getNextOwnedAgentSortOrder,
    mapOwnedAgentRowToManagementDetail,
} from '@/src/utils/managementApi/managementApiAgents';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import {
    ManagementAgentPathParamsSchema,
    ManagementAgentUpdateRequestSchema,
} from '@/src/utils/managementApi/managementApiSchemas';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
    parseManagementApiJsonBody,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Handles CORS preflight requests for `GET/PATCH/DELETE /api/v1/agents/{agentId}`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Returns one owned agent detail.
 *
 * @param request - Incoming detail request.
 * @param params - Route params containing the agent id.
 * @returns Owned agent detail payload.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedParams = ManagementAgentPathParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid agent identifier.');
    }

    try {
        const agentRow = await findOwnedAgentByIdentifier(identityResult.identity.userId, parsedParams.data.agentId);
        if (!agentRow || agentRow.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Agent was not found.');
        }

        const { publicUrl } = await $provideServer();
        return createManagementApiJsonResponse(request, mapOwnedAgentRowToManagementDetail(agentRow, publicUrl));
    } catch (error) {
        return mapOwnedAgentLookupErrorToResponse(request, error);
    }
}

/**
 * Updates one owned agent.
 *
 * Source updates reuse the existing collection persistence so runtime behavior stays aligned with the editor/UI.
 *
 * @param request - Incoming update request.
 * @param params - Route params containing the agent id.
 * @returns Updated owned agent detail.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedParams = ManagementAgentPathParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid agent identifier.');
    }

    const parsedBody = await parseManagementApiJsonBody(request, ManagementAgentUpdateRequestSchema);
    if (!parsedBody.success) {
        return parsedBody.response;
    }

    try {
        const existingAgent = await findOwnedAgentByIdentifier(identityResult.identity.userId, parsedParams.data.agentId);
        if (!existingAgent || existingAgent.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Agent was not found.');
        }

        if (typeof parsedBody.data.folderId === 'number') {
            const folder = await findOwnedFolderById(identityResult.identity.userId, parsedBody.data.folderId);
            if (!folder || folder.deletedAt) {
                return createManagementApiErrorResponse(request, 404, 'not_found', 'Target folder was not found.');
            }
        }

        if (parsedBody.data.name || parsedBody.data.source) {
            const collection = await $provideAgentCollectionForServer();
            let nextSource = (parsedBody.data.source || existingAgent.agentSource) as string_book;

            if (parsedBody.data.name) {
                nextSource = renameAgentSource(nextSource, parsedBody.data.name);
            }

            await collection.updateAgentSource(existingAgent.permanentId || existingAgent.agentName, nextSource);
        }

        const metadataUpdate: Record<string, unknown> = {};
        if (parsedBody.data.visibility !== undefined) {
            metadataUpdate.visibility = parsedBody.data.visibility;
        }
        if (parsedBody.data.folderId !== undefined) {
            metadataUpdate.folderId = parsedBody.data.folderId;
        }
        if (parsedBody.data.sortOrder !== undefined) {
            metadataUpdate.sortOrder = parsedBody.data.sortOrder;
        } else if (
            parsedBody.data.folderId !== undefined &&
            parsedBody.data.folderId !== existingAgent.folderId
        ) {
            metadataUpdate.sortOrder = await getNextOwnedAgentSortOrder(
                identityResult.identity.userId,
                parsedBody.data.folderId ?? null,
            );
        }

        if (Object.keys(metadataUpdate).length > 0) {
            metadataUpdate.updatedAt = new Date().toISOString();

            const supabase = $provideSupabaseForServer();
            const tableName = await $getTableName('Agent');
            const updateResult = await supabase
                .from(tableName)
                .update(metadataUpdate as never)
                .eq('permanentId', existingAgent.permanentId || existingAgent.agentName)
                .eq('userId', identityResult.identity.userId as never)
                .is('deletedAt', null);

            if (updateResult.error) {
                return createManagementApiErrorResponse(
                    request,
                    500,
                    'server_error',
                    updateResult.error.message,
                );
            }
        }

        const updatedAgent = await findOwnedAgentByIdentifier(
            identityResult.identity.userId,
            existingAgent.permanentId || existingAgent.agentName,
        );
        if (!updatedAgent) {
            return createManagementApiErrorResponse(
                request,
                500,
                'server_error',
                'Agent was updated but could not be loaded back.',
            );
        }

        const { publicUrl } = await $provideServer();
        return createManagementApiJsonResponse(request, {
            agent: mapOwnedAgentRowToManagementDetail(updatedAgent, publicUrl),
        });
    } catch (error) {
        return mapOwnedAgentLookupErrorToResponse(request, error);
    }
}

/**
 * Soft-deletes one owned agent.
 *
 * @param request - Incoming delete request.
 * @param params - Route params containing the agent id.
 * @returns Deletion confirmation.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedParams = ManagementAgentPathParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid agent identifier.');
    }

    try {
        const existingAgent = await findOwnedAgentByIdentifier(identityResult.identity.userId, parsedParams.data.agentId);
        if (!existingAgent || existingAgent.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Agent was not found.');
        }

        const collection = await $provideAgentCollectionForServer();
        await collection.deleteAgent(existingAgent.permanentId || existingAgent.agentName);

        return createManagementApiJsonResponse(request, { success: true });
    } catch (error) {
        return mapOwnedAgentLookupErrorToResponse(request, error);
    }
}

/**
 * Maps owner-scoped lookup failures to normalized management API responses.
 *
 * @param request - Incoming request.
 * @param error - Caught lookup error.
 * @returns Standardized error response.
 */
function mapOwnedAgentLookupErrorToResponse(request: Request, error: unknown) {
    if (error instanceof Error && error.message.includes('ambiguous')) {
        return createManagementApiErrorResponse(request, 409, 'conflict', error.message);
    }

    return createManagementApiErrorResponse(
        request,
        500,
        'server_error',
        error instanceof Error ? error.message : 'Failed to resolve agent.',
    );
}
