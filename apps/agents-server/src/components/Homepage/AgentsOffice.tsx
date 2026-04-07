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
 * Rendered height of room side walls.
 */
const ROOM_WALL_HEIGHT = 22;

/**
 * Height used for room furniture and accessories.
 */
const ROOM_PROP_HEIGHT = 14;

/**
 * Height used when rendering desk monitors.
 */
const DESK_MONITOR_HEIGHT = OFFICE_OBJECT_HEIGHT + 9;

/**
 * Height used for floating activity bubbles above agents.
 */
const AGENT_BUBBLE_HEIGHT = OFFICE_OBJECT_HEIGHT + 42;

/**
 * Outfit colors for deterministic per-agent character variation.
 */
const AGENT_OUTFIT_PALETTE = ['#0f172a', '#0f766e', '#7c2d12', '#6d28d9', '#be123c', '#1e3a8a'];

/**
 * Skin-tone palette used for deterministic per-agent avatars.
 */
const AGENT_SKIN_PALETTE = ['#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309'];

/**
 * Hair-color palette used for deterministic per-agent avatars.
 */
const AGENT_HAIR_PALETTE = ['#0f172a', '#1f2937', '#451a03', '#78350f', '#475569'];

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
 * Palette and accents used for one room rendering treatment.
 */
type OfficeRoomTheme = {
    floorFill: string;
    floorOverlayOpacity: number;
    borderStroke: string;
    wallFrontFill: string;
    wallRightFill: string;
    labelFill: string;
    labelTextColor: string;
    labelSubtextColor: string;
    propAccentColor: string;
};

/**
 * Supported decorative props rendered in each room.
 */
type OfficeRoomPropKind = 'bookshelf' | 'plant' | 'whiteboard' | 'coffee' | 'storage' | 'lounge';

/**
 * One decorative room prop in world coordinates.
 */
type OfficeRoomProp = {
    id: string;
    kind: OfficeRoomPropKind;
    x: number;
    y: number;
    width: number;
    depth: number;
    elevation: number;
};

/**
 * Paint configuration for one reusable isometric block primitive.
 */
type OfficeBlockPaint = {
    topFill: string;
    frontFill: string;
    rightFill: string;
    topStroke: string;
    faceStroke: string;
    topStrokeWidth: number;
    faceStrokeWidth: number;
    topPatternId?: string;
    topPatternOpacity?: number;
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
                            <stop offset="42%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        <pattern id="office-global-grid-pattern" width="18" height="18" patternUnits="userSpaceOnUse">
                            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                            <circle cx="0.9" cy="0.9" r="0.85" fill="rgba(255,255,255,0.66)" />
                        </pattern>
                        <pattern id="office-room-local-pattern" width="14" height="14" patternUnits="userSpaceOnUse">
                            <rect width="14" height="14" fill="rgba(255,255,255,0.02)" />
                            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(15,23,42,0.15)" strokeWidth="0.95" />
                            <path d="M 0 7 L 14 7 M 7 0 L 7 14" fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="0.7" />
                        </pattern>
                        <pattern id="office-room-remote-pattern" width="14" height="14" patternUnits="userSpaceOnUse">
                            <rect width="14" height="14" fill="rgba(59,130,246,0.03)" />
                            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(30,64,175,0.2)" strokeWidth="0.95" />
                            <path d="M 0 7 L 14 7 M 7 0 L 7 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />
                        </pattern>
                        <pattern id="office-corridor-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(71,85,105,0.22)" strokeWidth="1" />
                            <path d="M 5 0 L 0 5 M 20 9 L 9 20" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                        </pattern>
                        <pattern id="office-desk-wood-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
                            <path d="M 0 3 L 12 3 M 0 9 L 12 9" fill="none" stroke="rgba(15,23,42,0.14)" strokeWidth="1.1" />
                            <path d="M 0 0 L 12 12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
                        </pattern>
                    </defs>

                    <rect width={containerSize.width} height={containerSize.height} fill="url(#office-floor-gradient)" />
                    <rect width={containerSize.width} height={containerSize.height} fill="url(#office-global-grid-pattern)" opacity={0.45} />
                    <ellipse
                        cx={containerSize.width * 0.5}
                        cy={containerSize.height * 0.06}
                        rx={containerSize.width * 0.55}
                        ry={containerSize.height * 0.34}
                        fill="rgba(56,189,248,0.14)"
                    />

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
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="agent-avatar-pixelated h-full w-full object-cover"
                        />
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
    const start = projectPoint({ x: corridorHub.x - 28, y: 0 }, 0, metrics);
    const end = projectPoint({ x: corridorHub.x + 24, y: layout.worldHeight - 100 }, 0, metrics);
    const rightStart = projectPoint({ x: corridorHub.x + 30, y: 0 }, 0, metrics);
    const rightEnd = projectPoint({ x: corridorHub.x + 82, y: layout.worldHeight - 100 }, 0, metrics);
    const centerStart = {
        x: (start.x + rightStart.x) / 2,
        y: (start.y + rightStart.y) / 2,
    };
    const centerEnd = {
        x: (end.x + rightEnd.x) / 2,
        y: (end.y + rightEnd.y) / 2,
    };
    const laneAngle = (Math.atan2(centerEnd.y - centerStart.y, centerEnd.x - centerStart.x) * 180) / Math.PI;

    return (
        <g>
            <polygon
                points={`${start.x},${start.y} ${rightStart.x},${rightStart.y} ${rightEnd.x},${rightEnd.y} ${end.x},${end.y}`}
                fill="rgba(148,163,184,0.28)"
                stroke="rgba(71,85,105,0.42)"
                strokeWidth={2.1}
            />
            <polygon
                points={`${start.x},${start.y} ${rightStart.x},${rightStart.y} ${rightEnd.x},${rightEnd.y} ${end.x},${end.y}`}
                fill="url(#office-corridor-pattern)"
                opacity={0.6}
            />
            <line
                x1={centerStart.x}
                y1={centerStart.y}
                x2={centerEnd.x}
                y2={centerEnd.y}
                stroke="rgba(241,245,249,0.88)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeDasharray="14 12"
            />
            {Array.from({ length: 7 }, (_, markerIndex) => {
                const progress = (markerIndex + 1) / 8;
                const markerCenter = interpolatePoint(centerStart, centerEnd, progress);
                return (
                    <rect
                        key={`corridor-marker-${markerIndex}`}
                        x={markerCenter.x - 8}
                        y={markerCenter.y - 1.8}
                        width={16}
                        height={3.6}
                        rx={1.6}
                        fill="rgba(15,23,42,0.15)"
                        transform={`rotate(${laneAngle} ${markerCenter.x} ${markerCenter.y})`}
                    />
                );
            })}
        </g>
    );
}

/**
 * Renders one room floor, wall treatment, label, and decorative props.
 */
function renderRoom(room: OfficeRoom, roomAgents: Array<OfficeAgentVisual>, isFocused: boolean, metrics: OfficeSceneMetrics) {
    const theme = resolveRoomTheme(room);
    const hasMeeting = roomAgents.some((agent) => agent.state === 'meeting');
    const hasRemoteStyle = room.kind === 'remote' || room.kind === 'head-office';
    const patternId = hasRemoteStyle ? 'office-room-remote-pattern' : 'office-room-local-pattern';
    const labelPlateWidth = Math.min(132, room.width - 40);
    const labelPlate = projectTopFace(room.x + 14, room.y + 8, labelPlateWidth, 26, ROOM_PROP_HEIGHT + 5, metrics);
    const labelPoint = projectPoint({ x: room.x + 22, y: room.y + 17 }, ROOM_PROP_HEIGHT + 15, metrics);
    const roomProps = createRoomProps(room, hasMeeting);

    return (
        <g key={room.id} opacity={isFocused ? 1 : 0.72}>
            {renderIsometricBlock(
                `${room.id}:shell`,
                {
                    x: room.x,
                    y: room.y,
                    width: room.width,
                    depth: room.depth,
                    elevation: ROOM_WALL_HEIGHT,
                },
                metrics,
                {
                    topFill: theme.floorFill,
                    frontFill: theme.wallFrontFill,
                    rightFill: theme.wallRightFill,
                    topStroke: theme.borderStroke,
                    faceStroke: 'rgba(255,255,255,0.4)',
                    topStrokeWidth: hasRemoteStyle ? 2.8 : 2.2,
                    faceStrokeWidth: 1,
                    topPatternId: patternId,
                    topPatternOpacity: theme.floorOverlayOpacity,
                },
            )}

            {roomProps.map((prop) => renderRoomProp(prop, theme, metrics))}
            {hasMeeting && renderLoungeTable(room, metrics)}

            <polygon points={labelPlate} fill={theme.labelFill} stroke="rgba(15,23,42,0.22)" strokeWidth={1.1} />
            <text x={labelPoint.x} y={labelPoint.y} fill={theme.labelTextColor} fontSize={15.5} fontWeight={800}>
                {room.label}
            </text>
            <text x={labelPoint.x} y={labelPoint.y + 14} fill={theme.labelSubtextColor} fontSize={10} fontWeight={700}>
                {room.subtitle}
            </text>
        </g>
    );
}

/**
 * Resolves room-specific surface and accent colors.
 */
function resolveRoomTheme(room: OfficeRoom): OfficeRoomTheme {
    const remoteStyle = room.kind === 'remote' || room.kind === 'head-office';
    const headOffice = room.kind === 'head-office';

    if (headOffice) {
        return {
            floorFill: 'rgba(37,99,235,0.2)',
            floorOverlayOpacity: 0.74,
            borderStroke: 'rgba(30,64,175,0.8)',
            wallFrontFill: 'rgba(37,99,235,0.24)',
            wallRightFill: 'rgba(30,64,175,0.22)',
            labelFill: 'rgba(219,234,254,0.92)',
            labelTextColor: '#1e3a8a',
            labelSubtextColor: 'rgba(30,64,175,0.86)',
            propAccentColor: '#1e3a8a',
        };
    }

    if (remoteStyle) {
        return {
            floorFill: 'rgba(59,130,246,0.14)',
            floorOverlayOpacity: 0.66,
            borderStroke: 'rgba(37,99,235,0.74)',
            wallFrontFill: 'rgba(37,99,235,0.18)',
            wallRightFill: 'rgba(30,64,175,0.16)',
            labelFill: 'rgba(239,246,255,0.9)',
            labelTextColor: '#1e3a8a',
            labelSubtextColor: 'rgba(30,64,175,0.82)',
            propAccentColor: '#1d4ed8',
        };
    }

    return {
        floorFill: hexToRgba(room.color, 0.16),
        floorOverlayOpacity: 0.62,
        borderStroke: 'rgba(15,23,42,0.35)',
        wallFrontFill: hexToRgba(room.color, 0.22),
        wallRightFill: hexToRgba(room.color, 0.18),
        labelFill: 'rgba(255,255,255,0.88)',
        labelTextColor: '#0f172a',
        labelSubtextColor: 'rgba(51,65,85,0.86)',
        propAccentColor: room.color,
    };
}

/**
 * Creates decorative props that give rooms a pixel-office look.
 */
function createRoomProps(room: OfficeRoom, hasMeeting: boolean): Array<OfficeRoomProp> {
    const props: Array<OfficeRoomProp> = [
        {
            id: `${room.id}:bookshelf-left`,
            kind: 'bookshelf',
            x: room.x + 16,
            y: room.y + 16,
            width: 66,
            depth: 14,
            elevation: ROOM_PROP_HEIGHT,
        },
        {
            id: `${room.id}:bookshelf-right`,
            kind: 'bookshelf',
            x: room.x + room.width - 84,
            y: room.y + 16,
            width: 66,
            depth: 14,
            elevation: ROOM_PROP_HEIGHT,
        },
        {
            id: `${room.id}:plant-left`,
            kind: 'plant',
            x: room.x + 18,
            y: room.y + room.depth - 26,
            width: 18,
            depth: 12,
            elevation: ROOM_PROP_HEIGHT - 2,
        },
        {
            id: `${room.id}:plant-right`,
            kind: 'plant',
            x: room.x + room.width - 36,
            y: room.y + room.depth - 26,
            width: 18,
            depth: 12,
            elevation: ROOM_PROP_HEIGHT - 2,
        },
    ];

    if (room.kind === 'remote' || room.kind === 'head-office') {
        props.push({
            id: `${room.id}:coffee`,
            kind: 'coffee',
            x: room.x + room.width - 58,
            y: room.y + 56,
            width: 24,
            depth: 18,
            elevation: ROOM_PROP_HEIGHT + 3,
        });
        props.push({
            id: `${room.id}:storage`,
            kind: 'storage',
            x: room.x + room.width - 84,
            y: room.y + 54,
            width: 20,
            depth: 16,
            elevation: ROOM_PROP_HEIGHT + 2,
        });
    } else {
        props.push({
            id: `${room.id}:whiteboard`,
            kind: 'whiteboard',
            x: room.x + room.width - 88,
            y: room.y + 54,
            width: 72,
            depth: 10,
            elevation: ROOM_PROP_HEIGHT + 6,
        });
    }

    if (hasMeeting) {
        props.push({
            id: `${room.id}:lounge`,
            kind: 'lounge',
            x: room.x + room.width / 2 - 54,
            y: room.y + room.depth / 2 + 22,
            width: 108,
            depth: 20,
            elevation: ROOM_PROP_HEIGHT - 1,
        });
    }

    return props;
}

/**
 * Renders one decorative room prop.
 */
function renderRoomProp(prop: OfficeRoomProp, theme: OfficeRoomTheme, metrics: OfficeSceneMetrics) {
    if (prop.kind === 'bookshelf') {
        return (
            <g key={prop.id}>
                {renderIsometricBlock(
                    `${prop.id}:frame`,
                    {
                        x: prop.x,
                        y: prop.y,
                        width: prop.width,
                        depth: prop.depth,
                        elevation: prop.elevation,
                    },
                    metrics,
                    {
                        topFill: 'rgba(146,64,14,0.5)',
                        frontFill: 'rgba(120,53,15,0.62)',
                        rightFill: 'rgba(120,53,15,0.56)',
                        topStroke: 'rgba(69,26,3,0.4)',
                        faceStroke: 'rgba(255,255,255,0.24)',
                        topStrokeWidth: 1,
                        faceStrokeWidth: 0.8,
                    },
                )}
                {Array.from({ length: 4 }, (_, shelfIndex) => (
                    <polygon
                        key={`${prop.id}:book:${shelfIndex}`}
                        points={projectTopFace(prop.x + 8 + shelfIndex * 12, prop.y + 3, 8, 5, prop.elevation + 3.4, metrics)}
                        fill={
                            ['#f97316', '#0ea5e9', '#16a34a', '#f43f5e', '#a855f7'][shelfIndex % 5] || '#f97316'
                        }
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth={0.5}
                    />
                ))}
            </g>
        );
    }

    if (prop.kind === 'plant') {
        const leafAnchor = projectPoint({ x: prop.x + prop.width / 2, y: prop.y + prop.depth / 2 }, prop.elevation + 9, metrics);
        return (
            <g key={prop.id}>
                {renderIsometricBlock(
                    `${prop.id}:pot`,
                    {
                        x: prop.x,
                        y: prop.y,
                        width: prop.width,
                        depth: prop.depth,
                        elevation: prop.elevation,
                    },
                    metrics,
                    {
                        topFill: 'rgba(203,213,225,0.85)',
                        frontFill: 'rgba(148,163,184,0.88)',
                        rightFill: 'rgba(100,116,139,0.9)',
                        topStroke: 'rgba(51,65,85,0.3)',
                        faceStroke: 'rgba(255,255,255,0.3)',
                        topStrokeWidth: 0.9,
                        faceStrokeWidth: 0.7,
                    },
                )}
                <path
                    d={`M ${leafAnchor.x - 3} ${leafAnchor.y + 1} Q ${leafAnchor.x - 8} ${leafAnchor.y - 8} ${leafAnchor.x - 1} ${
                        leafAnchor.y - 13
                    }`}
                    stroke="rgba(22,163,74,0.9)"
                    strokeWidth={2.1}
                    fill="none"
                    strokeLinecap="round"
                />
                <path
                    d={`M ${leafAnchor.x + 2} ${leafAnchor.y + 1} Q ${leafAnchor.x + 8} ${leafAnchor.y - 8} ${leafAnchor.x + 1} ${
                        leafAnchor.y - 13
                    }`}
                    stroke="rgba(34,197,94,0.9)"
                    strokeWidth={2.1}
                    fill="none"
                    strokeLinecap="round"
                />
            </g>
        );
    }

    if (prop.kind === 'whiteboard') {
        return (
            <g key={prop.id}>
                {renderIsometricBlock(
                    `${prop.id}:board`,
                    {
                        x: prop.x,
                        y: prop.y,
                        width: prop.width,
                        depth: prop.depth,
                        elevation: prop.elevation,
                    },
                    metrics,
                    {
                        topFill: 'rgba(248,250,252,0.94)',
                        frontFill: 'rgba(226,232,240,0.9)',
                        rightFill: 'rgba(203,213,225,0.9)',
                        topStroke: 'rgba(51,65,85,0.35)',
                        faceStroke: 'rgba(255,255,255,0.34)',
                        topStrokeWidth: 1,
                        faceStrokeWidth: 0.7,
                    },
                )}
                <polygon
                    points={projectTopFace(prop.x + 10, prop.y + 2, prop.width - 24, 2.3, prop.elevation + 2.8, metrics)}
                    fill={hexToRgba(theme.propAccentColor, 0.76)}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={0.5}
                />
                <polygon
                    points={projectTopFace(prop.x + 10, prop.y + 6, prop.width - 14, 2.3, prop.elevation + 2.2, metrics)}
                    fill="rgba(15,23,42,0.3)"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={0.5}
                />
            </g>
        );
    }

    if (prop.kind === 'coffee') {
        const mugPoint = projectPoint({ x: prop.x + prop.width * 0.67, y: prop.y + prop.depth * 0.44 }, prop.elevation + 5, metrics);
        return (
            <g key={prop.id}>
                {renderIsometricBlock(
                    `${prop.id}:machine`,
                    {
                        x: prop.x,
                        y: prop.y,
                        width: prop.width,
                        depth: prop.depth,
                        elevation: prop.elevation,
                    },
                    metrics,
                    {
                        topFill: 'rgba(100,116,139,0.82)',
                        frontFill: 'rgba(71,85,105,0.92)',
                        rightFill: 'rgba(51,65,85,0.9)',
                        topStroke: 'rgba(15,23,42,0.45)',
                        faceStroke: 'rgba(255,255,255,0.24)',
                        topStrokeWidth: 1,
                        faceStrokeWidth: 0.7,
                    },
                )}
                <circle cx={mugPoint.x} cy={mugPoint.y} r={2.2} fill="rgba(241,245,249,0.9)" />
            </g>
        );
    }

    if (prop.kind === 'storage') {
        return (
            <g key={prop.id}>
                {renderIsometricBlock(
                    `${prop.id}:cabinet`,
                    {
                        x: prop.x,
                        y: prop.y,
                        width: prop.width,
                        depth: prop.depth,
                        elevation: prop.elevation,
                    },
                    metrics,
                    {
                        topFill: 'rgba(226,232,240,0.86)',
                        frontFill: 'rgba(203,213,225,0.9)',
                        rightFill: 'rgba(148,163,184,0.86)',
                        topStroke: 'rgba(51,65,85,0.34)',
                        faceStroke: 'rgba(255,255,255,0.28)',
                        topStrokeWidth: 0.9,
                        faceStrokeWidth: 0.7,
                    },
                )}
                <polygon
                    points={projectTopFace(prop.x + 4, prop.y + 4, prop.width - 8, 5, prop.elevation + 3, metrics)}
                    fill="rgba(37,99,235,0.5)"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={0.6}
                />
            </g>
        );
    }

    return (
        <g key={prop.id}>
            {renderIsometricBlock(
                `${prop.id}:sofa`,
                {
                    x: prop.x,
                    y: prop.y,
                    width: prop.width,
                    depth: prop.depth,
                    elevation: prop.elevation,
                },
                metrics,
                {
                    topFill: 'rgba(190,24,93,0.32)',
                    frontFill: 'rgba(157,23,77,0.42)',
                    rightFill: 'rgba(157,23,77,0.38)',
                    topStroke: 'rgba(76,5,25,0.36)',
                    faceStroke: 'rgba(255,255,255,0.24)',
                    topStrokeWidth: 1,
                    faceStrokeWidth: 0.8,
                },
            )}
        </g>
    );
}

/**
 * Renders the central meeting table and chairs for active team rooms.
 */
function renderLoungeTable(room: OfficeRoom, metrics: OfficeSceneMetrics) {
    const tableX = room.x + room.width / 2 - 44;
    const tableY = room.y + room.depth / 2 - 2;
    const chairPoints = [
        { x: tableX - 16, y: tableY + 12 },
        { x: tableX + 96, y: tableY + 12 },
        { x: tableX + 12, y: tableY - 20 },
        { x: tableX + 68, y: tableY + 38 },
    ];

    return (
        <g>
            {renderIsometricBlock(
                `${room.id}:meeting-table`,
                {
                    x: tableX,
                    y: tableY,
                    width: 88,
                    depth: 34,
                    elevation: ROOM_PROP_HEIGHT + 1,
                },
                metrics,
                {
                    topFill: 'rgba(15,23,42,0.2)',
                    frontFill: 'rgba(15,23,42,0.28)',
                    rightFill: 'rgba(15,23,42,0.24)',
                    topStroke: 'rgba(15,23,42,0.35)',
                    faceStroke: 'rgba(255,255,255,0.3)',
                    topStrokeWidth: 1,
                    faceStrokeWidth: 0.8,
                },
            )}
            {chairPoints.map((chairPoint, chairIndex) =>
                renderIsometricBlock(
                    `${room.id}:chair:${chairIndex}`,
                    {
                        x: chairPoint.x,
                        y: chairPoint.y,
                        width: 14,
                        depth: 10,
                        elevation: ROOM_PROP_HEIGHT - 2,
                    },
                    metrics,
                    {
                        topFill: 'rgba(190,24,93,0.28)',
                        frontFill: 'rgba(157,23,77,0.34)',
                        rightFill: 'rgba(157,23,77,0.32)',
                        topStroke: 'rgba(76,5,25,0.3)',
                        faceStroke: 'rgba(255,255,255,0.26)',
                        topStrokeWidth: 0.8,
                        faceStrokeWidth: 0.6,
                    },
                ),
            )}
        </g>
    );
}

/**
 * Renders one desk including monitor glow and compact work preview.
 */
function renderDesk(desk: OfficeDesk, occupant: OfficeAgentVisual | null, metrics: OfficeSceneMetrics) {
    const deskColor = occupant?.isRemote ? '#2563eb' : desk.color;
    const showScreen = occupant?.state === 'working';
    const labelPoint = projectPoint({ x: desk.x + 12, y: desk.y + 8 }, DESK_MONITOR_HEIGHT + 6, metrics);
    const keyboardTop = projectTopFace(desk.x + 10, desk.y + 13, 16, 7, OFFICE_OBJECT_HEIGHT + 2, metrics);
    const mugPoint = projectPoint({ x: desk.x + desk.width - 8, y: desk.y + 8 }, OFFICE_OBJECT_HEIGHT + 3, metrics);

    return (
        <g key={desk.id}>
            {renderIsometricBlock(
                `${desk.id}:chair`,
                {
                    x: desk.x + 18,
                    y: desk.y + desk.depth + 5,
                    width: 16,
                    depth: 12,
                    elevation: OFFICE_OBJECT_HEIGHT - 8,
                },
                metrics,
                {
                    topFill: 'rgba(51,65,85,0.7)',
                    frontFill: 'rgba(30,41,59,0.8)',
                    rightFill: 'rgba(15,23,42,0.82)',
                    topStroke: 'rgba(15,23,42,0.4)',
                    faceStroke: 'rgba(255,255,255,0.2)',
                    topStrokeWidth: 0.8,
                    faceStrokeWidth: 0.6,
                },
            )}
            {renderIsometricBlock(
                `${desk.id}:table`,
                {
                    x: desk.x,
                    y: desk.y,
                    width: desk.width,
                    depth: desk.depth,
                    elevation: OFFICE_OBJECT_HEIGHT,
                },
                metrics,
                {
                    topFill: hexToRgba(deskColor, 0.26),
                    frontFill: hexToRgba(deskColor, 0.33),
                    rightFill: hexToRgba(deskColor, 0.38),
                    topStroke: 'rgba(15,23,42,0.24)',
                    faceStroke: 'rgba(255,255,255,0.36)',
                    topStrokeWidth: 1,
                    faceStrokeWidth: 0.8,
                    topPatternId: 'office-desk-wood-pattern',
                    topPatternOpacity: 0.58,
                },
            )}
            {renderIsometricBlock(
                `${desk.id}:monitor`,
                {
                    x: desk.x + 11,
                    y: desk.y + 3,
                    width: 18,
                    depth: 8,
                    elevation: DESK_MONITOR_HEIGHT,
                },
                metrics,
                {
                    topFill: showScreen ? 'rgba(14,165,233,0.86)' : 'rgba(51,65,85,0.86)',
                    frontFill: showScreen ? 'rgba(6,182,212,0.8)' : 'rgba(30,41,59,0.88)',
                    rightFill: showScreen ? 'rgba(3,105,161,0.84)' : 'rgba(15,23,42,0.9)',
                    topStroke: 'rgba(255,255,255,0.44)',
                    faceStroke: 'rgba(255,255,255,0.3)',
                    topStrokeWidth: 0.8,
                    faceStrokeWidth: 0.6,
                },
            )}
            <polygon points={keyboardTop} fill="rgba(148,163,184,0.62)" stroke="rgba(15,23,42,0.26)" strokeWidth={0.6} />
            <circle cx={mugPoint.x} cy={mugPoint.y} r={2.2} fill="rgba(248,250,252,0.92)" />
            {showScreen && occupant?.previewText && (
                <text x={labelPoint.x} y={labelPoint.y} fill="rgba(8,47,73,0.88)" fontSize={7.3} fontWeight={700}>
                    {truncateText(occupant.previewText, 18)}
                </text>
            )}
        </g>
    );
}

/**
 * Renders one avatar with deterministic character styling and state bubble.
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
    const outfitColor = agent.isRemote ? '#1d4ed8' : pickColorFromSeed(agent.seed, AGENT_OUTFIT_PALETTE);
    const skinColor = pickColorFromSeed(agent.seed + 7, AGENT_SKIN_PALETTE);
    const hairColor = pickColorFromSeed(agent.seed + 19, AGENT_HAIR_PALETTE);
    const movementStart = agent.path ? projectPoint(agent.path.from, OFFICE_OBJECT_HEIGHT + 10, metrics) : null;
    const movementEnd = agent.path ? projectPoint(agent.path.to, OFFICE_OBJECT_HEIGHT + 10, metrics) : null;
    const bubblePoint = projectPoint(agent.position, AGENT_BUBBLE_HEIGHT, metrics);
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
                <rect
                    x={basePosition.x - 6}
                    y={basePosition.y - 10}
                    width={12}
                    height={12}
                    rx={3}
                    fill={outfitColor}
                    stroke="rgba(15,23,42,0.28)"
                    strokeWidth={1}
                />
                <rect
                    x={basePosition.x - 5.4}
                    y={basePosition.y + 1.4}
                    width={4.1}
                    height={5.4}
                    rx={1.4}
                    fill={hexToRgba(outfitColor, 0.9)}
                />
                <rect
                    x={basePosition.x + 1.3}
                    y={basePosition.y + 1.4}
                    width={4.1}
                    height={5.4}
                    rx={1.4}
                    fill={hexToRgba(outfitColor, 0.82)}
                />
                <circle cx={basePosition.x} cy={basePosition.y - 12.6} r={5.7} fill={skinColor} stroke="rgba(15,23,42,0.2)" strokeWidth={1} />
                <path
                    d={`M ${basePosition.x - 5.2} ${basePosition.y - 13.1} Q ${basePosition.x} ${basePosition.y - 19.5} ${
                        basePosition.x + 5.2
                    } ${basePosition.y - 13.1} L ${basePosition.x + 4.2} ${basePosition.y - 10.3} L ${basePosition.x - 4.2} ${
                        basePosition.y - 10.3
                    } Z`}
                    fill={hairColor}
                    opacity={0.92}
                />
                <circle cx={basePosition.x - 1.8} cy={basePosition.y - 12.7} r={0.72} fill="rgba(15,23,42,0.7)" />
                <circle cx={basePosition.x + 1.8} cy={basePosition.y - 12.7} r={0.72} fill="rgba(15,23,42,0.7)" />
                <rect
                    x={basePosition.x - 2.9}
                    y={basePosition.y - 5.8}
                    width={5.8}
                    height={4.4}
                    rx={1.6}
                    fill="rgba(255,255,255,0.24)"
                />
                <text x={basePosition.x} y={basePosition.y - 2.4} textAnchor="middle" fill="white" fontSize={4.6} fontWeight={800}>
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
                {renderActivityBubble(agent.state, bubblePoint)}
            </g>
        </g>
    );
}

/**
 * Renders a compact status bubble inspired by pixel-office activity indicators.
 */
function renderActivityBubble(state: OfficeAgentVisual['state'], bubblePoint: OfficePoint) {
    const bubbleFill =
        state === 'working'
            ? 'rgba(3,105,161,0.92)'
            : state === 'meeting'
            ? 'rgba(5,150,105,0.9)'
            : state === 'moving'
            ? 'rgba(59,130,246,0.9)'
            : 'rgba(71,85,105,0.88)';
    const bubbleStroke =
        state === 'working'
            ? 'rgba(6,182,212,0.66)'
            : state === 'meeting'
            ? 'rgba(52,211,153,0.72)'
            : state === 'moving'
            ? 'rgba(147,197,253,0.78)'
            : 'rgba(203,213,225,0.7)';

    return (
        <g transform={`translate(${bubblePoint.x - 12} ${bubblePoint.y - 16})`}>
            <rect width={24} height={12} rx={4} fill={bubbleFill} stroke={bubbleStroke} strokeWidth={1} />
            <path d="M 10 12 L 12 15.4 L 14 12" fill={bubbleFill} stroke={bubbleStroke} strokeWidth={0.7} />
            {state === 'working' && (
                <g>
                    <rect x={6} y={6.8} width={2.2} height={3} rx={0.7} fill="rgba(255,255,255,0.9)">
                        <animate attributeName="height" values="2.5;4.2;2.8" dur="1.2s" repeatCount="indefinite" />
                    </rect>
                    <rect x={10.7} y={5.6} width={2.2} height={4.3} rx={0.7} fill="rgba(255,255,255,0.96)">
                        <animate attributeName="height" values="3.2;5;3.5" dur="1.2s" repeatCount="indefinite" begin="0.18s" />
                    </rect>
                    <rect x={15.4} y={6.6} width={2.2} height={3.2} rx={0.7} fill="rgba(255,255,255,0.9)">
                        <animate attributeName="height" values="2.8;4.4;3.1" dur="1.2s" repeatCount="indefinite" begin="0.34s" />
                    </rect>
                </g>
            )}
            {state === 'meeting' && (
                <g>
                    <circle cx={8} cy={6.8} r={1.4} fill="rgba(255,255,255,0.95)">
                        <animate attributeName="opacity" values="0.4;1;0.45" dur="1.1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={12} cy={6.8} r={1.4} fill="rgba(255,255,255,0.95)">
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.1s" repeatCount="indefinite" begin="0.2s" />
                    </circle>
                    <circle cx={16} cy={6.8} r={1.4} fill="rgba(255,255,255,0.95)">
                        <animate attributeName="opacity" values="0.45;1;0.45" dur="1.1s" repeatCount="indefinite" begin="0.4s" />
                    </circle>
                </g>
            )}
            {state === 'moving' && (
                <path
                    d="M 7 7 L 12 4 L 12 6.4 L 17 6.4 L 17 7.6 L 12 7.6 L 12 10 Z"
                    fill="rgba(255,255,255,0.94)"
                    stroke="rgba(255,255,255,0.94)"
                    strokeWidth={0.5}
                />
            )}
            {state === 'idle' && (
                <path d="M 8 8.6 C 10 5 14 5 16 8.6" stroke="rgba(255,255,255,0.92)" strokeWidth={1.2} fill="none" />
            )}
        </g>
    );
}

/**
 * Renders one reusable isometric block with optional top-surface texture.
 */
function renderIsometricBlock(
    key: string,
    geometry: { x: number; y: number; width: number; depth: number; elevation: number },
    metrics: OfficeSceneMetrics,
    paint: OfficeBlockPaint,
) {
    const topFace = projectTopFace(geometry.x, geometry.y, geometry.width, geometry.depth, geometry.elevation, metrics);
    const frontFace = projectFrontFace(geometry.x, geometry.y, geometry.width, geometry.depth, geometry.elevation, metrics);
    const rightFace = projectRightFace(geometry.x, geometry.y, geometry.width, geometry.depth, geometry.elevation, metrics);

    return (
        <g key={key}>
            <polygon points={topFace} fill={paint.topFill} stroke={paint.topStroke} strokeWidth={paint.topStrokeWidth} />
            {paint.topPatternId && (
                <polygon
                    points={topFace}
                    fill={`url(#${paint.topPatternId})`}
                    opacity={paint.topPatternOpacity === undefined ? 0.5 : paint.topPatternOpacity}
                />
            )}
            <polygon points={frontFace} fill={paint.frontFill} stroke={paint.faceStroke} strokeWidth={paint.faceStrokeWidth} />
            <polygon points={rightFace} fill={paint.rightFill} stroke={paint.faceStroke} strokeWidth={paint.faceStrokeWidth} />
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
 * Picks a deterministic color from a palette using one numeric seed.
 */
function pickColorFromSeed(seed: number, palette: ReadonlyArray<string>): string {
    if (palette.length === 0) {
        return '#0f172a';
    }

    const normalizedSeed = Math.abs(Math.floor(seed));
    return palette[normalizedSeed % palette.length] || palette[0] || '#0f172a';
}

/**
 * Interpolates two projected points using linear progress.
 */
function interpolatePoint(start: OfficePoint, end: OfficePoint, progress: number): OfficePoint {
    return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
    };
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
