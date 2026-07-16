import type { AgentProjectRecord } from './AgentProjectRecord';
import { encodeProjectRelativePathForUrl } from './resolveAgentProjectDirectory';

/**
 * Builds the root-relative overview API pathname of one project.
 *
 * @param projectId - Project id.
 * @returns Root-relative pathname.
 */
export function createAgentProjectOverviewPathname(projectId: number): string {
    return `/api/agent-projects/${projectId}`;
}

/**
 * Builds the root-relative file API pathname of one project file.
 *
 * @param projectId - Project id.
 * @param relativePath - Normalized project-relative file path.
 * @returns Root-relative pathname.
 */
export function createAgentProjectFilePathname(projectId: number, relativePath: string): string {
    return `${createAgentProjectOverviewPathname(projectId)}/files/${encodeProjectRelativePathForUrl(relativePath)}`;
}

/**
 * Builds a project overview URL, absolute when the server origin is known.
 *
 * @param project - Project owning the link.
 * @param localServerUrl - Optional server origin.
 * @returns Overview URL.
 */
export function createAgentProjectOverviewUrl(
    project: Pick<AgentProjectRecord, 'id'>,
    localServerUrl?: string,
): string {
    return resolveAgentProjectUrl(createAgentProjectOverviewPathname(project.id), localServerUrl);
}

/**
 * Builds a project file URL, absolute when the server origin is known.
 *
 * @param project - Project owning the link.
 * @param relativePath - Normalized project-relative file path.
 * @param localServerUrl - Optional server origin.
 * @returns File URL.
 */
export function createAgentProjectFileUrl(
    project: Pick<AgentProjectRecord, 'id'>,
    relativePath: string,
    localServerUrl?: string,
): string {
    return resolveAgentProjectUrl(createAgentProjectFilePathname(project.id, relativePath), localServerUrl);
}

/**
 * Builds an absolute URL when the server origin is available, otherwise returns a root-relative URL.
 *
 * @private function of `createAgentProjectLinks`
 */
function resolveAgentProjectUrl(pathname: string, localServerUrl?: string): string {
    if (!localServerUrl) {
        return pathname;
    }

    return new URL(pathname, localServerUrl).href;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
