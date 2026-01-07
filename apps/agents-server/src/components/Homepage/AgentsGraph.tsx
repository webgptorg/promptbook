'use client';

import { string_url } from '@promptbook-local/types';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
    serverUrl?: string;
};

type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly publicUrl: string_url;
};

type Node = {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    val: number;
    serverUrl: string;
    __bckgDimensions?: number[];
};

type Link = {
    source: string;
    target: string;
    type: 'inheritance' | 'import';
};

type GraphLink = {
    source: string | { id: string };
    target: string | { id: string };
    type: 'inheritance' | 'import';
};

export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<ForceGraphMethods<any, any>>(null as any);

    const [filterType, setFilterType] = useState<string[]>(
        searchParams.get('connectionTypes')?.split(',').filter(Boolean) || ['inheritance', 'import'],
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const keepLoader = Loader2;

    const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(
        searchParams.get('selectedServer') || null,
    );
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
        searchParams.get('selectedAgent') || null,
    );

    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth > 1200 ? 1200 : window.innerWidth - 40,
                height: Math.max(window.innerHeight - 400, 500),
            });
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const graphData = useMemo(() => {
        const allAgents = [...agents, ...federatedAgents];

        const nodes: Node[] = allAgents.map((agent) => ({
            id: agent.serverUrl + '/' + agent.agentName,
            name: agent.meta.fullname || agent.agentName,
            agent,
            val: 10,
            serverUrl: agent.serverUrl || 'unknown',
        }));

        const links: Link[] = [];

        allAgents.forEach((agent) => {
            const agentNodeId = agent.serverUrl + '/' + agent.agentName;
            agent.capabilities?.forEach((cap) => {
                if ((cap.type === 'inheritance' || cap.type === 'import') && cap.agentUrl) {
                    if (filterType.includes(cap.type)) {
                        let targetUrl = cap.agentUrl as string;

                        // Normalize local/relative URLs to absolute
                        if (!targetUrl.includes('://')) {
                            targetUrl =
                                (agent.serverUrl || publicUrl.replace(/\/$/, '')) +
                                '/' +
                                targetUrl.replace(/^\.\//, '').replace(/^\//, '');
                            if (!targetUrl.includes('/agents/')) {
                                targetUrl = targetUrl.replace(/(\.ptbk\.io|\.com|\.org|\.net)\//, '$1/agents/');
                            }
                        }

                        const targetAgent = allAgents.find((a) => {
                            const aUrl = (a.serverUrl || publicUrl.replace(/\/$/, '')) + '/agents/' + a.agentName;
                            return (
                                aUrl === targetUrl || (a as AgentWithVisibility & { url?: string }).url === targetUrl
                            );
                        });

                        if (targetAgent) {
                            links.push({
                                source: agentNodeId,
                                target: targetAgent.serverUrl + '/' + targetAgent.agentName,
                                type: cap.type,
                            });
                        }
                    }
                }
            });
        });

        let filteredNodes = nodes;
        let filteredLinks = links;

        if (selectedServerUrl && selectedServerUrl !== 'ALL') {
            const serverNodes = nodes.filter((node) => node.serverUrl === selectedServerUrl);
            const serverNodeIds = new Set(serverNodes.map((n) => n.id));

            if (selectedAgentName) {
                const relatedNodeIds = new Set<string>();
                const focusedNodeId = selectedServerUrl + '/' + selectedAgentName;
                relatedNodeIds.add(focusedNodeId);

                links.forEach((link) => {
                    if (link.source === focusedNodeId) relatedNodeIds.add(link.target);
                    if (link.target === focusedNodeId) relatedNodeIds.add(link.source);
                });

                filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
                filteredLinks = links.filter(
                    (link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target),
                );
            } else {
                filteredNodes = serverNodes;
                filteredLinks = links.filter(
                    (link) => serverNodeIds.has(link.source) && serverNodeIds.has(link.target),
                );
            }
        } else if (selectedAgentName) {
            // "All Agents" + specific agent (though UI might not allow this combo easily, it's good to have)
            const relatedNodeIds = new Set<string>();
            // Search for the agent in any server
            const focusedNodes = nodes.filter((n) => n.agent.agentName === selectedAgentName);
            focusedNodes.forEach((n) => relatedNodeIds.add(n.id));

            links.forEach((link) => {
                if (focusedNodes.some((n) => n.id === link.source)) relatedNodeIds.add(link.target);
                if (focusedNodes.some((n) => n.id === link.target)) relatedNodeIds.add(link.source);
            });

            filteredNodes = nodes.filter((node) => relatedNodeIds.has(node.id));
            filteredLinks = links.filter((link) => relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target));
        }

        return { nodes: filteredNodes, links: filteredLinks };
    }, [agents, federatedAgents, publicUrl, filterType, selectedServerUrl, selectedAgentName]);

    const handleNodeClick = useCallback(
        (node: Node) => {
            const agent = node.agent;
            if (agent.serverUrl && agent.serverUrl !== publicUrl.replace(/\/$/, '')) {
                // External agent
                window.open(`${agent.serverUrl}/agents/${agent.agentName}`, '_blank');
            } else {
                router.push(`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`);
            }
        },
        [router, publicUrl],
    );

    const updateUrl = useCallback(
        (newFilters: string[], newSelectedServer: string | null, newSelectedAgent: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (newFilters.length === 2) {
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

    const toggleFilter = (type: string) => {
        const nextFilters = filterType.includes(type) ? filterType.filter((t) => t !== type) : [...filterType, type];
        setFilterType(nextFilters);
        updateUrl(nextFilters, selectedServerUrl, selectedAgentName);
    };

    const selectServerAndAgent = (value: string) => {
        if (value === '') {
            setSelectedServerUrl(null);
            setSelectedAgentName(null);
            updateUrl(filterType, null, null);
        } else if (value === 'ALL') {
            setSelectedServerUrl('ALL');
            setSelectedAgentName(null);
            updateUrl(filterType, 'ALL', null);
        } else if (value.startsWith('SERVER:')) {
            const serverUrl = value.replace('SERVER:', '');
            setSelectedServerUrl(serverUrl);
            setSelectedAgentName(null);
            updateUrl(filterType, serverUrl, null);
        } else {
            const [serverUrl, agentName] = value.split('|');
            setSelectedServerUrl(serverUrl);
            setSelectedAgentName(agentName);
            updateUrl(filterType, serverUrl, agentName);
        }
    };

    const servers = useMemo(() => {
        const serverSet = new Set<string>();
        agents.forEach((a) => a.serverUrl && serverSet.add(a.serverUrl));
        federatedAgents.forEach((a) => a.serverUrl && serverSet.add(a.serverUrl));
        return Array.from(serverSet);
    }, [agents, federatedAgents]);

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
                        <span className="text-sm">Inheritance (FROM)</span>
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
                        onChange={(e) => selectServerAndAgent(e.target.value)}
                        className="text-sm border rounded-md p-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Agents</option>
                        <optgroup label="This Server">
                            <option value={`SERVER:${publicUrl.replace(/\/$/, '')}`}>Entire This Server</option>
                            {agents.map((agent) => (
                                <option
                                    key={agent.agentName}
                                    value={`${publicUrl.replace(/\/$/, '')}|${agent.agentName}`}
                                >
                                    {agent.meta.fullname || agent.agentName}
                                </option>
                            ))}
                        </optgroup>
                        {servers
                            .filter((s) => s !== publicUrl.replace(/\/$/, ''))
                            .map((serverUrl) => (
                                <optgroup key={serverUrl} label={serverUrl.replace(/^https?:\/\//, '')}>
                                    <option value={`SERVER:${serverUrl}`}>Entire Server</option>
                                    {federatedAgents
                                        .filter((a) => a.serverUrl === serverUrl)
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
                className="relative border rounded-xl overflow-hidden bg-gray-50 shadow-inner"
                style={{ height: dimensions.height }}
            >
                <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel={(node) => (node as Node).name}
                    nodeColor={(node) =>
                        (node as Node).serverUrl === publicUrl.replace(/\/$/, '') ? '#3b82f6' : '#f59e0b'
                    }
                    nodeRelSize={6}
                    linkColor={(link) =>
                        (link as unknown as GraphLink).type === 'inheritance' ? '#8b5cf6' : '#10b981'
                    }
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.25}
                    onNodeClick={handleNodeClick}
                    cooldownTicks={100}
                    onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const n = node as Node;
                        const label = n.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map((d) => d + fontSize * 0.2);

                        // Draw cluster background (if many nodes in same server)
                        // This is a simplified "clustering" - color by server
                        const isLocal = n.serverUrl === publicUrl.replace(/\/$/, '');

                        ctx.fillStyle = isLocal ? 'rgba(255, 255, 255, 0.8)' : 'rgba(254, 243, 199, 0.8)';
                        ctx.fillRect(
                            (node.x || 0) - bckgDimensions[0] / 2,
                            (node.y || 0) - bckgDimensions[1] / 2,
                            bckgDimensions[0],
                            bckgDimensions[1],
                        );

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = isLocal ? '#1f2937' : '#92400e';
                        ctx.fillText(label, node.x || 0, node.y || 0);

                        (node as Node).__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
                    }}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        ctx.fillStyle = color;
                        const bckgDimensions = (node as Node).__bckgDimensions;
                        if (bckgDimensions) {
                            ctx.fillRect(
                                (node.x || 0) - bckgDimensions[0] / 2,
                                (node.y || 0) - bckgDimensions[1] / 2,
                                bckgDimensions[0],
                                bckgDimensions[1],
                            );
                        }
                    }}
                />
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 text-[10px] bg-white/80 p-2 rounded border shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-purple-500"></div>
                        <span>Inheritance (FROM)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-emerald-500"></div>
                        <span>Import</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
