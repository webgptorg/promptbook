import { NextResponse } from 'next/server';
import { isAgentsServerSqliteMode } from '../../../../database/agentsServerDatabaseMode';
import { resolveCurrentServerRegistryContext } from '../../../../utils/currentServerRegistryContext';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import {
    createServerPublicUrl,
    listEnvironmentRegisteredServers,
    normalizeServerDomain,
} from '../../../../utils/serverRegistry';
import {
    assertGlobalAdminAccess,
    createManagedServer,
    resolveManagedServerErrorStatus,
    type CreateServerInput,
} from '../../../../utils/serverManagement';
import {
    applyVpsRuntimeConfiguration,
    listConfiguredVpsDomains,
    updateConfiguredVpsDomains,
} from '../../../../utils/vpsConfiguration';

/**
 * Lists all registered servers together with the server resolved from the current domain.
 *
 * @returns Registry rows visible to the global admin.
 */
export async function GET() {
    try {
        if (!(await isUserAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const context = await resolveCurrentServerRegistryContext();
        return NextResponse.json({
            servers: context.registeredServers,
            currentServerId: context.currentServer?.id ?? null,
            canEdit: await isUserGlobalAdmin(),
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
        if (isAgentsServerSqliteMode()) {
            const normalizedDomain = normalizeServerDomain(body.domain);
            if (!normalizedDomain) {
                return NextResponse.json({ error: 'A valid domain is required.' }, { status: 400 });
            }

            const existingDomains = await listConfiguredVpsDomains();
            await updateConfiguredVpsDomains([...existingDomains, normalizedDomain]);
            await applyVpsRuntimeConfiguration();
            const createdServer = listEnvironmentRegisteredServers().find((server) => server.domain === normalizedDomain);

            return NextResponse.json(
                {
                    server: createdServer ?? null,
                    publicUrl: createServerPublicUrl(normalizedDomain).href,
                },
                { status: 201 },
            );
        }

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
