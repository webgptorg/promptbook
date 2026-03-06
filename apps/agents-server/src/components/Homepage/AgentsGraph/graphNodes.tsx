import { useEffect, useState } from 'react';
import type { Edge, NodeProps } from 'reactflow';
import type { AgentNodeData, FolderGroupNodeData, GraphData, ServerGroupNodeData } from './AgentsGraph.types';
import { EDGE_STYLES } from './graphConstants';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';

/**
 * Renders an agent node inside the React Flow canvas.
 */
export function AgentGraphNode({ data }: NodeProps<AgentNodeData>) {
    const [imageSrc, setImageSrc] = useState(data.imageUrl);

    useEffect(() => {
        setImageSrc(data.imageUrl);
    }, [data.imageUrl]);

    const handleImageError = () => {
        if (imageSrc !== data.placeholderUrl) {
            setImageSrc(data.placeholderUrl);
        }
    };

    const highlightClass = data.isHighlighted
        ? 'ring-2 ring-sky-400 shadow-lg'
        : data.isNeighbor
        ? 'ring-1 ring-sky-200'
        : '';
    const dimClass = data.isDimmed ? 'opacity-40' : 'opacity-100';

    return (
        <div
            className={`agents-graph-node relative h-full w-full rounded-2xl border shadow-sm cursor-pointer transition-transform duration-200 ${highlightClass} ${dimClass}`}
            style={{ backgroundColor: data.style.fill, borderColor: data.style.border, color: data.style.text }}
            onClick={data.onOpen}
            title={data.tooltip}
        >
            {data.orderIndex ? (
                <div className="absolute top-1.5 right-1.5 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow">
                    {data.orderIndex}
                </div>
            ) : null}
            <div className="flex h-full items-center gap-3 px-3">
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                    style={{ borderColor: data.style.ring }}
                >
                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageSrc}
                            alt={data.name}
                            className="h-full w-full object-cover"
                            onError={handleImageError}
                        />
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{data.name}</div>
                    <div className="text-[11px] text-slate-600 truncate">{data.agent.agentName}</div>
                </div>
            </div>
        </div>
    );
}

/**
 * Renders a server group container.
 */
export function ServerGroupNode({ data }: NodeProps<ServerGroupNodeData>) {
    const ringClass = data.isLocal ? 'border-sky-200 bg-sky-50/40' : 'border-slate-200 bg-white/70';
    const { formatText } = useAgentNaming();
    const countLabel = formatText(`${data.agentCount} agents`);

    return (
        <div className={`relative h-full w-full rounded-[28px] border ${ringClass} shadow-sm`}>
            <div className="absolute left-4 top-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {data.label}
            </div>
            <div className="absolute right-4 top-3 text-[11px] text-slate-400">{countLabel}</div>
        </div>
    );
}

/**
 * Renders a folder group container.
 */
export function FolderGroupNode({ data }: NodeProps<FolderGroupNodeData>) {
    const { formatText } = useAgentNaming();
    const countLabel = formatText(`${data.agentCount} agents`);

    return (
        <div className="relative h-full w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
            <div className="absolute left-3 top-2 text-xs font-semibold text-slate-500">{data.label}</div>
            <div className="absolute right-3 top-2 text-[10px] text-slate-400">{countLabel}</div>
        </div>
    );
}

/**
 * Build React Flow edges from graph links.
 */
export const buildGraphEdges = (graphData: GraphData): Edge[] => {
    const links = [...graphData.links, ...graphData.orderLinks];

    return links.map((link, index) => ({
        id: `edge:${link.type}:${link.source}:${link.target}:${index}`,
        source: link.source,
        target: link.target,
        type: 'smoothstep',
        data: { type: link.type },
        style: {
            stroke: EDGE_STYLES[link.type].color,
            strokeWidth: EDGE_STYLES[link.type].width,
            strokeDasharray: EDGE_STYLES[link.type].dash,
            opacity: 0.8,
        },
        selectable: false,
    }));
};

/**
 * Apply hover-based styling to edges.
 */
export const applyEdgeHighlighting = (
    edges: Edge[],
    hoveredNodeId: string | null,
    relatedNodeIds: Set<string> | null,
): Edge[] => {
    if (!hoveredNodeId || !relatedNodeIds) {
        return edges;
    }

    return edges.map((edge) => {
        const isRelated = relatedNodeIds.has(edge.source) && relatedNodeIds.has(edge.target);
        const isPrimary = edge.source === hoveredNodeId || edge.target === hoveredNodeId;
        const opacity = isRelated ? (isPrimary ? 1 : 0.8) : 0.15;

        return {
            ...edge,
            style: {
                ...edge.style,
                opacity,
            },
        };
    });
};
