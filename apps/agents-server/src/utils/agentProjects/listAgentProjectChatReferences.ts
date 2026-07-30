import type { AgentProjectReferenceInfo } from './AgentProjectReferenceInfo';
import { listAgentProjectRuntimes } from './agentProjectRuntimeRegistry';
import { listAgentProjects } from './listAgentProjects';

/**
 * Lists browser-safe project references enriched with their current runtime state for chat.
 *
 * @param agentPermanentId - Permanent id of the agent owning the projects.
 * @returns Projects suitable for rendering in the agent chat.
 */
export async function listAgentProjectChatReferences(
    agentPermanentId: string,
): Promise<ReadonlyArray<AgentProjectReferenceInfo>> {
    const [projects, runtimes] = await Promise.all([listAgentProjects(agentPermanentId), listAgentProjectRuntimes()]);
    const runtimeByProjectName = new Map(
        runtimes
            .filter((runtime) => runtime.agentPermanentId.toLowerCase() === agentPermanentId.toLowerCase())
            .map((runtime) => [runtime.projectName.toLowerCase(), runtime]),
    );

    return projects.map((project) => {
        const runtime = runtimeByProjectName.get(project.projectName.toLowerCase());

        return {
            projectName: project.projectName,
            displayName: project.displayName,
            description: project.description,
            sizeBytes: project.sizeBytes,
            isRunning: runtime?.isRunning ?? false,
            projectUrl: runtime?.publicUrl ?? null,
        };
    });
}
