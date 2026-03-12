import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';
import {
    assertGlobalAdminAccess,
    getManagedServerById,
    resolveManagedServerErrorStatus,
} from '../../../../../utils/serverManagement';
import { setSessionActiveServerId } from '../../../../../utils/session';

/**
 * Updates the currently selected same-instance server for the global-admin session.
 *
 * @param request - Incoming switch request.
 * @returns New active server id.
 */
export async function POST(request: Request) {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const body = (await request.json()) as { serverId?: number | null };
        const requestedServerId =
            typeof body.serverId === 'number' && Number.isFinite(body.serverId) ? body.serverId : null;

        if (requestedServerId !== null) {
            await getManagedServerById(requestedServerId);
        }

        await setSessionActiveServerId(requestedServerId);

        return NextResponse.json({
            success: true,
            currentServerId: requestedServerId,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to switch the active server.',
            },
            { status: resolveManagedServerErrorStatus(error) },
        );
    }
}
