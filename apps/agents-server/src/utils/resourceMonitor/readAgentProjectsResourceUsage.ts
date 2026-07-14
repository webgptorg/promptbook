import {
    groupAgentProjectSummariesByAgent,
    listAgentProjectSummaries,
    resolveAgentProjectsStorageDirectory,
} from '../agentProjects';
import type { AgentProjectsResourceUsage } from './resourceMonitorTypes';

/**
 * Reads disk usage for all local agent project folders.
 *
 * @returns Project storage resource usage.
 */
export async function readAgentProjectsResourceUsage(): Promise<AgentProjectsResourceUsage> {
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
        storageDirectory: resolveAgentProjectsStorageDirectory(),
        totalProjectCount: projects.length,
        totalSizeBytes: projects.reduce((sum, project) => sum + project.sizeBytes, 0),
        agents,
    };
}
