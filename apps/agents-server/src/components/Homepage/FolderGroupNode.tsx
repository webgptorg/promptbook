import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import type { NodeProps } from 'reactflow';
import type { FolderGroupNodeData } from './buildGraphLayoutNodes';

/**
 * Renders a folder group container.
 *
 * @private function of AgentsGraph
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
