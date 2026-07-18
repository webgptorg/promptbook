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
 * Builds the href of the project profile page.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @param projectName - Project directory name.
 * @returns Project profile href.
 */
export function buildAgentProjectProfileHref(agentPermanentId: string, projectName: string): string {
    return `${buildAgentProjectsDashboardHref(agentPermanentId)}/${encodeURIComponent(projectName)}`;
}

/**
 * Builds the href that starts browser VS Code for one project.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @param projectName - Project directory name.
 * @returns Project browser VS Code launcher href.
 */
export function buildAgentProjectVscodeHref(agentPermanentId: string, projectName: string): string {
    return `${buildAgentProjectProfileHref(agentPermanentId, projectName)}/vscode`;
}

/**
 * Builds the href of one browsed folder inside a project profile.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @param projectName - Project directory name.
 * @param folderRelativePath - Folder path relative to the project root using `/` separators.
 * @returns Project folder browser href.
 */
export function buildAgentProjectFolderHref(
    agentPermanentId: string,
    projectName: string,
    folderRelativePath: string,
): string {
    const profileHref = buildAgentProjectProfileHref(agentPermanentId, projectName);
    const normalizedFolderRelativePath = folderRelativePath.trim().replace(/^\/+|\/+$/g, '');

    if (!normalizedFolderRelativePath) {
        return profileHref;
    }

    const query = new URLSearchParams({ folder: normalizedFolderRelativePath });
    return `${profileHref}?${query.toString()}`;
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

    return `${buildAgentProjectProfileHref(agentPermanentId, projectName)}/files/${encodedFilePath}`;
}

/**
 * Href of the admin dashboard listing all projects of all agents.
 */
export const ADMIN_AGENT_PROJECTS_DASHBOARD_HREF = '/admin/projects';
