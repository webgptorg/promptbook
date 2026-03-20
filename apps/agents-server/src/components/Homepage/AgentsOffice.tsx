'use client';

import {
    BookOpen,
    MessageSquare,
    RefreshCcw,
    Search,
    UserRound,
    Users,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import {
    buildOfficeLayout,
    type OfficeAgentVisual,
    type OfficeDesk,
    type OfficeLayout,
    type OfficePoint,
    type OfficeRoom,
} from './buildOfficeLayout';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Horizontal scale factor used by the isometric projection.
 */
const ISO_X_SCALE = 1;

/**
 * Vertical scale factor used by the isometric projection.
 */
const ISO_Y_SCALE = 0.56;

/**
 * Height used for desks and agent figures in projected space.
 */
const OFFICE_OBJECT_HEIGHT = 22;

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
 * Screen-space scene metrics derived from the world layout.
 */
type OfficeSceneMetrics = {
    sceneWidth: number;
    sceneHeight: number;
    originX: number;
    originY: number;
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
    const [containerSize, setContainerSize] = useState<OfficeContainerSize>({ width: 1200, height: OFFICE_CANVAS_HEIGHT });
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
        () => layout.rooms.filter((room) => (agentsByRoomId.get(room.id) || []).some((agent) => agent.state === 'meeting')).map((room) => room.id),
        [layout.rooms, agentsByRoomId],
    );
    const hoveredAgent = tooltipState ? layout.agents.find((agent) => agent.id === tooltipState.agentId) || null : null;

    /**
     * Opens one local or federated agent route using the existing profile/chat/book UX.
     *
     * @param href - Relative app route or absolute federated URL.
     */
    const openHref = (href: string) => {
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
    const focusRoom = (roomId: string) => {
        const room = roomById.get(roomId);
        if (!room) {
            return;
        }

        const targetZoom = Math.max(defaultCamera.zoom, Math.min(defaultCamera.zoom * 1.25, 1.7));
        const roomCenter = projectPoint(
            {
                x: room.x + room.width / 2,
                y: room.y + room.depth / 2,
            },
            0,
            sceneMetrics,
        );

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
    const focusMeetingRoom = () => {
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
    const nudgeZoom = (zoomDelta: number) => {
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
    const resetCamera = () => {
        setFocusedRoomId(null);
        setCamera(defaultCamera);
    };

    /**
     * Updates the hover tooltip anchor for one agent.
     *
     * @param event - Pointer event from the office canvas.
     * @param agentId - Hovered agent identifier.
     */
    const updateTooltip = (event: ReactPointerEvent<SVGGElement>, agentId: string) => {
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
     * Starts a pan interaction on the office surface.
     *
     * @param event - Pointer event starting the drag.
     */
    const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
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
    const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
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
    const handlePointerUp = () => {
        setDragState(null);
    };

    /**
     * Handles wheel-based zoom interactions.
     *
     * @param event - Mouse wheel event over the office surface.
     */
    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        nudgeZoom(event.deltaY > 0 ? 0.92 : 1.08);
    };

    if (layout.agents.length === 0) {
        return <div className="flex justify-center py-12 text-gray-500">{formatText('No agents to show in office.')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => nudgeZoom(1.1)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                        <ZoomIn className="h-4 w-4" />
                        Zoom in
                    </button>
                    <button
                        type="button"
                        onClick={() => nudgeZoom(0.9)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                        <ZoomOut className="h-4 w-4" />
                        Zoom out
                    </button>
                    <button
                        type="button"
                        onClick={resetCamera}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFocusedRoomId(null);
                            setCamera(defaultCamera);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 transition hover:border-amber-300"
                    >
                        <Search className="h-4 w-4" />
                        Auto-arrange
                    </button>
                    <button
                        type="button"
                        onClick={focusMeetingRoom}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-300"
                    >
                        <Users className="h-4 w-4" />
                        Focus team
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {layout.rooms.map((room) => (
                        <button
                            key={room.id}
                            type="button"
                            onClick={() => focusRoom(room.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                                focusedRoomId === room.id
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-white/70 bg-white/90 text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {room.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <OfficeStatusChip label="Idle" value={layout.stateCounts.idle} tone="slate" />
                <OfficeStatusChip label="Working" value={layout.stateCounts.working} tone="amber" />
                <OfficeStatusChip label="Meeting" value={layout.stateCounts.meeting} tone="emerald" />
                <OfficeStatusChip label="Moving" value={layout.stateCounts.moving} tone="sky" />
            </div>

            <div
                ref={containerRef}
                className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(252,211,77,0.2),_rgba(255,255,255,0)_30%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(226,232,240,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                style={{ height: OFFICE_CANVAS_HEIGHT }}
                onWheel={handleWheel}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_rgba(255,255,255,0)_62%)]" />

                <svg
                    className={`h-full w-full ${dragState ? 'cursor-grabbing' : 'cursor-grab'}`}
                    viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    <defs>
                        <linearGradient id="office-floor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#e2e8f0" />
                        </linearGradient>
                    </defs>

                    <rect width={containerSize.width} height={containerSize.height} fill="url(#office-floor-gradient)" />

                    <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
                        {renderCorridor(layout.corridorHub, layout, sceneMetrics)}

                        {layout.rooms.map((room) =>
                            renderRoom(
                                room,
                                agentsByRoomId.get(room.id) || [],
                                focusedRoomId === null || focusedRoomId === room.id,
                                sceneMetrics,
                            ),
                        )}

                        {layout.desks.map((desk) => renderDesk(desk, deskOccupants.get(desk.id) || null, sceneMetrics))}

                        {layout.agents.map((agent) =>
                            renderAgent(agent, roomById.get(agent.roomId) || null, sceneMetrics, {
                                onHover: (event) => updateTooltip(event, agent.id),
                                onLeave: () => setTooltipState(null),
                                onOpen: () => openHref(agent.profileHref),
                            }),
                        )}
                    </g>
                </svg>

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
 * Renders one compact status chip for the Office toolbar.
 */
function OfficeStatusChip(props: { label: string; value: number; tone: 'slate' | 'amber' | 'emerald' | 'sky' }) {
    const toneClassName =
        props.tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : props.tone === 'emerald'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : props.tone === 'sky'
            ? 'border-sky-200 bg-sky-50 text-sky-900'
            : 'border-slate-200 bg-white text-slate-700';

    return (
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClassName}`}>
            <span>{props.label}</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-700">{props.value}</span>
        </div>
    );
}

/**
 * Tooltip panel shown when the user hovers one agent in the office scene.
 */
function OfficeTooltip(props: {
    agent: OfficeAgentVisual;
    publicUrl: string;
    x: number;
    y: number;
    onOpenProfile: () => void;
    onOpenChat: () => void;
    onOpenBook: () => void;
}) {
    const { agent, publicUrl, x, y, onOpenProfile, onOpenChat, onOpenBook } = props;
    const avatarUrl = resolveAgentAvatarImageUrl({ agent: agent.agent, baseUrl: agent.agent.serverUrl || publicUrl });
    const displayName = agent.agent.meta.fullname || agent.agent.agentName;

    return (
        <div
            className="absolute z-20 w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur"
            style={{ left: x, top: y }}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-slate-700">{displayName.charAt(0).toUpperCase()}</span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{displayName}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        {formatOfficeState(agent.state)}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                        {agent.roomLabel}
                        {agent.serverLabel ? ` / ${agent.serverLabel}` : ''}
                    </div>
                </div>
            </div>

            <p className="mt-3 text-sm leading-5 text-slate-700">{agent.summaryText}</p>
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{agent.previewText}</div>

            {agent.capabilityBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.capabilityBadges.map((badge) => (
                        <span key={badge} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {badge}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={onOpenProfile}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    <UserRound className="h-4 w-4" />
                    Profile
                </button>
                <button
                    type="button"
                    onClick={onOpenChat}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    <MessageSquare className="h-4 w-4" />
                    Message
                </button>
                <button
                    type="button"
                    onClick={onOpenBook}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    <BookOpen className="h-4 w-4" />
                    Book
                </button>
            </div>
        </div>
    );
}

/**
 * Projects one world-space point into screen-space isometric coordinates.
 */
function projectPoint(point: OfficePoint, elevation: number, metrics: OfficeSceneMetrics): OfficePoint {
    return {
        x: metrics.originX + (point.x - point.y) * ISO_X_SCALE,
        y: metrics.originY + (point.x + point.y) * ISO_Y_SCALE - elevation,
    };
}

/**
 * Returns projected scene metrics for camera fitting and rendering.
 */
function createSceneMetrics(layout: OfficeLayout): OfficeSceneMetrics {
    return {
        sceneWidth: layout.worldWidth + layout.worldHeight + SCENE_PADDING * 2,
        sceneHeight: (layout.worldWidth + layout.worldHeight) * ISO_Y_SCALE + SCENE_PADDING * 2,
        originX: layout.worldHeight + SCENE_PADDING * 0.9,
        originY: SCENE_PADDING,
    };
}

/**
 * Computes the default fitted camera for the current container.
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
 * Renders the central corridor spine.
 */
function renderCorridor(corridorHub: OfficePoint, layout: OfficeLayout, metrics: OfficeSceneMetrics) {
    const start = projectPoint({ x: corridorHub.x - 24, y: 0 }, 0, metrics);
    const end = projectPoint({ x: corridorHub.x + 30, y: layout.worldHeight - 100 }, 0, metrics);
    const rightStart = projectPoint({ x: corridorHub.x + 24, y: 0 }, 0, metrics);
    const rightEnd = projectPoint({ x: corridorHub.x + 78, y: layout.worldHeight - 100 }, 0, metrics);

    return (
        <polygon
            points={`${start.x},${start.y} ${rightStart.x},${rightStart.y} ${rightEnd.x},${rightEnd.y} ${end.x},${end.y}`}
            fill="rgba(203, 213, 225, 0.45)"
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth={2}
        />
    );
}

/**
 * Renders one room floor, label, and optional meeting table.
 */
function renderRoom(room: OfficeRoom, roomAgents: Array<OfficeAgentVisual>, isFocused: boolean, metrics: OfficeSceneMetrics) {
    const topFace = projectTopFace(room.x, room.y, room.width, room.depth, 0, metrics);
    const labelPoint = projectPoint({ x: room.x + 24, y: room.y + 8 }, 8, metrics);
    const hasMeeting = roomAgents.some((agent) => agent.state === 'meeting');
    const hasRemoteStyle = room.kind === 'remote' || room.kind === 'head-office';
    const accentStroke = hasRemoteStyle ? 'rgba(37, 99, 235, 0.7)' : 'rgba(15, 23, 42, 0.2)';

    return (
        <g key={room.id} opacity={isFocused ? 1 : 0.72}>
            <polygon
                points={topFace}
                fill={hexToRgba(room.color, hasRemoteStyle ? 0.18 : 0.12)}
                stroke={accentStroke}
                strokeWidth={hasRemoteStyle ? 2.8 : 2}
            />
            <polygon
                points={projectRightFace(room.x, room.y, room.width, room.depth, 18, metrics)}
                fill={hexToRgba(room.color, 0.12)}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={1.2}
            />
            <polygon
                points={projectFrontFace(room.x, room.y, room.width, room.depth, 18, metrics)}
                fill={hexToRgba(room.color, 0.17)}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={1.2}
            />

            <text x={labelPoint.x} y={labelPoint.y} fill="#0f172a" fontSize={18} fontWeight={700}>
                {room.label}
            </text>
            <text x={labelPoint.x} y={labelPoint.y + 18} fill="rgba(71,85,105,0.92)" fontSize={11} fontWeight={600}>
                {room.subtitle}
            </text>

            {hasMeeting && (
                <g>
                    <polygon
                        points={projectTopFace(room.x + 90, room.y + 66, 84, 36, 14, metrics)}
                        fill="rgba(15,23,42,0.12)"
                        stroke="rgba(15,23,42,0.22)"
                        strokeWidth={1.4}
                    />
                    <polygon
                        points={projectFrontFace(room.x + 90, room.y + 66, 84, 36, 14, metrics)}
                        fill="rgba(15,23,42,0.18)"
                        stroke="rgba(255,255,255,0.38)"
                        strokeWidth={1}
                    />
                </g>
            )}
        </g>
    );
}

/**
 * Renders one desk including a work preview for working agents.
 */
function renderDesk(desk: OfficeDesk, occupant: OfficeAgentVisual | null, metrics: OfficeSceneMetrics) {
    const deskColor = occupant?.isRemote ? '#2563eb' : desk.color;
    const showScreen = occupant?.state === 'working';
    const screenTop = showScreen ? projectTopFace(desk.x + 12, desk.y + 4, 20, 8, OFFICE_OBJECT_HEIGHT + 2, metrics) : null;
    const labelPoint = projectPoint({ x: desk.x + 12, y: desk.y + 8 }, OFFICE_OBJECT_HEIGHT + 18, metrics);

    return (
        <g key={desk.id}>
            <polygon
                points={projectTopFace(desk.x, desk.y, desk.width, desk.depth, OFFICE_OBJECT_HEIGHT, metrics)}
                fill={hexToRgba(deskColor, 0.22)}
                stroke="rgba(15,23,42,0.16)"
                strokeWidth={1}
            />
            <polygon
                points={projectFrontFace(desk.x, desk.y, desk.width, desk.depth, OFFICE_OBJECT_HEIGHT, metrics)}
                fill={hexToRgba(deskColor, 0.28)}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={0.8}
            />
            <polygon
                points={projectRightFace(desk.x, desk.y, desk.width, desk.depth, OFFICE_OBJECT_HEIGHT, metrics)}
                fill={hexToRgba(deskColor, 0.34)}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={0.8}
            />

            {screenTop && (
                <g>
                    <polygon points={screenTop} fill="rgba(14,165,233,0.88)" stroke="rgba(255,255,255,0.52)" strokeWidth={0.8}>
                        <animate attributeName="opacity" values="0.72;1;0.75;1" dur="2.4s" repeatCount="indefinite" />
                    </polygon>
                    {occupant?.previewText && (
                        <text x={labelPoint.x} y={labelPoint.y} fill="rgba(8,47,73,0.85)" fontSize={7.6} fontWeight={700}>
                            {truncateText(occupant.previewText, 18)}
                        </text>
                    )}
                </g>
            )}
        </g>
    );
}

/**
 * Renders one agent avatar/marker inside the office scene.
 */
function renderAgent(
    agent: OfficeAgentVisual,
    room: OfficeRoom | null,
    metrics: OfficeSceneMetrics,
    handlers: {
        onHover: (event: ReactPointerEvent<SVGGElement>) => void;
        onLeave: () => void;
        onOpen: () => void;
    },
) {
    const basePosition = projectPoint(agent.position, OFFICE_OBJECT_HEIGHT + 10, metrics);
    const groundShadow = projectPoint(agent.position, 0, metrics);
    const name = agent.agent.meta.fullname || agent.agent.agentName;
    const nameplateFill = agent.isRemote ? 'rgba(37,99,235,0.92)' : 'rgba(15,23,42,0.9)';
    const initials = name.slice(0, 1).toUpperCase();
    const movementStart = agent.path ? projectPoint(agent.path.from, OFFICE_OBJECT_HEIGHT + 10, metrics) : null;
    const movementEnd = agent.path ? projectPoint(agent.path.to, OFFICE_OBJECT_HEIGHT + 10, metrics) : null;
    const bubblePoint = projectPoint(agent.position, OFFICE_OBJECT_HEIGHT + 42, metrics);
    const remoteHalo = room?.kind === 'head-office' ? 'rgba(59,130,246,0.18)' : agent.isRemote ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)';

    return (
        <g
            key={agent.id}
            onMouseEnter={handlers.onHover}
            onMouseMove={handlers.onHover}
            onMouseLeave={handlers.onLeave}
            onClick={(event) => {
                event.stopPropagation();
                handlers.onOpen();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handlers.onOpen();
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${name}`}
            className="cursor-pointer"
        >
            <g>
                {movementStart && movementEnd && (
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        values={`${movementStart.x - basePosition.x} ${movementStart.y - basePosition.y};${movementEnd.x - basePosition.x} ${
                            movementEnd.y - basePosition.y
                        };${movementStart.x - basePosition.x} ${movementStart.y - basePosition.y}`}
                        dur={`${agent.path?.durationMs || 3600}ms`}
                        begin={`${agent.path?.delayMs || 0}ms`}
                        repeatCount="indefinite"
                    />
                )}

                <ellipse cx={groundShadow.x} cy={groundShadow.y + 8} rx={14} ry={6} fill="rgba(15,23,42,0.16)" />
                <circle cx={basePosition.x} cy={basePosition.y - 8} r={14} fill={remoteHalo} />
                <circle cx={basePosition.x} cy={basePosition.y - 16} r={7.5} fill="#f8fafc" stroke="rgba(15,23,42,0.22)" strokeWidth={1.2} />
                <rect
                    x={basePosition.x - 6.5}
                    y={basePosition.y - 10}
                    width={13}
                    height={16}
                    rx={6.5}
                    fill={agent.isRemote ? '#2563eb' : '#0f172a'}
                    opacity={0.92}
                />

                <text x={basePosition.x} y={basePosition.y - 13.5} textAnchor="middle" fill="#0f172a" fontSize={7.5} fontWeight={800}>
                    {initials}
                </text>

                <rect
                    x={basePosition.x - 16}
                    y={basePosition.y + 8}
                    width={32}
                    height={12}
                    rx={6}
                    fill={nameplateFill}
                    opacity={0.94}
                />
                <text x={basePosition.x} y={basePosition.y + 16.5} textAnchor="middle" fill="white" fontSize={7.5} fontWeight={700}>
                    {truncateText(name, 8)}
                </text>

                {agent.state === 'working' && (
                    <path
                        d={`M ${basePosition.x - 7} ${basePosition.y + 2} Q ${basePosition.x} ${basePosition.y - 2} ${basePosition.x + 7} ${
                            basePosition.y + 2
                        }`}
                        stroke="rgba(245,158,11,0.85)"
                        strokeWidth={1.8}
                        fill="none"
                    >
                        <animate attributeName="opacity" values="0.35;1;0.45" dur="1.8s" repeatCount="indefinite" />
                    </path>
                )}

                {agent.state === 'meeting' && (
                    <g>
                        <circle cx={bubblePoint.x - 4} cy={bubblePoint.y} r={2.5} fill="rgba(16,185,129,0.82)">
                            <animate attributeName="opacity" values="0.2;1;0.25" dur="1.6s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={bubblePoint.x + 2} cy={bubblePoint.y - 4} r={2} fill="rgba(16,185,129,0.72)">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.3s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={bubblePoint.x + 8} cy={bubblePoint.y - 1} r={2.3} fill="rgba(16,185,129,0.62)">
                            <animate attributeName="opacity" values="0.25;1;0.25" dur="1.8s" repeatCount="indefinite" />
                        </circle>
                    </g>
                )}
            </g>
        </g>
    );
}

/**
 * Projects the top face of one isometric block.
 */
function projectTopFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneMetrics,
): string {
    const topLeft = projectPoint({ x, y }, elevation, metrics);
    const topRight = projectPoint({ x: x + width, y }, elevation, metrics);
    const bottomRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const bottomLeft = projectPoint({ x, y: y + depth }, elevation, metrics);

    return `${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`;
}

/**
 * Projects the front face of one isometric block.
 */
function projectFrontFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneMetrics,
): string {
    const bottomLeft = projectPoint({ x, y: y + depth }, 0, metrics);
    const bottomRight = projectPoint({ x: x + width, y: y + depth }, 0, metrics);
    const topRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const topLeft = projectPoint({ x, y: y + depth }, elevation, metrics);

    return `${bottomLeft.x},${bottomLeft.y} ${bottomRight.x},${bottomRight.y} ${topRight.x},${topRight.y} ${topLeft.x},${topLeft.y}`;
}

/**
 * Projects the right face of one isometric block.
 */
function projectRightFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneMetrics,
): string {
    const bottomRight = projectPoint({ x: x + width, y }, 0, metrics);
    const bottomFarRight = projectPoint({ x: x + width, y: y + depth }, 0, metrics);
    const topFarRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const topRight = projectPoint({ x: x + width, y }, elevation, metrics);

    return `${bottomRight.x},${bottomRight.y} ${bottomFarRight.x},${bottomFarRight.y} ${topFarRight.x},${topFarRight.y} ${topRight.x},${topRight.y}`;
}

/**
 * Converts a HEX color into an RGBA string with the provided alpha value.
 */
function hexToRgba(hexColor: string, alpha: number): string {
    const normalized = hexColor.replace('#', '').trim();
    const longHex =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map((character) => `${character}${character}`)
                  .join('')
            : normalized.padEnd(6, '0').slice(0, 6);

    const red = Number.parseInt(longHex.slice(0, 2), 16);
    const green = Number.parseInt(longHex.slice(2, 4), 16);
    const blue = Number.parseInt(longHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Formats a user-facing office activity label.
 */
function formatOfficeState(state: OfficeAgentVisual['state']): string {
    if (state === 'working') {
        return 'Working';
    }

    if (state === 'meeting') {
        return 'In meeting';
    }

    if (state === 'moving') {
        return 'Moving';
    }

    return 'Idle';
}

/**
 * Truncates short labels used inside the SVG scene.
 */
function truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
}

/**
 * Clamps a number to the provided bounds.
 */
function clamp(value: number, minValue: number, maxValue: number): number {
    return Math.min(maxValue, Math.max(minValue, value));
}
