'use client';

import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { string_url } from '@promptbook-local/types';
import { renderMermaid } from 'beautiful-mermaid';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;
const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];
const GRAPH_MIN_HEIGHT = 480;
const GRAPH_HEIGHT_OFFSET = 340;
const MERMAID_LABEL_TOKEN = '__PB_NODE__';
const MERMAID_LABEL_PADDING = '            ';
const MERMAID_NODE_RADIUS = 18;
const MERMAID_NODE_BORDER_WIDTH = 1.2;
const MERMAID_NODE_TEXT_COLOR = '#0f172a';
const MERMAID_NODE_SHADOW_ID = 'pb-agent-node-shadow';
const MERMAID_NODE_SHADOW_COLOR = '#0f172a';
const MERMAID_NODE_SHADOW_OPACITY = 0.12;
const MERMAID_NODE_SHADOW_BLUR = 10;
const MERMAID_NODE_SHADOW_OFFSET_Y = 6;
const MERMAID_IMAGE_SIZE = 28;
const MERMAID_IMAGE_PADDING = 8;
const MERMAID_TEXT_PADDING = 12;
const MERMAID_LABEL_FONT_WEIGHT = '600';
const MERMAID_LABEL_FONT_SIZE = 13;
const MERMAID_LABEL_LETTER_SPACING = '0.01em';
const MERMAID_AVATAR_RING_WIDTH = 1.5;
const MERMAID_AVATAR_RING_PADDING = 1.5;
const MERMAID_AVATAR_RING_FILL = '#ffffff';
const MERMAID_NODE_SHAPE_HEXAGON_INDENT = 14;
const MERMAID_NODE_SHAPE_CUT_SIZE = 10;
const MERMAID_CLUSTER_FILL = '#f1f5f9';
const MERMAID_CLUSTER_STROKE = '#e2e8f0';
const MERMAID_CLUSTER_TEXT = '#64748b';
const MERMAID_CLUSTER_BORDER_WIDTH = 1;
const MERMAID_CLUSTER_RADIUS = 18;
const MERMAID_LAYOUT_BREAKPOINT = 900;
const MERMAID_FLOWCHART_NODE_SPACING = 52;
const MERMAID_FLOWCHART_RANK_SPACING = 96;
const MERMAID_INIT = `%%{init: {"flowchart":{"curve":"basis","nodeSpacing":${MERMAID_FLOWCHART_NODE_SPACING},"rankSpacing":${MERMAID_FLOWCHART_RANK_SPACING}}}}%%`;
const MERMAID_THEME = {
    bg: '#f8fafc',
    fg: '#0f172a',
    line: '#cbd5e1',
    accent: '#38bdf8',
    muted: '#94a3b8',
    surface: '#ffffff',
    border: '#e2e8f0',
    transparent: true,
};
const MERMAID_NODE_STYLES: Record<NodeCategory, NodeVisualStyle> = {
    LOCAL: {
        fill: '#ffffff',
        border: '#38bdf8',
        ring: '#38bdf8',
        shape: 'rounded',
    },
    FEDERATED: {
        fill: '#f0fdf4',
        border: '#22c55e',
        ring: '#22c55e',
        shape: 'hexagon',
    },
    PRIVATE: {
        fill: '#fff7ed',
        border: '#f59e0b',
        ring: '#f59e0b',
        shape: 'cut',
    },
};
const MERMAID_EDGE_STYLES: Record<ConnectionType, string> = {
    inheritance: '---',
    import: '---',
    team: '---',
};
const MERMAID_EDGE_COLORS: Record<ConnectionType, string> = {
    inheritance: '#38bdf8',
    import: '#94a3b8',
    team: '#34d399',
};
const MERMAID_EDGE_WIDTHS: Record<ConnectionType, number> = {
    inheritance: 1.5,
    import: 1.25,
    team: 2.5,
};
const MERMAID_EDGE_DASHES: Partial<Record<ConnectionType, string>> = {
    inheritance: '6 6',
};
const MERMAID_EDGE_OPACITY = 0.7;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Agent metadata plus visibility and server details used by the graph UI.
 */
type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
    serverUrl?: string;
};

/**
 * Graph connection types supported by the UI.
 */
type ConnectionType = (typeof CONNECTION_TYPES)[number];

/**
 * Visual category for agent nodes in the graph.
 */
type NodeCategory = 'LOCAL' | 'FEDERATED' | 'PRIVATE';

/**
 * Shape variants supported for node rendering.
 */
type NodeShape = 'rounded' | 'hexagon' | 'cut';

/**
 * Visual styling for a node category.
 */
type NodeVisualStyle = {
    fill: string;
    border: string;
    ring: string;
    shape: NodeShape;
};

/**
 * Props for the AgentsGraph component.
 */
type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
};

/**
 * Graph node data for a single agent.
 */
type GraphNode = {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    serverUrl: string;
    imageUrl: string | null;
    isLocal: boolean;
};

/**
 * Graph link between two agents.
 */
type GraphLink = {
    source: string;
    target: string;
    type: ConnectionType;
};

/**
 * Aggregated nodes and links for rendering.
 */
type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

/**
 * Cached image load status.
 */
type ImageLoadStatus = 'loading' | 'success' | 'error';

/**
 * Inputs needed to build the graph data structure.
 */
type GraphDataInput = {
    agents: AgentWithVisibility[];
    federatedAgents: AgentWithVisibility[];
    filterType: ConnectionType[];
    selectedServerUrl: string | null;
    selectedAgentName: string | null;
    publicUrl: string;
};

/**
 * Structured data for a Mermaid-rendered agent node.
 */
type MermaidNode = {
    mermaidId: string;
    graphNodeId: string;
    displayName: string;
    agent: AgentWithVisibility;
    serverUrl: string;
    isLocal: boolean;
    explicitImageUrl: string | null;
    placeholderImageUrl: string;
    tooltip: string;
};

/**
 * Mermaid graph data plus node lookup.
 */
type MermaidGraph = {
    diagram: string;
    nodes: MermaidNode[];
};

/**
 * Normalize a server URL by removing any trailing slash.
 */
const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');

/**
 * Normalize a selected agent identifier by stripping agent URL prefixes.
 */
const normalizeSelectedAgentIdentifier = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const withoutHash = trimmed.split('#')[0] ?? trimmed;
    const withoutQuery = withoutHash.split('?')[0] ?? withoutHash;
    const normalized = withoutQuery.replace(/\/$/, '');
    const agentsIndex = normalized.lastIndexOf('/agents/');
    if (agentsIndex >= 0) {
        return normalized.slice(agentsIndex + '/agents/'.length);
    }

    return normalized.replace(/^\/agents\//, '');
};

/**
 * Parse the selected agent input into identifier and optional server URL.
 */
const parseSelectedAgentInput = (value: string): { identifier: string; serverUrl: string | null } => {
    const trimmed = value.trim();
    if (!trimmed) {
        return { identifier: '', serverUrl: null };
    }

    if (trimmed.includes('://') && trimmed.includes('/agents/')) {
        const [serverPart] = trimmed.split('/agents/');
        return {
            identifier: normalizeSelectedAgentIdentifier(trimmed),
            serverUrl: normalizeServerUrl(serverPart),
        };
    }

    return { identifier: normalizeSelectedAgentIdentifier(trimmed), serverUrl: null };
};

/**
 * Check whether the agent matches the selected identifier.
 */
const matchesSelectedAgentIdentifier = (agent: AgentWithVisibility, identifier: string): boolean => {
    if (!identifier) {
        return false;
    }

    return agent.agentName === identifier || agent.permanentId === identifier;
};

/**
 * Check if a capability type is a graph connection type.
 */
const isConnectionType = (value: string): value is ConnectionType => CONNECTION_TYPES.includes(value as ConnectionType);

/**
 * Parse URL query parameters into a list of connection types.
 */
const parseConnectionTypes = (value: string | null): ConnectionType[] => {
    if (!value) {
        return DEFAULT_CONNECTION_TYPES;
    }

    const selected = value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => isConnectionType(item)) as ConnectionType[];

    return selected.length > 0 ? selected : DEFAULT_CONNECTION_TYPES;
};

/**
 * Return the canonical server URL for the agent or the fallback base.
 */
const getAgentServerUrl = (agent: AgentWithVisibility, fallbackServerUrl: string): string =>
    normalizeServerUrl(agent.serverUrl || fallbackServerUrl);

/**
 * Build a stable node id for the agent.
 */
const buildAgentNodeId = (agent: AgentWithVisibility, fallbackServerUrl: string): string => {
    const serverUrl = getAgentServerUrl(agent, fallbackServerUrl);
    return `${serverUrl}/${agent.agentName}`;
};

/**
 * Build the display name used for node labels.
 */
const getAgentDisplayName = (agent: AgentWithVisibility): string => agent.meta.fullname || agent.agentName;

/**
 * Build the tooltip text for the node.
 */
const getAgentTooltip = (agent: AgentWithVisibility): string =>
    agent.meta.description || agent.personaDescription || agent.agentName;

/**
 * Resolve the agent image URL, falling back to null if none is set.
 */
const getAgentExplicitImageUrl = (agent: AgentWithVisibility): string | null => agent.meta.image || null;

/**
 * Resolve a placeholder image URL for the agent.
 */
const getAgentPlaceholderImageUrl = (agent: AgentWithVisibility, publicUrl: string): string =>
    generatePlaceholderAgentProfileImageUrl(agent.agentName, publicUrl);

/**
 * Normalize a target agent URL from a capability link.
 */
const normalizeTargetAgentUrl = (agent: AgentWithVisibility, targetUrl: string, fallbackServerUrl: string): string => {
    if (targetUrl.includes('://')) {
        return targetUrl;
    }

    const baseUrl = getAgentServerUrl(agent, fallbackServerUrl);
    const sanitizedTarget = targetUrl
        .replace(/^\.\//, '')
        .replace(/^\/agents\//, '')
        .replace(/^\//, '');

    return `${baseUrl}/agents/${sanitizedTarget}`;
};

/**
 * Check whether an agent matches a target URL.
 */
const matchesAgentUrl = (agent: AgentWithVisibility, targetUrl: string, fallbackServerUrl: string): boolean => {
    const baseUrl = getAgentServerUrl(agent, fallbackServerUrl);
    const nameUrl = `${baseUrl}/agents/${agent.agentName}`;
    const permanentUrl = agent.permanentId ? `${baseUrl}/agents/${agent.permanentId}` : null;
    const explicitUrl = (agent as AgentWithVisibility & { url?: string }).url;

    return nameUrl === targetUrl || permanentUrl === targetUrl || explicitUrl === targetUrl;
};

/**
 * Resolve focused node ids based on server and agent selection.
 */
const resolveFocusedNodeIds = (
    nodes: GraphNode[],
    selectedServerUrl: string | null,
    selectedAgentName: string | null,
): Set<string> => {
    if (!selectedAgentName) {
        return new Set();
    }

    const parsedSelection = parseSelectedAgentInput(selectedAgentName);
    if (!parsedSelection.identifier) {
        return new Set();
    }

    const serverFilter =
        parsedSelection.serverUrl && parsedSelection.serverUrl !== 'ALL'
            ? parsedSelection.serverUrl
            : selectedServerUrl && selectedServerUrl !== 'ALL'
            ? selectedServerUrl
            : null;

    const focusedNodes = nodes.filter((node) => {
        if (serverFilter && node.serverUrl !== serverFilter) {
            return false;
        }

        return matchesSelectedAgentIdentifier(node.agent, parsedSelection.identifier);
    });

    return new Set(focusedNodes.map((node) => node.id));
};

/**
 * Collect node ids connected to any focused node via graph links.
 */
const collectRelatedNodeIds = (links: GraphLink[], focusedNodeIds: Set<string>): Set<string> => {
    const relatedNodeIds = new Set(focusedNodeIds);

    links.forEach((link) => {
        if (focusedNodeIds.has(link.source)) {
            relatedNodeIds.add(link.target);
        }

        if (focusedNodeIds.has(link.target)) {
            relatedNodeIds.add(link.source);
        }
    });

    return relatedNodeIds;
};

/**
 * Build the graph nodes and links from agents and filters.
 */
const buildGraphData = (input: GraphDataInput): GraphData => {
    const { agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, publicUrl } = input;
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const allAgents = [...agents, ...federatedAgents];

    const nodes: GraphNode[] = allAgents.map((agent) => {
        const serverUrl = getAgentServerUrl(agent, normalizedPublicUrl);
        const id = buildAgentNodeId(agent, normalizedPublicUrl);

        return {
            id,
            name: getAgentDisplayName(agent),
            agent,
            serverUrl,
            imageUrl: getAgentExplicitImageUrl(agent),
            isLocal: serverUrl === normalizedPublicUrl,
        };
    });

    const links: GraphLink[] = [];

    allAgents.forEach((agent) => {
        const agentNodeId = buildAgentNodeId(agent, normalizedPublicUrl);

        agent.capabilities?.forEach((capability) => {
            if (!capability.agentUrl || !isConnectionType(capability.type)) {
                return;
            }

            if (!filterType.includes(capability.type)) {
                return;
            }

            const targetUrl = normalizeTargetAgentUrl(agent, capability.agentUrl, normalizedPublicUrl);
            const targetAgent = allAgents.find((candidate) =>
                matchesAgentUrl(candidate, targetUrl, normalizedPublicUrl),
            );

            if (!targetAgent) {
                return;
            }

            links.push({
                source: agentNodeId,
                target: buildAgentNodeId(targetAgent, normalizedPublicUrl),
                type: capability.type,
            });
        });
    });

    let filteredNodes = nodes;
    let filteredLinks = links;
    const normalizedSelectedServerUrl =
        selectedServerUrl && selectedServerUrl !== 'ALL' ? normalizeServerUrl(selectedServerUrl) : selectedServerUrl;

    const focusedNodeIds = resolveFocusedNodeIds(nodes, normalizedSelectedServerUrl, selectedAgentName);

    if (focusedNodeIds.size > 0) {
        const relatedNodeIds = collectRelatedNodeIds(links, focusedNodeIds);
        filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
        filteredLinks = links.filter((link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target));
    } else if (normalizedSelectedServerUrl && normalizedSelectedServerUrl !== 'ALL') {
        const serverNodes = nodes.filter((node) => node.serverUrl === normalizedSelectedServerUrl);
        const serverNodeIds = new Set(serverNodes.map((node) => node.id));
        filteredNodes = serverNodes;
        filteredLinks = links.filter((link) => serverNodeIds.has(link.source) && serverNodeIds.has(link.target));
    } else if (selectedAgentName) {
        filteredNodes = [];
        filteredLinks = [];
    }

    return { nodes: filteredNodes, links: filteredLinks };
};

/**
 * Sanitize a Mermaid node identifier for safe rendering.
 */
const sanitizeMermaidId = (value: string): string => value.replace(/[^a-zA-Z0-9_]/g, '_');

/**
 * Escape a Mermaid label value for safe rendering.
 */
const escapeMermaidLabel = (value: string): string => value.replace(/"/g, '\\"');

/**
 * Build a Mermaid label with a hidden token for node mapping.
 */
const buildMermaidLabel = (label: string, mermaidId: string): string =>
    `${MERMAID_LABEL_PADDING}${label}${MERMAID_LABEL_TOKEN}${mermaidId}`;

/**
 * Build the Mermaid linkStyle clause for a connection type.
 */
const buildMermaidLinkStyle = (type: ConnectionType): string => {
    const dashPattern = MERMAID_EDGE_DASHES[type];
    const styles = [
        `stroke:${MERMAID_EDGE_COLORS[type]}`,
        `stroke-width:${MERMAID_EDGE_WIDTHS[type]}px`,
        `opacity:${MERMAID_EDGE_OPACITY}`,
        'stroke-linecap:round',
        'stroke-linejoin:round',
    ];

    if (dashPattern) {
        styles.push(`stroke-dasharray:${dashPattern}`);
    }

    return styles.join(',');
};

/**
 * Build Mermaid graph data for the current set of agents.
 */
const buildMermaidGraph = (graphData: GraphData, publicUrl: string, direction: 'LR' | 'TB'): MermaidGraph => {
    if (graphData.nodes.length === 0) {
        return { diagram: '', nodes: [] };
    }

    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const nodes: MermaidNode[] = graphData.nodes.map((node, index) => {
        const mermaidId = sanitizeMermaidId(`node_${index}_${node.id}`);
        const displayName = getAgentDisplayName(node.agent);
        const explicitImageUrl = getAgentExplicitImageUrl(node.agent);
        const placeholderImageUrl = getAgentPlaceholderImageUrl(node.agent, publicUrl);

        return {
            mermaidId,
            graphNodeId: node.id,
            displayName,
            agent: node.agent,
            serverUrl: node.serverUrl,
            isLocal: node.serverUrl === normalizedPublicUrl,
            explicitImageUrl,
            placeholderImageUrl,
            tooltip: getAgentTooltip(node.agent),
        };
    });

    const nodeIdLookup = new Map(nodes.map((node) => [node.graphNodeId, node.mermaidId]));
    const groupedByServer = nodes.reduce<Record<string, MermaidNode[]>>((groups, node) => {
        const key = node.serverUrl;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key]!.push(node);
        return groups;
    }, {});

    const sortedServers = Object.keys(groupedByServer).sort((left, right) => {
        if (left === normalizedPublicUrl) {
            return -1;
        }
        if (right === normalizedPublicUrl) {
            return 1;
        }
        return left.localeCompare(right);
    });

    const lines: string[] = [MERMAID_INIT, `flowchart ${direction}`];
    const linkStyleLines: string[] = [];
    let linkIndex = 0;

    sortedServers.forEach((serverUrl, index) => {
        const clusterId = sanitizeMermaidId(`server_${index}_${serverUrl}`);
        const label = serverUrl.replace(/^https?:\/\//, '');
        lines.push(`subgraph ${clusterId}["${escapeMermaidLabel(label)}"]`);
        groupedByServer[serverUrl]!.forEach((node) => {
            const labelWithToken = buildMermaidLabel(node.displayName, node.mermaidId);
            lines.push(`  ${node.mermaidId}["${escapeMermaidLabel(labelWithToken)}"]`);
        });
        lines.push('end');
    });

    graphData.links.forEach((link) => {
        const sourceId = nodeIdLookup.get(link.source);
        const targetId = nodeIdLookup.get(link.target);
        if (!sourceId || !targetId) {
            return;
        }

        const edgeStyle = MERMAID_EDGE_STYLES[link.type];
        lines.push(`${sourceId} ${edgeStyle} ${targetId}`);
        linkStyleLines.push(`linkStyle ${linkIndex} ${buildMermaidLinkStyle(link.type)}`);
        linkIndex += 1;
    });

    lines.push(...linkStyleLines);

    return { diagram: lines.join('\n'), nodes };
};

/**
 * Resolve the styling category for an agent node.
 */
const resolveNodeCategory = (node: MermaidNode): NodeCategory => {
    if (node.agent.visibility === 'PRIVATE') {
        return 'PRIVATE';
    }

    return node.isLocal ? 'LOCAL' : 'FEDERATED';
};

/**
 * Resolve the visual style for a node category.
 */
const resolveNodeStyle = (node: MermaidNode): NodeVisualStyle => MERMAID_NODE_STYLES[resolveNodeCategory(node)];

/**
 * Build hexagon polygon points within a rectangle.
 */
const buildHexagonPoints = (x: number, y: number, width: number, height: number): string => {
    const indent = Math.min(MERMAID_NODE_SHAPE_HEXAGON_INDENT, height / 2, width / 4);
    const midY = y + height / 2;
    const right = x + width;
    const bottom = y + height;

    return [
        `${x + indent},${y}`,
        `${right - indent},${y}`,
        `${right},${midY}`,
        `${right - indent},${bottom}`,
        `${x + indent},${bottom}`,
        `${x},${midY}`,
    ].join(' ');
};

/**
 * Build cut-corner polygon points within a rectangle.
 */
const buildCutCornerPoints = (x: number, y: number, width: number, height: number): string => {
    const cutSize = Math.min(MERMAID_NODE_SHAPE_CUT_SIZE, height / 3, width / 6);
    const right = x + width;
    const bottom = y + height;

    return [
        `${x + cutSize},${y}`,
        `${right - cutSize},${y}`,
        `${right},${y + cutSize}`,
        `${right},${bottom - cutSize}`,
        `${right - cutSize},${bottom}`,
        `${x + cutSize},${bottom}`,
        `${x},${bottom - cutSize}`,
        `${x},${y + cutSize}`,
    ].join(' ');
};

/**
 * Create an SVG element that represents the node shape.
 */
const createNodeShapeElement = (
    document: Document,
    shape: NodeShape,
    rect: { x: number; y: number; width: number; height: number },
    style: NodeVisualStyle,
    nodeShadowId: string,
    mermaidId: string,
): SVGElement => {
    let element: SVGElement;

    if (shape === 'rounded') {
        const rectElement = document.createElementNS(SVG_NAMESPACE, 'rect');
        rectElement.setAttribute('x', rect.x.toString());
        rectElement.setAttribute('y', rect.y.toString());
        rectElement.setAttribute('width', rect.width.toString());
        rectElement.setAttribute('height', rect.height.toString());
        rectElement.setAttribute('rx', MERMAID_NODE_RADIUS.toString());
        rectElement.setAttribute('ry', MERMAID_NODE_RADIUS.toString());
        element = rectElement;
    } else {
        const polygon = document.createElementNS(SVG_NAMESPACE, 'polygon');
        const points =
            shape === 'hexagon'
                ? buildHexagonPoints(rect.x, rect.y, rect.width, rect.height)
                : buildCutCornerPoints(rect.x, rect.y, rect.width, rect.height);
        polygon.setAttribute('points', points);
        polygon.setAttribute('stroke-linejoin', 'round');
        element = polygon;
    }

    element.setAttribute('fill', style.fill);
    element.setAttribute('stroke', style.border);
    element.setAttribute('stroke-width', MERMAID_NODE_BORDER_WIDTH.toString());
    element.setAttribute('filter', `url(#${nodeShadowId})`);
    element.setAttribute('data-node-id', mermaidId);
    element.setAttribute('style', 'cursor: pointer;');

    return element;
};

/**
 * Determine the image URL for the node based on load status.
 */
const resolveNodeImageUrl = (node: MermaidNode, status: ImageLoadStatus | undefined): string => {
    if (!node.explicitImageUrl) {
        return node.placeholderImageUrl;
    }

    if (status === 'success') {
        return node.explicitImageUrl;
    }

    return node.placeholderImageUrl;
};

/**
 * Parse a numeric SVG attribute with a fallback.
 */
const parseSvgNumber = (value: string | null, fallback = 0): number => {
    const parsed = Number.parseFloat(value ?? '');
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Find the node rectangle associated with a label element.
 */
const findNodeRectForLabel = (text: SVGTextElement): SVGRectElement | null => {
    const group = text.closest('g.node');
    if (!group) {
        return null;
    }

    return group.querySelector('rect') as SVGRectElement | null;
};

/**
 * Ensure the SVG has a <defs> element for clip paths.
 */
const ensureSvgDefs = (svg: SVGSVGElement, document: Document): SVGDefsElement => {
    const existingDefs = svg.querySelector('defs');
    if (existingDefs) {
        return existingDefs;
    }

    const defs = document.createElementNS(SVG_NAMESPACE, 'defs') as SVGDefsElement;
    const styleNode = svg.querySelector('style');

    if (styleNode?.nextSibling) {
        svg.insertBefore(defs, styleNode.nextSibling);
    } else {
        svg.insertBefore(defs, svg.firstChild);
    }

    return defs;
};

/**
 * Ensure the SVG has a drop shadow filter for node cards.
 */
const ensureSvgNodeShadow = (defs: SVGDefsElement, document: Document): string => {
    const existing = defs.querySelector(`#${MERMAID_NODE_SHADOW_ID}`);
    if (existing) {
        return MERMAID_NODE_SHADOW_ID;
    }

    const filter = document.createElementNS(SVG_NAMESPACE, 'filter');
    filter.setAttribute('id', MERMAID_NODE_SHADOW_ID);
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');

    const dropShadow = document.createElementNS(SVG_NAMESPACE, 'feDropShadow');
    dropShadow.setAttribute('dx', '0');
    dropShadow.setAttribute('dy', MERMAID_NODE_SHADOW_OFFSET_Y.toString());
    dropShadow.setAttribute('stdDeviation', MERMAID_NODE_SHADOW_BLUR.toString());
    dropShadow.setAttribute('flood-color', MERMAID_NODE_SHADOW_COLOR);
    dropShadow.setAttribute('flood-opacity', MERMAID_NODE_SHADOW_OPACITY.toString());
    filter.appendChild(dropShadow);
    defs.appendChild(filter);

    return MERMAID_NODE_SHADOW_ID;
};

/**
 * Apply soft styling to Mermaid cluster containers.
 */
const styleClusterElements = (svg: SVGSVGElement): void => {
    const clusterRects = Array.from(svg.querySelectorAll('g.cluster rect')) as SVGRectElement[];
    const clusterLabels = Array.from(svg.querySelectorAll('g.cluster text')) as SVGTextElement[];

    clusterRects.forEach((rect) => {
        rect.setAttribute('rx', MERMAID_CLUSTER_RADIUS.toString());
        rect.setAttribute('ry', MERMAID_CLUSTER_RADIUS.toString());
        rect.setAttribute('fill', MERMAID_CLUSTER_FILL);
        rect.setAttribute('stroke', MERMAID_CLUSTER_STROKE);
        rect.setAttribute('stroke-width', MERMAID_CLUSTER_BORDER_WIDTH.toString());
    });

    clusterLabels.forEach((label) => {
        label.setAttribute('fill', MERMAID_CLUSTER_TEXT);
        label.setAttribute('font-weight', MERMAID_LABEL_FONT_WEIGHT);
        label.setAttribute('font-size', MERMAID_LABEL_FONT_SIZE.toString());
    });
};

/**
 * Decorate Mermaid SVG output with agent avatars and interaction hooks.
 */
const decorateMermaidSvg = (
    svgMarkup: string,
    nodes: MermaidNode[],
    imageStatusMap: Record<string, ImageLoadStatus>,
): string => {
    const parser = new DOMParser();
    const document = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = document.querySelector('svg');

    if (!svg) {
        return svgMarkup;
    }

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const defs = ensureSvgDefs(svg, document);
    const nodeLookup = new Map(nodes.map((node) => [node.mermaidId, node]));
    const nodeShadowId = ensureSvgNodeShadow(defs, document);
    styleClusterElements(svg);
    const textNodes = Array.from(svg.querySelectorAll('text')).filter((text) =>
        text.textContent?.includes(MERMAID_LABEL_TOKEN),
    );

    textNodes.forEach((text) => {
        const rawValue = text.textContent ?? '';
        const [labelWithPadding, mermaidId] = rawValue.split(MERMAID_LABEL_TOKEN);

        if (!mermaidId) {
            return;
        }

        const node = nodeLookup.get(mermaidId);
        if (!node) {
            return;
        }

        const label = labelWithPadding.trimStart();
        text.textContent = label;
        text.setAttribute('data-node-id', mermaidId);
        text.setAttribute('text-anchor', 'start');
        text.setAttribute('xml:space', 'preserve');

        const rect = findNodeRectForLabel(text);

        if (!rect) {
            return;
        }

        const rectX = parseSvgNumber(rect.getAttribute('x'));
        const rectY = parseSvgNumber(rect.getAttribute('y'));
        const rectWidth = parseSvgNumber(rect.getAttribute('width'));
        const rectHeight = parseSvgNumber(rect.getAttribute('height'));
        const imageSize = Math.max(0, Math.min(MERMAID_IMAGE_SIZE, rectHeight - MERMAID_IMAGE_PADDING * 2));
        if (imageSize === 0) {
            return;
        }
        const imageX = rectX + MERMAID_IMAGE_PADDING;
        const imageY = rectY + (rectHeight - imageSize) / 2;
        const textX = imageX + imageSize + MERMAID_TEXT_PADDING;
        const nodeStyle = resolveNodeStyle(node);
        const ringColor = nodeStyle.ring;
        const ringRadius = imageSize / 2 + MERMAID_AVATAR_RING_PADDING;

        const shapeElement = createNodeShapeElement(
            document,
            nodeStyle.shape,
            {
                x: rectX,
                y: rectY,
                width: rectWidth,
                height: rectHeight,
            },
            nodeStyle,
            nodeShadowId,
            mermaidId,
        );
        rect.replaceWith(shapeElement);

        text.setAttribute('x', textX.toString());
        text.setAttribute('y', (rectY + rectHeight / 2).toString());
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-weight', MERMAID_LABEL_FONT_WEIGHT);
        text.setAttribute('font-size', MERMAID_LABEL_FONT_SIZE.toString());
        text.setAttribute('letter-spacing', MERMAID_LABEL_LETTER_SPACING);
        text.setAttribute('fill', MERMAID_NODE_TEXT_COLOR);
        text.setAttribute('style', 'cursor: pointer;');

        const imageUrl = resolveNodeImageUrl(node, imageStatusMap[node.graphNodeId]);
        const clipId = sanitizeMermaidId(`clip_${mermaidId}`);
        const clipPath = document.createElementNS(SVG_NAMESPACE, 'clipPath');
        clipPath.setAttribute('id', clipId);

        const clipCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
        clipCircle.setAttribute('cx', (imageX + imageSize / 2).toString());
        clipCircle.setAttribute('cy', (imageY + imageSize / 2).toString());
        clipCircle.setAttribute('r', (imageSize / 2).toString());
        clipPath.appendChild(clipCircle);
        defs.appendChild(clipPath);

        const ring = document.createElementNS(SVG_NAMESPACE, 'circle');
        ring.setAttribute('cx', (imageX + imageSize / 2).toString());
        ring.setAttribute('cy', (imageY + imageSize / 2).toString());
        ring.setAttribute('r', ringRadius.toString());
        ring.setAttribute('fill', MERMAID_AVATAR_RING_FILL);
        ring.setAttribute('stroke', ringColor);
        ring.setAttribute('stroke-width', MERMAID_AVATAR_RING_WIDTH.toString());
        ring.setAttribute('data-node-id', mermaidId);
        ring.setAttribute('style', 'cursor: pointer;');

        const image = document.createElementNS(SVG_NAMESPACE, 'image');
        image.setAttribute('href', imageUrl);
        image.setAttribute('x', imageX.toString());
        image.setAttribute('y', imageY.toString());
        image.setAttribute('width', imageSize.toString());
        image.setAttribute('height', imageSize.toString());
        image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        image.setAttribute('clip-path', `url(#${clipId})`);
        image.setAttribute('data-node-id', mermaidId);
        image.setAttribute('style', 'cursor: pointer;');

        const title = document.createElementNS(SVG_NAMESPACE, 'title');
        title.textContent = node.tooltip;
        shapeElement.appendChild(title);

        svg.insertBefore(ring, text);
        svg.insertBefore(image, text);
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
};

/**
 * Agents graph rendered with Beautiful Mermaid and enhanced SVG nodes.
 */
export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);
    const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
    const [filterType, setFilterType] = useState<ConnectionType[]>(
        parseConnectionTypes(searchParams.get('connectionTypes')),
    );
    const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(() => {
        const value = searchParams.get('selectedServer');
        if (!value) {
            return null;
        }
        if (value === 'ALL') {
            return 'ALL';
        }
        return normalizeServerUrl(value);
    });
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
        searchParams.get('selectedAgent') || null,
    );
    const [imageStatusMap, setImageStatusMap] = useState<Record<string, ImageLoadStatus>>({});
    const [baseSvg, setBaseSvg] = useState<string>('');
    const [decoratedSvg, setDecoratedSvg] = useState<string>('');
    const [renderError, setRenderError] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const nodeLookupRef = useRef<Map<string, MermaidNode>>(new Map());

    useEffect(() => {
        const updateHeight = () => {
            setGraphHeight(Math.max(GRAPH_MIN_HEIGHT, window.innerHeight - GRAPH_HEIGHT_OFFSET));
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    useEffect(() => {
        const updateDirection = () => {
            setLayoutDirection(window.innerWidth < MERMAID_LAYOUT_BREAKPOINT ? 'TB' : 'LR');
        };

        updateDirection();
        window.addEventListener('resize', updateDirection);

        return () => {
            window.removeEventListener('resize', updateDirection);
        };
    }, []);

    const graphData = useMemo(
        () =>
            buildGraphData({
                agents,
                federatedAgents,
                filterType,
                selectedServerUrl,
                selectedAgentName,
                publicUrl: normalizedPublicUrl,
            }),
        [agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, normalizedPublicUrl],
    );

    const mermaidGraph = useMemo(
        () => buildMermaidGraph(graphData, normalizedPublicUrl, layoutDirection),
        [graphData, normalizedPublicUrl, layoutDirection],
    );

    useEffect(() => {
        nodeLookupRef.current = new Map(mermaidGraph.nodes.map((node) => [node.mermaidId, node]));
    }, [mermaidGraph.nodes]);

    useEffect(() => {
        const imageNodes = graphData.nodes.filter((node) => node.imageUrl);

        imageNodes.forEach((node) => {
            if (imageStatusMap[node.id]) {
                return;
            }

            const imageUrl = node.imageUrl;
            if (!imageUrl) {
                return;
            }

            setImageStatusMap((prev) => ({ ...prev, [node.id]: 'loading' }));

            const image = new Image();
            image.onload = () => {
                setImageStatusMap((prev) => ({ ...prev, [node.id]: 'success' }));
            };
            image.onerror = () => {
                setImageStatusMap((prev) => ({ ...prev, [node.id]: 'error' }));
            };
            image.src = imageUrl;
        });
    }, [graphData.nodes, imageStatusMap]);

    useEffect(() => {
        let isCancelled = false;

        const renderGraph = async () => {
            if (!mermaidGraph.diagram) {
                setBaseSvg('');
                return;
            }

            setIsRendering(true);
            setRenderError(null);

            try {
                const svg = await renderMermaid(mermaidGraph.diagram, MERMAID_THEME);
                if (!isCancelled) {
                    setBaseSvg(svg);
                }
            } catch (error) {
                if (!isCancelled) {
                    setRenderError(error instanceof Error ? error.message : 'Failed to render graph.');
                    setBaseSvg('');
                }
            } finally {
                if (!isCancelled) {
                    setIsRendering(false);
                }
            }
        };

        renderGraph();

        return () => {
            isCancelled = true;
        };
    }, [mermaidGraph.diagram]);

    useEffect(() => {
        if (!baseSvg) {
            setDecoratedSvg('');
            return;
        }

        const decorated = decorateMermaidSvg(baseSvg, mermaidGraph.nodes, imageStatusMap);
        setDecoratedSvg(decorated);
    }, [baseSvg, mermaidGraph.nodes, imageStatusMap]);

    /**
     * Open the agent page or federated agent URL when a node is clicked.
     */
    const handleNodeClick = useCallback(
        (node: MermaidNode) => {
            const agent = node.agent;
            if (agent.serverUrl && normalizeServerUrl(agent.serverUrl) !== normalizedPublicUrl) {
                window.open(`${agent.serverUrl}/agents/${agent.agentName}`, '_blank');
            } else {
                router.push(`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`);
            }
        },
        [router, normalizedPublicUrl],
    );

    /**
     * Handle click events within the Mermaid SVG.
     */
    const handleSvgClick = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            const target = event.target as HTMLElement | null;
            const nodeId = target?.closest('[data-node-id]')?.getAttribute('data-node-id');
            if (!nodeId) {
                return;
            }

            const node = nodeLookupRef.current.get(nodeId);
            if (!node) {
                return;
            }

            handleNodeClick(node);
        },
        [handleNodeClick],
    );

    /**
     * Update URL query params to reflect graph filters and selections.
     */
    const updateUrl = useCallback(
        (newFilters: ConnectionType[], newSelectedServer: string | null, newSelectedAgent: string | null) => {
            const params = new URLSearchParams(searchParams.toString());

            if (newFilters.length === CONNECTION_TYPES.length) {
                params.delete('connectionTypes');
            } else {
                params.set('connectionTypes', newFilters.join(','));
            }

            if (newSelectedServer) {
                params.set('selectedServer', newSelectedServer);
            } else {
                params.delete('selectedServer');
            }

            if (newSelectedAgent) {
                params.set('selectedAgent', newSelectedAgent);
            } else {
                params.delete('selectedAgent');
            }

            params.set('view', 'graph');

            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    /**
     * Toggle a connection type filter.
     */
    const toggleFilter = useCallback(
        (type: ConnectionType) => {
            const nextFilters = filterType.includes(type)
                ? filterType.filter((item) => item !== type)
                : [...filterType, type];
            setFilterType(nextFilters);
            updateUrl(nextFilters, selectedServerUrl, selectedAgentName);
        },
        [filterType, selectedAgentName, selectedServerUrl, updateUrl],
    );

    /**
     * Apply the selected server/agent filter and persist to the URL.
     */
    const selectServerAndAgent = useCallback(
        (value: string) => {
            if (value === '') {
                setSelectedServerUrl(null);
                setSelectedAgentName(null);
                updateUrl(filterType, null, null);
                return;
            }

            if (value === 'ALL') {
                setSelectedServerUrl('ALL');
                setSelectedAgentName(null);
                updateUrl(filterType, 'ALL', null);
                return;
            }

            if (value.startsWith('SERVER:')) {
                const serverUrl = normalizeServerUrl(value.replace('SERVER:', ''));
                setSelectedServerUrl(serverUrl);
                setSelectedAgentName(null);
                updateUrl(filterType, serverUrl, null);
                return;
            }

            const [serverUrl, agentName] = value.split('|');
            const normalizedServerUrl = normalizeServerUrl(serverUrl || '');
            setSelectedServerUrl(normalizedServerUrl);
            setSelectedAgentName(agentName || null);
            updateUrl(filterType, normalizedServerUrl, agentName || null);
        },
        [filterType, updateUrl],
    );

    if (agents.length === 0) {
        return <div className="flex justify-center py-12 text-gray-500">No agents to show in graph.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Show connections:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterType.includes('inheritance')}
                            onChange={() => toggleFilter('inheritance')}
                            className="rounded text-blue-600"
                        />
                        <span className="text-sm">Parent</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterType.includes('import')}
                            onChange={() => toggleFilter('import')}
                            className="rounded text-blue-600"
                        />
                        <span className="text-sm">Import</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterType.includes('team')}
                            onChange={() => toggleFilter('team')}
                            className="rounded text-blue-600"
                        />
                        <span className="text-sm">Team</span>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Filter:</span>
                    <select
                        value={
                            selectedAgentName
                                ? `${selectedServerUrl}|${selectedAgentName}`
                                : selectedServerUrl === 'ALL'
                                ? 'ALL'
                                : selectedServerUrl
                                ? `SERVER:${selectedServerUrl}`
                                : ''
                        }
                        onChange={(event) => selectServerAndAgent(event.target.value)}
                        className="text-sm border rounded-md p-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Agents</option>
                        <optgroup label="This Server">
                            <option value={`SERVER:${normalizedPublicUrl}`}>Entire This Server</option>
                            {agents.map((agent) => (
                                <option key={agent.agentName} value={`${normalizedPublicUrl}|${agent.agentName}`}>
                                    {agent.meta.fullname || agent.agentName}
                                </option>
                            ))}
                        </optgroup>
                        {Object.entries(federatedServersStatus).map(([serverUrl, status]) => (
                            <optgroup
                                key={serverUrl}
                                label={
                                    serverUrl.replace(/^https?:\/\//, '') +
                                    (status.status === 'loading'
                                        ? ' (loading...)'
                                        : status.status === 'error'
                                        ? ' (error)'
                                        : '')
                                }
                            >
                                <option value={`SERVER:${serverUrl}`}>Entire Server</option>
                                {federatedAgents
                                    .filter((agent) => agent.serverUrl === serverUrl)
                                    .map((agent) => (
                                        <option key={agent.agentName} value={`${serverUrl}|${agent.agentName}`}>
                                            {agent.meta.fullname || agent.agentName}
                                        </option>
                                    ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {(selectedAgentName || selectedServerUrl) && (
                    <button onClick={() => selectServerAndAgent('')} className="text-xs text-blue-600 hover:underline">
                        Clear focus
                    </button>
                )}
            </div>

            <div
                className="agents-graph-surface relative overflow-auto rounded-2xl border border-slate-200 shadow-inner"
                style={{ height: graphHeight }}
            >
                {graphData.nodes.length === 0 ? (
                    <div className="flex justify-center py-12 text-gray-500">No agents to show in graph.</div>
                ) : renderError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-red-500">
                        <span className="text-sm font-medium">Unable to render graph</span>
                        <span className="text-xs text-red-400">{renderError}</span>
                    </div>
                ) : (
                    <div
                        className="mermaid-container agents-graph-canvas w-full h-full"
                        onClick={handleSvgClick}
                        role="presentation"
                    >
                        {isRendering && !decoratedSvg ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Rendering graph...
                            </div>
                        ) : (
                            <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: decoratedSvg }} />
                        )}
                    </div>
                )}

                <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 text-[10px] rounded-lg border border-slate-200 bg-white/80 p-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-2 border-dashed border-sky-400"></div>
                        <span>Parent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-2 border-slate-400"></div>
                        <span>Import</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-4 border-emerald-400"></div>
                        <span>Team</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
