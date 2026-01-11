'use client';

import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { string_url } from '@promptbook-local/types';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { TODO_USE } from '../../../../../src/utils/organization/TODO_USE';

type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
    serverUrl?: string;
};

type AgentsGraphProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
};

type Node = {
    id: string;
    name: string;
    agent: AgentWithVisibility;
    val: number;
    serverUrl: string;
    x?: number;
    y?: number;
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
    const { agents, federatedAgents, federatedServersStatus, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<ForceGraphMethods<any, any>>(null as any);

    const imageCache = useRef<Record<string, HTMLImageElement>>({});

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
                                '/agents/' +
                                targetUrl
                                    .replace(/^\.\//, '')
                                    .replace(/^\/agents\//, '')
                                    .replace(/^\//, '');
                        }

                        const targetAgent = allAgents.find((a) => {
                            const aUrl = (a.serverUrl || publicUrl.replace(/\/$/, '')) + '/agents/' + a.agentName;
                            const aUrlPermanent =
                                a.permanentId &&
                                (a.serverUrl || publicUrl.replace(/\/$/, '')) + '/agents/' + a.permanentId;
                            return (
                                aUrl === targetUrl ||
                                aUrlPermanent === targetUrl ||
                                (a as AgentWithVisibility & { url?: string }).url === targetUrl
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

    useEffect(() => {
        const fg = fgRef.current;
        if (!fg) return;

        // Add custom force to separate servers
        fg.d3Force('server-separate', (alpha: number) => {
            const nodes = graphData.nodes as Node[];
            const serverCenters: Record<string, { x: number; y: number; count: number }> = {};

            nodes.forEach((node) => {
                if (!serverCenters[node.serverUrl]) {
                    serverCenters[node.serverUrl] = { x: 0, y: 0, count: 0 };
                }
                serverCenters[node.serverUrl]!.x += node.x || 0;
                serverCenters[node.serverUrl]!.y += node.y || 0;
                serverCenters[node.serverUrl]!.count++;
            });

            Object.keys(serverCenters).forEach((url) => {
                serverCenters[url]!.x /= serverCenters[url]!.count;
                serverCenters[url]!.y /= serverCenters[url]!.count;
            });

            const urls = Object.keys(serverCenters);
            for (let i = 0; i < urls.length; i++) {
                for (let j = i + 1; j < urls.length; j++) {
                    const u1 = urls[i]!;
                    const u2 = urls[j]!;
                    const c1 = serverCenters[u1]!;
                    const c2 = serverCenters[u2]!;

                    const dx = c1.x - c2.x;
                    const dy = c1.y - c2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minCenteredDist = 300; // Increased distance between clusters

                    if (dist < minCenteredDist) {
                        const force = (minCenteredDist - dist) * alpha * 0.1;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        nodes.forEach((node) => {
                            if (node.serverUrl === u1) {
                                node.x = (node.x || 0) + fx;
                                node.y = (node.y || 0) + fy;
                            } else if (node.serverUrl === u2) {
                                node.x = (node.x || 0) - fx;
                                node.y = (node.y || 0) - fy;
                            }
                        });
                    }
                }
            }
        });

        // Also add a stronger collision force to prevent overlapping nodes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).d3) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fg.d3Force('collide', (window as any).d3.forceCollide(30));
        }
    }, [graphData]);

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

    TODO_USE(servers);

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
                        <span className="text-sm">Parent{/* Inheritance / FROM */}</span>
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
                    nodeLabel={(node) => {
                        const n = node as Node;
                        return n.agent.meta.description || n.agent.personaDescription || n.agent.agentName;
                    }}
                    nodeColor={(node) => (node as Node).agent.meta.color || '#3b82f6'}
                    nodeRelSize={10}
                    linkColor={(link) =>
                        (link as unknown as GraphLink).type === 'inheritance' ? '#8b5cf6' : '#10b981'
                    }
                    linkDirectionalArrowLength={5}
                    linkDirectionalArrowRelPos={1}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={0.005}
                    linkCurvature={0.25}
                    onNodeClick={handleNodeClick}
                    cooldownTicks={100}
                    onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const n = node as Node;
                        const x = node.x || 0;
                        const y = node.y || 0;
                        const size = 12; // Circle radius
                        const isLocal = n.serverUrl === publicUrl.replace(/\/$/, '');
                        const color = n.agent.meta.color || (isLocal ? '#3b82f6' : '#f59e0b');

                        // 1. Draw the circle background
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, 2 * Math.PI, false);
                        ctx.fillStyle = color;
                        ctx.fill();
                        ctx.lineWidth = 2 / globalScale;
                        ctx.strokeStyle = '#fff';
                        ctx.stroke();

                        // 2. Draw agent image
                        const imageUrl =
                            n.agent.meta.image || generatePlaceholderAgentProfileImageUrl(n.agent.agentName, publicUrl);

                        let img = imageCache.current[imageUrl];
                        if (!img) {
                            img = new Image();
                            img.src = imageUrl;
                            img.onload = () => {
                                imageCache.current[imageUrl] = img!;
                                // Trigger a re-render if needed, but usually force-graph handles it
                            };
                        }

                        if (img.complete && img.naturalWidth !== 0) {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(x, y, size - 1, 0, 2 * Math.PI, false);
                            ctx.clip();

                            // Calculate cover fit (CSS object-fit: cover)
                            const imgWidth = img.naturalWidth;
                            const imgHeight = img.naturalHeight;
                            const targetWidth = size * 2;
                            const targetHeight = size * 2;
                            const imgAspect = imgWidth / imgHeight;
                            const targetAspect = targetWidth / targetHeight;

                            let drawWidth, drawHeight, offsetX, offsetY;
                            if (imgAspect > targetAspect) {
                                // Image is wider than target
                                drawHeight = targetHeight;
                                drawWidth = imgAspect * drawHeight;
                                offsetX = (targetWidth - drawWidth) / 2;
                                offsetY = 0;
                            } else {
                                // Image is taller than target
                                drawWidth = targetWidth;
                                drawHeight = drawWidth / imgAspect;
                                offsetX = 0;
                                offsetY = (targetHeight - drawHeight) / 2;
                            }

                            ctx.drawImage(img, x - size + offsetX, y - size + offsetY, drawWidth, drawHeight);
                            ctx.restore();
                        } else {
                            // Draw fallback initial
                            const fullname = n.agent.meta.fullname || n.agent.agentName || 'Agent';
                            const initial = fullname.charAt(0).toUpperCase();
                            const fontSize = 14 / globalScale;
                            ctx.font = `bold ${fontSize}px Sans-Serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = '#fff';
                            ctx.fillText(initial, x, y);
                        }

                        // 3. Draw the label
                        const label = n.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillStyle = '#1f2937';
                        ctx.fillText(label, x, y + size + 2);

                        // Store dimensions for pointer area
                        const textWidth = ctx.measureText(label).width;
                        (node as Node).__bckgDimensions = [Math.max(size * 2, textWidth), size * 2 + fontSize + 4];
                    }}
                    onRenderFramePost={(ctx) => {
                        // Draw clusters/regions for servers
                        const serverNodes: Record<string, Node[]> = {};
                        [...graphData.nodes].forEach((n) => {
                            if (!serverNodes[n.serverUrl]) serverNodes[n.serverUrl] = [];
                            serverNodes[n.serverUrl]!.push(n);
                        });

                        Object.entries(serverNodes).forEach(([serverUrl, nodes]) => {
                            if (nodes.length === 0) return;

                            const isLocal = serverUrl === publicUrl.replace(/\/$/, '');

                            // Calculate center and radius to encompass all nodes in this server
                            let centerX = 0;
                            let centerY = 0;
                            nodes.forEach((n) => {
                                centerX += n.x || 0;
                                centerY += n.y || 0;
                            });
                            centerX /= nodes.length;
                            centerY /= nodes.length;

                            let maxDist = 0;
                            nodes.forEach((n) => {
                                const dist = Math.sqrt(
                                    Math.pow((n.x || 0) - centerX, 2) + Math.pow((n.y || 0) - centerY, 2),
                                );
                                maxDist = Math.max(maxDist, dist);
                            });

                            const radius = maxDist + 40;

                            ctx.beginPath();
                            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = isLocal ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)';
                            ctx.setLineDash([5, 5]);
                            ctx.lineWidth = 2;
                            ctx.stroke();
                            ctx.setLineDash([]);

                            const label = serverUrl.replace(/^https?:\/\//, '');
                            ctx.font = `italic 10px Sans-Serif`;
                            ctx.fillStyle = isLocal ? 'rgba(59, 130, 246, 0.5)' : 'rgba(245, 158, 11, 0.5)';
                            ctx.textAlign = 'center';
                            ctx.fillText(label, centerX, centerY - radius - 5);
                        });
                    }}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        const n = node as Node;
                        ctx.fillStyle = color;
                        const bckgDimensions = n.__bckgDimensions;
                        if (bckgDimensions) {
                            ctx.beginPath();
                            ctx.arc(n.x || 0, n.y || 0, 15, 0, 2 * Math.PI, false);
                            ctx.fill();
                        }
                    }}
                />
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 text-[10px] bg-white/80 p-2 rounded border shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-purple-500"></div>
                        <span>Parent{/* Inheritance / FROM */}</span>
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
