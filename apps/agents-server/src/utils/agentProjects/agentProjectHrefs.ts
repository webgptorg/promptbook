import { createServerPublicUrl, normalizeServerDomain } from '../serverRegistry';

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
 * Builds the href of one agent's projects dashboard on its owning server.
 *
 * A project on the current server stays a relative application link. A project owned by
 * another server receives an absolute URL so it cannot accidentally open under the current
 * server's database namespace.
 *
 * @param options - Agent and server identity.
 * @returns Server-scoped projects dashboard href.
 */
export function buildAgentProjectsDashboardHrefForServer(options: {
    readonly agentPermanentId: string;
    readonly serverDomain: string | null;
    readonly currentServerDomain: string | null;
}): string {
    return buildAgentProjectHrefForServer(
        buildAgentProjectsDashboardHref(options.agentPermanentId),
        options.serverDomain,
        options.currentServerDomain,
    );
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
 * Builds the href of one project on its owning server.
 *
 * @param options - Project and server identity.
 * @returns Server-scoped project profile href.
 */
export function buildAgentProjectProfileHrefForServer(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly serverDomain: string | null;
    readonly currentServerDomain: string | null;
}): string {
    return buildAgentProjectHrefForServer(
        buildAgentProjectProfileHref(options.agentPermanentId, options.projectName),
        options.serverDomain,
        options.currentServerDomain,
    );
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
 * Builds the href serving one raw file of one agent project on its owning server.
 *
 * @param options - Project file and server identity.
 * @returns Server-scoped raw project file href.
 */
export function buildAgentProjectFileHrefForServer(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly fileRelativePath: string;
    readonly serverDomain: string | null;
    readonly currentServerDomain: string | null;
}): string {
    return buildAgentProjectHrefForServer(
        buildAgentProjectFileHref(options.agentPermanentId, options.projectName, options.fileRelativePath),
        options.serverDomain,
        options.currentServerDomain,
    );
}

/**
 * Builds the href opening one project in browser VS Code.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @param projectName - Project directory name.
 * @returns Project VS Code launcher href.
 */
export function buildAgentProjectVscodeHref(agentPermanentId: string, projectName: string): string {
    return `${buildAgentProjectProfileHref(agentPermanentId, projectName)}/vscode`;
}

/**
 * Href of the admin dashboard listing all projects of all agents.
 */
export const ADMIN_AGENT_PROJECTS_DASHBOARD_HREF = '/admin/projects';

/**
 * Makes a project href absolute only when its owner is a foreign server.
 *
 * @param relativeHref - Path within the Agents Server application.
 * @param serverDomain - Domain of the owning server.
 * @param currentServerDomain - Domain serving the current request.
 * @returns Relative current-server href or absolute foreign-server href.
 */
function buildAgentProjectHrefForServer(
    relativeHref: string,
    serverDomain: string | null,
    currentServerDomain: string | null,
): string {
    const normalizedServerDomain = normalizeServerDomain(serverDomain || '');
    const normalizedCurrentServerDomain = normalizeServerDomain(currentServerDomain || '');

    if (!normalizedServerDomain || normalizedServerDomain === normalizedCurrentServerDomain) {
        return relativeHref;
    }

    return new URL(relativeHref, createServerPublicUrl(normalizedServerDomain)).toString();
}
