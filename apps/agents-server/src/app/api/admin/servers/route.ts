import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../../../src/errors/DatabaseError';
import { isAgentsServerSqliteMode } from '../../../../database/agentsServerDatabaseMode';
import { seedDefaultAgents } from '../../../../database/seedDefaultAgents';
import {
    buildAgentProjectProfileHrefForServer,
    buildAgentProjectsDashboardHrefForServer,
} from '../../../../utils/agentProjects/agentProjectHrefs';
import { listAgentProjectDomainRecords } from '../../../../utils/agentProjects/agentProjectRuntimeDomains';
import {
    createAgentProjectDnsDiagnosticLookup,
    createAgentProjectDnsDiagnosticLookupKey,
    listAgentProjectDnsDiagnostics,
} from '../../../../utils/agentProjects/listAgentProjectDnsDiagnostics';
import { resolveCurrentServerRegistryContext } from '../../../../utils/currentServerRegistryContext';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../utils/isUserGlobalAdmin';
import { loadLocalAgentSourceSnapshot } from '../../../../utils/localChatRunner/ensureLocalAgentFolder';
import { buildServerTablePrefix } from '../../../../utils/buildServerTablePrefix';
import {
    createServerPublicUrl,
    isServerEnvironment,
    normalizeServerDomain,
    SERVER_ENVIRONMENT,
    type ServerRecord,
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
import { createStandaloneVpsDomainDnsDiagnostic } from '../../../../utils/standaloneVpsDnsDiagnostics';
import { runWithVpsServerSetupTask } from '../../../../utils/vpsTask/runWithVpsServerSetupTask';
import { runWithServerContextOverride } from '../../../../tools/serverContextOverride';
import {
    applyVpsRuntimeConfiguration,
    listConfiguredVpsDomains,
    updateConfiguredVpsDomains,
} from '../../../../utils/vpsConfiguration';

/**
 * Separator used in agent-owner lookup keys.
 */
const AGENT_PROJECT_OWNER_LOOKUP_KEY_SEPARATOR = '::';

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
        const isStandaloneVps = isAgentsServerSqliteMode();
        const serversWithoutProjectDomains = isStandaloneVps
            ? await createStandaloneVpsServersResponse(context.registeredServers)
            : context.registeredServers;
        const projectDomainRecords = await listAgentProjectDomainRecords();
        const agentNameByProjectOwner = await createAgentNameLookup(projectDomainRecords, context.registeredServers);
        const currentServerDomain = context.currentServer?.domain || context.hostServer?.domain || null;
        const servers = await Promise.all(
            serversWithoutProjectDomains.map(async (server) => {
                const serverProjectDomainRecords = projectDomainRecords.filter(
                    (record) => normalizeServerDomain(record.serverDomain) === normalizeServerDomain(server.domain),
                );
                const projectDnsDiagnosticByProject = createAgentProjectDnsDiagnosticLookup(
                    isStandaloneVps
                        ? await listAgentProjectDnsDiagnostics({
                              projectDomainRecords: serverProjectDomainRecords,
                              publicIpAddress: process.env.PTBK_PUBLIC_IP_ADDRESS,
                              serverDomain: server.domain,
                          })
                        : [],
                );

                return {
                    ...server,
                    projectDomains: serverProjectDomainRecords.map((record) => ({
                        agentPermanentId: record.agentPermanentId,
                        agentName:
                            agentNameByProjectOwner.get(
                                createAgentProjectOwnerLookupKey(record.serverDomain, record.agentPermanentId),
                            ) ?? null,
                        agentProjectsHref: buildAgentProjectsDashboardHrefForServer({
                            agentPermanentId: record.agentPermanentId,
                            serverDomain: server.domain,
                            currentServerDomain,
                        }),
                        projectName: record.projectName,
                        customDomain: record.customDomain,
                        domain: record.domain,
                        publicUrl: record.publicUrl,
                        projectHref: buildAgentProjectProfileHrefForServer({
                            agentPermanentId: record.agentPermanentId,
                            projectName: record.projectName,
                            serverDomain: server.domain,
                            currentServerDomain,
                        }),
                        dnsDiagnostic:
                            projectDnsDiagnosticByProject.get(
                                createAgentProjectDnsDiagnosticLookupKey(record.agentPermanentId, record.projectName),
                            )?.dnsDiagnostic ?? null,
                        assignedAt: record.assignedAt,
                        updatedAt: record.updatedAt,
                    })),
                };
            }),
        );

        return NextResponse.json({
            servers,
            currentServerId: context.currentServer?.id ?? null,
            canEdit: await isUserGlobalAdmin(),
            isStandaloneVps,
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
 * Loads readable agent names for project-domain rows without making a stale domain record fail the server registry.
 *
 * @param projectDomainRecords - Project domains whose owners need labels.
 * @param registeredServers - Servers that own the project-domain records.
 * @returns Project-owner names keyed by owning server and permanent agent id.
 */
async function createAgentNameLookup(
    projectDomainRecords: Awaited<ReturnType<typeof listAgentProjectDomainRecords>>,
    registeredServers: ReadonlyArray<ServerRecord>,
): Promise<ReadonlyMap<string, string | null>> {
    const serverByDomain = new Map<string, ServerRecord>();

    for (const server of registeredServers) {
        const serverDomain = normalizeServerDomain(server.domain);

        if (serverDomain) {
            serverByDomain.set(serverDomain, server);
        }
    }
    const projectDomainRecordByOwner = new Map<string, (typeof projectDomainRecords)[number]>();

    for (const projectDomainRecord of projectDomainRecords) {
        projectDomainRecordByOwner.set(
            createAgentProjectOwnerLookupKey(projectDomainRecord.serverDomain, projectDomainRecord.agentPermanentId),
            projectDomainRecord,
        );
    }

    const agentNames = await Promise.all(
        [...projectDomainRecordByOwner.entries()].map(async ([projectOwnerLookupKey, projectDomainRecord]) => {
            const server = serverByDomain.get(normalizeServerDomain(projectDomainRecord.serverDomain) || '');

            if (!server) {
                return [projectOwnerLookupKey, null] as const;
            }

            const agentSnapshot = await runWithServerContextOverride(
                {
                    id: server.id,
                    publicUrl: createServerPublicUrl(server.domain),
                    tablePrefix: server.tablePrefix,
                },
                () => loadLocalAgentSourceSnapshot(projectDomainRecord.agentPermanentId),
            ).catch(() => null);

            return [projectOwnerLookupKey, agentSnapshot?.agentName || null] as const;
        }),
    );

    return new Map(agentNames);
}

/**
 * Creates a stable lookup key for one server-scoped project owner.
 *
 * @param serverDomain - Domain of the server that owns the agent.
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Case-insensitive project-owner lookup key.
 */
function createAgentProjectOwnerLookupKey(serverDomain: string, agentPermanentId: string): string {
    return [normalizeServerDomain(serverDomain) || '', agentPermanentId.toLowerCase()].join(
        AGENT_PROJECT_OWNER_LOOKUP_KEY_SEPARATOR,
    );
}

/**
 * Enriches standalone VPS server rows with display metadata and DNS diagnostics.
 *
 * @param servers - Virtual standalone server rows.
 * @returns Browser-safe server rows with DNS setup guidance.
 */
async function createStandaloneVpsServersResponse(
    servers: Awaited<ReturnType<typeof resolveCurrentServerRegistryContext>>['registeredServers'],
) {
    const primaryDomain = servers[0]?.domain ?? null;

    return Promise.all(
        servers.map(async (server) => ({
            ...server,
            name: await resolveStandaloneVpsServerDisplayName(server),
            dnsDiagnostic: await createStandaloneVpsDomainDnsDiagnostic({
                domain: server.domain,
                publicIpAddress: process.env.PTBK_PUBLIC_IP_ADDRESS,
                fallbackCnameTargetDomain: primaryDomain && primaryDomain !== server.domain ? primaryDomain : null,
            }),
        })),
    );
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
            const serverName = body.name?.trim() || normalizedDomain;

            return runWithVpsServerSetupTask(
                {
                    taskName: `Server setup: ${serverName}`,
                    chatId: normalizedDomain,
                    serverName,
                    serverDomain: normalizedDomain,
                },
                () => createStandaloneVpsServer(body, normalizedDomain),
                (response) => response.status < 400,
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
 * Creates and provisions one standalone VPS server.
 *
 * @param body - Create-server request payload.
 * @param normalizedDomain - Validated server domain.
 * @returns Create response.
 *
 * @private function of `POST`
 */
async function createStandaloneVpsServer(body: CreateServerInput, normalizedDomain: string): Promise<NextResponse> {
    const isDefaultAgentsInstalled = body.isDefaultAgentsInstalled !== false;
    const tablePrefix = normalizeStandaloneVpsCreateServerTablePrefix(body);

    // Note: The VPS registry database is the source of truth for the server list.
    //       Its unique table prefix selects the new server's own isolated SQLite database.
    const { createStandaloneServer } = await import('../../../../database/sqlite/standaloneServerRegistryStore');
    const createdServer = createStandaloneServer({
        name: body.name?.trim() || normalizedDomain,
        environment: isServerEnvironment(body.environment) ? body.environment : SERVER_ENVIRONMENT.PRODUCTION,
        domain: normalizedDomain,
        tablePrefix,
    });

    // Note: `SERVERS` stays a projection of the registry for nginx/certbot provisioning
    //       and Edge middleware host matching; it no longer defines table prefixes.
    const existingDomains = await listConfiguredVpsDomains();
    await updateConfiguredVpsDomains([...existingDomains, normalizedDomain]);
    await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });

    await applyStandaloneVpsServerMetadata({
        tablePrefix: createdServer.tablePrefix,
        name: body.name,
        iconUrl: body.iconUrl,
    });
    if (isDefaultAgentsInstalled) {
        await seedDefaultAgents({ tablePrefix });
    }

    return NextResponse.json(
        {
            server: createdServer,
            publicUrl: createServerPublicUrl(normalizedDomain).href,
        },
        { status: 201 },
    );
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
