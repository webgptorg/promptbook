import { RESERVED_PATHS } from '../../generated/reservedPaths';
import { getFolderPathSegments } from '../../utils/agentOrganization/folderPath';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import type { HeaderAgentMenuFolder } from './AgentMenuStructure';
import type { AgentHierarchyView } from './createAgentViewLabel';
import { getAgentMenuLabel } from './getAgentMenuLabel';

/**
 * Resolved route context used to render hierarchy crumbs.
 *
 * @private type of Header
 */
export type ActiveAgentNavigation = {
    agentIdentifier: string | null;
    view: AgentHierarchyView | null;
};

/**
 * Reserved top-level routes that cannot be interpreted as an agent alias.
 */
const RESERVED_PATH_SET = new Set<string>(RESERVED_PATHS);

/**
 * Resolves the hierarchy view label from URL segment.
 *
 * @param segment - Route segment after the agent identifier.
 * @returns Human-friendly view label, or null when unsupported.
 *
 * @private function of Header
 */
function resolveAgentHierarchyView(segment: string | undefined): AgentHierarchyView | null {
    if (!segment) {
        return 'Profile';
    }

    if (segment === 'chat') {
        return 'Chat';
    }

    if (segment === 'book') {
        return 'Book';
    }

    if (segment === 'timeouts') {
        return 'Timeouts';
    }

    return 'More';
}

/**
 * Returns canonical identifier used in routes for one agent.
 *
 * @param agent - Agent used in the menu hierarchy.
 * @returns Permanent id when available, otherwise agent name.
 *
 * @private function of Header
 */
export function getAgentNavigationId(agent: AgentOrganizationAgent): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Parses current pathname and extracts active agent + hierarchy view context.
 *
 * @param pathname - Current browser pathname.
 * @returns Navigation context for hierarchy crumbs.
 *
 * @private function of Header
 */
export function resolveActiveAgentNavigation(pathname: string | null): ActiveAgentNavigation {
    if (!pathname) {
        return { agentIdentifier: null, view: null };
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const firstPathSegment = pathSegments[0];

    if (!firstPathSegment) {
        return { agentIdentifier: null, view: null };
    }

    if (firstPathSegment === 'agents') {
        if (!pathSegments[1]) {
            return { agentIdentifier: null, view: null };
        }

        return {
            agentIdentifier: decodeURIComponent(pathSegments[1]),
            view: resolveAgentHierarchyView(pathSegments[2]),
        };
    }

    if (RESERVED_PATH_SET.has(firstPathSegment)) {
        return { agentIdentifier: null, view: null };
    }

    return {
        agentIdentifier: decodeURIComponent(firstPathSegment),
        view: resolveAgentHierarchyView(pathSegments[1]),
    };
}

/**
 * Builds hierarchy label for the active agent, including folder path when available.
 *
 * @param agent - Active agent metadata.
 * @param folderById - Folder lookup table.
 * @returns Display label for breadcrumb-like hierarchy.
 *
 * @private function of Header
 */
export function createAgentHierarchyLabel(
    agent: AgentOrganizationAgent,
    folderById: Map<number, HeaderAgentMenuFolder>,
): string {
    const folderSegments = getFolderPathSegments(agent.folderId, folderById).map((folder) => folder.name);
    const agentLabel = getAgentMenuLabel(agent);

    if (folderSegments.length === 0) {
        return agentLabel;
    }

    return `${folderSegments.join(' / ')} / ${agentLabel}`;
}

/**
 * Builds a minimal agent payload for menu rendering fallback scenarios.
 *
 * @param agentIdentifier - Active agent identifier when available.
 * @returns Placeholder agent data to satisfy menu helpers.
 *
 * @private function of Header
 */
export function createFallbackAgent(agentIdentifier: string | null): AgentOrganizationAgent {
    return {
        agentName: agentIdentifier || 'Agent',
        agentHash: '',
        personaDescription: null,
        initialMessage: null,
        meta: {},
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        visibility: 'UNLISTED',
        folderId: null,
        sortOrder: 0,
    };
}
