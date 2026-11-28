import { NextResponse } from 'next/server';
import { isUserGlobalAdmin } from '../../../../../../utils/isUserGlobalAdmin';
import {
    assertGlobalAdminAccess,
    migrateManagedServer,
    parseManagedServerId,
    resolveManagedServerErrorStatus,
} from '../../../../../../utils/serverManagement';

/**
 * Runs pending migrations for one registered server prefix.
 *
 * @param request - Incoming migrate request.
 * @param context - Dynamic route params.
 * @returns Migration summary.
 */
export async function POST(_request: Request, context: { params: Promise<{ serverId: string }> }) {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const { serverId } = await context.params;
        const migrationResult = await migrateManagedServer(parseManagedServerId(serverId));

        return NextResponse.json(migrationResult);
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to run server migrations.',
            },
            { status: resolveManagedServerErrorStatus(error) },
        );
    }
}
