'use client';

import { AgentsGraphCanvas } from './AgentsGraphCanvas';
import { AgentsGraphToolbar } from './AgentsGraphToolbar';
import { GraphSummaryPanel } from './GraphSummaryPanel';
import { useAgentsGraphState } from './useAgentsGraphState';

/**
 * Props for the AgentsGraph component.
 */
type AgentsGraphProps = Parameters<typeof useAgentsGraphState>[0];

/**
 * Render the AgentsGraph component.
 */
export function AgentsGraph(props: AgentsGraphProps) {
    const { canvas, emptyMessage, graphSummary, hasAnyAgents, toolbar } = useAgentsGraphState(props);

    if (!hasAnyAgents) {
        return <div className="flex justify-center py-12 text-gray-500">{emptyMessage}</div>;
    }

    return (
        <div className="space-y-4">
            <AgentsGraphToolbar {...toolbar} />
            <GraphSummaryPanel summary={graphSummary} />
            <AgentsGraphCanvas {...canvas} />
        </div>
    );
}
