import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { buildAgentFolderContext, type AgentFolderContext } from '../../utils/agentOrganization/agentFolderContext';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { buildAgentProfileHref, buildFreshAgentChatHref } from '../../utils/agentRouting/agentRouteHrefs';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import type { HeaderAgentMenuFolder } from './AgentMenuStructure';
import { buildAgentMenuStructure } from './buildAgentMenuStructure';
import { createAgentViewLabel } from './createAgentViewLabel';
import {
    createAgentHierarchyLabel,
    createFallbackAgent,
    getAgentNavigationId,
    resolveActiveAgentNavigation,
    type ActiveAgentNavigation,
} from './resolveActiveAgentNavigation';

/**
 * Translation function shape used by Header-specific hooks.
 *
 * @private type of Header
 */
type HeaderTranslate = (key: ServerTranslationKey, variables?: Record<string, string>) => string;

/**
 * Inputs required to resolve the active-agent context for the header.
 *
 * @private type of Header
 */
type UseHeaderActiveAgentOptions = {
    readonly agents: ReadonlyArray<AgentOrganizationAgent>;
    readonly agentFolders: ReadonlyArray<HeaderAgentMenuFolder>;
    readonly namingPlural: string;
    readonly pathname: string | null;
    readonly translate: HeaderTranslate;
};

/**
 * Derived active-agent state consumed by the Header component.
 *
 * @private type of Header
 */
type HeaderActiveAgentState = {
    readonly activeAgent: AgentOrganizationAgent | null;
    readonly activeAgentAvatarUrl: string | null;
    readonly activeAgentEmail: string;
    readonly activeAgentFolderContext: AgentFolderContext | null;
    readonly activeAgentHref: string;
    readonly activeAgentLabel: string;
    readonly activeAgentMenuAgent: AgentOrganizationAgent;
    readonly activeAgentNavigationId: string | null;
    readonly activeAgentOrigin: string;
    readonly activeAgentUrl: string;
    readonly activeAgentView: ActiveAgentNavigation['view'];
    readonly activeAgentViewLabel: ReactNode;
    readonly agentMenuTree: ReturnType<typeof buildAgentMenuStructure>['tree'];
};

/**
 * Creates a folder lookup table used by header hierarchy labels and folder actions.
 *
 * @private function of Header
 */
function createAgentFolderById(
    agentFolders: ReadonlyArray<HeaderAgentMenuFolder>,
): Map<number, HeaderAgentMenuFolder> {
    return new Map(agentFolders.map((folder) => [folder.id, folder]));
}

/**
 * Creates a lookup table keyed by every route identifier that can resolve one agent.
 *
 * @private function of Header
 */
function createAgentByIdentifier(
    agents: ReadonlyArray<AgentOrganizationAgent>,
): Map<string, AgentOrganizationAgent> {
    const agentByIdentifier = new Map<string, AgentOrganizationAgent>();

    for (const agent of agents) {
        agentByIdentifier.set(agent.agentName, agent);

        if (agent.permanentId) {
            agentByIdentifier.set(agent.permanentId, agent);
        }
    }

    return agentByIdentifier;
}

/**
 * Resolves the active agent from the parsed route context.
 *
 * @private function of Header
 */
function resolveActiveAgent(
    activeAgentNavigation: ActiveAgentNavigation,
    agentByIdentifier: ReadonlyMap<string, AgentOrganizationAgent>,
): AgentOrganizationAgent | null {
    if (!activeAgentNavigation.agentIdentifier) {
        return null;
    }

    return agentByIdentifier.get(activeAgentNavigation.agentIdentifier) || null;
}

/**
 * Resolves the canonical identifier used for the active agent route.
 *
 * @private function of Header
 */
function resolveActiveAgentNavigationId(
    activeAgent: AgentOrganizationAgent | null,
    activeAgentIdentifier: string | null,
): string | null {
    if (activeAgent) {
        return getAgentNavigationId(activeAgent);
    }

    return activeAgentIdentifier;
}

/**
 * Resolves the base href used by the active-agent header controls.
 *
 * @private function of Header
 */
function createActiveAgentHref(activeAgentNavigationId: string | null): string {
    if (!activeAgentNavigationId) {
        return '/agents';
    }

    return buildFreshAgentChatHref(activeAgentNavigationId);
}

/**
 * Resolves the breadcrumb label shown for the active agent.
 *
 * @private function of Header
 */
function createActiveAgentLabel(
    activeAgent: AgentOrganizationAgent | null,
    activeAgentIdentifier: string | null,
    agentFolderById: Map<number, HeaderAgentMenuFolder>,
    namingPlural: string,
    translate: HeaderTranslate,
): string {
    if (activeAgent) {
        return createAgentHierarchyLabel(activeAgent, agentFolderById);
    }

    return activeAgentIdentifier || translate('header.agentsLabelFallback', { agentsPlural: namingPlural });
}

/**
 * Reads the current browser origin and hostname when available.
 *
 * @private function of Header
 */
function readWindowLocationState(): { origin: string; hostname: string } {
    if (typeof window === 'undefined') {
        return {
            origin: '',
            hostname: '',
        };
    }

    return {
        origin: window.location.origin,
        hostname: window.location.hostname,
    };
}

/**
 * Resolves the shareable active-agent URL.
 *
 * @private function of Header
 */
function createActiveAgentUrl(activeAgentNavigationId: string | null, origin: string): string {
    if (!activeAgentNavigationId) {
        return '';
    }

    return `${origin}${buildAgentProfileHref(activeAgentNavigationId)}`;
}

/**
 * Resolves the shareable active-agent email address.
 *
 * @private function of Header
 */
function createActiveAgentEmail(activeAgentNavigationId: string | null, hostname: string): string {
    if (!activeAgentNavigationId || !hostname) {
        return '';
    }

    return `${activeAgentNavigationId}@${hostname}`;
}

/**
 * Resolves the active-agent context consumed by the Header component.
 *
 * @private function of Header
 */
export function useHeaderActiveAgent({
    agents,
    agentFolders,
    namingPlural,
    pathname,
    translate,
}: UseHeaderActiveAgentOptions): HeaderActiveAgentState {
    const agentMenuTree = useMemo(() => buildAgentMenuStructure(agents, agentFolders).tree, [agents, agentFolders]);
    const agentFolderById = useMemo(() => createAgentFolderById(agentFolders), [agentFolders]);
    const agentByIdentifier = useMemo(() => createAgentByIdentifier(agents), [agents]);
    const activeAgentNavigation = useMemo(() => resolveActiveAgentNavigation(pathname), [pathname]);
    const activeAgent = useMemo(
        () => resolveActiveAgent(activeAgentNavigation, agentByIdentifier),
        [activeAgentNavigation, agentByIdentifier],
    );
    const activeAgentNavigationId = resolveActiveAgentNavigationId(activeAgent, activeAgentNavigation.agentIdentifier);
    const activeAgentHref = createActiveAgentHref(activeAgentNavigationId);
    const activeAgentLabel = createActiveAgentLabel(
        activeAgent,
        activeAgentNavigation.agentIdentifier,
        agentFolderById,
        namingPlural,
        translate,
    );
    const activeAgentMenuAgent = useMemo(
        () => activeAgent || createFallbackAgent(activeAgentNavigationId),
        [activeAgent, activeAgentNavigationId],
    );
    const activeAgentFolderContext = useMemo(
        () => buildAgentFolderContext(activeAgentMenuAgent.folderId, agentFolderById),
        [activeAgentMenuAgent.folderId, agentFolderById],
    );
    const { origin, hostname } = readWindowLocationState();
    const activeAgentAvatarUrl = useMemo(
        () => (activeAgent ? resolveAgentAvatarImageUrl({ agent: activeAgent }) : null),
        [activeAgent],
    );

    return {
        activeAgent,
        activeAgentAvatarUrl,
        activeAgentEmail: createActiveAgentEmail(activeAgentNavigationId, hostname),
        activeAgentFolderContext,
        activeAgentHref,
        activeAgentLabel,
        activeAgentMenuAgent,
        activeAgentNavigationId,
        activeAgentOrigin: origin,
        activeAgentUrl: createActiveAgentUrl(activeAgentNavigationId, origin),
        activeAgentView: activeAgentNavigation.view,
        activeAgentViewLabel: activeAgentNavigation.view
            ? createAgentViewLabel(activeAgentNavigation.view, translate)
            : null,
        agentMenuTree,
    };
}
