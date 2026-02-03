
'use client';

import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { string_url } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Edge,
    MarkerType,
    Node,
    OnConnect,
    OnEdgesChange,
    OnNodesChange,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { CustomNode } from './CustomNode';

// TODO: Move to a separate file
type AgentWithVisibility = AgentBasicInformation & {
    visibility?: 'PUBLIC' | 'PRIVATE';
    serverUrl?: string;
};

type AgentsGraphV2Props = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVIisibility[];
    readonly federatedServersStatus: Record<string, { status: 'loading' | 'success' | 'error'; error?: string }>;
    readonly publicUrl: string_url;
};

const nodeTypes = {
    custom: CustomNode,
};

export function AgentsGraphV2(props: AgentsGraphV2Props) {
    const { agents, federatedAgents, publicUrl } = props;
    const router = useRouter();

    const allAgents = useMemo(() => [...agents, ...federatedAgents], [agents, federatedAgents]);

    const nodes: Node[] = useMemo(() => {
        const localAgents = agents.map((agent, i) => ({
            id: agent.agentName,
            type: 'custom',
            data: {
                label: agent.agentName,
                image: agent.meta.image || generatePlaceholderAgentProfileImageUrl(agent.agentName, publicUrl),
                onClick: () => {
                    router.push(`/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`);
                },
            },
            position: { x: i * 200, y: 100 },
        }));

        const remoteAgents = federatedAgents.map((agent, i) => ({
            id: agent.agentName,
            type: 'custom',
            data: {
                label: agent.agentName,
                image: agent.meta.image || generatePlaceholderAgentProfileImageUrl(agent.agentName, publicUrl),
                isRemote: true,
                onClick: () => {
                    window.open(`${agent.serverUrl}/agents/${agent.agentName}`, '_blank');
                },
            },
            position: { x: i * 200, y: 400 },
        }));

        return [...localAgents, ...remoteAgents];
    }, [agents, federatedAgents, publicUrl, router]);

    const edges: Edge[] = useMemo(() => {
        const newEdges: Edge[] = [];
        allAgents.forEach((agent) => {
            agent.capabilities?.forEach((capability) => {
                if (!capability.agentUrl) {
                    return;
                }
                const targetAgentName = capability.agentUrl.split('/').pop();
                const targetAgent = allAgents.find((a) => a.agentName === targetAgentName);
                if (targetAgent) {
                    newEdges.push({
                        id: `${agent.agentName}-${targetAgent.agentName}`,
                        source: agent.agentName,
                        target: targetAgent.agentName,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                        },
                    });
                }
            });
        });
        return newEdges;
    }, [allAgents]);

    const [nodesState, setNodesState] = React.useState<Node[]>(nodes);
    const [edgesState, setEdgesState] = React.useState<Edge[]>(edges);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodesState((nds) => applyNodeChanges(changes, nds)),
        [setNodesState],
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdgesState((eds) => applyEdgeChanges(changes, eds)),
        [setEdgesState],
    );
    const onConnect: OnConnect = useCallback(
        (connection) => setEdgesState((eds) => addEdge(connection, eds)),
        [setEdgesState],
    );

    return (
        <div style={{ height: '100vh' }}>
            <ReactFlow
                nodes={nodesState}
                edges={edgesState}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
            >
                <Controls />
                <Background />
            </ReactFlow>
        </div>
    );
}
