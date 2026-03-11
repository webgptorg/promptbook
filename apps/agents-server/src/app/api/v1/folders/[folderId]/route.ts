import { ConflictError } from '@promptbook-local/core';
import { NextRequest } from 'next/server';
import { translateSupabaseUniqueConstraintError } from '../../../../../../../../src/utils/database/uniqueConstraint';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { findOwnedFolderById } from '@/src/utils/agentOwnership';
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
        const existingFolder = await findOwnedFolderById(identityResult.identity.userId, parsedParams.data.folderId);
        if (!existingFolder || existingFolder.deletedAt) {
            return createManagementApiErrorResponse(request, 404, 'not_found', 'Folder was not found.');
        }

        if (typeof parsedBody.data.parentId === 'number') {
            const parentFolder = await findOwnedFolderById(identityResult.identity.userId, parsedBody.data.parentId);
            if (!parentFolder || parentFolder.deletedAt) {
                return createManagementApiErrorResponse(request, 404, 'not_found', 'Parent folder was not found.');
            }

            const supabase = $provideSupabaseForServer();
            const tableName = await $getTableName('AgentFolder');
            const foldersResult = await supabase
                .from(tableName)
                .select('id, parentId')
                .eq('userId', identityResult.identity.userId as never)
                .is('deletedAt', null);

            if (foldersResult.error) {
                return createManagementApiErrorResponse(request, 500, 'server_error', foldersResult.error.message);
            }

            const { childrenByParentId } = buildFolderTree(
                (foldersResult.data || []) as Array<{ id: number; parentId: number | null }>,
            );
            const descendantIds = new Set(collectDescendantFolderIds(existingFolder.id, childrenByParentId));
            if (descendantIds.has(parsedBody.data.parentId)) {
                return createManagementApiErrorResponse(
                    request,
                    400,
                    'validation_error',
                    'Folder cannot be moved inside itself or one of its descendants.',
                );
            }
        }

        const nextValues: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (parsedBody.data.name !== undefined) {
            const nextName = parsedBody.data.name.trim();
            if (!nextName || nextName.includes('/')) {
                return createManagementApiErrorResponse(
                    request,
                    400,
                    'validation_error',
                    'Folder name must be non-empty and cannot contain `/`.',
                );
            }
            nextValues.name = nextName;
        }

        if (parsedBody.data.parentId !== undefined) {
            nextValues.parentId = parsedBody.data.parentId;
        }

        if (parsedBody.data.sortOrder !== undefined) {
            nextValues.sortOrder = parsedBody.data.sortOrder;
        }

        if (parsedBody.data.icon !== undefined) {
            const parsedIcon = parseFolderIcon(parsedBody.data.icon);
            if (parsedIcon === undefined) {
                return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder icon.');
            }
            nextValues.icon = parsedIcon;
        }

        if (parsedBody.data.color !== undefined) {
            const parsedColor = parseFolderColor(parsedBody.data.color);
            if (parsedColor === undefined) {
                return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder color.');
            }
            nextValues.color = parsedColor;
        }

        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('AgentFolder');
        const updateResult = await supabase
            .from(tableName)
            .update(nextValues as never)
            .eq('id', existingFolder.id)
            .eq('userId', identityResult.identity.userId as never)
            .is('deletedAt', null)
            .select('id, name, parentId, createdAt, updatedAt, deletedAt, sortOrder, icon, color, userId')
            .maybeSingle();

        if (updateResult.error || !updateResult.data) {
            const conflictError = translateSupabaseUniqueConstraintError(updateResult.error, [
                {
                    suffix: 'AgentFolder_parent_name_key',
                    buildError: () =>
                        new ConflictError(`Folder name already exists at this level. Pick another name.`),
                },
            ]);

            if (conflictError) {
                return createManagementApiErrorResponse(request, 409, 'conflict', conflictError.message);
            }

            return createManagementApiErrorResponse(
                request,
                500,
                'server_error',
                updateResult.error?.message || 'Failed to update folder.',
            );
        }

        return createManagementApiJsonResponse(request, {
            folder: mapOwnedFolderRowToManagementFolder(
                updateResult.data as unknown as Parameters<typeof mapOwnedFolderRowToManagementFolder>[0],
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
