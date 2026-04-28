import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AvatarVisualId } from '../../../../../src/avatars/types/AvatarVisualDefinition';
import type { AgentVisibility } from '../../utils/agentVisibility';

/**
 * Supported graph link categories.
 *
 * @private function of AgentsGraph
 */
export const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;

/**
 * Default connection categories shown in the graph.
 *
 * @private function of AgentsGraph
 */
export const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];

/**
 * Agent metadata plus visibility, server, and folder details used by the graph UI.
 *
 * @private function of AgentsGraph
 */
export type AgentWithVisibility = AgentBasicInformation & {
    visibility?: AgentVisibility;
    serverUrl?: string;
    url?: string;

    /**
     * Server-wide default built-in visual resolved for federated agents.
     */
    defaultAgentAvatarVisualId?: AvatarVisualId;
    folderId?: number | null;
    sortOrder?: number;
};

/**
 * Graph connection types supported by the UI.
 *
 * @private function of AgentsGraph
 */
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

/**
 * Link types used in the graph view.
 *
 * @private function of AgentsGraph
 */
export type GraphLinkKind = ConnectionType | 'order';

/**
 * Graph node data for a single agent.
 *
 * @private function of AgentsGraph
 */
export type GraphNode = {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    serverUrl: string;
    isLocal: boolean;
    folderId: number | null;
    sortOrder: number;
};

/**
 * Graph link between two agents.
 *
 * @private function of AgentsGraph
 */
export type GraphLink = {
    source: string;
    target: string;
    type: GraphLinkKind;
};

/**
 * Aggregated nodes and links for rendering.
 *
 * @private function of AgentsGraph
 */
export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
    orderLinks: GraphLink[];
    orderIndexByNodeId: Map<string, number>;
};

/**
 * Summary metrics derived from the current graph data.
 *
 * @private function of AgentsGraph
 */
export type GraphSummaryInfo = {
    agentCount: number;
    serverCount: number;
    totalConnections: number;
    connectionCountByType: Record<ConnectionType, number>;
    orderLinkCount: number;
};

/**
 * Inputs needed to build the graph data structure.
 *
 * @private function of AgentsGraph
 */
export type GraphDataInput = {
    agents: AgentWithVisibility[];
    federatedAgents: AgentWithVisibility[];
    filterType: ConnectionType[];
    selectedServerUrl: string | null;
    selectedAgentName: string | null;
    publicUrl: string;
};

/**
 * Folder grouping information for layout.
 *
 * @private function of AgentsGraph
 */
export type FolderGroup = {
    id: number | null;
    label: string;
    agents: GraphNode[];
};

/**
 * Server grouping information for layout.
 *
 * @private function of AgentsGraph
 */
export type ServerGroup = {
    serverUrl: string;
    label: string;
    isLocal: boolean;
    folders: FolderGroup[];
};

/**
 * Visual style definitions for each graph edge kind.
 *
 * @private function of AgentsGraph
 */
export const EDGE_STYLES: Record<GraphLinkKind, { color: string; width: number; dash?: string }> = {
    inheritance: { color: '#38bdf8', width: 1.6, dash: '6 6' },
    import: { color: '#94a3b8', width: 1.25 },
    team: { color: '#34d399', width: 2.5 },
    order: { color: '#f59e0b', width: 1.1, dash: '2 6' },
};

/**
 * Human-readable labels for each graph edge kind.
 *
 * @private function of AgentsGraph
 */
export const EDGE_LABELS: Record<GraphLinkKind, string> = {
    inheritance: 'Parent',
    import: 'Import',
    team: 'Team',
    order: 'Folder order',
};
