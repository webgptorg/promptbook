import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { ProvidedServer } from '@/src/tools/$provideServer';
import { runWithServerContextOverride } from '@/src/tools/serverContextOverride';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { createLocalAgentDirectoryName, resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import { createServerPublicUrl, type ServerRecord, listRegisteredServersUsingServiceRole } from '../serverRegistry';
import type { AgentProjectsSummary, AllAgentProjectsReport } from './AgentProjectInfo';
import { listAgentProjects } from './listAgentProjects';

/**
 * Scope used when collecting agent project summaries.
 */
export type AgentProjectsSummaryScope = 'current-server' | 'vps';

/**
 * Agent row from a server database needed to scope project filesystem folders.
 */
type ServerProjectAgent = {
    /**
     * Permanent id of the server agent.
     */
    readonly agentPermanentId: string;

    /**
     * Display name of the server agent.
     */
    readonly agentName: string | null;

    /**
     * Local runner directory name derived from the permanent id.
     */
    readonly agentDirectoryName: string;
};

/**
 * Builds the server-wide report of all projects of all agents.
 *
 * The report is assembled from current-server agents stored in the database and then
 * enriched with their local project folders on disk. This keeps project dashboards scoped
 * to the server selected by the request host even when multiple servers share one VPS.
 *
 * @param options - Optional report scope.
 * @returns Report with per-agent summaries ordered by total size descending.
 */
export async function listAllAgentProjectSummaries(options?: {
    /**
     * Whether to inspect only the request server or every registered server on the VPS.
     */
    readonly scope?: AgentProjectsSummaryScope;
}): Promise<AllAgentProjectsReport> {
    if (options?.scope === 'vps') {
        return listVpsAgentProjectSummaries();
    }

    return createAgentProjectsReport(await loadCurrentServerProjectAgents(), null);
}

/**
 * Builds a project report for every registered server on the VPS.
 *
 * Each server database is queried inside its own routing override. The local project folders
 * remain on the shared VPS filesystem, but their ownership comes from the server-specific
 * `Agent` table instead of from whichever request host happens to render the report.
 *
 * @returns VPS-wide project report.
 */
async function listVpsAgentProjectSummaries(): Promise<AllAgentProjectsReport> {
    const registeredServers = await listRegisteredServersUsingServiceRole();

    if (registeredServers.length === 0) {
        return createAgentProjectsReport(await loadCurrentServerProjectAgents(), null);
    }

    const reports = await Promise.all(registeredServers.map((server) => listServerAgentProjectSummaries(server)));
    const summaries = reports
        .flatMap((report) => report.summaries)
        .sort((firstSummary, secondSummary) => secondSummary.totalSizeBytes - firstSummary.totalSizeBytes);

    return {
        rootPath: resolveLocalAgentRootPath(),
        totalAgentCount: reports.reduce((totalAgentCount, report) => totalAgentCount + report.totalAgentCount, 0),
        summaries,
        totalSizeBytes: summaries.reduce((totalSizeBytes, summary) => totalSizeBytes + summary.totalSizeBytes, 0),
        totalProjectCount: summaries.reduce(
            (totalProjectCount, summary) => totalProjectCount + summary.projects.length,
            0,
        ),
        totalFileCount: summaries.reduce((totalFileCount, summary) => totalFileCount + summary.totalFileCount, 0),
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Builds a project report for one explicitly selected server.
 *
 * @param server - Server whose isolated agent database should be inspected.
 * @returns Project report for the selected server.
 */
async function listServerAgentProjectSummaries(server: ServerRecord): Promise<AllAgentProjectsReport> {
    return runWithServerContextOverride(createProvidedServer(server), async () =>
        createAgentProjectsReport(await loadCurrentServerProjectAgents(), server),
    );
}

/**
 * Creates the public server context required by database table-name resolution.
 *
 * @param server - Registered server record.
 * @returns Explicit server routing context.
 */
function createProvidedServer(server: ServerRecord): ProvidedServer {
    return {
        id: server.id,
        publicUrl: createServerPublicUrl(server.domain),
        tablePrefix: server.tablePrefix,
    };
}

/**
 * Assembles filesystem project summaries for agents loaded from one server database.
 *
 * @param agents - Agents that belong to the selected server.
 * @param server - Owning server, or `null` for the request/default server.
 * @returns Project report for the loaded agents.
 */
async function createAgentProjectsReport(
    agents: ReadonlyArray<ServerProjectAgent>,
    server: ServerRecord | null,
): Promise<AllAgentProjectsReport> {
    const rootPath = resolveLocalAgentRootPath();

    const summaryCandidates = await Promise.all(
        agents.map(async (agent): Promise<AgentProjectsSummary | null> => {
            const projects = await listAgentProjects(agent.agentPermanentId);
            if (projects.length === 0) {
                return null;
            }

            return {
                agentPermanentId: agent.agentPermanentId,
                agentName: agent.agentName,
                agentDirectoryName: agent.agentDirectoryName,
                serverId: server?.id ?? null,
                serverName: server?.name ?? null,
                serverDomain: server?.domain ?? null,
                projects,
                totalSizeBytes: projects.reduce((totalSizeBytes, project) => totalSizeBytes + project.sizeBytes, 0),
                totalFileCount: projects.reduce((totalFileCount, project) => totalFileCount + project.fileCount, 0),
            };
        }),
    );

    const summaries = summaryCandidates
        .filter((summaryCandidate): summaryCandidate is AgentProjectsSummary => summaryCandidate !== null)
        .sort((firstSummary, secondSummary) => secondSummary.totalSizeBytes - firstSummary.totalSizeBytes);

    return {
        rootPath,
        totalAgentCount: agents.length,
        summaries,
        totalSizeBytes: summaries.reduce((totalSizeBytes, summary) => totalSizeBytes + summary.totalSizeBytes, 0),
        totalProjectCount: summaries.reduce((totalProjectCount, summary) => totalProjectCount + summary.projects.length, 0),
        totalFileCount: summaries.reduce((totalFileCount, summary) => totalFileCount + summary.totalFileCount, 0),
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Loads current-server agents that may own local project folders.
 */
async function loadCurrentServerProjectAgents(): Promise<ReadonlyArray<ServerProjectAgent>> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Agent'))
        .select('permanentId,agentName')
        .is('deletedAt', null);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to load current-server agents for the projects report.

                **Database error:** ${error.message}
            `),
        );
    }

    return ((data || []) as Array<{ permanentId: string | null; agentName: string | null }>)
        .filter((agentRow): agentRow is { permanentId: string; agentName: string | null } =>
            Boolean(agentRow.permanentId),
        )
        .map((agentRow) => ({
            agentPermanentId: agentRow.permanentId,
            agentName: agentRow.agentName,
            agentDirectoryName: createLocalAgentDirectoryName(agentRow.permanentId),
        }));
}
