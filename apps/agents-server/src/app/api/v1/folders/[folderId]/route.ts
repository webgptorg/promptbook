import { ConflictError } from '@promptbook-local/core';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { translateSupabaseUniqueConstraintError } from '../../../../../../../../src/utils/database/uniqueConstraint';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { findOwnedFolderById, type OwnedAgentFolderRow } from '@/src/utils/agentOwnership';
import { parseFolderColor, parseFolderIcon } from '@/src/utils/agentOrganization/folderAppearance';
import { buildFolderTree, collectDescendantFolderIds } from '@/src/utils/agentOrganization/folderTree';
import { mapOwnedFolderRowToManagementFolder } from '@/src/utils/managementApi/managementApiFolders';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import {
    ManagementFolderPathParamsSchema,
    ManagementFolderUpdateRequestSchema,
} from '@/src/utils/managementApi/managementApiSchemas';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
    parseManagementApiJsonBody,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Parsed payload accepted by the managed folder update route.
 */
type ManagementFolderUpdateRequest = z.infer<typeof ManagementFolderUpdateRequestSchema>;

/**
 * Folder fields written directly in the database during `PATCH`.
 */
type ManagementFolderPatchValues = {
    updatedAt: string;
    name?: string;
    parentId?: number | null;
    sortOrder?: number;
    icon?: string | null;
    color?: string | null;
};

/**
 * Handles CORS preflight requests for `PATCH/DELETE /api/v1/folders/{folderId}`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Updates one owned folder.
 *
 * @param request - Incoming update request.
 * @param params - Route params containing the folder id.
 * @returns Updated folder payload.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedParams = ManagementFolderPathParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder identifier.');
    }

    const parsedBody = await parseManagementApiJsonBody(request, ManagementFolderUpdateRequestSchema);
    if (!parsedBody.success) {
        return parsedBody.response;
    }

    try {
        const existingFolder = await loadOwnedFolderForPatch(
            request,
            identityResult.identity.userId,
            parsedParams.data.folderId,
        );
        if (existingFolder instanceof Response) {
            return existingFolder;
        }

        const parentValidationResponse = await validateOwnedFolderPatchParent(
            request,
            identityResult.identity.userId,
            existingFolder,
            parsedBody.data.parentId,
        );
        if (parentValidationResponse) {
            return parentValidationResponse;
        }

        const nextValues = await createOwnedFolderPatchValues(request, parsedBody.data);
        if (nextValues instanceof Response) {
            return nextValues;
        }

        const updatedFolder = await persistOwnedFolderPatch(
            request,
            identityResult.identity.userId,
            existingFolder,
            nextValues,
        );
        if (updatedFolder instanceof Response) {
            return updatedFolder;
        }

        return createManagementApiJsonResponse(request, {
            folder: mapOwnedFolderRowToManagementFolder(
                updatedFolder as Parameters<typeof mapOwnedFolderRowToManagementFolder>[0],
            ),
        });
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to update folder.',
        );
    }
}

/**
 * Loads the persisted folder targeted by the current patch request.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param folderId - Requested folder identifier.
 * @returns Persisted folder row or a normalized not-found response.
 */
async function loadOwnedFolderForPatch(
    request: Request,
    userId: number,
    folderId: number,
): Promise<OwnedAgentFolderRow | Response> {
    const existingFolder = await findOwnedFolderById(userId, folderId);
    if (!existingFolder || existingFolder.deletedAt) {
        return createManagementApiErrorResponse(request, 404, 'not_found', 'Folder was not found.');
    }

    return existingFolder;
}

/**
 * Ensures an explicit folder move points to a valid parent and does not create a cycle.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param existingFolder - Folder loaded for the current mutation.
 * @param parentId - Requested parent folder id or `undefined` when unchanged.
 * @returns Error response when the move is invalid, otherwise `null`.
 */
async function validateOwnedFolderPatchParent(
    request: Request,
    userId: number,
    existingFolder: OwnedAgentFolderRow,
    parentId: ManagementFolderUpdateRequest['parentId'],
): Promise<Response | null> {
    if (typeof parentId !== 'number') {
        return null;
    }

    const parentValidationResponse = await validateOwnedFolderPatchParentExists(request, userId, parentId);
    if (parentValidationResponse) {
        return parentValidationResponse;
    }

    return validateOwnedFolderPatchParentHierarchy(request, userId, existingFolder.id, parentId);
}

/**
 * Ensures the requested parent folder exists and is still active.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param parentId - Requested parent folder id.
 * @returns Error response when the parent is missing, otherwise `null`.
 */
async function validateOwnedFolderPatchParentExists(
    request: Request,
    userId: number,
    parentId: number,
): Promise<Response | null> {
    const parentFolder = await findOwnedFolderById(userId, parentId);
    if (!parentFolder || parentFolder.deletedAt) {
        return createManagementApiErrorResponse(request, 404, 'not_found', 'Parent folder was not found.');
    }

    return null;
}

/**
 * Prevents moving a folder inside itself or one of its descendants.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param folderId - Folder being moved.
 * @param parentId - Requested parent folder id.
 * @returns Error response when the move would create a cycle, otherwise `null`.
 */
async function validateOwnedFolderPatchParentHierarchy(
    request: Request,
    userId: number,
    folderId: number,
    parentId: number,
): Promise<Response | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('AgentFolder');
    const foldersResult = await supabase
        .from(tableName)
        .select('id, parentId')
        .eq('userId', userId as never)
        .is('deletedAt', null);

    if (foldersResult.error) {
        return createManagementApiErrorResponse(request, 500, 'server_error', foldersResult.error.message);
    }

    const { childrenByParentId } = buildFolderTree(
        (foldersResult.data || []) as Array<{ id: number; parentId: number | null }>,
    );
    const descendantIds = new Set(collectDescendantFolderIds(folderId, childrenByParentId));
    if (descendantIds.has(parentId)) {
        return createManagementApiErrorResponse(
            request,
            400,
            'validation_error',
            'Folder cannot be moved inside itself or one of its descendants.',
        );
    }

    return null;
}

/**
 * Builds the validated database update payload for the current patch request.
 *
 * @param request - Incoming update request.
 * @param updateRequest - Parsed update payload.
 * @returns Validated update values or a normalized validation error response.
 */
async function createOwnedFolderPatchValues(
    request: Request,
    updateRequest: ManagementFolderUpdateRequest,
): Promise<ManagementFolderPatchValues | Response> {
    const nextValues: ManagementFolderPatchValues = {
        updatedAt: new Date().toISOString(),
    };

    const nextName = await resolveOwnedFolderPatchName(request, updateRequest.name);
    if (nextName instanceof Response) {
        return nextName;
    }
    if (nextName !== undefined) {
        nextValues.name = nextName;
    }

    if (updateRequest.parentId !== undefined) {
        nextValues.parentId = updateRequest.parentId;
    }

    if (updateRequest.sortOrder !== undefined) {
        nextValues.sortOrder = updateRequest.sortOrder;
    }

    const nextIcon = await resolveOwnedFolderPatchIcon(request, updateRequest.icon);
    if (nextIcon instanceof Response) {
        return nextIcon;
    }
    if (nextIcon !== undefined) {
        nextValues.icon = nextIcon;
    }

    const nextColor = await resolveOwnedFolderPatchColor(request, updateRequest.color);
    if (nextColor instanceof Response) {
        return nextColor;
    }
    if (nextColor !== undefined) {
        nextValues.color = nextColor;
    }

    return nextValues;
}

/**
 * Normalizes the requested folder name while preserving the current validation message.
 *
 * @param request - Incoming update request.
 * @param name - Requested folder name or `undefined` when unchanged.
 * @returns Normalized name, `undefined`, or a validation error response.
 */
async function resolveOwnedFolderPatchName(
    request: Request,
    name: ManagementFolderUpdateRequest['name'],
): Promise<string | Response | undefined> {
    if (name === undefined) {
        return undefined;
    }

    const nextName = name.trim();
    if (!nextName || nextName.includes('/')) {
        return createManagementApiErrorResponse(
            request,
            400,
            'validation_error',
            'Folder name must be non-empty and cannot contain `/`.',
        );
    }

    return nextName;
}

/**
 * Normalizes the requested folder icon while preserving the current validation message.
 *
 * @param request - Incoming update request.
 * @param icon - Requested icon value or `undefined` when unchanged.
 * @returns Normalized icon, `undefined`, or a validation error response.
 */
async function resolveOwnedFolderPatchIcon(
    request: Request,
    icon: ManagementFolderUpdateRequest['icon'],
): Promise<ReturnType<typeof parseFolderIcon> | Response> {
    const parsedIcon = parseFolderIcon(icon);
    if (icon !== undefined && parsedIcon === undefined) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder icon.');
    }

    return parsedIcon;
}

/**
 * Normalizes the requested folder color while preserving the current validation message.
 *
 * @param request - Incoming update request.
 * @param color - Requested color value or `undefined` when unchanged.
 * @returns Normalized color, `undefined`, or a validation error response.
 */
async function resolveOwnedFolderPatchColor(
    request: Request,
    color: ManagementFolderUpdateRequest['color'],
): Promise<ReturnType<typeof parseFolderColor> | Response> {
    const parsedColor = parseFolderColor(color);
    if (color !== undefined && parsedColor === undefined) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder color.');
    }

    return parsedColor;
}

/**
 * Persists the validated folder update and normalizes unique-constraint failures.
 *
 * @param request - Incoming update request.
 * @param userId - Authenticated owner id.
 * @param existingFolder - Folder loaded before mutation.
 * @param nextValues - Validated database update payload.
 * @returns Updated folder row or an error response.
 */
async function persistOwnedFolderPatch(
    request: Request,
    userId: number,
    existingFolder: OwnedAgentFolderRow,
    nextValues: ManagementFolderPatchValues,
): Promise<OwnedAgentFolderRow | Response> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('AgentFolder');
    const updateResult = await supabase
        .from(tableName)
        .update(nextValues as never)
        .eq('id', existingFolder.id)
        .eq('userId', userId as never)
        .is('deletedAt', null)
        .select('id, name, parentId, createdAt, updatedAt, deletedAt, sortOrder, icon, color, userId')
        .maybeSingle();

    if (updateResult.error || !updateResult.data) {
        return mapOwnedFolderPatchWriteErrorToResponse(request, updateResult.error);
    }

    return updateResult.data as unknown as OwnedAgentFolderRow;
}

/**
 * Maps update write failures to normalized management API responses.
 *
 * @param request - Incoming update request.
 * @param error - Database error returned by Supabase.
 * @returns Standardized error response.
 */
async function mapOwnedFolderPatchWriteErrorToResponse(
    request: Request,
    error: Parameters<typeof translateSupabaseUniqueConstraintError>[0],
): Promise<Response> {
    const conflictError = translateSupabaseUniqueConstraintError(error, [
        {
            suffix: 'AgentFolder_parent_name_key',
            buildError: () => new ConflictError(`Folder name already exists at this level. Pick another name.`),
        },
    ]);

    if (conflictError) {
        return createManagementApiErrorResponse(request, 409, 'conflict', conflictError.message);
    }

    return createManagementApiErrorResponse(
        request,
        500,
        'server_error',
        error?.message || 'Failed to update folder.',
    );
}

/**
 * Deletes one owned folder and soft-deletes its descendant folders and agents.
 *
 * @param request - Incoming delete request.
 * @param params - Route params containing the folder id.
 * @returns Deletion confirmation.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedParams = ManagementFolderPathParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder identifier.');
    }

    try {
        const existingFolder = await findOwnedFolderById(identityResult.identity.userId, parsedParams.data.folderId);
        if (!existingFolder || existingFolder.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Folder was not found.');
        }

        const supabase = $provideSupabaseForServer();
        const folderTable = await $getTableName('AgentFolder');
        const agentTable = await $getTableName('Agent');
        const folderResult = await supabase
            .from(folderTable)
            .select('id, parentId')
            .eq('userId', identityResult.identity.userId as never);

        if (folderResult.error) {
            return createManagementApiErrorResponse(request, 500, 'server_error', folderResult.error.message);
        }

        const { childrenByParentId } = buildFolderTree(
            (folderResult.data || []) as Array<{ id: number; parentId: number | null }>,
        );
        const descendantFolderIds = collectDescendantFolderIds(existingFolder.id, childrenByParentId);
        const deletionTimestamp = new Date().toISOString();

        const folderUpdateResult = await supabase
            .from(folderTable)
            .update({ deletedAt: deletionTimestamp, updatedAt: deletionTimestamp } as never)
            .eq('userId', identityResult.identity.userId as never)
            .in('id', descendantFolderIds)
            .is('deletedAt', null);

        if (folderUpdateResult.error) {
            return createManagementApiErrorResponse(request, 500, 'server_error', folderUpdateResult.error.message);
        }

        const agentUpdateResult = await supabase
            .from(agentTable)
            .update({ deletedAt: deletionTimestamp, updatedAt: deletionTimestamp } as never)
            .eq('userId', identityResult.identity.userId as never)
            .in('folderId', descendantFolderIds)
            .is('deletedAt', null);

        if (agentUpdateResult.error) {
            return createManagementApiErrorResponse(request, 500, 'server_error', agentUpdateResult.error.message);
        }

        return createManagementApiJsonResponse(request, { success: true });
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to delete folder.',
        );
    }
}
