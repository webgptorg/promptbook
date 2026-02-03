'use client';

import { Code, FileImage, FileText } from 'lucide-react';
import { useWindowSize } from '@react-hook/window-size';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { MiniMap, Controls, Background, Node, Edge, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { string_url } from '@promptbook-local/types';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import AgentNode from './AgentNode';
import CustomEdge from './CustomEdge';

const CONNECTION_TYPES = ['inheritance', 'import', 'team'] as const;
const DEFAULT_CONNECTION_TYPES = [...CONNECTION_TYPES];
const GRAPH_MIN_HEIGHT = 480;
const GRAPH_HEIGHT_OFFSET = 340;

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
 * ReactFlow data structure.
 */
type ReactFlowData = {
    nodes: Node[];
    edges: Edge[];
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
 * Resolve the agent image URL, falling back to null if none is set.
 */
const getAgentExplicitImageUrl = (agent: AgentWithVisibility): string | null => agent.meta.image || null;

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
const buildReactFlowData = (input: GraphDataInput): ReactFlowData => {
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

    const reactFlowNodes: Node[] = filteredNodes.map((node, index) => ({
        id: node.id,
        type: 'agentNode',
        data: { label: node.name, imageUrl: node.imageUrl },
        position: { x: (index % 10) * 150, y: Math.floor(index / 10) * 100 },
    }));

    const reactFlowEdges: Edge[] = filteredLinks.map((link) => ({
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        type: 'custom',
        data: { label: link.type },
    }));

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
};

/**
 * Build the class name for a download button based on enabled state.
 */
const getDownloadButtonClassName = (isEnabled: boolean): string =>
    [
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        isEnabled
            ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
    ].join(' ');

export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl } = props;
    const searchParams = useSearchParams();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const [width, height] = useWindowSize();
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);

    useEffect(() => {
        setGraphHeight(Math.max(GRAPH_MIN_HEIGHT, height - GRAPH_HEIGHT_OFFSET));
    }, [height]);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        const { nodes: initialNodes, edges: initialEdges } = buildReactFlowData({
            agents,
            federatedAgents,
            filterType,
            selectedServerUrl,
            selectedAgentName,
            publicUrl: normalizedPublicUrl,
        });
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, normalizedPublicUrl, setNodes, setEdges]);

    /**
     * Toggle a connection type filter.
     */
    const toggleFilter = (type: ConnectionType) => {
        const nextFilters = filterType.includes(type)
            ? filterType.filter((item) => item !== type)
            : [...filterType, type];
        setFilterType(nextFilters);
    };

    /**
     * Apply the selected server/agent filter and persist to the URL.
     */
    const selectServerAndAgent = (value: string) => {
        if (value === '') {
            setSelectedServerUrl(null);
            setSelectedAgentName(null);
            return;
        }

        if (value === 'ALL') {
            setSelectedServerUrl('ALL');
            setSelectedAgentName(null);
            return;
        }

        if (value.startsWith('SERVER:')) {
            const serverUrl = normalizeServerUrl(value.replace('SERVER:', ''));
            setSelectedServerUrl(serverUrl);
            setSelectedAgentName(null);
            return;
        }

        const [serverUrl, agentName] = value.split('|');
        const normalizedServerUrl = normalizeServerUrl(serverUrl || '');
        setSelectedServerUrl(normalizedServerUrl);
        setSelectedAgentName(agentName || null);
    };

    const canDownloadPng = false;
    const canDownloadSvg = false;
    const canDownloadAscii = false;

    const handleDownloadPng = () => {
        // TODO: Implement download PNG
    };

    const handleDownloadSvg = () => {
        // TODO: Implement download SVG
    };

    const handleDownloadAscii = () => {
        // TODO: Implement download ASCII
    };

    if (agents.length === 0) {
        return <div className="flex justify-center py-12 text-gray-500">No agents to show in graph.</div>;
    }

        const nodeTypes = {
            agentNode: AgentNode,
        };
    
                const onNodeMouseEnter = (event: any, node: Node) => {
    
                    setNodes((nodes) =>
    
                        nodes.map((n) => {
    
                            if (n.id === node.id) {
    
                                return {
    
                                    ...n,
    
                                    style: { ...n.style, boxShadow: '0 0 10px #aaa' },
    
                                };
    
                            }
    
                            return n;
    
                        }),
    
                    );
    
                };
    
            
    
                const onNodeMouseLeave = (event: any, node: Node) => {
    
                    setNodes((nodes) =>
    
                        nodes.map((n) => {
    
                            if (n.id === node.id) {
    
                                return {
    
                                    ...n,
    
                                    style: { ...n.style, boxShadow: 'none' },
    
                                };
    
                            }
    
                            return n;
    
                        }),
    
                    );
    
                };
    
        
    
                const edgeTypes = {
    
        
    
                    custom: CustomEdge,
    
        
    
                };
    
        
    
            
    
        
    
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
    
        
    
                                    className={getDownloadButtonClassName(canDownloadPng)}
    
        
    
                                    title="Download graph as PNG"
    
        
    
                                >
    
        
    
                                    <FileImage className="w-4 h-4" />
    
        
    
                                    PNG
    
        
    
                                </button>
    
        
    
                                <button
    
        
    
                                    type="button"
    
        
    
                                    onClick={handleDownloadSvg}
    
        
    
                                    disabled={!canDownloadSvg}
    
        
    
                                    className={getDownloadButtonClassName(canDownloadSvg)}
    
        
    
                                    title="Download graph as SVG"
    
        
    
                                >
    
        
    
                                    <Code className="w-4 h-4" />
    
        
    
                                    SVG
    
        
    
                                </button>
    
        
    
                                <button
    
        
    
                                    type="button"
    
        
    
                                    onClick={handleDownloadAscii}
    
        
    
                                    disabled={!canDownloadAscii}
    
        
    
                                    className={getDownloadButtonClassName(canDownloadAscii)}
    
        
    
                                    title="Download graph as ASCII"
    
        
    
                                >
    
        
    
                                    <FileText className="w-4 h-4" />
    
        
    
                                    ASCII
    
        
    
                                </button>
    
        
    
                            </div>
    
        
    
                        </div>
    
        
    
            
    
        
    
                        <div
    
        
    
                            className="agents-graph-surface relative overflow-auto rounded-2xl border border-slate-200 shadow-inner"
    
        
    
                            style={{ height: graphHeight }}
    
        
    
                        >
    
        
    
                            {nodes.length === 0 ? (
    
        
    
                                <div className="flex justify-center py-12 text-gray-500">No agents to show in graph.</div>
    
        
    
                            ) : (
    
        
    
                                <div className="w-full h-full">
    
        
    
                                    <ReactFlow
    
        
    
                                        nodes={nodes}
    
        
    
                                        edges={edges}
    
        
    
                                        nodeTypes={nodeTypes}
    
        
    
                                        edgeTypes={edgeTypes}
    
        
    
                                        onNodesChange={onNodesChange}
    
        
    
                                        onEdgesChange={onEdgesChange}
    
        
    
                                        fitView
    
        
    
                                        onNodeMouseEnter={onNodeMouseEnter}
    
        
    
                                        onNodeMouseLeave={onNodeMouseLeave}
    
        
    
                                    >
    
        
    
                                        <MiniMap />
    
        
    
                                        <Controls />
    
        
    
                                        <Background />
    
        
    
                                    </ReactFlow>
    
        
    
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
    
        
    
                );    }
