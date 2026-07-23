import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { createLocalAgentDirectoryName, resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import type { AgentProjectsSummary, AllAgentProjectsReport } from './AgentProjectInfo';
import { listAgentProjects } from './listAgentProjects';

/**
 * Agent row from the current server database needed to scope project filesystem folders.
 */
type CurrentServerProjectAgent = {
    /**
     * Permanent id of the current-server agent.
     */
    readonly agentPermanentId: string;

    /**
     * Display name of the current-server agent.
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
 * @returns Report with per-agent summaries ordered by total size descending.
 */
export async function listAllAgentProjectSummaries(): Promise<AllAgentProjectsReport> {
    const rootPath = resolveLocalAgentRootPath();
    const agents = await loadCurrentServerProjectAgents();

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
async function loadCurrentServerProjectAgents(): Promise<ReadonlyArray<CurrentServerProjectAgent>> {
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
