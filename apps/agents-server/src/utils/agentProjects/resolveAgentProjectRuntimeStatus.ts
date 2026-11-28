import { formatAgentProjectRuntimeStatus } from './agentProjectRuntimeDisplay';
import { resolveAgentProjectRuntime } from './agentProjectRuntimeRegistry';
import { resolveAgentProjectPublicUrls } from './resolveAgentProjectPublicUrls';

/**
 * Current runtime state of one project as shown on its project page.
 */
export type AgentProjectRuntimeStatusInfo = {
    /**
     * Whether the project currently accepts requests on its assigned runtime port.
     */
    readonly isRunning: boolean;

    /**
     * Human-readable status label, the same one the project page shows.
     */
    readonly statusLabel: string;

    /**
     * Stable public project URL, or `null` when the project has no assigned domain or runtime.
     *
     * The URL stays the same while the project is stopped, so a link to it keeps working once the
     * project is started again.
     */
    readonly projectUrl: string | null;
};

/**
 * Resolves the runtime state of one single project.
 *
 * This is the one-project counterpart of `listAgentProjectChatReferences`, for surfaces which
 * already know which project they show and must not pay for listing every project of the agent.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @returns Runtime state of the project.
 */
export async function resolveAgentProjectRuntimeStatus(
    agentPermanentId: string,
    projectName: string,
): Promise<AgentProjectRuntimeStatusInfo> {
    const runtime = await resolveAgentProjectRuntime(agentPermanentId, projectName);

    return {
        isRunning: runtime?.isRunning ?? false,
        statusLabel: formatAgentProjectRuntimeStatus(runtime),
        projectUrl: runtime?.publicUrl ?? (await resolveAssignedAgentProjectPublicUrl(agentPermanentId, projectName)),
    };
}

/**
 * Resolves the domain assigned to one project which currently has no runtime.
 *
 * The assignment is scoped by the domain the current server is reached under, which is known from
 * the request headers only. A caller outside a request — such as the local chat runner finishing a
 * message — therefore learns no URL instead of failing, and the project page link still works.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @returns Assigned public project URL, or `null` when there is none to resolve.
 *
 * @private helper of `resolveAgentProjectRuntimeStatus`
 */
async function resolveAssignedAgentProjectPublicUrl(
    agentPermanentId: string,
    projectName: string,
): Promise<string | null> {
    try {
        return (await resolveAgentProjectPublicUrls(agentPermanentId)).get(projectName.toLowerCase()) ?? null;
    } catch {
        return null;
    }
}
