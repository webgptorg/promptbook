import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import type { NodeProps } from 'reactflow';
import type { ServerGroupNodeData } from './buildGraphLayoutNodes';

/**
 * Renders a server group container.
 *
 * @private function of AgentsGraph
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
