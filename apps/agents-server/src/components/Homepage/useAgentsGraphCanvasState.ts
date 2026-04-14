'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type MutableRefObject } from 'react';
import { useNodesState, type Edge, type Node, type OnNodesChange, type ReactFlowInstance } from 'reactflow';
import { applyEdgeHighlighting, buildGraphEdges } from './buildGraphEdges';
import { collectRelatedNodeIds, type GraphData, type GraphNode, type ServerGroup } from './buildGraphData';
import {
    buildGraphLayoutNodes,
    buildPositionsStorageKey,
    loadStoredPositions,
    saveStoredPositions,
    type AgentNodeData,
    type StoredPositions,
} from './buildGraphLayoutNodes';

/**
 * Minimum graph viewport height.
 *
 * @private function of AgentsGraph
 */
const GRAPH_MIN_HEIGHT = 480;

/**
 * Vertical viewport offset used to compute graph height.
 *
 * @private function of AgentsGraph
 */
const GRAPH_HEIGHT_OFFSET = 340;

/**
 * Inputs consumed by the private graph-canvas state hook.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphCanvasStateProps = {
    readonly graphData: GraphData;
    readonly normalizedPublicUrl: string;
    readonly onOpenGraphNode: (node: GraphNode) => void;
    readonly serverGroups: ServerGroup[];
};

/**
 * Canvas-facing state derived from graph data, layout, hover, and persisted positions.
 *
 * @private function of AgentsGraph
 */
type UseAgentsGraphCanvasStateResult = {
    readonly graphHeight: number;
    readonly graphWrapperRef: MutableRefObject<HTMLDivElement | null>;
    readonly isGraphCanvasReady: boolean;
    readonly displayedNodes: Node[];
    readonly displayedEdges: Edge[];
    readonly onNodesChange: OnNodesChange;
    readonly onFlowNodeClick: (_event: MouseEvent, node: Node) => void;
    readonly onNodeHover: (node: Node | null) => void;
    readonly onNodeDragStop: (_event: MouseEvent, node: Node) => void;
    readonly onGraphInit: (instance: ReactFlowInstance) => void;
};

/**
 * Read the typed node payload when the React Flow node is an agent node.
 *
 * @private function of AgentsGraph
 */
function getAgentNodeData(node: Node): AgentNodeData | null {
    if (node.type !== 'agent') {
        return null;
    }

    return node.data as AgentNodeData;
}

/**
 * Resolve the currently hovered agent id, or `null` for non-agent nodes.
 *
 * @private function of AgentsGraph
 */
function resolveHoveredNodeId(node: Node | null): string | null {
    if (!node || node.type !== 'agent') {
        return null;
    }

    return node.id;
}

/**
 * Apply hovered/neighbor/dimmed agent styling without changing non-agent nodes.
 *
 * @private function of AgentsGraph
 */
function applyNodeRelationshipHighlighting(
    nodes: ReadonlyArray<Node>,
    relatedNodeIds: ReadonlySet<string> | null,
    hoveredNodeId: string | null,
): Node[] {
    if (!relatedNodeIds) {
        return [...nodes];
    }

    return nodes.map((node) => {
        const nodeData = getAgentNodeData(node);
        if (!nodeData) {
            return node;
        }

        const isRelated = relatedNodeIds.has(node.id);
        const isHighlighted = hoveredNodeId === node.id;

        return {
            ...node,
            data: {
                ...nodeData,
                isDimmed: !isRelated,
                isHighlighted,
                isNeighbor: isRelated && !isHighlighted,
            } satisfies AgentNodeData,
        };
    });
}

/**
 * Persist the dragged position for an agent node.
 *
 * @private function of AgentsGraph
 */
function persistDraggedAgentNode(node: Node, storedPositions: StoredPositions, storageKey: string): void {
    if (node.type !== 'agent' || !node.parentId) {
        return;
    }

    storedPositions[node.id] = {
        x: node.position.x,
        y: node.position.y,
        parentId: node.parentId,
    };

    saveStoredPositions(storageKey, storedPositions);
}

/**
 * Fit the graph into the visible viewport after layout changes settle.
 *
 * @private function of AgentsGraph
 */
function fitGraphToViewport(reactFlowInstanceRef: MutableRefObject<ReactFlowInstance | null>): void {
    requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 500 });
    });
}

/**
 * Measure the preferred graph canvas height from the current viewport.
 *
 * @private function of AgentsGraph
 */
function measureGraphHeight(): number {
    return Math.max(GRAPH_MIN_HEIGHT, window.innerHeight - GRAPH_HEIGHT_OFFSET);
}

/**
 * Compose layout, hover highlighting, drag persistence, and React Flow lifecycle state for `AgentsGraphCanvas`.
 *
 * @param props - Current graph data, grouping, and open-node behavior.
 * @returns Canvas-facing state and handlers consumed by the private graph facade.
 *
 * @private function of AgentsGraph
 */
export function useAgentsGraphCanvasState(props: UseAgentsGraphCanvasStateProps): UseAgentsGraphCanvasStateResult {
    const { graphData, normalizedPublicUrl, onOpenGraphNode, serverGroups } = props;
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [isGraphCanvasReady, setIsGraphCanvasReady] = useState(false);
    const storedPositionsRef = useRef<StoredPositions>({});
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const graphWrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateGraphHeight = () => {
            setGraphHeight(measureGraphHeight());
        };

        updateGraphHeight();
        window.addEventListener('resize', updateGraphHeight);

        return () => {
            window.removeEventListener('resize', updateGraphHeight);
        };
    }, []);

    const storageKey = useMemo(() => buildPositionsStorageKey(normalizedPublicUrl), [normalizedPublicUrl]);

    useEffect(() => {
        storedPositionsRef.current = loadStoredPositions(storageKey);
    }, [storageKey]);

    const layoutNodes = useMemo(
        () =>
            buildGraphLayoutNodes({
                serverGroups,
                orderIndexByNodeId: graphData.orderIndexByNodeId,
                publicUrl: normalizedPublicUrl,
                storedPositions: storedPositionsRef.current,
                onNodeOpen: onOpenGraphNode,
            }),
        [serverGroups, graphData.orderIndexByNodeId, normalizedPublicUrl, onOpenGraphNode],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

    useEffect(() => {
        setNodes(layoutNodes);
        if (layoutNodes.length > 0) {
            fitGraphToViewport(reactFlowInstanceRef);
        }
    }, [layoutNodes, setNodes]);

    const baseEdges = useMemo(() => buildGraphEdges(graphData), [graphData]);

    const relatedNodeIds = useMemo(() => {
        if (!hoveredNodeId) {
            return null;
        }

        return collectRelatedNodeIds([...graphData.links, ...graphData.orderLinks], new Set([hoveredNodeId]));
    }, [hoveredNodeId, graphData.links, graphData.orderLinks]);

    const displayedNodes = useMemo(
        () => applyNodeRelationshipHighlighting(nodes, relatedNodeIds, hoveredNodeId),
        [nodes, relatedNodeIds, hoveredNodeId],
    );

    const displayedEdges = useMemo(
        () => applyEdgeHighlighting(baseEdges, hoveredNodeId, relatedNodeIds),
        [baseEdges, hoveredNodeId, relatedNodeIds],
    );

    const handleFlowNodeClick = useCallback((_event: MouseEvent, node: Node) => {
        getAgentNodeData(node)?.onOpen();
    }, []);

    const handleNodeHover = useCallback((node: Node | null) => {
        setHoveredNodeId(resolveHoveredNodeId(node));
    }, []);

    const handleNodeDragStop = useCallback(
        (_event: MouseEvent, node: Node) => {
            persistDraggedAgentNode(node, storedPositionsRef.current, storageKey);
        },
        [storageKey],
    );

    const handleGraphInit = useCallback((instance: ReactFlowInstance) => {
        reactFlowInstanceRef.current = instance;
        setIsGraphCanvasReady(true);
    }, []);

    return {
        graphHeight,
        graphWrapperRef,
        isGraphCanvasReady,
        displayedNodes,
        displayedEdges,
        onNodesChange,
        onFlowNodeClick: handleFlowNodeClick,
        onNodeHover: handleNodeHover,
        onNodeDragStop: handleNodeDragStop,
        onGraphInit: handleGraphInit,
    };
}
