'use client';

import type { string_url } from '@promptbook-local/types';
import { toPng, toSvg } from 'html-to-image';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MouseEvent, MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNodesState, type Node, type ReactFlowInstance } from 'reactflow';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { applyEdgeHighlighting, buildGraphEdges } from './buildGraphEdges';
import {
    buildAsciiGraph,
    buildGraphData,
    buildGraphSummaryInfo,
    buildServerGroups,
    collectRelatedNodeIds,
    CONNECTION_TYPES,
    normalizeServerUrl,
    parseConnectionTypes,
    type AgentWithVisibility,
    type ConnectionType,
    type GraphNode,
} from './buildGraphData';
import {
    buildGraphLayoutNodes,
    buildPositionsStorageKey,
    loadStoredPositions,
    saveStoredPositions,
    type AgentNodeData,
    type StoredPositions,
} from './buildGraphLayoutNodes';

/**
 * Minimum graph viewport height.
 *
 * @private function of AgentsGraph
 */
const GRAPH_MIN_HEIGHT = 480;

/**
 * Vertical viewport offset used to compute graph height.
 *
 * @private function of AgentsGraph
 */
const GRAPH_HEIGHT_OFFSET = 340;

/**
 * Prefix used in graph export filenames.
 *
 * @private function of AgentsGraph
 */
const GRAPH_DOWNLOAD_PREFIX = 'agents-graph';

/**
 * Canvas background color used in PNG/SVG exports.
 *
 * @private function of AgentsGraph
 */
const GRAPH_EXPORT_BACKGROUND = '#f8fafc';

/**
 * Fixed view query parameter for the graph tab.
 *
 * @private function of AgentsGraph
 */
const GRAPH_VIEW_MODE = 'graph';

/**
 * Minimal search params interface used by graph URL helpers.
 *
 * @private function of AgentsGraph
 */
type SearchParamsSnapshot = Pick<URLSearchParams, 'get' | 'toString'>;

/**
 * Props consumed by `useAgentsGraphState`.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphStateProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
    readonly folders: AgentOrganizationFolder[];
};

/**
 * Server/agent selection encoded in the graph URL and `<select>` control.
 *
 * @private function of AgentsGraph
 */
type AgentsGraphSelection = {
    selectedServerUrl: string | null;
    selectedAgentName: string | null;
};

/**
 * Arguments required to export a rendered graph image.
 *
 * @private function of AgentsGraph
 */
type ExportGraphImageProps = {
    extension: 'png' | 'svg';
    graphWrapperElement: HTMLDivElement;
    createDataUrl: (graphWrapperElement: HTMLDivElement) => Promise<string>;
    failureMessage: string;
};

/**
 * Build a timestamped filename for graph downloads.
 *
 * @private function of AgentsGraph
 */
function buildGraphFilename(extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    return `${GRAPH_DOWNLOAD_PREFIX}-${timestamp}.${extension}`;
}

/**
 * Trigger a browser download for the provided blob payload.
 *
 * @private function of AgentsGraph
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Convert a data URL into a blob.
 *
 * @private function of AgentsGraph
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

/**
 * Determine whether a DOM node should be included in image exports.
 *
 * @private function of AgentsGraph
 */
function shouldExportNode(node: HTMLElement): boolean {
    if (node.dataset?.exportExclude === 'true') {
        return false;
    }

    if (node.classList?.contains('react-flow__panel')) {
        return false;
    }

    return true;
}

/**
 * Read the initial selected server from the current URL query params.
 *
 * @private function of AgentsGraph
 */
function readInitialSelectedServerUrl(searchParams: SearchParamsSnapshot): string | null {
    const selectedServer = searchParams.get('selectedServer');

    if (!selectedServer) {
        return null;
    }

    if (selectedServer === 'ALL') {
        return 'ALL';
    }

    return normalizeServerUrl(selectedServer);
}

/**
 * Build the next graph search params from the current query string and selection state.
 *
 * @private function of AgentsGraph
 */
function buildUpdatedGraphSearchParams(
    searchParamsString: string,
    connectionTypes: ReadonlyArray<ConnectionType>,
    selectedServerUrl: string | null,
    selectedAgentName: string | null,
): URLSearchParams {
    const params = new URLSearchParams(searchParamsString);

    if (connectionTypes.length === CONNECTION_TYPES.length) {
        params.delete('connectionTypes');
    } else {
        params.set('connectionTypes', connectionTypes.join(','));
    }

    if (selectedServerUrl) {
        params.set('selectedServer', selectedServerUrl);
    } else {
        params.delete('selectedServer');
    }

    if (selectedAgentName) {
        params.set('selectedAgent', selectedAgentName);
    } else {
        params.delete('selectedAgent');
    }

    params.set('view', GRAPH_VIEW_MODE);

    return params;
}

/**
 * Decode the select-control value into a server/agent selection.
 *
 * @private function of AgentsGraph
 */
function resolveGraphSelection(value: string): AgentsGraphSelection {
    if (value === '') {
        return {
            selectedServerUrl: null,
            selectedAgentName: null,
        };
    }

    if (value === 'ALL') {
        return {
            selectedServerUrl: 'ALL',
            selectedAgentName: null,
        };
    }

    if (value.startsWith('SERVER:')) {
        return {
            selectedServerUrl: normalizeServerUrl(value.replace('SERVER:', '')),
            selectedAgentName: null,
        };
    }

    const [serverUrl, agentName] = value.split('|');

    return {
        selectedServerUrl: normalizeServerUrl(serverUrl || ''),
        selectedAgentName: agentName || null,
    };
}

/**
 * Toggle one connection type while preserving the current filter order.
 *
 * @private function of AgentsGraph
 */
function toggleConnectionType(
    connectionTypes: ReadonlyArray<ConnectionType>,
    toggledType: ConnectionType,
): ConnectionType[] {
    if (connectionTypes.includes(toggledType)) {
        return connectionTypes.filter((connectionType) => connectionType !== toggledType);
    }

    return [...connectionTypes, toggledType];
}

/**
 * Read the typed node payload when the React Flow node is an agent node.
 *
 * @private function of AgentsGraph
 */
function getAgentNodeData(node: Node): AgentNodeData | null {
    if (node.type !== 'agent') {
        return null;
    }

    return node.data as AgentNodeData;
}

/**
 * Resolve the currently hovered agent id, or `null` for non-agent nodes.
 *
 * @private function of AgentsGraph
 */
function resolveHoveredNodeId(node: Node | null): string | null {
    if (!node || node.type !== 'agent') {
        return null;
    }

    return node.id;
}

/**
 * Apply hovered/neighbor/dimmed agent styling without changing non-agent nodes.
 *
 * @private function of AgentsGraph
 */
function applyNodeRelationshipHighlighting(
    nodes: ReadonlyArray<Node>,
    relatedNodeIds: ReadonlySet<string> | null,
    hoveredNodeId: string | null,
): Node[] {
    if (!relatedNodeIds) {
        return [...nodes];
    }

    return nodes.map((node) => {
        const nodeData = getAgentNodeData(node);
        if (!nodeData) {
            return node;
        }

        const isRelated = relatedNodeIds.has(node.id);
        const isHighlighted = hoveredNodeId === node.id;

        return {
            ...node,
            data: {
                ...nodeData,
                isDimmed: !isRelated,
                isHighlighted,
                isNeighbor: isRelated && !isHighlighted,
            } satisfies AgentNodeData,
        };
    });
}

/**
 * Persist the dragged position for an agent node.
 *
 * @private function of AgentsGraph
 */
function persistDraggedAgentNode(
    node: Node,
    storedPositions: StoredPositions,
    storageKey: string,
): void {
    if (node.type !== 'agent' || !node.parentId) {
        return;
    }

    storedPositions[node.id] = {
        x: node.position.x,
        y: node.position.y,
        parentId: node.parentId,
    };

    saveStoredPositions(storageKey, storedPositions);
}

/**
 * Build the PNG data URL for the rendered graph.
 *
 * @private function of AgentsGraph
 */
function buildPngGraphDataUrl(graphWrapperElement: HTMLDivElement): Promise<string> {
    return toPng(graphWrapperElement, {
        backgroundColor: GRAPH_EXPORT_BACKGROUND,
        filter: (node) => shouldExportNode(node as HTMLElement),
        pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    });
}

/**
 * Build the SVG data URL for the rendered graph.
 *
 * @private function of AgentsGraph
 */
function buildSvgGraphDataUrl(graphWrapperElement: HTMLDivElement): Promise<string> {
    return toSvg(graphWrapperElement, {
        backgroundColor: GRAPH_EXPORT_BACKGROUND,
        filter: (node) => shouldExportNode(node as HTMLElement),
    });
}

/**
 * Export the current graph image and surface a targeted error when it fails.
 *
 * @private function of AgentsGraph
 */
async function exportGraphImage({
    extension,
    graphWrapperElement,
    createDataUrl,
    failureMessage,
}: ExportGraphImageProps): Promise<void> {
    try {
        const dataUrl = await createDataUrl(graphWrapperElement);
        const blob = await dataUrlToBlob(dataUrl);
        triggerBlobDownload(blob, buildGraphFilename(extension));
    } catch (error) {
        console.error(`Failed to export graph as ${extension.toUpperCase()}.`, error);
        await showAlert({
            title: 'Export failed',
            message: failureMessage,
        }).catch(() => undefined);
    }
}

/**
 * Fit the graph into the visible viewport after layout changes settle.
 *
 * @private function of AgentsGraph
 */
function fitGraphToViewport(reactFlowInstanceRef: MutableRefObject<ReactFlowInstance | null>): void {
    requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 500 });
    });
}

/**
 * Measure the preferred graph canvas height from the current viewport.
 *
 * @private function of AgentsGraph
 */
function measureGraphHeight(): number {
    return Math.max(GRAPH_MIN_HEIGHT, window.innerHeight - GRAPH_HEIGHT_OFFSET);
}

/**
 * Derive AgentsGraph state and handlers while keeping the public component focused on composition.
 *
 * @private function of AgentsGraph
 */
export function useAgentsGraphState(props: UseAgentsGraphStateProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl, folders } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { formatText } = useAgentNaming();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);
    const [filterType, setFilterType] = useState<ConnectionType[]>(parseConnectionTypes(searchParams.get('connectionTypes')));
    const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(() =>
        readInitialSelectedServerUrl(searchParams),
    );
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(searchParams.get('selectedAgent') || null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [isGraphCanvasReady, setIsGraphCanvasReady] = useState(false);
    const storedPositionsRef = useRef<StoredPositions>({});
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const graphWrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateGraphHeight = () => {
            setGraphHeight(measureGraphHeight());
        };

        updateGraphHeight();
        window.addEventListener('resize', updateGraphHeight);

        return () => {
            window.removeEventListener('resize', updateGraphHeight);
        };
    }, []);

    const storageKey = useMemo(() => buildPositionsStorageKey(normalizedPublicUrl), [normalizedPublicUrl]);

    useEffect(() => {
        storedPositionsRef.current = loadStoredPositions(storageKey);
    }, [storageKey]);

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

    const serverGroups = useMemo(() => {
        const rootLabel = formatText('Agents');
        return buildServerGroups(graphData.nodes, folders, normalizedPublicUrl, rootLabel);
    }, [graphData.nodes, folders, normalizedPublicUrl, formatText]);
    const graphSummary = useMemo(() => buildGraphSummaryInfo(graphData, serverGroups), [graphData, serverGroups]);

    /**
     * Open the local agent page or the remote federated agent URL.
     */
    const openGraphNode = useCallback(
        (node: GraphNode) => {
            const agent = node.agent;
            if (agent.serverUrl && normalizeServerUrl(agent.serverUrl) !== normalizedPublicUrl) {
                window.open(`${agent.serverUrl}/agents/${agent.agentName}`, '_blank');
                return;
            }

            router.push(`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`);
        },
        [router, normalizedPublicUrl],
    );

    const layoutNodes = useMemo(
        () =>
            buildGraphLayoutNodes({
                serverGroups,
                orderIndexByNodeId: graphData.orderIndexByNodeId,
                publicUrl: normalizedPublicUrl,
                storedPositions: storedPositionsRef.current,
                onNodeOpen: openGraphNode,
            }),
        [serverGroups, graphData.orderIndexByNodeId, normalizedPublicUrl, openGraphNode],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

    useEffect(() => {
        setNodes(layoutNodes);
        if (layoutNodes.length > 0) {
            fitGraphToViewport(reactFlowInstanceRef);
        }
    }, [layoutNodes, setNodes]);

    const baseEdges = useMemo(() => buildGraphEdges(graphData), [graphData]);

    const relatedNodeIds = useMemo(() => {
        if (!hoveredNodeId) {
            return null;
        }

        return collectRelatedNodeIds([...graphData.links, ...graphData.orderLinks], new Set([hoveredNodeId]));
    }, [hoveredNodeId, graphData.links, graphData.orderLinks]);

    const displayedNodes = useMemo(
        () => applyNodeRelationshipHighlighting(nodes, relatedNodeIds, hoveredNodeId),
        [nodes, relatedNodeIds, hoveredNodeId],
    );

    const displayedEdges = useMemo(
        () => applyEdgeHighlighting(baseEdges, hoveredNodeId, relatedNodeIds),
        [baseEdges, hoveredNodeId, relatedNodeIds],
    );

    /**
     * Persist the current graph filters and selection into the URL.
     */
    const updateUrl = useCallback(
        (nextFilterType: ConnectionType[], nextSelectedServerUrl: string | null, nextSelectedAgentName: string | null) => {
            const params = buildUpdatedGraphSearchParams(
                searchParams.toString(),
                nextFilterType,
                nextSelectedServerUrl,
                nextSelectedAgentName,
            );
            router.replace(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    /**
     * Toggle one graph connection filter and keep the URL in sync.
     */
    const toggleFilter = useCallback(
        (type: ConnectionType) => {
            const nextFilterType = toggleConnectionType(filterType, type);
            setFilterType(nextFilterType);
            updateUrl(nextFilterType, selectedServerUrl, selectedAgentName);
        },
        [filterType, selectedAgentName, selectedServerUrl, updateUrl],
    );

    /**
     * Apply a server/agent selection coming from the graph toolbar.
     */
    const selectServerAndAgent = useCallback(
        (value: string) => {
            const nextSelection = resolveGraphSelection(value);
            setSelectedServerUrl(nextSelection.selectedServerUrl);
            setSelectedAgentName(nextSelection.selectedAgentName);
            updateUrl(filterType, nextSelection.selectedServerUrl, nextSelection.selectedAgentName);
        },
        [filterType, updateUrl],
    );

    /**
     * Forward agent-node clicks to the node open handler.
     */
    const handleFlowNodeClick = useCallback((_event: MouseEvent, node: Node) => {
        getAgentNodeData(node)?.onOpen();
    }, []);

    /**
     * Track the currently hovered agent for relationship highlighting.
     */
    const handleNodeHover = useCallback((node: Node | null) => {
        setHoveredNodeId(resolveHoveredNodeId(node));
    }, []);

    /**
     * Persist agent positions after dragging within a server/folder group.
     */
    const handleNodeDragStop = useCallback(
        (_event: MouseEvent, node: Node) => {
            persistDraggedAgentNode(node, storedPositionsRef.current, storageKey);
        },
        [storageKey],
    );

    /**
     * Mark the graph canvas as ready once React Flow finishes initializing.
     */
    const handleGraphInit = useCallback((instance: ReactFlowInstance) => {
        reactFlowInstanceRef.current = instance;
        setIsGraphCanvasReady(true);
    }, []);

    /**
     * Download the rendered graph as a PNG image.
     */
    const handleDownloadPng = useCallback(async () => {
        const graphWrapperElement = graphWrapperRef.current;
        if (!graphWrapperElement) {
            return;
        }

        await exportGraphImage({
            extension: 'png',
            graphWrapperElement,
            createDataUrl: buildPngGraphDataUrl,
            failureMessage: 'Failed to export PNG. Try downloading the SVG instead.',
        });
    }, []);

    /**
     * Download the rendered graph as an SVG image.
     */
    const handleDownloadSvg = useCallback(async () => {
        const graphWrapperElement = graphWrapperRef.current;
        if (!graphWrapperElement) {
            return;
        }

        await exportGraphImage({
            extension: 'svg',
            graphWrapperElement,
            createDataUrl: buildSvgGraphDataUrl,
            failureMessage: 'Failed to export SVG. Try downloading the PNG instead.',
        });
    }, []);

    /**
     * Download the graph as ASCII text.
     */
    const handleDownloadAscii = useCallback(() => {
        const ascii = buildAsciiGraph(graphData, serverGroups);
        const blob = new Blob([ascii], { type: 'text/plain;charset=utf-8' });
        triggerBlobDownload(blob, buildGraphFilename('txt'));
    }, [graphData, serverGroups]);

    const emptyMessage = formatText('No agents to show in graph.');
    const hasAnyAgents = agents.length > 0 || federatedAgents.length > 0;
    const isDownloadAvailable = graphData.nodes.length > 0;

    return {
        emptyMessage,
        graphSummary,
        hasAnyAgents,
        toolbar: {
            agents,
            federatedAgents,
            federatedServersStatus,
            filterType,
            selectedServerUrl,
            selectedAgentName,
            normalizedPublicUrl,
            isDownloadAvailable,
            formatText,
            onToggleFilter: toggleFilter,
            onSelectServerAndAgent: selectServerAndAgent,
            onDownloadPng: handleDownloadPng,
            onDownloadSvg: handleDownloadSvg,
            onDownloadAscii: handleDownloadAscii,
        },
        canvas: {
            emptyMessage,
            graphHeight,
            graphNodeCount: graphData.nodes.length,
            graphWrapperRef,
            isGraphCanvasReady,
            displayedNodes,
            displayedEdges,
            onNodesChange,
            onFlowNodeClick: handleFlowNodeClick,
            onNodeHover: handleNodeHover,
            onNodeDragStop: handleNodeDragStop,
            onGraphInit: handleGraphInit,
        },
    };
}
