import type {
    AgentProjectVscodeRuntimeInfo,
    AgentProjectVscodeTheme,
} from './AgentProjectVscodeRuntimeInfo';
import {
    AGENT_PROJECT_VSCODE_PROXY_PATH_PREFIX,
    AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM,
} from './agentProjectVscodeConstants';
import { buildAgentProjectProfileHref } from './agentProjectHrefs';

/**
 * Builds the Agents Server route that opens browser VS Code for one project.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @returns Browser VS Code launcher href.
 */
export function buildAgentProjectVscodeHref(agentPermanentId: string, projectName: string): string {
    return `${buildAgentProjectProfileHref(agentPermanentId, projectName)}/vscode`;
}

/**
 * Builds the same-origin proxy path for one browser VS Code runtime.
 *
 * @param runtimeId - Process-local VS Code runtime id.
 * @returns Same-origin proxy path with a trailing slash.
 */
export function buildAgentProjectVscodeProxyPath(runtimeId: string): string {
    return `${AGENT_PROJECT_VSCODE_PROXY_PATH_PREFIX}/${encodeURIComponent(runtimeId)}/`;
}

/**
 * Parses the runtime id from a same-origin browser VS Code proxy request path.
 *
 * @param originalUri - Original browser URI forwarded by Nginx.
 * @returns Runtime id, or `null` when the path is not a browser VS Code proxy path.
 */
export function parseAgentProjectVscodeRuntimeIdFromProxyUri(originalUri: string): string | null {
    let pathname = originalUri;

    try {
        pathname = new URL(originalUri, 'http://promptbook.local').pathname;
    } catch {
        pathname = originalUri.split('?')[0] || '';
    }

    const normalizedPrefix = `${AGENT_PROJECT_VSCODE_PROXY_PATH_PREFIX}/`;
    if (!pathname.startsWith(normalizedPrefix)) {
        return null;
    }

    const runtimeId = pathname.slice(normalizedPrefix.length).split('/')[0] || '';
    return runtimeId ? decodeURIComponent(runtimeId) : null;
}

/**
 * Builds a launch URL for code-server with the requested project folder and theme.
 *
 * @param options - Runtime, theme, and proxy selection.
 * @returns URL or same-origin path opened by the browser.
 */
export function buildAgentProjectVscodeLaunchUrl(options: {
    readonly runtime: AgentProjectVscodeRuntimeInfo;
    readonly theme: AgentProjectVscodeTheme;
    readonly isProxyPreferred: boolean;
}): string {
    const query = new URLSearchParams({
        folder: options.runtime.projectPath,
        [AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM]: options.theme,
    });
    const baseUrl = options.isProxyPreferred ? options.runtime.proxyPath : `${options.runtime.localUrl}/`;

    return `${baseUrl}?${query.toString()}`;
}
