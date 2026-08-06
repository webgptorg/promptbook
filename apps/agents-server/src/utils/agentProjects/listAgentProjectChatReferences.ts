import type { AgentProjectReferenceInfo } from './AgentProjectReferenceInfo';
import { listAgentProjectRuntimes } from './agentProjectRuntimeRegistry';
import { listAgentProjects } from './listAgentProjects';
import { resolveAgentProjectPublicUrls } from './resolveAgentProjectPublicUrls';

/**
 * Lists browser-safe project references enriched with their current runtime state for chat.
 *
 * @param agentPermanentId - Permanent id of the agent owning the projects.
 * @returns Projects suitable for rendering in the agent chat.
 */
export async function listAgentProjectChatReferences(
    agentPermanentId: string,
): Promise<ReadonlyArray<AgentProjectReferenceInfo>> {
    const [projects, runtimes, publicUrlByProjectName] = await Promise.all([
        listAgentProjects(agentPermanentId),
        listAgentProjectRuntimes(),
        resolveAgentProjectPublicUrls(agentPermanentId),
    ]);
    const runtimeByProjectName = new Map(
        runtimes
            .filter((runtime) => runtime.agentPermanentId.toLowerCase() === agentPermanentId.toLowerCase())
            .map((runtime) => [runtime.projectName.toLowerCase(), runtime]),
    );

    return projects.map((project) => {
        const normalizedProjectName = project.projectName.toLowerCase();
        const runtime = runtimeByProjectName.get(normalizedProjectName);

        return {
            projectName: project.projectName,
            displayName: project.displayName,
            description: project.description,
            sizeBytes: project.sizeBytes,
            ...(project.faviconRelativePath ? { faviconRelativePath: project.faviconRelativePath } : {}),
            isRunning: runtime?.isRunning ?? false,
            projectUrl: runtime?.publicUrl ?? publicUrlByProjectName.get(normalizedProjectName) ?? null,
        };
    });
}
