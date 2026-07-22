import { NextResponse } from 'next/server';
import { isAgentsServerSqliteMode } from '../../../../../database/agentsServerDatabaseMode';
import type { ServerRecord } from '../../../../../utils/serverRegistry';
import { resolveCurrentServerRegistryContext } from '../../../../../utils/currentServerRegistryContext';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';
import { createServerPublicUrl, normalizeServerDomain } from '../../../../../utils/serverRegistry';
import {
    assertGlobalAdminAccess,
    deleteManagedServer,
    parseManagedServerId,
    resolveManagedServerErrorStatus,
    updateManagedServer,
    type UpdateServerInput,
} from '../../../../../utils/serverManagement';
import { applyStandaloneVpsServerMetadata } from '../../../../../utils/serverManagement/standaloneVpsServerMetadata';
import {
    applyVpsRuntimeConfiguration,
    listConfiguredVpsDomains,
    updateConfiguredVpsDomains,
} from '../../../../../utils/vpsConfiguration';

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
        const parsedServerId = parseManagedServerId(serverId);

        if (isAgentsServerSqliteMode()) {
            const updatedServer = await updateStandaloneVpsServer(parsedServerId, body);
            await applyStandaloneVpsServerMetadata({
                tablePrefix: updatedServer.tablePrefix,
                name: body.name,
            });
            return NextResponse.json({ server: updatedServer });
        }

        const updatedServer = await updateManagedServer({
            id: parsedServerId,
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
 * Deletes the current server from the registry.
 *
 * @param request - Incoming delete request.
 * @param context - Dynamic route params.
 * @returns Delete summary with an optional redirect target.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ serverId: string }> }) {
    try {
        assertGlobalAdminAccess(await isUserGlobalAdmin());

        const { serverId } = await context.params;
        const parsedServerId = parseManagedServerId(serverId);

        if (isAgentsServerSqliteMode()) {
            await deleteStandaloneVpsServerDomain(parsedServerId);
            return NextResponse.json({
                success: true,
                redirectUrl: null,
            });
        }

        const currentContext = await resolveCurrentServerRegistryContext();
        const nextServerId = await deleteManagedServer({
            serverId: parsedServerId,
            currentServerId: currentContext.currentServer?.id ?? null,
        });
        const nextServer =
            nextServerId === null
                ? null
                : currentContext.registeredServers.find((server) => server.id === nextServerId) ?? null;
        const redirectUrl = nextServer ? new URL('/admin/servers', createServerPublicUrl(nextServer.domain)).href : null;

        return NextResponse.json({
            success: true,
            redirectUrl,
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

/**
 * Updates one registered standalone VPS server in the VPS registry database.
 *
 * The server keeps its id and its isolated per-server SQLite database; only the
 * domain (and name) change, so no server data is lost or leaked by renames.
 *
 * @param serverId - Registry server id.
 * @param input - Replacement domain and optional name.
 * @returns Updated registry row.
 */
async function updateStandaloneVpsServer(
    serverId: number,
    input: { readonly domain?: string; readonly name?: string },
): Promise<ServerRecord> {
    const normalizedDomain = input.domain === undefined ? undefined : normalizeServerDomain(input.domain) ?? undefined;
    if (input.domain !== undefined && !normalizedDomain) {
        throw new Error('A valid domain is required.');
    }

    const { getStandaloneServerById, updateStandaloneServer } = await import(
        '../../../../../database/sqlite/standaloneServerRegistryStore'
    );
    const previousServer = getStandaloneServerById(serverId);
    const updatedServer = updateStandaloneServer(serverId, {
        domain: normalizedDomain,
        name: input.name,
    });

    if (previousServer && previousServer.domain !== updatedServer.domain) {
        const domains = await listConfiguredVpsDomains();
        const replacedDomains = domains.map((domain) =>
            domain === previousServer.domain ? updatedServer.domain : domain,
        );
        await updateConfiguredVpsDomains(
            replacedDomains.includes(updatedServer.domain)
                ? replacedDomains
                : [...replacedDomains, updatedServer.domain],
        );
        await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });
    }

    return updatedServer;
}

/**
 * Deletes one registered standalone VPS server.
 *
 * The registration row and its domain are removed, while the isolated
 * per-server SQLite database file stays on disk so no data is destroyed silently.
 *
 * @param serverId - Registry server id.
 */
async function deleteStandaloneVpsServerDomain(serverId: number): Promise<void> {
    const { deleteStandaloneServer } = await import('../../../../../database/sqlite/standaloneServerRegistryStore');
    const deletedServer = deleteStandaloneServer(serverId);

    const domains = await listConfiguredVpsDomains();
    await updateConfiguredVpsDomains(domains.filter((domain) => domain !== deletedServer.domain));
    await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });
}
