import { listAllAgentProjectSummaries } from '../agentProjects/listAllAgentProjectSummaries';
import { resolveCurrentServerRegistryContext } from '../currentServerRegistryContext';
import { resolveLocalAgentRootPath } from '../localChatRunner/ensureLocalAgentFolder';
import type { AgentProjectsResourceUsage } from './resourceMonitorTypes';

/**
 * Reads the storage usage of all agent projects for the resource monitor.
 *
 * Measurement failures are reported inside the usage value so the resource monitor page
 * can still render the remaining resources.
 *
 * @returns Aggregated project storage usage per agent and in total.
 */
export async function readAgentProjectsResourceUsage(): Promise<AgentProjectsResourceUsage> {
    try {
        const [report, currentServerContext] = await Promise.all([
            listAllAgentProjectSummaries({ scope: 'vps' }),
            resolveCurrentServerRegistryContext(),
        ]);

        return {
            rootPath: report.rootPath,
            totalSizeBytes: report.totalSizeBytes,
            totalProjectCount: report.totalProjectCount,
            currentServerDomain: currentServerContext.currentServer?.domain ?? null,
            agents: report.summaries.map((summary) => ({
                agentPermanentId: summary.agentPermanentId,
                agentName: summary.agentName,
                agentDirectoryName: summary.agentDirectoryName,
                serverId: summary.serverId,
                serverName: summary.serverName,
                serverDomain: summary.serverDomain,
                projectCount: summary.projects.length,
                projects: summary.projects,
                sizeBytes: summary.totalSizeBytes,
            })),
            errorMessage: null,
        };
    } catch (error) {
        return {
            rootPath: resolveLocalAgentRootPath(),
            totalSizeBytes: 0,
            totalProjectCount: 0,
            currentServerDomain: null,
            agents: [],
            errorMessage: error instanceof Error ? error.message : 'Failed to measure agent project sizes.',
        };
    }
}
