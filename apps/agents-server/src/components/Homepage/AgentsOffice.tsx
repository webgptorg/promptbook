'use client';

import { useRouter } from 'next/navigation';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent as ReactWheelEvent,
} from 'react';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { AgentsOfficeToolbar } from './AgentsOfficeToolbar';
import {
    buildOfficeLayout,
    type OfficeAgentVisual,
    type OfficeLayout,
    type OfficePoint,
    type OfficeRoom,
} from './buildOfficeLayout';
import { OfficeSceneGeometry, type OfficeSceneMetrics } from './OfficeSceneGeometry';
import { OfficeScene } from './OfficeScene';
import { OfficeTooltip } from './OfficeTooltip';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Width of the tooltip action panel.
 */
const TOOLTIP_WIDTH = 240;

/**
 * Height reserved for the office scene canvas.
 */
const OFFICE_CANVAS_HEIGHT = 760;

/**
 * Additional padding added around the projected scene.
 */
const SCENE_PADDING = 180;

/**
 * Props for the office homepage visualization.
 */
type AgentsOfficeProps = {
    agents: ReadonlyArray<AgentOrganizationAgent>;
    federatedAgents: ReadonlyArray<AgentWithVisibility>;
    publicUrl: string;
    folders: ReadonlyArray<AgentOrganizationFolder>;
};

/**
 * Camera state used for pan/zoom transforms.
 */
type OfficeCamera = {
    x: number;
    y: number;
    zoom: number;
};

/**
 * Hover tooltip state for one agent.
 */
type OfficeTooltipState = {
    agentId: string;
    x: number;
    y: number;
};

/**
 * Drag interaction state for manual panning.
 */
type OfficeDragState = {
    pointerX: number;
    pointerY: number;
    cameraX: number;
    cameraY: number;
};

/**
 * Container size observed for camera fitting.
 */
type OfficeContainerSize = {
    width: number;
    height: number;
};

/**
 * Renders the isometric Office homepage view for local and federated agents.
 */
export function AgentsOffice(props: AgentsOfficeProps) {
    const { agents, federatedAgents, publicUrl, folders } = props;
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<OfficeContainerSize>({
        width: 1200,
        height: OFFICE_CANVAS_HEIGHT,
    });
    const [camera, setCamera] = useState<OfficeCamera>({ x: 0, y: 0, zoom: 1 });
    const [dragState, setDragState] = useState<OfficeDragState | null>(null);
    const [tooltipState, setTooltipState] = useState<OfficeTooltipState | null>(null);
    const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
    const [focusedMeetingRoomIndex, setFocusedMeetingRoomIndex] = useState(0);

    const layout = useMemo<OfficeLayout>(
        () =>
            buildOfficeLayout({
                agents,
                federatedAgents,
                publicUrl,
                folders,
            }),
        [agents, federatedAgents, publicUrl, folders],
    );

    const sceneMetrics = useMemo(() => createSceneMetrics(layout), [layout]);
    const defaultCamera = useMemo(() => fitCameraToScene(sceneMetrics, containerSize), [sceneMetrics, containerSize]);

    useEffect(() => {
        setCamera(defaultCamera);
    }, [defaultCamera]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            const nextEntry = entries[0];
            if (!nextEntry) {
                return;
            }

            setContainerSize({
                width: nextEntry.contentRect.width,
                height: nextEntry.contentRect.height,
            });
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const roomById = useMemo(() => new Map(layout.rooms.map((room) => [room.id, room])), [layout.rooms]);
    const deskOccupants = useMemo(() => {
        return layout.agents.reduce<Map<string, OfficeAgentVisual>>((map, agent) => {
            if (agent.deskId) {
                map.set(agent.deskId, agent);
            }
            return map;
        }, new Map());
    }, [layout.agents]);
    const agentsByRoomId = useMemo(() => {
        return layout.agents.reduce<Map<string, Array<OfficeAgentVisual>>>((map, agent) => {
            const agentsForRoom = map.get(agent.roomId) || [];
            agentsForRoom.push(agent);
            map.set(agent.roomId, agentsForRoom);
            return map;
        }, new Map());
    }, [layout.agents]);
    const meetingRoomIds = useMemo(
        () =>
            layout.rooms
                .filter((room) => (agentsByRoomId.get(room.id) || []).some((agent) => agent.state === 'meeting'))
                .map((room) => room.id),
        [layout.rooms, agentsByRoomId],
    );
    const hoveredAgent = useMemo(
        () => (tooltipState ? layout.agents.find((agent) => agent.id === tooltipState.agentId) || null : null),
        [tooltipState, layout.agents],
    );

    /**
     * Opens one local or federated agent route using the existing profile/chat/book UX.
     *
     * @param href - Relative app route or absolute federated URL.
     */
    const openHref = (href: string): void => {
        if (/^https?:\/\//.test(href)) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }

        router.push(href);
    };

    /**
     * Focuses the camera on one room.
     *
     * @param roomId - Room to focus.
     */
    const focusRoom = (roomId: string): void => {
        const room = roomById.get(roomId);
        if (!room) {
            return;
        }

        const targetZoom = Math.max(defaultCamera.zoom, Math.min(defaultCamera.zoom * 1.25, 1.7));
        const roomCenter = projectRoomCenter(room, sceneMetrics);

        setFocusedRoomId(roomId);
        setCamera({
            zoom: targetZoom,
            x: containerSize.width / 2 - roomCenter.x * targetZoom,
            y: containerSize.height / 2 - roomCenter.y * targetZoom,
        });
    };

    /**
     * Cycles through rooms that currently host meetings.
     */
    const focusMeetingRoom = (): void => {
        if (meetingRoomIds.length === 0) {
            const firstRoom = layout.rooms[0];
            if (firstRoom) {
                focusRoom(firstRoom.id);
            }
            return;
        }

        const nextRoomId = meetingRoomIds[focusedMeetingRoomIndex % meetingRoomIds.length];
        setFocusedMeetingRoomIndex((previousIndex) => previousIndex + 1);
        focusRoom(nextRoomId);
    };

    /**
     * Adjusts zoom while preserving the current scene center.
     *
     * @param zoomDelta - Multiplicative zoom factor.
     */
    const nudgeZoom = (zoomDelta: number): void => {
        setCamera((currentCamera) => {
            const nextZoom = clamp(currentCamera.zoom * zoomDelta, defaultCamera.zoom * 0.85, 2.1);
            const centerX = containerSize.width / 2;
            const centerY = containerSize.height / 2;
            const sceneCenterX = (centerX - currentCamera.x) / currentCamera.zoom;
            const sceneCenterY = (centerY - currentCamera.y) / currentCamera.zoom;

            return {
                zoom: nextZoom,
                x: centerX - sceneCenterX * nextZoom,
                y: centerY - sceneCenterY * nextZoom,
            };
        });
    };

    /**
     * Resets the camera to the fitted overview.
     */
    const resetCamera = (): void => {
        setFocusedRoomId(null);
        setCamera(defaultCamera);
    };

    /**
     * Updates the hover tooltip anchor for one agent.
     *
     * @param event - Pointer event from the office canvas.
     * @param agentId - Hovered agent identifier.
     */
    const updateTooltip = (event: ReactPointerEvent<SVGGElement>, agentId: string): void => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) {
            return;
        }

        setTooltipState({
            agentId,
            x: event.clientX - containerRect.left,
            y: event.clientY - containerRect.top,
        });
    };

    /**
     * Clears the hover tooltip state.
     */
    const clearTooltip = (): void => {
        setTooltipState(null);
    };

    /**
     * Starts a pan interaction on the office surface.
     *
     * @param event - Pointer event starting the drag.
     */
    const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
        setDragState({
            pointerX: event.clientX,
            pointerY: event.clientY,
            cameraX: camera.x,
            cameraY: camera.y,
        });
    };

    /**
     * Updates the camera during manual panning.
     *
     * @param event - Pointer event emitted while dragging.
     */
    const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
        if (!dragState) {
            return;
        }

        setCamera((currentCamera) => ({
            ...currentCamera,
            x: dragState.cameraX + (event.clientX - dragState.pointerX),
            y: dragState.cameraY + (event.clientY - dragState.pointerY),
        }));
    };

    /**
     * Ends a pan interaction.
     */
    const handlePointerUp = (): void => {
        setDragState(null);
    };

    /**
     * Handles wheel-based zoom interactions.
     *
     * @param event - Mouse wheel event over the office surface.
     */
    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
        event.preventDefault();
        nudgeZoom(event.deltaY > 0 ? 0.92 : 1.08);
    };

    if (layout.agents.length === 0) {
        return (
            <div className="flex justify-center py-12 text-gray-500">{formatText('No agents to show in office.')}</div>
        );
    }

    return (
        <div className="space-y-4">
            <AgentsOfficeToolbar
                rooms={layout.rooms}
                stateCounts={layout.stateCounts}
                focusedRoomId={focusedRoomId}
                onZoomIn={() => nudgeZoom(1.1)}
                onZoomOut={() => nudgeZoom(0.9)}
                onResetCamera={resetCamera}
                onAutoArrange={resetCamera}
                onFocusMeetingRoom={focusMeetingRoom}
                onFocusRoom={focusRoom}
            />

            <div
                ref={containerRef}
                className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(252,211,77,0.2),_rgba(255,255,255,0)_30%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(226,232,240,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                style={{ height: OFFICE_CANVAS_HEIGHT }}
                onWheel={handleWheel}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_rgba(255,255,255,0)_62%)]" />

                <OfficeScene
                    layout={layout}
                    camera={camera}
                    containerSize={containerSize}
                    sceneMetrics={sceneMetrics}
                    isDragging={dragState !== null}
                    focusedRoomId={focusedRoomId}
                    roomById={roomById}
                    deskOccupants={deskOccupants}
                    agentsByRoomId={agentsByRoomId}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onAgentHover={updateTooltip}
                    onAgentLeave={clearTooltip}
                    onAgentOpen={openHref}
                />

                {hoveredAgent && tooltipState && (
                    <OfficeTooltip
                        agent={hoveredAgent}
                        publicUrl={publicUrl}
                        x={clamp(tooltipState.x + 18, 18, containerSize.width - TOOLTIP_WIDTH - 18)}
                        y={clamp(tooltipState.y - 16, 18, containerSize.height - 210)}
                        onOpenProfile={() => openHref(hoveredAgent.profileHref)}
                        onOpenChat={() => openHref(hoveredAgent.chatHref)}
                        onOpenBook={() => openHref(hoveredAgent.bookHref)}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * Returns projected scene metrics for camera fitting and rendering.
 *
 * @param layout - Prepared office layout.
 * @returns Screen-space scene metrics.
 */
function createSceneMetrics(layout: OfficeLayout): OfficeSceneMetrics {
    return {
        sceneWidth: layout.worldWidth + layout.worldHeight + SCENE_PADDING * 2,
        sceneHeight: (layout.worldWidth + layout.worldHeight) * OfficeSceneGeometry.ISO_Y_SCALE + SCENE_PADDING * 2,
        originX: layout.worldHeight + SCENE_PADDING * 0.9,
        originY: SCENE_PADDING,
    };
}

/**
 * Computes the default fitted camera for the current container.
 *
 * @param metrics - Projected scene metrics.
 * @param containerSize - Observed container size.
 * @returns Camera centered on the full scene.
 */
function fitCameraToScene(metrics: OfficeSceneMetrics, containerSize: OfficeContainerSize): OfficeCamera {
    const zoom = Math.min(containerSize.width / metrics.sceneWidth, containerSize.height / metrics.sceneHeight) * 0.95;

    return {
        zoom,
        x: (containerSize.width - metrics.sceneWidth * zoom) / 2,
        y: (containerSize.height - metrics.sceneHeight * zoom) / 2,
    };
}

/**
 * Projects the visual center of one room into screen coordinates.
 *
 * @param room - Room to center on.
 * @param metrics - Projected scene metrics.
 * @returns Screen-space room center.
 */
function projectRoomCenter(room: OfficeRoom, metrics: OfficeSceneMetrics): OfficePoint {
    const centerX = room.x + room.width / 2;
    const centerY = room.y + room.depth / 2;

    return OfficeSceneGeometry.projectPoint({ x: centerX, y: centerY }, 0, metrics);
}

/**
 * Clamps a number to the provided bounds.
 *
 * @param value - Input value.
 * @param minValue - Lower bound.
 * @param maxValue - Upper bound.
 * @returns Clamped value.
 */
function clamp(value: number, minValue: number, maxValue: number): number {
    return Math.min(maxValue, Math.max(minValue, value));
}
