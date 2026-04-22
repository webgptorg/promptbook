'use client';

import type { string_url } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import {
    buildGraphData,
    buildGraphSummaryInfo,
    buildServerGroups,
    normalizeServerUrl,
    type AgentWithVisibility,
    type GraphNode,
} from './buildGraphData';
import { useAgentsGraphCanvasState } from './useAgentsGraphCanvasState';
import { useAgentsGraphDownloadState } from './useAgentsGraphDownloadState';
import { useAgentsGraphQueryState } from './useAgentsGraphQueryState';

/**
 * Props consumed by `useAgentsGraphState`.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphStateProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
    readonly folders: AgentOrganizationFolder[];
};

/**
 * Derive AgentsGraph state by composing focused private graph helpers.
 *
 * @private function of AgentsGraph
 */
export function useAgentsGraphState(props: UseAgentsGraphStateProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl, folders } = props;
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const { filterType, selectedServerUrl, selectedAgentName, toggleFilter, selectServerAndAgent } =
        useAgentsGraphQueryState();

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
     * Open the local agent page or the remote federated agent URL.
     */
    const openGraphNode = useCallback(
        (node: GraphNode) => {
            const agent = node.agent;
            if (agent.serverUrl && normalizeServerUrl(agent.serverUrl) !== normalizedPublicUrl) {
                window.open(`${agent.serverUrl}/agents/${agent.agentName}`, '_blank');
                return;
            }

            router.push(`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`);
        },
        [router, normalizedPublicUrl],
    );

    const canvasState = useAgentsGraphCanvasState({
        graphData,
        normalizedPublicUrl,
        onOpenGraphNode: openGraphNode,
        serverGroups,
    });
    const downloadState = useAgentsGraphDownloadState({
        graphData,
        graphWrapperRef: canvasState.graphWrapperRef,
        serverGroups,
    });

    const emptyMessage = formatText('No agents to show in graph.');
    const hasAnyAgents = agents.length > 0 || federatedAgents.length > 0;

    return {
        emptyMessage,
        graphSummary,
        hasAnyAgents,
        toolbar: {
            agents,
            federatedAgents,
            federatedServersStatus,
            filterType,
            selectedServerUrl,
            selectedAgentName,
            normalizedPublicUrl,
            isDownloadAvailable: downloadState.isDownloadAvailable,
            formatText,
            onToggleFilter: toggleFilter,
            onSelectServerAndAgent: selectServerAndAgent,
            onDownloadPng: downloadState.handleDownloadPng,
            onDownloadSvg: downloadState.handleDownloadSvg,
            onDownloadAscii: downloadState.handleDownloadAscii,
        },
        canvas: {
            emptyMessage,
            graphHeight: canvasState.graphHeight,
            graphNodeCount: graphData.nodes.length,
            graphWrapperRef: canvasState.graphWrapperRef,
            isGraphCanvasReady: canvasState.isGraphCanvasReady,
            displayedNodes: canvasState.displayedNodes,
            displayedEdges: canvasState.displayedEdges,
            onNodesChange: canvasState.onNodesChange,
            onFlowNodeClick: canvasState.onFlowNodeClick,
            onNodeHover: canvasState.onNodeHover,
            onNodeDragStop: canvasState.onNodeDragStop,
            onGraphInit: canvasState.onGraphInit,
        },
    };
}
