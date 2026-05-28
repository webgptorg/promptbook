import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../../../src/errors/DatabaseError';
import { isAgentsServerSqliteMode } from '../../../../database/agentsServerDatabaseMode';
import { resolveCurrentServerRegistryContext } from '../../../../utils/currentServerRegistryContext';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import { buildServerTablePrefix } from '../../../../utils/buildServerTablePrefix';
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
import { ManagedServerInputNormalizer } from '../../../../utils/serverManagement/ManagedServerInputNormalizer';
import {
    applyStandaloneVpsServerMetadata,
    resolveStandaloneVpsServerDisplayName,
} from '../../../../utils/serverManagement/standaloneVpsServerMetadata';
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
        const servers = isAgentsServerSqliteMode()
            ? await Promise.all(
                  context.registeredServers.map(async (server) => ({
                      ...server,
                      name: await resolveStandaloneVpsServerDisplayName(server),
                  })),
              )
            : context.registeredServers;

        return NextResponse.json({
            servers,
            currentServerId: context.currentServer?.id ?? null,
            canEdit: await isUserGlobalAdmin(),
            isStandaloneVps: isAgentsServerSqliteMode(),
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

        const body = withEnvironmentAdminUser((await request.json()) as CreateServerInput);
        if (isAgentsServerSqliteMode()) {
            const normalizedDomain = normalizeServerDomain(body.domain);
            if (!normalizedDomain) {
                return NextResponse.json({ error: 'A valid domain is required.' }, { status: 400 });
            }
            const tablePrefix = normalizeStandaloneVpsCreateServerTablePrefix(body);

            const existingDomains = await listConfiguredVpsDomains();
            await updateConfiguredVpsDomains([...existingDomains, normalizedDomain], { tablePrefix });
            await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });
            const createdServer = listEnvironmentRegisteredServers().find((server) => server.domain === normalizedDomain);
            if (createdServer) {
                await applyStandaloneVpsServerMetadata({
                    tablePrefix: createdServer.tablePrefix,
                    name: body.name,
                    iconUrl: body.iconUrl,
                });
            }

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

/**
 * Uses the installer-managed environment admin when the browser no longer collects admin credentials.
 *
 * @param input - Raw create-server payload.
 * @returns Payload compatible with the existing managed-server bootstrap flow.
 */
function withEnvironmentAdminUser(input: CreateServerInput): CreateServerInput {
    const adminPassword = process.env.ADMIN_PASSWORD || input.adminUser?.password || '';
    const adminUsername = input.adminUser?.username?.trim() || 'admin';

    return {
        ...input,
        adminUser: {
            username: adminUsername,
            password: adminPassword,
            isAdmin: true,
        },
        additionalUsers: input.additionalUsers || [],
    };
}

/**
 * Validates the generated server table prefix used by standalone VPS setup.
 *
 * @param input - Create-server payload with generated identifier and table prefix.
 * @returns Validated server-level table prefix.
 */
function normalizeStandaloneVpsCreateServerTablePrefix(input: CreateServerInput): string {
    const identifier = ManagedServerInputNormalizer.normalizeServerIdentifier(input.identifier);
    const tablePrefix = ManagedServerInputNormalizer.validateServerTablePrefix(input.tablePrefix);
    const expectedTablePrefix = buildServerTablePrefix(identifier);

    if (tablePrefix !== expectedTablePrefix) {
        throw new DatabaseError(
            spaceTrim(`
                Table prefix \`${tablePrefix}\` does not match generated server identifier \`${identifier}\`.

                Expected \`${expectedTablePrefix}\`.
            `),
        );
    }

    return tablePrefix;
}
