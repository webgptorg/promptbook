import {
    groupAgentProjectSummariesByAgent,
    listAgentProjectSummaries,
    resolveAgentProjectsStorageDirectory,
} from '../agentProjects';
import type { AgentProjectsResourceUsage } from './resourceMonitorTypes';

/**
 * Reads disk usage for all local agent project folders.
 *
 * The reader never throws so the resource monitor stays usable even when
 * project metadata cannot be loaded.
 *
 * @returns Project storage resource usage.
 */
export async function readAgentProjectsResourceUsage(): Promise<AgentProjectsResourceUsage> {
    const storageDirectory = resolveAgentProjectsStorageDirectory();

    try {
        const projects = await listAgentProjectSummaries();
        const agents = groupAgentProjectSummariesByAgent(projects).map((agentSummary) => ({
            agentPermanentId: agentSummary.agentPermanentId,
            agentName: agentSummary.agentName,
            projectCount: agentSummary.projectCount,
            totalSizeBytes: agentSummary.totalSizeBytes,
            projects: agentSummary.projects.map((project) => ({
                id: project.id,
                name: project.name,
                directoryPath: project.directoryPath,
                sizeBytes: project.sizeBytes,
                fileCount: project.fileCount,
                directoryCount: project.directoryCount,
                isGitRepository: project.isGitRepository,
                errorMessage: project.errorMessage,
            })),
        }));

        return {
            storageDirectory,
            totalProjectCount: projects.length,
            totalSizeBytes: projects.reduce((sum, project) => sum + project.sizeBytes, 0),
            agents,
            errorMessage: null,
        };
    } catch (error) {
        return {
            storageDirectory,
            totalProjectCount: 0,
            totalSizeBytes: 0,
            agents: [],
            errorMessage: error instanceof Error ? error.message : 'Agent project usage is not available.',
        };
    }
}
