import { buildFolderTree, collectDescendantFolderIds } from '../agentOrganization/folderTree';
import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';

/**
 * Normalized name of the Core folder that defines canonical boilerplate agents.
 */
const DEFAULT_CORE_BOILERPLATE_FOLDER_NAME = 'default';

/**
 * Minimal agent shape returned by the public organization snapshot.
 */
export type FederatedOrganizationAgentSnapshot = {
    /**
     * Agent name shown by the remote server.
     */
    readonly agentName: string;
    /**
     * Stable remote permanent id, when available.
     */
    readonly permanentId?: string | null;
    /**
     * Public route URL of the remote agent, when provided by the source server.
     */
    readonly url?: string;
    /**
     * Folder placement on the remote server.
     */
    readonly folderId: number | null;
};

/**
 * Minimal folder shape returned by the public organization snapshot.
 */
export type FederatedOrganizationFolderSnapshot = {
    /**
     * Folder identifier on the remote server.
     */
    readonly id: number;
    /**
     * Folder label.
     */
    readonly name: string;
    /**
     * Parent folder identifier, or `null` for root.
     */
    readonly parentId: number | null;
};

/**
 * Public organization payload shape consumed from Core.
 */
export type FederatedOrganizationPayload = {
    /**
     * Whether the remote endpoint reported success.
     */
    readonly success?: boolean;
    /**
     * Public agents visible in the organization snapshot.
     */
    readonly agents?: ReadonlyArray<FederatedOrganizationAgentSnapshot>;
    /**
     * Public folders visible in the organization snapshot.
     */
    readonly folders?: ReadonlyArray<FederatedOrganizationFolderSnapshot>;
};

/**
 * Normalized remote default-agent candidate resolved from the Core organization snapshot.
 */
export type DefaultFederatedAgentCandidate = {
    /**
     * Stable normalized name used for cross-server matching.
     */
    readonly normalizedName: string;
    /**
     * Human-readable name exposed by the Core server.
     */
    readonly sourceAgentName: string;
    /**
     * Remote canonical identifier (`permanentId` when available, otherwise `agentName`).
     */
    readonly sourceAgentIdentifier: string;
    /**
     * Remote canonical route URL of the agent.
     */
    readonly sourceAgentUrl: string;
};

/**
 * Selects agents that belong to the Core `default` folder subtree.
 *
 * The result is deduplicated by normalized name so matching stays stable across servers
 * even when the remote payload contains aliases or repeated entries.
 *
 * @param payload - Public organization payload fetched from Core.
 * @param coreServerUrl - Base URL of the Core server.
 * @returns Canonical default-agent candidates keyed by normalized name.
 */
export function selectDefaultFederatedAgentsFromOrganizationPayload(
    payload: FederatedOrganizationPayload,
    coreServerUrl: string,
): Array<DefaultFederatedAgentCandidate> {
    const folders = Array.isArray(payload.folders) ? payload.folders : [];
    const agents = Array.isArray(payload.agents) ? payload.agents : [];
    const defaultFolderIds = resolveDefaultFolderIds(folders);
    const candidatesByNormalizedName = new Map<string, DefaultFederatedAgentCandidate>();

    for (const agent of agents) {
        if (agent.folderId === null || !defaultFolderIds.has(agent.folderId)) {
            continue;
        }

        const normalizedName = normalizeAgentName(agent.agentName);
        if (candidatesByNormalizedName.has(normalizedName)) {
            continue;
        }

        const sourceAgentIdentifier = agent.permanentId || agent.agentName;
        candidatesByNormalizedName.set(normalizedName, {
            normalizedName,
            sourceAgentName: agent.agentName,
            sourceAgentIdentifier,
            sourceAgentUrl: resolveFederatedAgentRouteUrl(coreServerUrl, sourceAgentIdentifier, agent.url),
        });
    }

    return Array.from(candidatesByNormalizedName.values());
}

/**
 * Resolves the full set of folder ids that belong to the remote `default` subtree.
 *
 * @param folders - Public folders exposed by the remote server.
 * @returns Folder ids of all matching `default` roots plus their descendants.
 */
function resolveDefaultFolderIds(folders: ReadonlyArray<FederatedOrganizationFolderSnapshot>): Set<number> {
    const { childrenByParentId } = buildFolderTree([...folders]);
    const defaultFolderIds = new Set<number>();

    for (const folder of folders) {
        if (normalizeAgentName(folder.name) !== DEFAULT_CORE_BOILERPLATE_FOLDER_NAME) {
            continue;
        }

        for (const descendantId of collectDescendantFolderIds(folder.id, childrenByParentId)) {
            defaultFolderIds.add(descendantId);
        }
    }

    return defaultFolderIds;
}

/**
 * Builds a stable public route URL for one remote agent.
 *
 * @param coreServerUrl - Base URL of the Core server.
 * @param sourceAgentIdentifier - Canonical remote identifier.
 * @param sourceAgentUrl - Optional URL already provided by the remote payload.
 * @returns Absolute agent route URL.
 */
function resolveFederatedAgentRouteUrl(
    coreServerUrl: string,
    sourceAgentIdentifier: string,
    sourceAgentUrl?: string,
): string {
    if (typeof sourceAgentUrl === 'string' && sourceAgentUrl.trim() !== '') {
        return sourceAgentUrl;
    }

    return new URL(`/agents/${encodeURIComponent(sourceAgentIdentifier)}`, ensureTrailingSlash(coreServerUrl)).href;
}

/**
 * Normalizes a server base URL so relative `URL` construction stays predictable.
 *
 * @param value - Raw base URL.
 * @returns Base URL with exactly one trailing slash.
 */
function ensureTrailingSlash(value: string): string {
    return `${value.replace(/\/+$/g, '')}/`;
}
