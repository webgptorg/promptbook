import type { string_url } from '@promptbook-local/types';
import { AgentBasicInformation } from '../../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { AgentOrganizationFolder } from '../../../utils/agentOrganization/types';
import type { AgentVisibility } from '../../../utils/agentVisibility';

/**
 * Graph connection types supported by the UI.
 */
export const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;

/**
 * Default connection filters used when no selection is provided.
 */
export const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];

/**
 * Agent metadata plus visibility, server, and folder details used by the graph UI.
 */
export type AgentWithVisibility = AgentBasicInformation & {
    visibility?: AgentVisibility;
    serverUrl?: string;
    folderId?: number | null;
    sortOrder?: number;
};

/**
 * Graph connection types supported by the UI.
 */
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

/**
 * Link types used in the graph view.
 */
export type GraphLinkKind = ConnectionType | 'order';

/**
 * Visual styling for a node chip.
 */
export type NodeVisualStyle = {
    fill: string;
    border: string;
    ring: string;
    text: string;
};

/**
 * Props for the AgentsGraph component.
 */
export type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
    readonly folders: AgentOrganizationFolder[];
};

/**
 * Graph node data for a single agent.
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
 */
export type GraphLink = {
    source: string;
    target: string;
    type: GraphLinkKind;
};

/**
 * Aggregated nodes and links for rendering.
 */
export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
    orderLinks: GraphLink[];
    orderIndexByNodeId: Map<string, number>;
};

/**
 * Summary metrics derived from the current graph data.
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
 */
export type FolderGroup = {
    id: number | null;
    label: string;
    agents: GraphNode[];
};

/**
 * Server grouping information for layout.
 */
export type ServerGroup = {
    serverUrl: string;
    label: string;
    isLocal: boolean;
    folders: FolderGroup[];
};

/**
 * Layout metadata for a folder container.
 */
export type FolderLayout = {
    folder: FolderGroup;
    width: number;
    height: number;
    agentColumns: number;
    contentWidth: number;
    contentHeight: number;
    column?: number;
    row?: number;
    x?: number;
    y?: number;
};

/**
 * Layout metadata for a server container.
 */
export type ServerLayout = {
    serverGroup: ServerGroup;
    folderLayouts: FolderLayout[];
    width: number;
    height: number;
};

/**
 * Stored position for a draggable node.
 */
export type StoredNodePosition = {
    x: number;
    y: number;
    parentId: string;
};

/**
 * Record of stored positions by node id.
 */
export type StoredPositions = Record<string, StoredNodePosition>;

/**
 * Node data for agent nodes.
 */
export type AgentNodeData = {
    name: string;
    agent: AgentWithVisibility;
    imageUrl: string;
    placeholderUrl: string;
    tooltip: string;
    style: NodeVisualStyle;
    orderIndex: number | null;
    isDimmed?: boolean;
    isHighlighted?: boolean;
    isNeighbor?: boolean;
    onOpen: () => void;
};

/**
 * Node data for server group nodes.
 */
export type ServerGroupNodeData = {
    label: string;
    agentCount: number;
    isLocal: boolean;
};

/**
 * Node data for folder group nodes.
 */
export type FolderGroupNodeData = {
    label: string;
    agentCount: number;
};
