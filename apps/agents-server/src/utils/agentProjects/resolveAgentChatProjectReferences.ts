import { resolveAgentProjectsAccess, type AgentProjectsAccessResolution } from './agentProjectAccess';
import type { AgentProjectReferenceInfo } from './AgentProjectReferenceInfo';
import { listAgentProjectChatReferences } from './listAgentProjectChatReferences';

/**
 * Resolves the compact project references one chat surface may render as project chips.
 *
 * Every surface showing a chat — the agent profile, the chat page, and the action refreshing an open
 * chat — gates the projects behind the same overview permission, so the decision lives here only.
 *
 * @param options - Owning agent and its already resolved project access, when the caller has it.
 * @returns Display-only project references safe to send to the browser.
 */
export async function resolveAgentChatProjectReferences(options: {
    readonly agentPermanentId: string;
    readonly projectsAccess?: AgentProjectsAccessResolution;
}): Promise<ReadonlyArray<AgentProjectReferenceInfo>> {
    const projectsAccess = options.projectsAccess || (await resolveAgentProjectsAccess(options.agentPermanentId));

    if (!projectsAccess.isProjectOverviewVisible) {
        return [];
    }

    return await listAgentProjectChatReferences(options.agentPermanentId);
}
