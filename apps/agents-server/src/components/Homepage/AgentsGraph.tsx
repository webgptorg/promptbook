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
const MERMAID_LABEL_PADDING = '          ';
const MERMAID_NODE_STROKE_WIDTH = '0.75';
const MERMAID_NODE_RADIUS = 12;
const MERMAID_IMAGE_SIZE = 22;
const MERMAID_IMAGE_PADDING = 6;
const MERMAID_TEXT_PADDING = 8;
const MERMAID_LABEL_FONT_WEIGHT = '600';
const MERMAID_LAYOUT_BREAKPOINT = 900;
const MERMAID_THEME = {
    bg: '#f8fafc',
    fg: '#0f172a',
    line: '#94a3b8',
    accent: '#64748b',
    muted: '#64748b',
    surface: '#ffffff',
    border: '#e2e8f0',
    transparent: true,
};
const MERMAID_EDGE_LABELS: Record<ConnectionType, string> = {
    inheritance: 'parent',
    import: 'import',
    team: 'team',
};
const MERMAID_EDGE_STYLES: Record<ConnectionType, string> = {
    inheritance: '-.->',
    import: '-->',
    team: '==>',
};
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

    if (normalizedSelectedServerUrl && normalizedSelectedServerUrl !== 'ALL') {
        const serverNodes = nodes.filter((node) => node.serverUrl === normalizedSelectedServerUrl);
        const serverNodeIds = new Set(serverNodes.map((node) => node.id));

        if (selectedAgentName) {
            const relatedNodeIds = new Set<string>();
            const focusedNodeId = `${normalizedSelectedServerUrl}/${selectedAgentName}`;
            relatedNodeIds.add(focusedNodeId);

            links.forEach((link) => {
                if (link.source === focusedNodeId) {
                    relatedNodeIds.add(link.target);
                }
                if (link.target === focusedNodeId) {
                    relatedNodeIds.add(link.source);
                }
            });

            filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
            filteredLinks = links.filter((link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target));
        } else {
            filteredNodes = serverNodes;
            filteredLinks = links.filter((link) => serverNodeIds.has(link.source) && serverNodeIds.has(link.target));
        }
    } else if (selectedAgentName) {
        const relatedNodeIds = new Set<string>();
        const focusedNodes = nodes.filter((node) => node.agent.agentName === selectedAgentName);

        focusedNodes.forEach((node) => relatedNodeIds.add(node.id));

        links.forEach((link) => {
            if (focusedNodes.some((node) => node.id === link.source)) {
                relatedNodeIds.add(link.target);
            }
            if (focusedNodes.some((node) => node.id === link.target)) {
                relatedNodeIds.add(link.source);
            }
        });

        filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
        filteredLinks = links.filter((link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target));
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

    const lines: string[] = [`flowchart ${direction}`];

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

        const edgeLabel = MERMAID_EDGE_LABELS[link.type];
        const edgeStyle = MERMAID_EDGE_STYLES[link.type];
        lines.push(`${sourceId} ${edgeStyle}|${edgeLabel}| ${targetId}`);
    });

    return { diagram: lines.join('\n'), nodes };
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
 * Find the closest node rectangle to a label position.
 */
const findClosestNodeRect = (rects: SVGRectElement[], labelX: number, labelY: number): SVGRectElement | null => {
    let closest: SVGRectElement | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    rects.forEach((rect) => {
        const rectX = parseSvgNumber(rect.getAttribute('x'));
        const rectY = parseSvgNumber(rect.getAttribute('y'));
        const rectHeight = parseSvgNumber(rect.getAttribute('height'));
        const centerX = rectX + rectWidth / 2;
        const centerY = rectY + rectHeight / 2;
        const distance = Math.hypot(centerX - labelX, centerY - labelY);

        if (distance < closestDistance) {
            closestDistance = distance;
            closest = rect;
        }
    });

    return closest;
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
    const rects = Array.from(svg.querySelectorAll('rect')).filter(
        (rect) => rect.getAttribute('stroke-width') === MERMAID_NODE_STROKE_WIDTH,
    );
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
        text.setAttribute('font-weight', MERMAID_LABEL_FONT_WEIGHT);
        text.setAttribute('text-anchor', 'start');
        text.setAttribute('xml:space', 'preserve');

        const labelX = parseSvgNumber(text.getAttribute('x'));
        const labelY = parseSvgNumber(text.getAttribute('y'));
        const rect = findClosestNodeRect(rects, labelX, labelY);

        if (!rect) {
            return;
        }

        const rectX = parseSvgNumber(rect.getAttribute('x'));
        const rectY = parseSvgNumber(rect.getAttribute('y'));
        const rectHeight = parseSvgNumber(rect.getAttribute('height'));
        const imageSize = Math.min(MERMAID_IMAGE_SIZE, rectHeight - MERMAID_IMAGE_PADDING * 2);
        const imageX = rectX + MERMAID_IMAGE_PADDING;
        const imageY = rectY + (rectHeight - imageSize) / 2;
        const textX = imageX + imageSize + MERMAID_TEXT_PADDING;

        rect.setAttribute('rx', MERMAID_NODE_RADIUS.toString());
        rect.setAttribute('ry', MERMAID_NODE_RADIUS.toString());
        rect.setAttribute('data-node-id', mermaidId);
        rect.setAttribute('style', 'cursor: pointer;');

        text.setAttribute('x', textX.toString());
        text.setAttribute('y', (rectY + rectHeight / 2).toString());
        text.setAttribute('dominant-baseline', 'central');
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
        rect.appendChild(title);

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
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
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
                className="relative border rounded-xl overflow-auto bg-slate-50 shadow-inner"
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
                    <div className="mermaid-container w-full h-full" onClick={handleSvgClick} role="presentation">
                        {isRendering && !decoratedSvg ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Rendering graph...
                            </div>
                        ) : (
                            <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: decoratedSvg }} />
                        )}
                    </div>
                )}

                <div className="absolute bottom-4 right-4 flex flex-col gap-2 text-[10px] bg-white/80 p-2 rounded border shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-5 border-t border-dashed border-slate-500"></div>
                        <span>Parent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 border-t border-slate-500"></div>
                        <span>Import</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 border-t-2 border-slate-500"></div>
                        <span>Team</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
