'use client';

import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { string_url } from '@promptbook-local/types';
import * as d3 from 'd3';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;
const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];
const GRAPH_MIN_HEIGHT = 500;
const GRAPH_HEIGHT_OFFSET = 400;
const GRAPH_MIN_WIDTH = 300;
const NODE_RADIUS = 15;
const NODE_RADIUS_HOVER = 20;
const NODE_LABEL_FONT_SIZE = 14;
const NODE_LABEL_FONT_SIZE_HOVER = 16;
const NODE_LABEL_OFFSET = 6;
const NODE_IMAGE_PADDING = 2;
const LINK_DISTANCE = 200;
const LINK_STRENGTH = 0.5;
const LINK_STROKE_WIDTH = 2;
const LINK_STROKE_WIDTH_HIGHLIGHT = 3;
const LINK_OPACITY = 0.5;
const LINK_OPACITY_DIM = 0.1;
const LINK_OPACITY_HIGHLIGHT = 0.9;
const LINK_NODE_PADDING = 10;
const CHARGE_STRENGTH = -1 * 400;
const COLLISION_PADDING = 20;
const COLLISION_STRENGTH = 0.5;
const CLUSTER_FORCE_STRENGTH = 0.1;
const CLUSTER_PADDING = 50;
const CLUSTER_LABEL_OFFSET = 16;
const CLUSTER_LABEL_FONT_SIZE = 14;
const CLUSTER_STROKE_WIDTH = 2;
const ZOOM_MIN_SCALE = 0.5;
const ZOOM_MAX_SCALE = 2;
const ZOOM_TO_FIT_PADDING = 100;
const ZOOM_TO_FIT_DURATION_MS = 500;
const ZOOM_TO_FIT_FALLBACK_MS = 800;
const IMAGE_RETRY_LIMIT = 3;
const IMAGE_RETRY_DELAY_MS = 500;
const LOCAL_NODE_COLOR = '#3b82f6';
const EXTERNAL_NODE_COLOR = '#f59e0b';
const LINK_COLORS: Record<ConnectionType, string> = {
    inheritance: '#8b5cf6',
    import: '#10b981',
    team: '#f97316',
};
const CLUSTER_COLORS = {
    localFill: 'rgba(59, 130, 246, 0.08)',
    localStroke: 'rgba(59, 130, 246, 0.2)',
    localLabel: 'rgba(59, 130, 246, 0.7)',
    externalFill: 'rgba(245, 158, 11, 0.08)',
    externalStroke: 'rgba(245, 158, 11, 0.2)',
    externalLabel: 'rgba(245, 158, 11, 0.7)',
};

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
 * D3 node for a single agent in the graph layout.
 */
type GraphNode = d3.SimulationNodeDatum & {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    serverUrl: string;
    imageUrl: string;
    isLocal: boolean;
    clipPathId: string;
};

/**
 * D3 link between two agents.
 */
type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
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
 * Cached image entry with retry tracking.
 */
type ImageCacheEntry = {
    status: ImageLoadStatus;
    retryCount: number;
};

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
 * Server cluster metadata used for rendering background groups.
 */
type ServerCluster = {
    serverUrl: string;
    label: string;
    isLocal: boolean;
    nodes: GraphNode[];
};
/**
 * Normalize a server URL by removing any trailing slash.
 */
const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');

/**
 * Check if a capability type is a graph connection type.
 */
const isConnectionType = (value: string): value is ConnectionType =>
    CONNECTION_TYPES.includes(value as ConnectionType);

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
        .filter((item) => isConnectionType(item));

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
 * Resolve the agent image URL, falling back to a generated placeholder.
 */
const getAgentImageUrl = (agent: AgentWithVisibility, publicUrl: string): string =>
    agent.meta.image || generatePlaceholderAgentProfileImageUrl(agent.agentName, publicUrl);

/**
 * Normalize a target agent URL from a capability link.
 */
const normalizeTargetAgentUrl = (
    agent: AgentWithVisibility,
    targetUrl: string,
    fallbackServerUrl: string,
): string => {
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
 * Build a safe SVG id from a node identifier.
 */
const sanitizeForId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-');

/**
 * Build a stable clipPath id for node images.
 */
const buildClipPathId = (nodeId: string, index: number): string => `agent-clip-${sanitizeForId(nodeId)}-${index}`;

/**
 * Build the graph nodes and links from agents and filters.
 */
const buildGraphData = (input: GraphDataInput): GraphData => {
    const { agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, publicUrl } = input;
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const allAgents = [...agents, ...federatedAgents];

    const nodes: GraphNode[] = allAgents.map((agent, index) => {
        const serverUrl = getAgentServerUrl(agent, normalizedPublicUrl);
        const id = buildAgentNodeId(agent, normalizedPublicUrl);

        return {
            id,
            name: getAgentDisplayName(agent),
            agent,
            serverUrl,
            imageUrl: getAgentImageUrl(agent, publicUrl),
            isLocal: serverUrl === normalizedPublicUrl,
            clipPathId: buildClipPathId(id, index),
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
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;

                if (sourceId === focusedNodeId) {
                    relatedNodeIds.add(targetId);
                }
                if (targetId === focusedNodeId) {
                    relatedNodeIds.add(sourceId);
                }
            });

            filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
            filteredLinks = links.filter((link) => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                return relatedNodeIds.has(sourceId) && relatedNodeIds.has(targetId);
            });
        } else {
            filteredNodes = serverNodes;
            filteredLinks = links.filter((link) => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                return serverNodeIds.has(sourceId) && serverNodeIds.has(targetId);
            });
        }
    } else if (selectedAgentName) {
        const relatedNodeIds = new Set<string>();
        const focusedNodes = nodes.filter((node) => node.agent.agentName === selectedAgentName);

        focusedNodes.forEach((node) => relatedNodeIds.add(node.id));

        links.forEach((link) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;

            if (focusedNodes.some((node) => node.id === sourceId)) {
                relatedNodeIds.add(targetId);
            }
            if (focusedNodes.some((node) => node.id === targetId)) {
                relatedNodeIds.add(sourceId);
            }
        });

        filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
        filteredLinks = links.filter((link) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return relatedNodeIds.has(sourceId) && relatedNodeIds.has(targetId);
        });
    }

    return { nodes: filteredNodes, links: filteredLinks };
};

/**
 * Build a quick lookup table for node adjacency.
 */
const buildAdjacencyMap = (links: GraphLink[]): Map<string, Set<string>> => {
    const adjacency = new Map<string, Set<string>>();

    links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        if (!adjacency.has(sourceId)) {
            adjacency.set(sourceId, new Set());
        }
        adjacency.get(sourceId)!.add(targetId);

        if (!adjacency.has(targetId)) {
            adjacency.set(targetId, new Set());
        }
        adjacency.get(targetId)!.add(sourceId);
    });

    return adjacency;
};
/**
 * Create data entries for server clusters.
 */
const buildClusterData = (nodes: GraphNode[], publicUrl: string): ServerCluster[] => {
    const normalizedPublicUrl = normalizeServerUrl(publicUrl);
    const grouped = d3.group(nodes, (node) => node.serverUrl);

    return Array.from(grouped.entries()).map(([serverUrl, serverNodes]) => ({
        serverUrl,
        label: serverUrl.replace(/^https?:\/\//, ''),
        isLocal: serverUrl === normalizedPublicUrl,
        nodes: serverNodes,
    }));
};

/**
 * Compute deterministic cluster centers to keep server groups separated.
 */
const computeServerCenters = (
    nodes: GraphNode[],
    width: number,
    height: number,
): Map<string, { x: number; y: number }> => {
    const servers = Array.from(new Set(nodes.map((node) => node.serverUrl)));
    const centers = new Map<string, { x: number; y: number }>();
    const centerX = width / 2;
    const centerY = height / 2;

    if (servers.length === 1) {
        centers.set(servers[0]!, { x: centerX, y: centerY });
        return centers;
    }

    const radius = Math.min(width, height) / 3;
    const angleStep = (Math.PI * 2) / servers.length;

    servers.forEach((serverUrl, index) => {
        const angle = index * angleStep;
        centers.set(serverUrl, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
    });

    return centers;
};

/**
 * Extract the endpoint id for a link.
 */
const getLinkEndpointId = (endpoint: GraphLink['source'] | GraphLink['target']): string => {
    if (typeof endpoint === 'string') {
        return endpoint;
    }

    return endpoint.id;
};

/**
 * Build a stable key for links to help D3 reuse elements.
 */
const getLinkKey = (link: GraphLink): string =>
    `${getLinkEndpointId(link.source)}-${getLinkEndpointId(link.target)}-${link.type}`;

/**
 * Agents graph rendered with D3 force simulation and SVG.
 */
export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const graphContainerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const updateImageVisibilityRef = useRef<(() => void) | null>(null);
    const imageCacheRef = useRef<Record<string, ImageCacheEntry>>({});
    const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
    const hasZoomedRef = useRef(false);
    const isMountedRef = useRef(true);
    const [dimensions, setDimensions] = useState({ width: GRAPH_MIN_WIDTH, height: GRAPH_MIN_HEIGHT });
    const [imageStatusMap, setImageStatusMap] = useState<Record<string, ImageLoadStatus>>({});
    const imageStatusRef = useRef(imageStatusMap);
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

    /**
     * Update the graph size using the container width and viewport height.
     */
    const updateDimensions = useCallback(() => {
        const element = graphContainerRef.current;
        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();
        const width = Math.max(GRAPH_MIN_WIDTH, Math.round(rect.width));
        const height = Math.max(GRAPH_MIN_HEIGHT, Math.round(window.innerHeight - GRAPH_HEIGHT_OFFSET));

        setDimensions({ width, height });
    }, []);

    useEffect(() => {
        updateDimensions();
        const element = graphContainerRef.current;
        if (!element) {
            return;
        }

        const observer = new ResizeObserver(() => updateDimensions());
        observer.observe(element);
        window.addEventListener('resize', updateDimensions);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, [updateDimensions]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
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

    const adjacencyMap = useMemo(() => buildAdjacencyMap(graphData.links), [graphData.links]);

    useEffect(() => {
        hasZoomedRef.current = false;
    }, [graphData]);
    /**
     * Store status changes for image URLs while avoiding unnecessary state churn.
     */
    const setImageStatus = useCallback((url: string, status: ImageLoadStatus) => {
        if (!isMountedRef.current) {
            return;
        }

        setImageStatusMap((prev) => {
            if (prev[url] === status) {
                return prev;
            }
            return { ...prev, [url]: status };
        });
    }, []);

    /**
     * Load an agent image with retry support and cache the result.
     */
    const loadAgentImage = useCallback(
        (url: string) => {
            if (imageCacheRef.current[url]) {
                return;
            }

            imageCacheRef.current[url] = { status: 'loading', retryCount: 0 };
            setImageStatus(url, 'loading');

            const image = new Image();

            /**
             * Attempt to load the image and schedule retries on failure.
             */
            const attemptLoad = () => {
                image.onload = () => {
                    imageCacheRef.current[url] = { status: 'success', retryCount: 0 };
                    setImageStatus(url, 'success');
                };

                image.onerror = () => {
                    const entry = imageCacheRef.current[url];
                    if (!entry) {
                        return;
                    }

                    if (entry.retryCount < IMAGE_RETRY_LIMIT) {
                        entry.retryCount += 1;
                        const retryDelay = IMAGE_RETRY_DELAY_MS * entry.retryCount;
                        window.setTimeout(() => {
                            image.src = `${url}${url.includes('?') ? '&' : '?'}retry=${entry.retryCount}`;
                        }, retryDelay);
                    } else {
                        imageCacheRef.current[url] = { status: 'error', retryCount: entry.retryCount };
                        setImageStatus(url, 'error');
                    }
                };

                image.src = url;
            };

            attemptLoad();
        },
        [setImageStatus],
    );

    useEffect(() => {
        graphData.nodes.forEach((node) => {
            loadAgentImage(node.imageUrl);
        });
    }, [graphData.nodes, loadAgentImage]);

    /**
     * Open the agent page or federated agent URL when a node is clicked.
     */
    const handleNodeClick = useCallback(
        (node: GraphNode) => {
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

    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) {
            return;
        }

        const svg = d3.select(svgElement);
        svg.selectAll('*').remove();

        if (graphData.nodes.length === 0) {
            return;
        }

        svg.attr('width', dimensions.width);
        svg.attr('height', dimensions.height);
        svg.attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

        const defs = svg.append('defs');
        const markerData = CONNECTION_TYPES.map((type) => ({ type, color: LINK_COLORS[type] }));

        defs.selectAll('marker')
            .data(markerData)
            .enter()
            .append('marker')
            .attr('id', (item) => `arrow-${item.type}`)
            .attr('viewBox', `0 ${-1 * 5} 10 10`)
            .attr('refX', NODE_RADIUS + LINK_NODE_PADDING)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5 L10,0 L0,5')
            .attr('fill', (item) => item.color);

        defs.selectAll('clipPath')
            .data(graphData.nodes, (node) => (node as GraphNode).clipPathId)
            .join((enter) => {
                const clip = enter.append('clipPath').attr('id', (node) => (node as GraphNode).clipPathId);
                clip
                    .attr('clipPathUnits', 'objectBoundingBox')
                    .append('circle')
                    .attr('cx', 0.5)
                    .attr('cy', 0.5)
                    .attr('r', 0.5);
                return clip;
            });

        const root = svg.append('g').attr('class', 'graph-root');
        const clusterLayer = root.append('g').attr('class', 'graph-clusters').attr('pointer-events', 'none');
        const linkLayer = root.append('g').attr('class', 'graph-links');
        const nodeLayer = root.append('g').attr('class', 'graph-nodes');

        const zoomBehavior = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([ZOOM_MIN_SCALE, ZOOM_MAX_SCALE])
            .on('zoom', (event) => {
                root.attr('transform', event.transform);
            });

        svg.call(zoomBehavior as d3.ZoomBehavior<SVGSVGElement, unknown>);
        zoomBehaviorRef.current = zoomBehavior;

        const clusterData = buildClusterData(graphData.nodes, normalizedPublicUrl);
        const clusterSelection = clusterLayer
            .selectAll<SVGGElement, ServerCluster>('g.cluster')
            .data(clusterData, (cluster) => cluster.serverUrl)
            .join((enter) => {
                const group = enter.append('g').attr('class', 'cluster');
                group.append('circle').attr('class', 'cluster-circle');
                group.append('text').attr('class', 'cluster-label');
                return group;
            });

        clusterSelection
            .select('text.cluster-label')
            .attr('font-size', CLUSTER_LABEL_FONT_SIZE)
            .attr('font-style', 'italic')
            .attr('font-weight', '600')
            .attr('text-anchor', 'middle');

        const linkSelection = linkLayer
            .selectAll<SVGPathElement, GraphLink>('path')
            .data(graphData.links, (link) => getLinkKey(link as GraphLink))
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', (link) => LINK_COLORS[link.type])
            .attr('stroke-width', LINK_STROKE_WIDTH)
            .attr('stroke-linecap', 'round')
            .attr('marker-end', (link) => `url(#arrow-${link.type})`)
            .attr('stroke-opacity', LINK_OPACITY)
            .style('vector-effect', 'non-scaling-stroke');

        const nodeSelection = nodeLayer
            .selectAll<SVGGElement, GraphNode>('g.node')
            .data(graphData.nodes, (node) => node.id)
            .join((enter) => {
                const node = enter.append('g').attr('class', 'node').style('cursor', 'pointer');

                node.append('title').text((item) => getAgentTooltip(item.agent));

                node.append('circle')
                    .attr('class', 'node-ring')
                    .attr('r', NODE_RADIUS)
                    .attr('fill', (item) => item.agent.meta.color || (item.isLocal ? LOCAL_NODE_COLOR : EXTERNAL_NODE_COLOR))
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', 2)
                    .style('vector-effect', 'non-scaling-stroke');

                node.append('image')
                    .attr('class', 'node-image')
                    .attr('href', (item) => item.imageUrl)
                    .attr('x', -NODE_RADIUS + NODE_IMAGE_PADDING)
                    .attr('y', -NODE_RADIUS + NODE_IMAGE_PADDING)
                    .attr('width', (NODE_RADIUS - NODE_IMAGE_PADDING) * 2)
                    .attr('height', (NODE_RADIUS - NODE_IMAGE_PADDING) * 2)
                    .attr('clip-path', (item) => `url(#${item.clipPathId})`)
                    .attr('preserveAspectRatio', 'xMidYMid slice')
                    .attr('opacity', 0)
                    .attr('pointer-events', 'none');

                node.append('text')
                    .attr('class', 'node-initial')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('font-size', NODE_LABEL_FONT_SIZE)
                    .attr('font-weight', '700')
                    .attr('fill', '#ffffff')
                    .attr('opacity', 0)
                    .text((item) => getAgentDisplayName(item.agent).charAt(0).toUpperCase());

                node.append('text')
                    .attr('class', 'node-label')
                    .attr('text-anchor', 'middle')
                    .attr('font-size', NODE_LABEL_FONT_SIZE)
                    .attr('font-weight', '500')
                    .attr('fill', '#1f2937')
                    .attr('y', NODE_RADIUS + NODE_LABEL_OFFSET)
                    .text((item) => item.name);

                return node;
            });

        const dragBehavior = d3
            .drag<SVGGElement, GraphNode>()
            .on('start', (event, node) => {
                if (!event.active) {
                    simulation.alphaTarget(0.5).restart();
                }
                node.fx = node.x;
                node.fy = node.y;
            })
            .on('drag', (event, node) => {
                node.fx = event.x;
                node.fy = event.y;
            })
            .on('end', (event, node) => {
                if (!event.active) {
                    simulation.alphaTarget(0);
                }
                node.fx = null;
                node.fy = null;
            });

        /**
         * Emphasize hovered nodes and their connected links.
         */
        const updateHoverState = (hoveredId: string | null) => {
            const relatedNodes = hoveredId ? adjacencyMap.get(hoveredId) : null;

            nodeSelection
                .attr('opacity', (node) => {
                    if (!hoveredId) {
                        return 1;
                    }

                    if (node.id === hoveredId || relatedNodes?.has(node.id)) {
                        return 1;
                    }

                    return LINK_OPACITY;
                })
                .select('circle.node-ring')
                .attr('r', (node) => (node.id === hoveredId ? NODE_RADIUS_HOVER : NODE_RADIUS));

            nodeSelection
                .select('text.node-label')
                .attr('font-size', (node) => (node.id === hoveredId ? NODE_LABEL_FONT_SIZE_HOVER : NODE_LABEL_FONT_SIZE))
                .attr('font-weight', (node) => (node.id === hoveredId ? '700' : '500'));

            linkSelection
                .attr('stroke-opacity', (link) => {
                    if (!hoveredId) {
                        return LINK_OPACITY;
                    }

                    const sourceId = getLinkEndpointId(link.source);
                    const targetId = getLinkEndpointId(link.target);

                    if (sourceId === hoveredId || targetId === hoveredId) {
                        return LINK_OPACITY_HIGHLIGHT;
                    }

                    return LINK_OPACITY_DIM;
                })
                .attr('stroke-width', (link) => {
                    if (!hoveredId) {
                        return LINK_STROKE_WIDTH;
                    }

                    const sourceId = getLinkEndpointId(link.source);
                    const targetId = getLinkEndpointId(link.target);

                    if (sourceId === hoveredId || targetId === hoveredId) {
                        return LINK_STROKE_WIDTH_HIGHLIGHT;
                    }

                    return LINK_STROKE_WIDTH;
                });
        };

        nodeSelection
            .call(dragBehavior)
            .on('mouseenter', (_event, node) => {
                updateHoverState(node.id);
            })
            .on('mouseleave', () => {
                updateHoverState(null);
            })
            .on('click', (event, node) => {
                if (event.defaultPrevented) {
                    return;
                }
                handleNodeClick(node);
            });

        /**
         * Sync node images with the latest load statuses.
         */
        /**
         * Sync node images with the latest load statuses.
         */
        const applyImageStatus = () => {
            const statusMap = imageStatusRef.current;

            nodeSelection
                .selectAll<SVGImageElement, GraphNode>('image.node-image')
                .attr('opacity', (node) => (statusMap[node.imageUrl] === 'success' ? 1 : 0));

            nodeSelection
                .selectAll<SVGTextElement, GraphNode>('text.node-initial')
                .attr('opacity', (node) => (statusMap[node.imageUrl] === 'error' ? 1 : 0));
        };

        updateImageVisibilityRef.current = applyImageStatus;
        applyImageStatus();

        const serverCenters = computeServerCenters(graphData.nodes, dimensions.width, dimensions.height);
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        const simulation = d3
            .forceSimulation(graphData.nodes)
            .alpha(1)
            .alphaDecay(0.1)
            .force(
                'link',
                d3
                    .forceLink<GraphNode, GraphLink>(graphData.links)
                    .id((node) => node.id)
                    .distance(LINK_DISTANCE)
                    .strength(LINK_STRENGTH),
            )
            .force('charge', d3.forceManyBody().strength(CHARGE_STRENGTH))
            .force('center', d3.forceCenter(centerX, centerY))
            .force(
                'collide',
                d3.forceCollide<GraphNode>().radius(NODE_RADIUS + COLLISION_PADDING).strength(COLLISION_STRENGTH),
            )
            .force(
                'clusterX',
                d3
                    .forceX<GraphNode>()
                    .x((node) => serverCenters.get(node.serverUrl)?.x ?? centerX)
                    .strength(CLUSTER_FORCE_STRENGTH),
            )
            .force(
                'clusterY',
                d3
                    .forceY<GraphNode>()
                    .y((node) => serverCenters.get(node.serverUrl)?.y ?? centerY)
                    .strength(CLUSTER_FORCE_STRENGTH),
            );

        simulation.on('tick', () => {
            linkSelection.attr('d', (link) => {
                const source = link.source as GraphNode;
                const target = link.target as GraphNode;
                const sourceX = source.x ?? centerX;
                const sourceY = source.y ?? centerY;
                const targetX = target.x ?? centerX;
                const targetY = target.y ?? centerY;
                const dx = targetX - sourceX;
                const dy = targetY - sourceY;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const offset = NODE_RADIUS + LINK_NODE_PADDING;
                const startX = sourceX + (dx / distance) * offset;
                const startY = sourceY + (dy / distance) * offset;
                const endX = targetX - (dx / distance) * offset;
                const endY = targetY - (dy / distance) * offset;

                return `M${startX},${startY} L${endX},${endY}`;
            });

            nodeSelection.attr('transform', (node) => `translate(${node.x ?? centerX},${node.y ?? centerY})`);

            clusterSelection.each((cluster, index, elements) => {
                const clusterNodes = cluster.nodes;
                if (clusterNodes.length === 0) {
                    return;
                }

                let clusterX = 0;
                let clusterY = 0;

                clusterNodes.forEach((node) => {
                    clusterX += node.x ?? centerX;
                    clusterY += node.y ?? centerY;
                });

                clusterX /= clusterNodes.length;
                clusterY /= clusterNodes.length;

                let maxDistance = 0;
                clusterNodes.forEach((node) => {
                    const dxNode = (node.x ?? centerX) - clusterX;
                    const dyNode = (node.y ?? centerY) - clusterY;
                    const distance = Math.sqrt(dxNode * dxNode + dyNode * dyNode);
                    maxDistance = Math.max(maxDistance, distance);
                });

                const radius = Math.max(NODE_RADIUS + CLUSTER_PADDING, maxDistance + CLUSTER_PADDING);
                const clusterElement = d3.select(elements[index] as SVGGElement);
                const fill = cluster.isLocal ? CLUSTER_COLORS.localFill : CLUSTER_COLORS.externalFill;
                const stroke = cluster.isLocal ? CLUSTER_COLORS.localStroke : CLUSTER_COLORS.externalStroke;
                const labelColor = cluster.isLocal ? CLUSTER_COLORS.localLabel : CLUSTER_COLORS.externalLabel;

                clusterElement
                    .select('circle.cluster-circle')
                    .attr('cx', clusterX)
                    .attr('cy', clusterY)
                    .attr('r', radius)
                    .attr('fill', fill)
                    .attr('stroke', stroke)
                    .attr('stroke-width', CLUSTER_STROKE_WIDTH)
                    .attr('stroke-dasharray', '10 6')
                    .style('vector-effect', 'non-scaling-stroke');

                clusterElement
                    .select('text.cluster-label')
                    .attr('x', clusterX)
                    .attr('y', clusterY - radius - CLUSTER_LABEL_OFFSET)
                    .attr('fill', labelColor)
                    .text(cluster.label);
            });
        });

        simulationRef.current = simulation;

        /**
         * Fit the zoom to the current node bounds.
         */
        const zoomToFit = () => {
            if (!zoomBehaviorRef.current || graphData.nodes.length === 0) {
                return;
            }

            const xs = graphData.nodes.map((node) => node.x ?? centerX);
            const ys = graphData.nodes.map((node) => node.y ?? centerY);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const width = Math.max(maxX - minX, 1);
            const height = Math.max(maxY - minY, 1);
            const scale = Math.min(
                dimensions.width / (width + ZOOM_TO_FIT_PADDING),
                dimensions.height / (height + ZOOM_TO_FIT_PADDING),
                ZOOM_MAX_SCALE,
            );
            const translateX = dimensions.width / 2 - (scale * (minX + maxX)) / 2;
            const translateY = dimensions.height / 2 - (scale * (minY + maxY)) / 2;
            const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

            svg.transition().duration(ZOOM_TO_FIT_DURATION_MS).call(zoomBehaviorRef.current.transform, transform);
        };

        simulation.on('end', () => {
            if (!hasZoomedRef.current) {
                zoomToFit();
                hasZoomedRef.current = true;
            }
        });

        window.setTimeout(() => {
            if (!hasZoomedRef.current) {
                zoomToFit();
                hasZoomedRef.current = true;
            }
        }, ZOOM_TO_FIT_FALLBACK_MS);

        return () => {
            simulation.stop();
            svg.on('.zoom', null);
        };
    }, [adjacencyMap, dimensions, graphData, handleNodeClick, normalizedPublicUrl]);

    useEffect(() => {
        imageStatusRef.current = imageStatusMap;
        updateImageVisibilityRef.current?.();
    }, [imageStatusMap]);
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
                ref={graphContainerRef}
                className="relative border rounded-xl overflow-hidden bg-gray-50 shadow-inner"
                style={{ height: dimensions.height }}
            >
                {graphData.nodes.length === 0 ? (
                    <div className="flex justify-center py-12 text-gray-500">No agents to show in graph.</div>
                ) : (
                    <svg ref={svgRef} className="w-full h-full" />
                )}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 text-[10px] bg-white/80 p-2 rounded border shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-purple-500"></div>
                        <span>Parent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-emerald-500"></div>
                        <span>Import</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-orange-500"></div>
                        <span>Team</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
