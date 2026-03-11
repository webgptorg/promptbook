import { NextRequest } from 'next/server';
import { string_book } from '@promptbook-local/types';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { findOwnedFolderById, findOwnedAgentByIdentifier } from '@/src/utils/agentOwnership';
import { createAgentWithDefaultVisibility } from '@/src/utils/createAgentWithDefaultVisibility';
import { searchOwnedAgents, getNextOwnedAgentSortOrder, mapOwnedAgentRowToManagementDetail, mapOwnedAgentRowToManagementSummary } from '@/src/utils/managementApi/managementApiAgents';
import { resolveManagementApiIdentity } from '@/src/utils/managementApi/managementApiAuth';
import {
    ManagementAgentCreateRequestSchema,
    ManagementAgentListQuerySchema,
} from '@/src/utils/managementApi/managementApiSchemas';
import {
    createManagementApiErrorResponse,
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
    parseManagementApiJsonBody,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Handles CORS preflight requests for `GET/POST /api/v1/agents`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Lists agents owned by the authenticated API key user.
 *
 * Search reuses the same matcher logic as the Agents Server UI search provider.
 *
 * @param request - Incoming list request.
 * @returns Paged agent summaries.
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

    const parsedQuery = ManagementAgentListQuerySchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsedQuery.success) {
        return createManagementApiErrorResponse(
            request,
            400,
            'validation_error',
            'Invalid agent list query.',
            parsedQuery.error.flatten(),
        );
    }

    try {
        const agents = await searchOwnedAgents(identityResult.identity.userId, parsedQuery.data);
        const { publicUrl } = await $provideServer();
        const page = parsedQuery.data.page;
        const limit = parsedQuery.data.limit;
        const total = agents.length;
        const startIndex = (page - 1) * limit;
        const pagedAgents = agents.slice(startIndex, startIndex + limit);

        return createManagementApiJsonResponse(request, {
            items: pagedAgents.map((item) => mapOwnedAgentRowToManagementSummary(item.row, publicUrl)),
            pagination: {
                page,
                limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to list agents.',
        );
    }
}

/**
 * Creates a new owned agent for the authenticated API key user.
 *
 * @param request - Incoming create request.
 * @returns Created agent detail.
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

    const parsedBody = await parseManagementApiJsonBody(request, ManagementAgentCreateRequestSchema);
    if (!parsedBody.success) {
        return parsedBody.response;
    }

    try {
        if (typeof parsedBody.data.folderId === 'number') {
            const folder = await findOwnedFolderById(identityResult.identity.userId, parsedBody.data.folderId);
            if (!folder || folder.deletedAt) {
                return createManagementApiErrorResponse(
                    request,
                    404,
                    'not_found',
                    'Target folder was not found.',
                );
            }
        }

        const collection = await $provideAgentCollectionForServer();
        const sortOrder =
            parsedBody.data.sortOrder ??
            (await getNextOwnedAgentSortOrder(
                identityResult.identity.userId,
                parsedBody.data.folderId ?? null,
            ));
        const createdAgent = await createAgentWithDefaultVisibility(collection, parsedBody.data.source as string_book, {
            folderId: parsedBody.data.folderId ?? null,
            visibility: parsedBody.data.visibility,
            sortOrder,
            userId: identityResult.identity.userId,
        });
        const persistedRow = await findOwnedAgentByIdentifier(identityResult.identity.userId, createdAgent.permanentId);

        if (!persistedRow) {
            return createManagementApiErrorResponse(
                request,
                500,
                'server_error',
                'Agent was created but could not be loaded back.',
            );
        }

        const { publicUrl } = await $provideServer();
        return createManagementApiJsonResponse(
            request,
            {
                agent: mapOwnedAgentRowToManagementDetail(persistedRow, publicUrl),
            },
            { status: 201 },
        );
    } catch (error) {
        return createManagementApiErrorResponse(
            request,
            500,
            'server_error',
            error instanceof Error ? error.message : 'Failed to create agent.',
        );
    }
}
