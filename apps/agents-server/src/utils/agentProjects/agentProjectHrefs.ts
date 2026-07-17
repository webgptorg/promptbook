/**
 * Builds the href of the projects dashboard of one agent.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Projects dashboard href.
 */
export function buildAgentProjectsDashboardHref(agentPermanentId: string): string {
    return `/agents/${encodeURIComponent(agentPermanentId)}/projects`;
}

/**
 * Builds the href serving one raw file of one agent project.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @param projectName - Project directory name.
 * @param fileRelativePath - File path relative to the project root using `/` separators.
 * @returns Raw project file href.
 */
export function buildAgentProjectFileHref(
    agentPermanentId: string,
    projectName: string,
    fileRelativePath: string,
): string {
    const encodedFilePath = fileRelativePath
        .split('/')
        .map((filePathSegment) => encodeURIComponent(filePathSegment))
        .join('/');

    return `${buildAgentProjectsDashboardHref(agentPermanentId)}/${encodeURIComponent(
        projectName,
    )}/files/${encodedFilePath}`;
}

/**
 * Href of the admin dashboard listing all projects of all agents.
 */
export const ADMIN_AGENT_PROJECTS_DASHBOARD_HREF = '/admin/projects';
