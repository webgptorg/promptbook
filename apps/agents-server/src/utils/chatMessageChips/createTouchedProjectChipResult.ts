import type { AgentProjectToolCallResult } from '../../../../../src/book-components/Chat/utils/agentProjectToolCall';
import type { AgentMessageProjectChange } from '../../../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import { buildAgentProjectProfileHref } from '../agentProjects/agentProjectHrefs';
import { resolveAgentProjectInfo } from '../agentProjects/resolveAgentProjectInfo';
import { resolveAgentProjectRuntimeStatus } from '../agentProjects/resolveAgentProjectRuntimeStatus';
import { formatResourceBytes } from '../resourceMonitor/formatResourceMonitorValue';

/**
 * Builds everything one project chip shows about the project it stands for.
 *
 * The payload is assembled from the very same sources as the project page — project metadata,
 * runtime state and the formatted project size — so a chip and the page it links to can never
 * describe one project differently. It travels inside the chat message, which keeps the chip
 * popup readable in every chat surface without asking the server again.
 *
 * @param options - Project identity and what the answered message changed in it.
 * @returns Chip payload, or `null` when the project no longer exists.
 */
export async function createTouchedProjectChipResult(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly projectChange: AgentMessageProjectChange | null;
}): Promise<AgentProjectToolCallResult | null> {
    const project = await resolveAgentProjectInfo(options.agentPermanentId, options.projectName);

    if (!project) {
        return null;
    }

    const runtimeStatus = await resolveAgentProjectRuntimeStatus(options.agentPermanentId, project.projectName);

    return {
        projectName: project.projectName,
        displayName: project.displayName,
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        isRunning: runtimeStatus.isRunning,
        runtimeStatusLabel: runtimeStatus.statusLabel,
        sizeLabel: formatResourceBytes(project.sizeBytes),
        fileCount: project.fileCount,
        isGitRepository: project.isGitRepository,
        ...(project.description ? { description: project.description } : {}),
        ...(runtimeStatus.projectUrl ? { projectUrl: runtimeStatus.projectUrl } : {}),
        ...(options.projectChange ? { change: options.projectChange } : {}),
    };
}
