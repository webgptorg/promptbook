import { useEffect, useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { AgentNodeData } from './buildGraphLayoutNodes';

/**
 * Renders an agent node inside the React Flow canvas.
 *
 * @private function of AgentsGraph
 */
export function AgentGraphNode({ data }: NodeProps<AgentNodeData>) {
    const [imageSrc, setImageSrc] = useState(data.imageUrl);

    useEffect(() => {
        setImageSrc(data.imageUrl);
    }, [data.imageUrl]);

    /**
     * Fall back to the generated placeholder avatar when image loading fails.
     */
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
