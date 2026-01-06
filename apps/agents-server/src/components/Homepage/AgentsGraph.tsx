'use client';

import { string_agent_url, string_url } from '@promptbook-local/types';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
};

type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly publicUrl: string_url;
};

type Node = {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    val: number;
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
    const { agents, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<ForceGraphMethods<any, any>>(null as any);

    const [filterType, setFilterType] = useState<string[]>(
        searchParams.get('connectionTypes')?.split(',').filter(Boolean) || ['inheritance', 'import'],
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const keepLoader = Loader2;
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(searchParams.get('selectedAgent') || null);

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
        const nodes: Node[] = agents.map((agent) => ({
            id: agent.agentName,
            name: agent.meta.fullname || agent.agentName,
            agent,
            val: 10,
        }));

        const links: Link[] = [];

        agents.forEach((agent) => {
            agent.capabilities?.forEach((cap) => {
                if ((cap.type === 'inheritance' || cap.type === 'import') && cap.agentUrl) {
                    if (filterType.includes(cap.type)) {
                        // Extract agent name from URL/path
                        let targetName: string | null = null;
                        const urlStr = cap.agentUrl as string;

                        if (urlStr.startsWith(publicUrl)) {
                            targetName = urlStr.replace(publicUrl, '').replace(/^agents\//, '');
                        } else if (!urlStr.includes('://')) {
                            // Local reference
                            targetName = urlStr.replace(/^\.\//, '').replace(/^\//, '');
                        }

                        if (targetName) {
                            // Find the agent in our list (could be by name or ID)
                            const targetAgent = agents.find(
                                (a) => a.agentName === targetName || a.permanentId === targetName,
                            );
                            if (targetAgent) {
                                links.push({
                                    source: agent.agentName,
                                    target: targetAgent.agentName,
                                    type: cap.type,
                                });
                            }
                        }
                    }
                }
            });
        });

        let filteredNodes = nodes;
        let filteredLinks = links;

        if (selectedAgentName) {
            const relatedAgentNames = new Set<string>();
            relatedAgentNames.add(selectedAgentName);

            // Simple one-level connection for now
            links.forEach((link) => {
                if (link.source === selectedAgentName) relatedAgentNames.add(link.target);
                if (link.target === selectedAgentName) relatedAgentNames.add(link.source);
            });

            filteredNodes = nodes.filter((node) => relatedAgentNames.has(node.id));
            filteredLinks = links.filter((link) => relatedAgentNames.has(link.source) && relatedAgentNames.has(link.target));
        }

        return { nodes: filteredNodes, links: filteredLinks };
    }, [agents, publicUrl, filterType, selectedAgentName]);

    const handleNodeClick = useCallback(
        (node: Node) => {
            router.push(`/agents/${encodeURIComponent(node.agent.permanentId || node.agent.agentName)}`);
        },
        [router],
    );

    const updateUrl = useCallback(
        (newFilters: string[], newSelectedAgent: string | null) => {
            const params = new URLSearchParams(searchParams.toString());
            if (newFilters.length === 2) {
                params.delete('connectionTypes');
            } else {
                params.set('connectionTypes', newFilters.join(','));
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
        const nextFilters = filterType.includes(type)
            ? filterType.filter((t) => t !== type)
            : [...filterType, type];
        setFilterType(nextFilters);
        updateUrl(nextFilters, selectedAgentName);
    };

    const selectAgent = (name: string | null) => {
        setSelectedAgentName(name);
        updateUrl(filterType, name);
    };

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
                    <span className="text-sm font-medium text-gray-700">Filter by agent:</span>
                    <select
                        value={selectedAgentName || ''}
                        onChange={(e) => selectAgent(e.target.value || null)}
                        className="text-sm border rounded-md p-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Agents</option>
                        {agents.map((agent) => (
                            <option key={agent.agentName} value={agent.agentName}>
                                {agent.meta.fullname || agent.agentName}
                            </option>
                        ))}
                    </select>
                </div>
                
                {selectedAgentName && (
                    <button 
                        onClick={() => selectAgent(null)}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Clear focus
                    </button>
                )}
            </div>

            <div className="relative border rounded-xl overflow-hidden bg-gray-50 shadow-inner" style={{ height: dimensions.height }}>
                <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel={(node) => (node as Node).name}
                    nodeColor={() => '#3b82f6'}
                    nodeRelSize={6}
                    linkColor={(link) => ((link as unknown as GraphLink).type === 'inheritance' ? '#8b5cf6' : '#10b981')}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.25}
                    onNodeClick={handleNodeClick}
                    cooldownTicks={100}
                    onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = (node as Node).name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.2);

                        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                        ctx.fillRect(
                            (node.x || 0) - bckgDimensions[0] / 2,
                            (node.y || 0) - bckgDimensions[1] / 2,
                            bckgDimensions[0],
                            bckgDimensions[1],
                        );

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#1f2937';
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
