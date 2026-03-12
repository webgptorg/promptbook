import { NextResponse } from 'next/server';
import { resolveCurrentServerRegistryContext } from '../../../../../utils/currentServerRegistryContext';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';
import {
    assertGlobalAdminAccess,
    deleteManagedServer,
    parseManagedServerId,
    resolveManagedServerErrorStatus,
    updateManagedServer,
    type UpdateServerInput,
} from '../../../../../utils/serverManagement';
import { setSessionActiveServerId } from '../../../../../utils/session';

/**
 * Updates editable `_Server` fields for one registered server.
 *
 * @param request - Incoming update request.
 * @param context - Dynamic route params.
 * @returns Updated server row.
 */
export async function PATCH(request: Request, context: { params: Promise<{ serverId: string }> }) {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const { serverId } = await context.params;
        const body = (await request.json()) as Omit<UpdateServerInput, 'id'>;
        const updatedServer = await updateManagedServer({
            id: parseManagedServerId(serverId),
            ...body,
        });

        return NextResponse.json({ server: updatedServer });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to update the server.',
            },
            { status: resolveManagedServerErrorStatus(error) },
        );
    }
}

/**
 * Deletes the currently selected server from `_Server` and switches to a safe fallback context.
 *
 * @param request - Incoming delete request.
 * @param context - Dynamic route params.
 * @returns Delete summary.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ serverId: string }> }) {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const { serverId } = await context.params;
        const currentContext = await resolveCurrentServerRegistryContext();
        const nextServerId = await deleteManagedServer({
            serverId: parseManagedServerId(serverId),
            currentServerId: currentContext.currentServer?.id ?? null,
        });

        await setSessionActiveServerId(nextServerId);

        return NextResponse.json({
            success: true,
            currentServerId: nextServerId,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to delete the server.',
            },
            { status: resolveManagedServerErrorStatus(error) },
        );
    }
}
