import { NextResponse } from 'next/server';
import { resolveCurrentServerRegistryContext } from '../../../../utils/currentServerRegistryContext';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import {
    assertGlobalAdminAccess,
    createManagedServer,
    resolveManagedServerErrorStatus,
    type CreateServerInput,
} from '../../../../utils/serverManagement';

/**
 * Lists all registered servers together with the server resolved from the current domain.
 *
 * @returns Registry rows visible to the global admin.
 */
export async function GET() {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const context = await resolveCurrentServerRegistryContext();
        return NextResponse.json({
            servers: context.registeredServers,
            currentServerId: context.currentServer?.id ?? null,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load registered servers.',
            },
            { status: resolveManagedServerErrorStatus(error) },
        );
    }
}

/**
 * Creates a new same-instance server.
 *
 * @param request - Incoming create-server request.
 * @returns Create result with optional SQL dump on failure.
 */
export async function POST(request: Request) {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const body = (await request.json()) as CreateServerInput;
        const result = await createManagedServer(body);

        if (!result.ok) {
            return NextResponse.json(
                {
                    error: result.message,
                    sqlDump: result.sqlDump,
                    sqlFilename: result.sqlFilename,
                },
                { status: result.status },
            );
        }

        return NextResponse.json(
            {
                server: result.server,
                publicUrl: result.publicUrl,
            },
            { status: 201 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to create the server.',
            },
            { status: resolveManagedServerErrorStatus(error) },
        );
    }
}
