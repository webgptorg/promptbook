import { NextRequest } from 'next/server';
import { string_book } from '@promptbook-local/types';
import { z } from 'zod';
import { renameAgentSource } from '@/src/utils/renameAgentSource';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { findOwnedAgentByIdentifier, findOwnedFolderById, type OwnedAgentRow } from '@/src/utils/agentOwnership';
import {
    getNextOwnedAgentSortOrder,
    mapOwnedAgentRowToManagementDetail,
    resolveOwnedAgentDerivedState,
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
 * Parsed payload accepted by the managed agent update route.
 */
type ManagementAgentUpdateRequest = z.infer<typeof ManagementAgentUpdateRequestSchema>;

/**
 * Agent metadata fields updated directly in the database during `PATCH`.
 */
type ManagementAgentMetadataUpdate = {
    visibility?: ManagementAgentUpdateRequest['visibility'];
    folderId?: ManagementAgentUpdateRequest['folderId'];
    sortOrder?: ManagementAgentUpdateRequest['sortOrder'];
    updatedAt?: string;
};

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
        const resolvedAgentState = await resolveOwnedAgentDerivedState(agentRow);
        return createManagementApiJsonResponse(
            request,
            mapOwnedAgentRowToManagementDetail(agentRow, publicUrl, resolvedAgentState.resolvedAgentProfile),
        );
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
        const existingAgent = await loadOwnedAgentForPatch(
            request,
            identityResult.identity.userId,
            parsedParams.data.agentId,
        );
        if (existingAgent instanceof Response) {
            return existingAgent;
        }

        const folderValidationResponse = await validateOwnedAgentTargetFolder(
            request,
            identityResult.identity.userId,
            parsedBody.data.folderId,
        );
        if (folderValidationResponse) {
            return folderValidationResponse;
        }

        await updateOwnedAgentSourceIfNeeded(existingAgent, parsedBody.data);

        const metadataUpdate = await createOwnedAgentMetadataUpdate(
            identityResult.identity.userId,
            existingAgent,
            parsedBody.data,
        );
        const metadataUpdateResponse = await persistOwnedAgentMetadataUpdate(
            request,
            identityResult.identity.userId,
            existingAgent,
            metadataUpdate,
        );
        if (metadataUpdateResponse) {
            return metadataUpdateResponse;
        }

        return createUpdatedOwnedAgentResponse(request, identityResult.identity.userId, existingAgent);
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
 * Loads the persisted agent targeted by the current patch request.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param agentId - Requested agent identifier.
 * @returns Persisted row or a normalized not-found response.
 */
async function loadOwnedAgentForPatch(
    request: Request,
    userId: number,
    agentId: string,
): Promise<OwnedAgentRow | Response> {
    const existingAgent = await findOwnedAgentByIdentifier(userId, agentId);
    if (!existingAgent || existingAgent.deletedAt) {
        return createManagementApiErrorResponse(request, 404, 'not_found', 'Agent was not found.');
    }

    return existingAgent;
}

/**
 * Ensures an explicit folder move targets an existing folder owned by the caller.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param folderId - Requested folder id or `undefined` when unchanged.
 * @returns Error response when the folder does not exist, otherwise `null`.
 */
async function validateOwnedAgentTargetFolder(
    request: Request,
    userId: number,
    folderId: ManagementAgentUpdateRequest['folderId'],
): Promise<Response | null> {
    if (typeof folderId !== 'number') {
        return null;
    }

    const folder = await findOwnedFolderById(userId, folderId);
    if (!folder || folder.deletedAt) {
        return createManagementApiErrorResponse(request, 404, 'not_found', 'Target folder was not found.');
    }

    return null;
}

/**
 * Persists source-affecting changes through the shared agent collection.
 *
 * @param existingAgent - Current persisted agent row.
 * @param updateRequest - Parsed update payload.
 */
async function updateOwnedAgentSourceIfNeeded(
    existingAgent: OwnedAgentRow,
    updateRequest: ManagementAgentUpdateRequest,
): Promise<void> {
    if (updateRequest.name === undefined && updateRequest.source === undefined) {
        return;
    }

    const collection = await $provideAgentCollectionForServer();
    const nextSource = createUpdatedOwnedAgentSource(existingAgent, updateRequest);
    await collection.updateAgentSource(getOwnedAgentIdentifier(existingAgent), nextSource);
}

/**
 * Creates the next source snapshot after applying optional source and name changes.
 *
 * @param existingAgent - Current persisted agent row.
 * @param updateRequest - Parsed update payload.
 * @returns Next stored source for the agent.
 */
function createUpdatedOwnedAgentSource(
    existingAgent: OwnedAgentRow,
    updateRequest: ManagementAgentUpdateRequest,
): string_book {
    const sourceWithRequestedContent = (updateRequest.source || existingAgent.agentSource) as string_book;
    if (!updateRequest.name) {
        return sourceWithRequestedContent;
    }

    return renameAgentSource(sourceWithRequestedContent, updateRequest.name);
}

/**
 * Builds the direct database metadata update for the current patch request.
 *
 * @param userId - Authenticated owner id.
 * @param existingAgent - Current persisted agent row.
 * @param updateRequest - Parsed update payload.
 * @returns Metadata fields that should be persisted.
 */
async function createOwnedAgentMetadataUpdate(
    userId: number,
    existingAgent: OwnedAgentRow,
    updateRequest: ManagementAgentUpdateRequest,
): Promise<ManagementAgentMetadataUpdate> {
    const metadataUpdate: ManagementAgentMetadataUpdate = {};

    if (updateRequest.visibility !== undefined) {
        metadataUpdate.visibility = updateRequest.visibility;
    }
    if (updateRequest.folderId !== undefined) {
        metadataUpdate.folderId = updateRequest.folderId;
    }
    if (updateRequest.sortOrder !== undefined) {
        metadataUpdate.sortOrder = updateRequest.sortOrder;
    } else if (updateRequest.folderId !== undefined && updateRequest.folderId !== existingAgent.folderId) {
        metadataUpdate.sortOrder = await getNextOwnedAgentSortOrder(userId, updateRequest.folderId ?? null);
    }

    return metadataUpdate;
}

/**
 * Persists direct database metadata changes for the current patch request.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param existingAgent - Current persisted agent row.
 * @param metadataUpdate - Fields to persist directly in the `Agent` row.
 * @returns Error response when the write fails, otherwise `null`.
 */
async function persistOwnedAgentMetadataUpdate(
    request: Request,
    userId: number,
    existingAgent: OwnedAgentRow,
    metadataUpdate: ManagementAgentMetadataUpdate,
): Promise<Response | null> {
    if (!hasOwnedAgentMetadataUpdate(metadataUpdate)) {
        return null;
    }

    const persistedMetadataUpdate: ManagementAgentMetadataUpdate = {
        ...metadataUpdate,
        updatedAt: new Date().toISOString(),
    };
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Agent');
    const updateResult = await supabase
        .from(tableName)
        .update(persistedMetadataUpdate as never)
        .eq('permanentId', getOwnedAgentIdentifier(existingAgent))
        .eq('userId', userId as never)
        .is('deletedAt', null);

    if (updateResult.error) {
        return createManagementApiErrorResponse(request, 500, 'server_error', updateResult.error.message);
    }

    return null;
}

/**
 * Reports whether the current metadata update contains any persisted fields.
 *
 * @param metadataUpdate - Candidate metadata update.
 * @returns `true` when at least one field should be written.
 */
function hasOwnedAgentMetadataUpdate(metadataUpdate: ManagementAgentMetadataUpdate): boolean {
    return Object.keys(metadataUpdate).length > 0;
}

/**
 * Reloads the updated agent and maps it into the management API detail response.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param existingAgent - Agent row loaded before mutation.
 * @returns Updated management API response payload.
 */
async function createUpdatedOwnedAgentResponse(request: Request, userId: number, existingAgent: OwnedAgentRow) {
    const updatedAgent = await findOwnedAgentByIdentifier(userId, getOwnedAgentIdentifier(existingAgent));
    if (!updatedAgent) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            'Agent was updated but could not be loaded back.',
        );
    }

    const { publicUrl } = await $provideServer();
    const resolvedAgentState = await resolveOwnedAgentDerivedState(updatedAgent);
    return createManagementApiJsonResponse(request, {
        agent: mapOwnedAgentRowToManagementDetail(updatedAgent, publicUrl, resolvedAgentState.resolvedAgentProfile),
    });
}

/**
 * Resolves the stable identifier used for collection and database writes.
 *
 * @param agent - Persisted agent row.
 * @returns Permanent id when available, otherwise the legacy agent name.
 */
function getOwnedAgentIdentifier(agent: OwnedAgentRow): string {
    return agent.permanentId || agent.agentName;
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
