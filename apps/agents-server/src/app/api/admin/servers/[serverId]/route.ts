import { NextResponse } from 'next/server';
import { isAgentsServerSqliteMode } from '../../../../../database/agentsServerDatabaseMode';
import { resolveCurrentServerRegistryContext } from '../../../../../utils/currentServerRegistryContext';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';
import {
    createServerPublicUrl,
    listEnvironmentRegisteredServers,
    normalizeServerDomain,
} from '../../../../../utils/serverRegistry';
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
            const updatedServer = await updateStandaloneVpsServerDomain(parsedServerId, body.domain);
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
 * Updates a virtual standalone VPS server by replacing its domain in `SERVERS`.
 *
 * @param serverId - Virtual server id.
 * @param rawDomain - Replacement domain.
 * @returns Updated virtual server row.
 */
async function updateStandaloneVpsServerDomain(serverId: number, rawDomain: string) {
    const normalizedDomain = normalizeServerDomain(rawDomain);
    if (!normalizedDomain) {
        throw new Error('A valid domain is required.');
    }

    const servers = listEnvironmentRegisteredServers();
    const serverIndex = servers.findIndex((server) => server.id === serverId);
    if (serverIndex === -1) {
        throw new Error(`Standalone VPS server ${serverId} was not found.`);
    }

    const domains = await listConfiguredVpsDomains();
    const nextDomains = domains.map((domain, index) => (index === serverIndex ? normalizedDomain : domain));
    await updateConfiguredVpsDomains(nextDomains);
    await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });

    const updatedServer = listEnvironmentRegisteredServers().find((server) => server.domain === normalizedDomain);
    if (!updatedServer) {
        throw new Error(`Standalone VPS server ${normalizedDomain} was not persisted.`);
    }

    return updatedServer;
}

/**
 * Deletes a virtual standalone VPS server by removing its domain from `SERVERS`.
 *
 * @param serverId - Virtual server id.
 */
async function deleteStandaloneVpsServerDomain(serverId: number): Promise<void> {
    const servers = listEnvironmentRegisteredServers();
    const serverIndex = servers.findIndex((server) => server.id === serverId);
    if (serverIndex === -1) {
        throw new Error(`Standalone VPS server ${serverId} was not found.`);
    }

    const domains = await listConfiguredVpsDomains();
    await updateConfiguredVpsDomains(domains.filter((_domain, index) => index !== serverIndex));
    await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });
}
