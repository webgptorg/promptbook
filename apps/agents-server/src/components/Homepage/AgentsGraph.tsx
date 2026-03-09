'use client';

import type { string_url } from '@promptbook-local/types';
import { toPng, toSvg } from 'html-to-image';
import { Code, FileImage, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    useNodesState,
    type Node,
    type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { GraphLoadingSkeleton } from '../Skeleton/GraphLoadingSkeleton';
import { AgentGraphNode } from './AgentGraphNode';
import { FolderGroupNode } from './FolderGroupNode';
import { GraphSummaryPanel } from './GraphSummaryPanel';
import { ServerGroupNode } from './ServerGroupNode';
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
 * Props for the AgentsGraph component.
 */
type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
    readonly folders: AgentOrganizationFolder[];
};

/**
 * Build a timestamped filename for graph downloads.
 */
const buildGraphFilename = (extension: string): string => {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    return `${GRAPH_DOWNLOAD_PREFIX}-${timestamp}.${extension}`;
};

/**
 * Trigger a browser download for the provided blob payload.
 */
const triggerBlobDownload = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/**
 * Convert a data URL into a blob.
 */
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
};

/**
 * Determine whether a DOM node should be included in exports.
 */
const shouldExportNode = (node: HTMLElement): boolean => {
    if (node.dataset?.exportExclude === 'true') {
        return false;
    }

    if (node.classList?.contains('react-flow__panel')) {
        return false;
    }

    return true;
};

/**
 * Render the AgentsGraph component.
 */
export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl, folders } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { formatText } = useAgentNaming();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);
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
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [isGraphCanvasReady, setIsGraphCanvasReady] = useState(false);
    const storedPositionsRef = useRef<StoredPositions>({});
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const graphWrapperRef = useRef<HTMLDivElement | null>(null);

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

    const layoutNodes = useMemo(
        () =>
            buildGraphLayoutNodes({
                serverGroups,
                orderIndexByNodeId: graphData.orderIndexByNodeId,
                publicUrl: normalizedPublicUrl,
                storedPositions: storedPositionsRef.current,
                onNodeOpen: handleNodeClick,
            }),
        [serverGroups, graphData.orderIndexByNodeId, normalizedPublicUrl, handleNodeClick],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

    useEffect(() => {
        setNodes(layoutNodes);
        if (layoutNodes.length > 0) {
            requestAnimationFrame(() => {
                reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 500 });
            });
        }
    }, [layoutNodes, setNodes]);

    const baseEdges = useMemo(() => buildGraphEdges(graphData), [graphData]);

    const relatedNodeIds = useMemo(() => {
        if (!hoveredNodeId) {
            return null;
        }

        return collectRelatedNodeIds([...graphData.links, ...graphData.orderLinks], new Set([hoveredNodeId]));
    }, [hoveredNodeId, graphData.links, graphData.orderLinks]);

    const displayedNodes = useMemo(() => {
        if (!relatedNodeIds) {
            return nodes;
        }

        return nodes.map((node) => {
            if (node.type !== 'agent') {
                return node;
            }

            const isRelated = relatedNodeIds.has(node.id);
            const isHighlighted = hoveredNodeId === node.id;

            return {
                ...node,
                data: {
                    ...(node.data as AgentNodeData),
                    isDimmed: !isRelated,
                    isHighlighted,
                    isNeighbor: isRelated && !isHighlighted,
                } satisfies AgentNodeData,
            };
        });
    }, [nodes, relatedNodeIds, hoveredNodeId]);

    const displayedEdges = useMemo(
        () => applyEdgeHighlighting(baseEdges, hoveredNodeId, relatedNodeIds),
        [baseEdges, hoveredNodeId, relatedNodeIds],
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

    /**
     * Handle click events within the React Flow canvas.
     */
    const handleFlowNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        if (node.type !== 'agent') {
            return;
        }
        const nodeData = node.data as AgentNodeData;
        nodeData.onOpen();
    }, []);

    /**
     * Track hover state for highlighting.
     */
    const handleNodeHover = useCallback((node: Node | null) => {
        if (!node || node.type !== 'agent') {
            setHoveredNodeId(null);
            return;
        }
        setHoveredNodeId(node.id);
    }, []);

    /**
     * Persist node positions after dragging.
     */
    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (node.type !== 'agent' || !node.parentId) {
                return;
            }

            storedPositionsRef.current[node.id] = {
                x: node.position.x,
                y: node.position.y,
                parentId: node.parentId,
            };
            saveStoredPositions(storageKey, storedPositionsRef.current);
        },
        [storageKey],
    );

    const canDownloadPng = graphData.nodes.length > 0;
    const canDownloadSvg = graphData.nodes.length > 0;
    const canDownloadAscii = graphData.nodes.length > 0;

    /**
     * Download the rendered graph as a PNG.
     */
    const handleDownloadPng = useCallback(async () => {
        if (!graphWrapperRef.current) {
            return;
        }

        try {
            const dataUrl = await toPng(graphWrapperRef.current, {
                backgroundColor: GRAPH_EXPORT_BACKGROUND,
                filter: (node) => shouldExportNode(node as HTMLElement),
                pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
            });
            const blob = await dataUrlToBlob(dataUrl);
            triggerBlobDownload(blob, buildGraphFilename('png'));
        } catch (error) {
            console.error('Failed to export graph as PNG.', error);
            await showAlert({
                title: 'Export failed',
                message: 'Failed to export PNG. Try downloading the SVG instead.',
            }).catch(() => undefined);
        }
    }, []);

    /**
     * Download the rendered graph as an SVG.
     */
    const handleDownloadSvg = useCallback(async () => {
        if (!graphWrapperRef.current) {
            return;
        }

        try {
            const dataUrl = await toSvg(graphWrapperRef.current, {
                backgroundColor: GRAPH_EXPORT_BACKGROUND,
                filter: (node) => shouldExportNode(node as HTMLElement),
            });
            const blob = await dataUrlToBlob(dataUrl);
            triggerBlobDownload(blob, buildGraphFilename('svg'));
        } catch (error) {
            console.error('Failed to export graph as SVG.', error);
            await showAlert({
                title: 'Export failed',
                message: 'Failed to export SVG. Try downloading the PNG instead.',
            }).catch(() => undefined);
        }
    }, []);

    /**
     * Download the graph as ASCII text.
     */
    const handleDownloadAscii = useCallback(() => {
        const ascii = buildAsciiGraph(graphData, serverGroups);
        const blob = new Blob([ascii], { type: 'text/plain;charset=utf-8' });
        triggerBlobDownload(blob, buildGraphFilename('txt'));
    }, [graphData, serverGroups]);

    const nodeTypes = useMemo(
        () => ({
            agent: AgentGraphNode,
            serverGroup: ServerGroupNode,
            folderGroup: FolderGroupNode,
        }),
        [],
    );

    if (agents.length === 0 && federatedAgents.length === 0) {
        return <div className="flex justify-center py-12 text-gray-500">{formatText('No agents to show in graph.')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
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
                            <option value="">{formatText('All Agents')}</option>
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
                        <button
                            type="button"
                            onClick={() => selectServerAndAgent('')}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Clear focus
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <span className="text-xs font-medium text-slate-500">Download:</span>
                    <button
                        type="button"
                        onClick={handleDownloadPng}
                        disabled={!canDownloadPng}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            canDownloadPng
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Download graph as PNG"
                    >
                        <FileImage className="w-4 h-4" />
                        PNG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        disabled={!canDownloadSvg}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            canDownloadSvg
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Download graph as SVG"
                    >
                        <Code className="w-4 h-4" />
                        SVG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadAscii}
                        disabled={!canDownloadAscii}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            canDownloadAscii
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                        title="Download graph as ASCII"
                    >
                        <FileText className="w-4 h-4" />
                        ASCII
                    </button>
                </div>
            </div>

            <GraphSummaryPanel summary={graphSummary} />

            <div
                className="agents-graph-surface relative overflow-hidden rounded-2xl border border-slate-200 shadow-inner"
                style={{ height: graphHeight }}
            >
                {graphData.nodes.length === 0 ? (
                    <div className="flex justify-center py-12 text-gray-500">{formatText('No agents to show in graph.')}</div>
                ) : (
                    <div
                        ref={graphWrapperRef}
                        className={`agents-graph-canvas h-full w-full ${isGraphCanvasReady ? 'opacity-100' : 'opacity-0'}`}
                        role="presentation"
                    >
                        <ReactFlow
                            nodes={displayedNodes}
                            edges={displayedEdges}
                            nodeTypes={nodeTypes}
                            onNodesChange={onNodesChange}
                            onNodeClick={handleFlowNodeClick}
                            onNodeMouseEnter={(_, node) => handleNodeHover(node)}
                            onNodeMouseLeave={() => handleNodeHover(null)}
                            onNodeDragStop={handleNodeDragStop}
                            onInit={(instance) => {
                                reactFlowInstanceRef.current = instance;
                                setIsGraphCanvasReady(true);
                            }}
                            fitView
                            panOnScroll
                            minZoom={0.2}
                            maxZoom={2.5}
                            snapToGrid
                            snapGrid={[8, 8]}
                            nodesConnectable={false}
                            nodesDraggable
                            className="agents-graph-flow"
                        >
                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={28}
                                size={1}
                                color="rgba(148, 163, 184, 0.35)"
                            />
                            <MiniMap
                                position="bottom-left"
                                zoomable
                                pannable
                                nodeColor={(node) => {
                                    if (node.type === 'agent') {
                                        const nodeData = node.data as AgentNodeData;
                                        return nodeData.style.fill;
                                    }
                                    if (node.type === 'serverGroup') {
                                        return '#e2e8f0';
                                    }
                                    return '#f1f5f9';
                                }}
                            />
                            <Controls position="bottom-right" />
                        </ReactFlow>
                    </div>
                )}

                {!isGraphCanvasReady && graphData.nodes.length > 0 && (
                    <div className="absolute inset-0 z-20">
                        <GraphLoadingSkeleton isInset />
                    </div>
                )}

                <div
                    data-export-exclude="true"
                    className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 text-[10px] rounded-lg border border-slate-200 bg-white/80 p-2 shadow-sm"
                >
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
                    <div className="flex items-center gap-2">
                        <div className="w-6 border-t-2 border-dashed border-amber-400"></div>
                        <span>Folder order</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
