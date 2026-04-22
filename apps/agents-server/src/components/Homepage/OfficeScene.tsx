import type { PointerEvent as ReactPointerEvent } from 'react';
import type { OfficeAgentVisual, OfficeLayout, OfficeRoom } from './buildOfficeLayout';
import type { OfficeSceneMetrics } from './OfficeSceneGeometry';
import { OfficeSceneRenderAgent } from './OfficeSceneRenderAgent';
import { OfficeSceneRenderCorridor } from './OfficeSceneRenderCorridor';
import { OfficeSceneRenderDesk } from './OfficeSceneRenderDesk';
import { OfficeSceneRenderRoom } from './OfficeSceneRenderRoom';
import { OfficeSceneSurface } from './OfficeSceneSurface';

/**
 * Props for the office scene SVG renderer.
 */
type OfficeSceneProps = {
    layout: OfficeLayout;
    camera: {
        x: number;
        y: number;
        zoom: number;
    };
    containerSize: {
        width: number;
        height: number;
    };
    sceneMetrics: OfficeSceneMetrics;
    isDragging: boolean;
    focusedRoomId: string | null;
    roomById: ReadonlyMap<string, OfficeRoom>;
    deskOccupants: ReadonlyMap<string, OfficeAgentVisual>;
    agentsByRoomId: ReadonlyMap<string, ReadonlyArray<OfficeAgentVisual>>;
    onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
    onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
    onPointerUp: () => void;
    onAgentHover: (event: ReactPointerEvent<SVGGElement>, agentId: string) => void;
    onAgentLeave: () => void;
    onAgentOpen: (href: string) => void;
};

/**
 * Renders the SVG office scene, including rooms, desks, and agents.
 *
 * @private function of <AgentsOffice/>
 */
export function OfficeScene(props: OfficeSceneProps) {
    const {
        layout,
        camera,
        containerSize,
        sceneMetrics,
        isDragging,
        focusedRoomId,
        roomById,
        deskOccupants,
        agentsByRoomId,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onAgentHover,
        onAgentLeave,
        onAgentOpen,
    } = props;

    return (
        <svg
            className={`h-full w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
        >
            <OfficeSceneSurface width={containerSize.width} height={containerSize.height} />

            <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
                <OfficeSceneRenderCorridor corridorHub={layout.corridorHub} layout={layout} metrics={sceneMetrics} />

                {layout.rooms.map((room) => (
                    <OfficeSceneRenderRoom
                        key={room.id}
                        room={room}
                        roomAgents={agentsByRoomId.get(room.id) || []}
                        isFocused={focusedRoomId === null || focusedRoomId === room.id}
                        metrics={sceneMetrics}
                    />
                ))}

                {layout.desks.map((desk) => (
                    <OfficeSceneRenderDesk
                        key={desk.id}
                        desk={desk}
                        occupant={deskOccupants.get(desk.id) || null}
                        metrics={sceneMetrics}
                    />
                ))}

                {layout.agents.map((agent) => (
                    <OfficeSceneRenderAgent
                        key={agent.id}
                        agent={agent}
                        room={roomById.get(agent.roomId) || null}
                        metrics={sceneMetrics}
                        onHover={(event) => onAgentHover(event, agent.id)}
                        onLeave={onAgentLeave}
                        onOpen={() => onAgentOpen(agent.profileHref)}
                    />
                ))}
            </g>
        </svg>
    );
}
