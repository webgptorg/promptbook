import { ConflictError } from '@promptbook-local/core';
import { NextRequest } from 'next/server';
import { translateSupabaseUniqueConstraintError } from '../../../../../../../src/utils/database/uniqueConstraint';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { findOwnedFolderById } from '@/src/utils/agentOwnership';
import { parseFolderColor, parseFolderIcon } from '@/src/utils/agentOrganization/folderAppearance';
import { mapOwnedFolderRowToManagementFolder, getNextOwnedFolderSortOrder } from '@/src/utils/managementApi/managementApiFolders';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import {
    ManagementFolderCreateRequestSchema,
} from '@/src/utils/managementApi/managementApiSchemas';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
    parseManagementApiJsonBody,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Handles CORS preflight requests for `GET/POST /api/v1/folders`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Lists folders owned by the authenticated API key user.
 *
 * @param request - Incoming list request.
 * @returns Flat folder list for the owner.
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
        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('AgentFolder');
        const result = await supabase
            .from(tableName)
            .select('id, name, parentId, createdAt, updatedAt, deletedAt, sortOrder, icon, color, userId')
            .eq('userId', identityResult.identity.userId as never)
            .is('deletedAt', null)
            .order('sortOrder', { ascending: true });

        if (result.error) {
            return createManagementApiErrorResponse(request, 500, 'server_error', result.error.message);
        }

        return createManagementApiJsonResponse(request, {
            items: ((result.data || []) as unknown as Array<Parameters<typeof mapOwnedFolderRowToManagementFolder>[0]>).map(
                mapOwnedFolderRowToManagementFolder,
            ),
        });
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to list folders.',
        );
    }
}

/**
 * Creates one folder owned by the authenticated API key user.
 *
 * @param request - Incoming create request.
 * @returns Created folder payload.
 */
export async function POST(request: NextRequest) {
    const identityResult = await resolveManagementApiIdentity(request);
    if (!identityResult.success) {
        return createManagementApiErrorResponse(
            request,
            identityResult.status,
            identityResult.code,
            identityResult.message,
        );
    }

    const parsedBody = await parseManagementApiJsonBody(request, ManagementFolderCreateRequestSchema);
    if (!parsedBody.success) {
        return parsedBody.response;
    }

    const name = parsedBody.data.name.trim();
    if (!name || name.includes('/')) {
        return createManagementApiErrorResponse(
            request,
            400,
            'validation_error',
            'Folder name must be non-empty and cannot contain `/`.',
        );
    }

    const parsedIcon = parseFolderIcon(parsedBody.data.icon);
    if (parsedBody.data.icon !== undefined && parsedIcon === undefined) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder icon.');
    }

    const parsedColor = parseFolderColor(parsedBody.data.color);
    if (parsedBody.data.color !== undefined && parsedColor === undefined) {
        return createManagementApiErrorResponse(request, 400, 'validation_error', 'Invalid folder color.');
    }

    try {
        if (typeof parsedBody.data.parentId === 'number') {
            const parentFolder = await findOwnedFolderById(identityResult.identity.userId, parsedBody.data.parentId);
            if (!parentFolder || parentFolder.deletedAt) {
                return createManagementApiErrorResponse(request, 404, 'not_found', 'Parent folder was not found.');
            }
        }

        const sortOrder =
            parsedBody.data.sortOrder ??
            (await getNextOwnedFolderSortOrder(
                identityResult.identity.userId,
                parsedBody.data.parentId ?? null,
            ));

        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('AgentFolder');
        const insertResult = await supabase
            .from(tableName)
            .insert({
                userId: identityResult.identity.userId,
                name,
                parentId: parsedBody.data.parentId ?? null,
                sortOrder,
                icon: parsedIcon ?? null,
                color: parsedColor ?? null,
                createdAt: new Date().toISOString(),
                updatedAt: null,
            } as never)
            .select('id, name, parentId, createdAt, updatedAt, deletedAt, sortOrder, icon, color, userId')
            .maybeSingle();

        if (insertResult.error || !insertResult.data) {
            const conflictError = translateSupabaseUniqueConstraintError(insertResult.error, [
                {
                    suffix: 'AgentFolder_parent_name_key',
                    buildError: () =>
                        new ConflictError(`Folder name "${name}" already exists at this level. Pick another name.`),
                },
            ]);

            if (conflictError) {
                return createManagementApiErrorResponse(request, 409, 'conflict', conflictError.message);
            }

            return createManagementApiErrorResponse(
                request,
                500,
                'server_error',
                insertResult.error?.message || 'Failed to create folder.',
            );
        }

        return createManagementApiJsonResponse(
            request,
            {
                folder: mapOwnedFolderRowToManagementFolder(
                    insertResult.data as unknown as Parameters<typeof mapOwnedFolderRowToManagementFolder>[0],
                ),
            },
            { status: 201 },
        );
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to create folder.',
        );
    }
}
