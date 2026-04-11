import type { MouseEvent, MutableRefObject } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    type Edge,
    type Node,
    type OnNodesChange,
    type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphLoadingSkeleton } from '../Skeleton/GraphLoadingSkeleton';
import { AgentGraphNode } from './AgentGraphNode';
import { FolderGroupNode } from './FolderGroupNode';
import { ServerGroupNode } from './ServerGroupNode';
import type { AgentNodeData } from './buildGraphLayoutNodes';

/**
 * Props for the graph canvas surface.
 *
 * @private function of AgentsGraph
 */
type AgentsGraphCanvasProps = {
    readonly emptyMessage: string;
    readonly graphHeight: number;
    readonly graphNodeCount: number;
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
 * Static node-type mapping used by React Flow.
 *
 * @private function of AgentsGraph
 */
const GRAPH_NODE_TYPES = {
    agent: AgentGraphNode,
    serverGroup: ServerGroupNode,
    folderGroup: FolderGroupNode,
};

/**
 * Legend item rendered in the graph corner.
 *
 * @private function of AgentsGraph
 */
type GraphLegendItem = {
    label: string;
    lineClassName: string;
};

/**
 * Edge legend shown on top of the graph surface.
 *
 * @private function of AgentsGraph
 */
const GRAPH_LEGEND_ITEMS: ReadonlyArray<GraphLegendItem> = [
    { label: 'Parent', lineClassName: 'w-6 border-t-2 border-dashed border-sky-400' },
    { label: 'Import', lineClassName: 'w-6 border-t-2 border-slate-400' },
    { label: 'Team', lineClassName: 'w-6 border-t-4 border-emerald-400' },
    { label: 'Folder order', lineClassName: 'w-6 border-t-2 border-dashed border-amber-400' },
];

/**
 * Resolve the color used by the React Flow minimap for one node.
 *
 * @private function of AgentsGraph
 */
function getMiniMapNodeColor(node: Node): string {
    if (node.type === 'agent') {
        const nodeData = node.data as AgentNodeData;
        return nodeData.style.fill;
    }

    if (node.type === 'serverGroup') {
        return '#e2e8f0';
    }

    return '#f1f5f9';
}

/**
 * Render the small edge legend in the bottom-right corner.
 *
 * @private function of AgentsGraph
 */
function AgentsGraphLegend() {
    return (
        <div
            data-export-exclude="true"
            className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 text-[10px] rounded-lg border border-slate-200 bg-white/80 p-2 shadow-sm"
        >
            {GRAPH_LEGEND_ITEMS.map(({ label, lineClassName }) => (
                <div key={label} className="flex items-center gap-2">
                    <div className={lineClassName}></div>
                    <span>{label}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Render the React Flow canvas and its empty/loading states.
 *
 * @private function of AgentsGraph
 */
export function AgentsGraphCanvas(props: AgentsGraphCanvasProps) {
    const {
        emptyMessage,
        graphHeight,
        graphNodeCount,
        graphWrapperRef,
        isGraphCanvasReady,
        displayedNodes,
        displayedEdges,
        onNodesChange,
        onFlowNodeClick,
        onNodeHover,
        onNodeDragStop,
        onGraphInit,
    } = props;

    return (
        <div
            className="agents-graph-surface relative overflow-hidden rounded-2xl border border-slate-200 shadow-inner"
            style={{ height: graphHeight }}
        >
            {graphNodeCount === 0 ? (
                <div className="flex justify-center py-12 text-gray-500">{emptyMessage}</div>
            ) : (
                <div
                    ref={graphWrapperRef}
                    className={`agents-graph-canvas h-full w-full ${isGraphCanvasReady ? 'opacity-100' : 'opacity-0'}`}
                    role="presentation"
                >
                    <ReactFlow
                        nodes={displayedNodes}
                        edges={displayedEdges}
                        nodeTypes={GRAPH_NODE_TYPES}
                        onNodesChange={onNodesChange}
                        onNodeClick={onFlowNodeClick}
                        onNodeMouseEnter={(_, node) => onNodeHover(node)}
                        onNodeMouseLeave={() => onNodeHover(null)}
                        onNodeDragStop={onNodeDragStop}
                        onInit={onGraphInit}
                        fitView
                        panOnScroll
                        minZoom={0.2}
                        maxZoom={2.5}
                        snapToGrid
                        snapGrid={[8, 8]}
                        nodesConnectable={false}
                        nodesDraggable
                        className="agents-graph-flow"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(148, 163, 184, 0.35)" />
                        <MiniMap position="bottom-left" zoomable pannable nodeColor={getMiniMapNodeColor} />
                        <Controls position="bottom-right" />
                    </ReactFlow>
                </div>
            )}

            {!isGraphCanvasReady && graphNodeCount > 0 && (
                <div className="absolute inset-0 z-20">
                    <GraphLoadingSkeleton isInset />
                </div>
            )}

            <AgentsGraphLegend />
        </div>
    );
}
