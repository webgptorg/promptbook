import {
    resolveAgentAccess,
    type AgentAccessResolution,
    type ResolveAgentAccessOptions,
} from '../agentAccess';

/**
 * Message returned when an anonymous user attempts to open project files or details.
 */
export const AGENT_PROJECT_DETAILS_FORBIDDEN_MESSAGE = 'Sign in to view project files and details.';

/**
 * Agent access enriched with project-specific permission flags.
 */
export type AgentProjectsAccessResolution = AgentAccessResolution & {
    /**
     * Whether the request belongs to a logged-in user.
     */
    readonly isAuthenticated: boolean;

    /**
     * Whether the request may see the project names and README files.
     */
    readonly isProjectOverviewVisible: boolean;

    /**
     * Whether the request may see project files, paths, sizes, and timestamps.
     */
    readonly isProjectDetailsVisible: boolean;
};

/**
 * Returns whether project names and README files may be shown.
 *
 * @param agentAccess - General agent access decision.
 * @returns `true` when the caller can see the limited projects overview.
 */
export function isAgentProjectsOverviewVisible(agentAccess: AgentAccessResolution): boolean {
    return agentAccess.isAllowed;
}

/**
 * Returns whether project files and metadata may be shown.
 *
 * @param agentAccess - General agent access decision.
 * @returns `true` when the caller is logged in and may access the agent.
 */
export function isAgentProjectDetailsVisible(agentAccess: AgentAccessResolution): boolean {
    return agentAccess.isAllowed && Boolean(agentAccess.currentUser);
}

/**
 * Resolves agent access together with project-specific visibility decisions.
 *
 * @param agentIdentifier - Agent name, permanent id, or book-scoped child identifier.
 * @param options - Request and internal TEAM access policy.
 * @returns General agent access plus project-specific flags.
 */
export async function resolveAgentProjectsAccess(
    agentIdentifier: string,
    options: ResolveAgentAccessOptions = {},
): Promise<AgentProjectsAccessResolution> {
    const agentAccess = await resolveAgentAccess(agentIdentifier, options);

    return {
        ...agentAccess,
        isAuthenticated: Boolean(agentAccess.currentUser),
        isProjectOverviewVisible: isAgentProjectsOverviewVisible(agentAccess),
        isProjectDetailsVisible: isAgentProjectDetailsVisible(agentAccess),
    };
}
