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
import { AgentAvatar } from '../AgentAvatar/AgentAvatar';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { AgentsOfficeToolbar } from './AgentsOfficeToolbar';
import {
    buildMazeOfficeLayout,
    type MazeCommunicationLink,
    type MazeCorridor,
    type MazeOfficeLayout,
    type MazeRoom,
} from './buildMazeOfficeLayout';
import type { OfficeAgentVisual, OfficePoint } from './buildOfficeLayout';
import { OfficeSceneGeometry, type OfficeSceneMetrics } from './OfficeSceneGeometry';
import { OfficeTooltip } from './OfficeTooltip';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Width reserved for the hover tooltip.
 */
const TOOLTIP_WIDTH = 240;

/**
 * Height reserved for the maze canvas.
 */
const MAZE_CANVAS_HEIGHT = 760;

/**
 * Additional padding added around the projected maze scene.
 */
const MAZE_SCENE_PADDING = 220;

/**
 * Interval used for lightweight scene animation updates.
 */
const MAZE_ANIMATION_INTERVAL_MS = 140;

/**
 * Base avatar size used before camera scaling is applied.
 */
const MAZE_AVATAR_BASE_SIZE = 58;

/**
 * Rendered height of maze rooms.
 */
const MAZE_ROOM_HEIGHT = 30;

/**
 * Rendered height of maze corridors.
 */
const MAZE_CORRIDOR_HEIGHT = 16;

/**
 * Props for the maze homepage visualization.
 */
type AgentsMazeOfficeProps = {
    agents: ReadonlyArray<AgentOrganizationAgent>;
    federatedAgents: ReadonlyArray<AgentWithVisibility>;
    publicUrl: string;
    folders: ReadonlyArray<AgentOrganizationFolder>;
};

/**
 * Camera state used for pan and zoom transforms.
 */
type MazeCamera = {
    x: number;
    y: number;
    zoom: number;
};

/**
 * Hover tooltip state for one maze agent.
 */
type MazeTooltipState = {
    agentId: string;
    x: number;
    y: number;
};

/**
 * Drag interaction state for manual panning.
 */
type MazeDragState = {
    pointerX: number;
    pointerY: number;
    cameraX: number;
    cameraY: number;
};

/**
 * Observed size of the maze container.
 */
type MazeContainerSize = {
    width: number;
    height: number;
};

/**
 * Small theme palette used by the maze SVG scene.
 */
type MazeThemePalette = {
    surfaceTop: string;
    surfaceBottom: string;
    gridStroke: string;
    gridDot: string;
    corridorTop: string;
    corridorFront: string;
    corridorRight: string;
    corridorStroke: string;
    roomStroke: string;
    roomShadow: string;
    workstationTop: string;
    workstationFront: string;
    workstationRight: string;
    workstationScreen: string;
    meetingTableTop: string;
    meetingTableFront: string;
    meetingTableRight: string;
    labelText: string;
    subtitleText: string;
    labelPanel: string;
    shadowFill: string;
    spotlightFill: string;
    beamMeeting: string;
    beamWorking: string;
    beamHandoff: string;
    busyBadge: string;
    haloIdle: string;
    haloWorking: string;
    haloMeeting: string;
    haloMoving: string;
};

/**
 * Screen-space model used by the DOM avatar overlay.
 */
type MazeProjectedAgent = {
    agent: OfficeAgentVisual;
    shadowPoint: OfficePoint;
    screenX: number;
    screenY: number;
    size: number;
};

/**
 * Renders the isometric maze office homepage view.
 */
export function AgentsMazeOffice(props: AgentsMazeOfficeProps) {
    const { agents, federatedAgents, publicUrl, folders } = props;
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<MazeContainerSize>({
        width: 1200,
        height: MAZE_CANVAS_HEIGHT,
    });
    const [camera, setCamera] = useState<MazeCamera>({ x: 0, y: 0, zoom: 1 });
    const [dragState, setDragState] = useState<MazeDragState | null>(null);
    const [tooltipState, setTooltipState] = useState<MazeTooltipState | null>(null);
    const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
    const [focusedBusyRoomIndex, setFocusedBusyRoomIndex] = useState(0);
    const [animationClockMs, setAnimationClockMs] = useState(() => Date.now());
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    const layout = useMemo<MazeOfficeLayout>(
        () =>
            buildMazeOfficeLayout({
                agents,
                federatedAgents,
                publicUrl,
                folders,
            }),
        [agents, federatedAgents, publicUrl, folders],
    );
    const sceneMetrics = useMemo(() => createSceneMetrics(layout), [layout]);
    const defaultCamera = useMemo(() => fitCameraToScene(sceneMetrics, containerSize), [sceneMetrics, containerSize]);
    const theme = useMemo(() => createMazeThemePalette(isDarkTheme), [isDarkTheme]);
    const roomById = useMemo(() => new Map(layout.rooms.map((room) => [room.id, room])), [layout.rooms]);
    const agentsByRoomId = useMemo(() => {
        return layout.agents.reduce<Map<string, Array<OfficeAgentVisual>>>((map, agent) => {
            const roomAgents = map.get(agent.roomId) || [];
            roomAgents.push(agent);
            map.set(agent.roomId, roomAgents);
            return map;
        }, new Map());
    }, [layout.agents]);
    const busyRoomIds = useMemo(() => {
        return [...layout.rooms]
            .map((room) => {
                const score = (agentsByRoomId.get(room.id) || []).reduce((total, agent) => {
                    if (agent.state === 'meeting') {
                        return total + 3;
                    }
                    if (agent.state === 'working') {
                        return total + 2;
                    }
                    if (agent.state === 'moving') {
                        return total + 1;
                    }
                    return total;
                }, 0);

                return { roomId: room.id, score };
            })
            .sort((left, right) => right.score - left.score || left.roomId.localeCompare(right.roomId))
            .filter(({ score }) => score > 0)
            .map(({ roomId }) => roomId);
    }, [agentsByRoomId, layout.rooms]);
    const projectedAgents = useMemo(
        () => createProjectedAgents(layout.agents, animationClockMs, sceneMetrics, camera),
        [layout.agents, animationClockMs, sceneMetrics, camera],
    );
    const hoveredAgent = useMemo(
        () => (tooltipState ? layout.agents.find((agent) => agent.id === tooltipState.agentId) || null : null),
        [tooltipState, layout.agents],
    );

    useEffect(() => {
        setCamera(defaultCamera);
    }, [defaultCamera]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setAnimationClockMs(Date.now());
        }, MAZE_ANIMATION_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

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

    useEffect(() => {
        const rootElement = document.documentElement;

        const updateTheme = (): void => {
            setIsDarkTheme(
                rootElement.classList.contains('dark') || rootElement.getAttribute('data-theme-resolved') === 'dark',
            );
        };

        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(rootElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme-resolved'],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const openHref = (href: string): void => {
        if (/^https?:\/\//.test(href)) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }

        router.push(href);
    };

    const focusRoom = (roomId: string): void => {
        const room = roomById.get(roomId);
        if (!room) {
            return;
        }

        const targetZoom = Math.max(defaultCamera.zoom, Math.min(defaultCamera.zoom * 1.28, 1.72));
        const roomCenter = projectRoomCenter(room, sceneMetrics);

        setFocusedRoomId(roomId);
        setCamera({
            zoom: targetZoom,
            x: containerSize.width / 2 - roomCenter.x * targetZoom,
            y: containerSize.height / 2 - roomCenter.y * targetZoom,
        });
    };

    const focusBusyRoom = (): void => {
        if (busyRoomIds.length === 0) {
            const firstRoom = layout.rooms[0];
            if (firstRoom) {
                focusRoom(firstRoom.id);
            }
            return;
        }

        const nextRoomId = busyRoomIds[focusedBusyRoomIndex % busyRoomIds.length];
        setFocusedBusyRoomIndex((previousIndex) => previousIndex + 1);
        focusRoom(nextRoomId);
    };

    const nudgeZoom = (zoomDelta: number): void => {
        setCamera((currentCamera) => {
            const nextZoom = clamp(currentCamera.zoom * zoomDelta, defaultCamera.zoom * 0.85, 2.2);
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

    const resetCamera = (): void => {
        setFocusedRoomId(null);
        setCamera(defaultCamera);
    };

    const updateTooltip = (event: { clientX: number; clientY: number }, agentId: string): void => {
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

    const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
        setDragState({
            pointerX: event.clientX,
            pointerY: event.clientY,
            cameraX: camera.x,
            cameraY: camera.y,
        });
    };

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

    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
        event.preventDefault();
        nudgeZoom(event.deltaY > 0 ? 0.92 : 1.08);
    };

    if (layout.agents.length === 0) {
        return (
            <div className="flex justify-center py-12 text-gray-500">
                {formatText('No agents with built-in avatars to show in maze.')}
            </div>
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
                onFocusMeetingRoom={focusBusyRoom}
                onFocusRoom={focusRoom}
            />

            <div
                ref={containerRef}
                className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-cyan-50/70 to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-700 dark:from-slate-950 dark:via-sky-950/40 dark:to-slate-950"
                style={{ height: MAZE_CANVAS_HEIGHT }}
                onWheel={handleWheel}
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.1),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.08),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(96,165,250,0.1),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.08),_transparent_36%)]" />

                <svg
                    className={`absolute inset-0 h-full w-full ${dragState ? 'cursor-grabbing' : 'cursor-grab'}`}
                    viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => setDragState(null)}
                    onPointerLeave={() => setDragState(null)}
                >
                    <MazeSurface width={containerSize.width} height={containerSize.height} theme={theme} />
                    <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
                        {layout.corridors.map((corridor) => (
                            <MazeCorridorBlock key={corridor.id} corridor={corridor} metrics={sceneMetrics} theme={theme} />
                        ))}
                        {layout.links.map((link) => (
                            <MazeCommunicationBeam key={link.id} link={link} metrics={sceneMetrics} theme={theme} />
                        ))}
                        {layout.rooms.map((room) => (
                            <MazeRoomBlock
                                key={room.id}
                                room={room}
                                metrics={sceneMetrics}
                                theme={theme}
                                roomAgents={agentsByRoomId.get(room.id) || []}
                                isFocused={focusedRoomId === null || focusedRoomId === room.id}
                            />
                        ))}
                        {projectedAgents.map((projectedAgent) => (
                            <MazeAgentShadow key={`shadow-${projectedAgent.agent.id}`} projectedAgent={projectedAgent} theme={theme} />
                        ))}
                    </g>
                </svg>

                <div className="pointer-events-none absolute inset-0">
                    {projectedAgents.map((projectedAgent) => (
                        <button
                            key={projectedAgent.agent.id}
                            type="button"
                            onClick={() => openHref(projectedAgent.agent.defaultHref)}
                            onMouseEnter={(event) => updateTooltip(event, projectedAgent.agent.id)}
                            onMouseMove={(event) => updateTooltip(event, projectedAgent.agent.id)}
                            onMouseLeave={() => setTooltipState(null)}
                            className="agents-maze-avatar pointer-events-auto absolute bg-transparent p-0"
                            style={{
                                left: projectedAgent.screenX,
                                top: projectedAgent.screenY,
                                width: projectedAgent.size,
                                height: projectedAgent.size,
                                transform: `translate(${-projectedAgent.size / 2}px, ${-projectedAgent.size * 0.78}px)`,
                                animationDuration: `${2600 + (projectedAgent.agent.seed % 1100)}ms`,
                                animationDelay: `-${projectedAgent.agent.seed % 900}ms`,
                                filter: 'drop-shadow(0 14px 24px rgba(15,23,42,0.24))',
                            }}
                            aria-label={`Open ${
                                projectedAgent.agent.agent.meta.fullname || projectedAgent.agent.agent.agentName
                            }`}
                        >
                            <span
                                className="agents-maze-pulse pointer-events-none absolute inset-0 rounded-full"
                                style={{
                                    background: resolveAgentHalo(projectedAgent.agent.state, theme),
                                    opacity: 0.34,
                                    transform: 'scale(0.72)',
                                    animationDuration: `${1800 + (projectedAgent.agent.seed % 900)}ms`,
                                }}
                            />
                            <span className="relative block h-full w-full">
                                <AgentAvatar
                                    agent={projectedAgent.agent.agent}
                                    baseUrl={projectedAgent.agent.agent.serverUrl || publicUrl}
                                    size={Math.round(projectedAgent.size)}
                                    surface="transparent"
                                    alt={projectedAgent.agent.agent.meta.fullname || projectedAgent.agent.agent.agentName}
                                    className="h-full w-full"
                                />
                            </span>
                        </button>
                    ))}
                </div>

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
 * Static SVG background shared by the maze scene.
 */
function MazeSurface(props: { width: number; height: number; theme: MazeThemePalette }) {
    const { width, height, theme } = props;

    return (
        <>
            <defs>
                <linearGradient id="maze-surface-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={theme.surfaceTop} />
                    <stop offset="100%" stopColor={theme.surfaceBottom} />
                </linearGradient>
                <pattern id="maze-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke={theme.gridStroke} strokeWidth="1" />
                    <circle cx="1" cy="1" r="0.8" fill={theme.gridDot} />
                </pattern>
            </defs>

            <rect width={width} height={height} fill="url(#maze-surface-gradient)" />
            <rect width={width} height={height} fill="url(#maze-grid-pattern)" opacity={0.45} />
            <ellipse cx={width * 0.5} cy={height * 0.08} rx={width * 0.45} ry={height * 0.26} fill={theme.spotlightFill} />
        </>
    );
}

/**
 * Renders one corridor floor block.
 */
function MazeCorridorBlock(props: {
    corridor: MazeCorridor;
    metrics: OfficeSceneMetrics;
    theme: MazeThemePalette;
}) {
    const { corridor, metrics, theme } = props;

    return (
        <>
            {OfficeSceneGeometry.renderIsometricBlock(
                corridor.id,
                {
                    x: corridor.x,
                    y: corridor.y,
                    width: corridor.width,
                    depth: corridor.depth,
                    elevation: MAZE_CORRIDOR_HEIGHT,
                },
                metrics,
                {
                    topFill: theme.corridorTop,
                    frontFill: theme.corridorFront,
                    rightFill: theme.corridorRight,
                    topStroke: theme.corridorStroke,
                    faceStroke: theme.corridorStroke,
                    topStrokeWidth: 1.1,
                    faceStrokeWidth: 0.9,
                },
            )}
        </>
    );
}

/**
 * Renders one room block with desk props and labels.
 */
function MazeRoomBlock(props: {
    room: MazeRoom;
    metrics: OfficeSceneMetrics;
    theme: MazeThemePalette;
    roomAgents: ReadonlyArray<OfficeAgentVisual>;
    isFocused: boolean;
}) {
    const { room, metrics, theme, roomAgents, isFocused } = props;
    const roomTopFill = mixHexColors(room.color, theme.surfaceTop, 0.68);
    const roomFrontFill = mixHexColors(room.color, theme.surfaceBottom, 0.42);
    const roomRightFill = mixHexColors(room.color, theme.corridorFront, 0.38);
    const roomCenter = projectRoomCenter(room, metrics);
    const busyCount = roomAgents.filter((agent) => agent.state === 'meeting' || agent.state === 'working').length;

    return (
        <g opacity={isFocused ? 1 : 0.42}>
            {OfficeSceneGeometry.renderIsometricBlock(
                room.id,
                {
                    x: room.x,
                    y: room.y,
                    width: room.width,
                    depth: room.depth,
                    elevation: MAZE_ROOM_HEIGHT,
                },
                metrics,
                {
                    topFill: roomTopFill,
                    frontFill: roomFrontFill,
                    rightFill: roomRightFill,
                    topStroke: theme.roomStroke,
                    faceStroke: theme.roomStroke,
                    topStrokeWidth: 1.4,
                    faceStrokeWidth: 1,
                },
            )}

            {room.deskSlots.slice(0, 4).map((deskSlot, index) => (
                <MazeWorkstation
                    key={`${room.id}:workstation:${index}`}
                    point={deskSlot}
                    accentColor={room.color}
                    metrics={metrics}
                    theme={theme}
                />
            ))}

            {roomAgents.some((agent) => agent.state === 'meeting') && (
                <MazeMeetingTable room={room} metrics={metrics} theme={theme} />
            )}

            <ellipse cx={roomCenter.x} cy={roomCenter.y - 4} rx={58} ry={22} fill={theme.roomShadow} opacity={0.18} />
            <rect
                x={roomCenter.x - 58}
                y={roomCenter.y - 42}
                width={116}
                height={18}
                rx={9}
                fill={theme.labelPanel}
                opacity={0.92}
            />
            <text x={roomCenter.x} y={roomCenter.y - 29} textAnchor="middle" fontSize={10} fontWeight={800} fill={theme.labelText}>
                {room.label}
            </text>
            <text
                x={roomCenter.x}
                y={roomCenter.y - 12}
                textAnchor="middle"
                fontSize={7.4}
                fontWeight={600}
                fill={theme.subtitleText}
            >
                {room.subtitle}
            </text>

            {busyCount > 0 && (
                <g transform={`translate(${roomCenter.x + 56} ${roomCenter.y - 40})`}>
                    <rect width={24} height={14} rx={7} fill={theme.busyBadge} />
                    <text x={12} y={10.2} textAnchor="middle" fontSize={8} fontWeight={800} fill="white">
                        {busyCount}
                    </text>
                </g>
            )}
        </g>
    );
}

/**
 * Renders one workstation block on a room floor.
 */
function MazeWorkstation(props: {
    point: OfficePoint;
    accentColor: string;
    metrics: OfficeSceneMetrics;
    theme: MazeThemePalette;
}) {
    const { point, accentColor, metrics, theme } = props;
    const topPoint = OfficeSceneGeometry.projectPoint(point, 20, metrics);

    return (
        <g>
            {OfficeSceneGeometry.renderIsometricBlock(
                `${point.x}:${point.y}`,
                {
                    x: point.x - 18,
                    y: point.y - 10,
                    width: 30,
                    depth: 18,
                    elevation: 10,
                },
                metrics,
                {
                    topFill: mixHexColors(accentColor, theme.workstationTop, 0.3),
                    frontFill: theme.workstationFront,
                    rightFill: theme.workstationRight,
                    topStroke: theme.roomStroke,
                    faceStroke: theme.roomStroke,
                    topStrokeWidth: 0.9,
                    faceStrokeWidth: 0.8,
                },
            )}
            <rect x={topPoint.x - 5} y={topPoint.y - 12} width={10} height={7} rx={2} fill={theme.workstationScreen} opacity={0.9}>
                <animate attributeName="opacity" values="0.5;0.95;0.6" dur="2.8s" repeatCount="indefinite" />
            </rect>
        </g>
    );
}

/**
 * Renders the central meeting table for collaborative rooms.
 */
function MazeMeetingTable(props: { room: MazeRoom; metrics: OfficeSceneMetrics; theme: MazeThemePalette }) {
    const { room, metrics, theme } = props;
    const centerX = room.x + room.width / 2;
    const centerY = room.y + room.depth / 2;

    return (
        <>
            {OfficeSceneGeometry.renderIsometricBlock(
                `${room.id}:meeting-table`,
                {
                    x: centerX - 34,
                    y: centerY - 22,
                    width: 68,
                    depth: 44,
                    elevation: 12,
                },
                metrics,
                {
                    topFill: theme.meetingTableTop,
                    frontFill: theme.meetingTableFront,
                    rightFill: theme.meetingTableRight,
                    topStroke: theme.roomStroke,
                    faceStroke: theme.roomStroke,
                    topStrokeWidth: 0.9,
                    faceStrokeWidth: 0.8,
                },
            )}
        </>
    );
}

/**
 * Renders one animated communication beam between two agents.
 */
function MazeCommunicationBeam(props: {
    link: MazeCommunicationLink;
    metrics: OfficeSceneMetrics;
    theme: MazeThemePalette;
}) {
    const { link, metrics, theme } = props;
    const fromPoint = OfficeSceneGeometry.projectPoint(link.from, OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 8, metrics);
    const toPoint = OfficeSceneGeometry.projectPoint(link.to, OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 8, metrics);
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = Math.min(fromPoint.y, toPoint.y) - 18;
    const stroke =
        link.tone === 'meeting' ? theme.beamMeeting : link.tone === 'handoff' ? theme.beamHandoff : theme.beamWorking;

    return (
        <path
            d={`M ${fromPoint.x} ${fromPoint.y} Q ${midX} ${midY} ${toPoint.x} ${toPoint.y}`}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="6 8"
            opacity={0.9}
        >
            <animate attributeName="stroke-dashoffset" values="0;-42" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.42;0.92;0.42" dur="2.4s" repeatCount="indefinite" />
        </path>
    );
}

/**
 * Renders the shadow and activity halo under one avatar.
 */
function MazeAgentShadow(props: { projectedAgent: MazeProjectedAgent; theme: MazeThemePalette }) {
    const { projectedAgent, theme } = props;
    const haloFill = resolveAgentHalo(projectedAgent.agent.state, theme);

    return (
        <g>
            <ellipse cx={projectedAgent.shadowPoint.x} cy={projectedAgent.shadowPoint.y + 8} rx={15} ry={7} fill={theme.shadowFill} opacity={0.34} />
            <circle cx={projectedAgent.shadowPoint.x} cy={projectedAgent.shadowPoint.y - 4} r={16} fill={haloFill} opacity={0.18}>
                <animate attributeName="r" values="13;18;13" dur="2.2s" repeatCount="indefinite" />
            </circle>
        </g>
    );
}

/**
 * Creates projected scene metrics for the maze component.
 */
function createSceneMetrics(layout: MazeOfficeLayout): OfficeSceneMetrics {
    return {
        sceneWidth: layout.worldWidth + layout.worldHeight + MAZE_SCENE_PADDING * 2,
        sceneHeight: (layout.worldWidth + layout.worldHeight) * OfficeSceneGeometry.ISO_Y_SCALE + MAZE_SCENE_PADDING * 2,
        originX: layout.worldHeight + MAZE_SCENE_PADDING * 0.92,
        originY: MAZE_SCENE_PADDING,
    };
}

/**
 * Computes the default fitted camera for the maze scene.
 */
function fitCameraToScene(metrics: OfficeSceneMetrics, containerSize: MazeContainerSize): MazeCamera {
    const zoom = Math.min(containerSize.width / metrics.sceneWidth, containerSize.height / metrics.sceneHeight) * 0.95;

    return {
        zoom,
        x: (containerSize.width - metrics.sceneWidth * zoom) / 2,
        y: (containerSize.height - metrics.sceneHeight * zoom) / 2,
    };
}

/**
 * Projects the center of one maze room into screen coordinates.
 */
function projectRoomCenter(room: MazeRoom, metrics: OfficeSceneMetrics): OfficePoint {
    return OfficeSceneGeometry.projectPoint(
        {
            x: room.x + room.width / 2,
            y: room.y + room.depth / 2,
        },
        MAZE_ROOM_HEIGHT,
        metrics,
    );
}

/**
 * Creates screen-space models for each animated agent.
 */
function createProjectedAgents(
    agents: ReadonlyArray<OfficeAgentVisual>,
    animationClockMs: number,
    metrics: OfficeSceneMetrics,
    camera: MazeCamera,
): Array<MazeProjectedAgent> {
    return agents.map((agent) => {
        const worldPoint = resolveAnimatedAgentPoint(agent, animationClockMs);
        const scenePoint = OfficeSceneGeometry.projectPoint(worldPoint, OfficeSceneGeometry.OFFICE_OBJECT_HEIGHT + 12, metrics);
        const shadowPoint = OfficeSceneGeometry.projectPoint(worldPoint, 0, metrics);
        const size = clamp(MAZE_AVATAR_BASE_SIZE * Math.max(0.82, Math.min(1.28, camera.zoom + 0.08)), 38, 78);

        return {
            agent,
            shadowPoint,
            screenX: camera.x + scenePoint.x * camera.zoom,
            screenY: camera.y + scenePoint.y * camera.zoom,
            size,
        };
    });
}

/**
 * Resolves the current world position of one moving or static agent.
 */
function resolveAnimatedAgentPoint(agent: OfficeAgentVisual, animationClockMs: number): OfficePoint {
    if (agent.state !== 'moving' || !agent.path) {
        return agent.position;
    }

    const pathDelayMs = Math.max(0, agent.path.delayMs);
    const pathDurationMs = Math.max(1, agent.path.durationMs);
    const loopDurationMs = pathDelayMs + pathDurationMs;
    const phaseMs = (animationClockMs + (agent.seed % loopDurationMs)) % loopDurationMs;

    if (phaseMs <= pathDelayMs) {
        return agent.path.from;
    }

    const walkProgress = Math.min(1, (phaseMs - pathDelayMs) / pathDurationMs);

    return {
        x: agent.path.from.x + (agent.path.to.x - agent.path.from.x) * walkProgress,
        y: agent.path.from.y + (agent.path.to.y - agent.path.from.y) * walkProgress,
    };
}

/**
 * Resolves a compact scene palette for the current theme mode.
 */
function createMazeThemePalette(isDarkTheme: boolean): MazeThemePalette {
    if (isDarkTheme) {
        return {
            surfaceTop: '#031426',
            surfaceBottom: '#081120',
            gridStroke: 'rgba(125,211,252,0.1)',
            gridDot: 'rgba(255,255,255,0.16)',
            corridorTop: '#13314b',
            corridorFront: '#0b2134',
            corridorRight: '#08192a',
            corridorStroke: 'rgba(125,211,252,0.18)',
            roomStroke: 'rgba(148,163,184,0.24)',
            roomShadow: 'rgba(2,6,23,0.42)',
            workstationTop: '#29445c',
            workstationFront: '#142438',
            workstationRight: '#102034',
            workstationScreen: '#67e8f9',
            meetingTableTop: '#1d4ed8',
            meetingTableFront: '#1e3a8a',
            meetingTableRight: '#172554',
            labelText: '#f8fafc',
            subtitleText: '#cbd5e1',
            labelPanel: 'rgba(8,15,28,0.82)',
            shadowFill: 'rgba(2,6,23,0.4)',
            spotlightFill: 'rgba(34,211,238,0.08)',
            beamMeeting: 'rgba(74,222,128,0.95)',
            beamWorking: 'rgba(125,211,252,0.95)',
            beamHandoff: 'rgba(248,113,113,0.95)',
            busyBadge: 'rgba(8,145,178,0.92)',
            haloIdle: 'rgba(148,163,184,0.46)',
            haloWorking: 'rgba(56,189,248,0.58)',
            haloMeeting: 'rgba(74,222,128,0.58)',
            haloMoving: 'rgba(125,211,252,0.6)',
        };
    }

    return {
        surfaceTop: '#f8fcff',
        surfaceBottom: '#dbeafe',
        gridStroke: 'rgba(71,85,105,0.12)',
        gridDot: 'rgba(255,255,255,0.7)',
        corridorTop: '#d9eefb',
        corridorFront: '#bfdbea',
        corridorRight: '#aecede',
        corridorStroke: 'rgba(14,116,144,0.16)',
        roomStroke: 'rgba(15,23,42,0.16)',
        roomShadow: 'rgba(15,23,42,0.16)',
        workstationTop: '#f8fafc',
        workstationFront: '#dbe5f0',
        workstationRight: '#cad8e6',
        workstationScreen: '#06b6d4',
        meetingTableTop: '#dbeafe',
        meetingTableFront: '#93c5fd',
        meetingTableRight: '#60a5fa',
        labelText: '#0f172a',
        subtitleText: '#334155',
        labelPanel: 'rgba(255,255,255,0.82)',
        shadowFill: 'rgba(15,23,42,0.18)',
        spotlightFill: 'rgba(14,165,233,0.08)',
        beamMeeting: 'rgba(16,185,129,0.9)',
        beamWorking: 'rgba(14,165,233,0.9)',
        beamHandoff: 'rgba(239,68,68,0.9)',
        busyBadge: 'rgba(8,145,178,0.92)',
        haloIdle: 'rgba(100,116,139,0.28)',
        haloWorking: 'rgba(14,165,233,0.36)',
        haloMeeting: 'rgba(16,185,129,0.36)',
        haloMoving: 'rgba(59,130,246,0.34)',
    };
}

/**
 * Resolves the halo fill used by one agent state.
 */
function resolveAgentHalo(state: OfficeAgentVisual['state'], theme: MazeThemePalette): string {
    if (state === 'working') {
        return theme.haloWorking;
    }

    if (state === 'meeting') {
        return theme.haloMeeting;
    }

    if (state === 'moving') {
        return theme.haloMoving;
    }

    return theme.haloIdle;
}

/**
 * Blends two hex-like colors together.
 */
function mixHexColors(primary: string, secondary: string, primaryRatio: number): string {
    const normalizedPrimary = normalizeHexColor(primary);
    const normalizedSecondary = normalizeHexColor(secondary);
    const ratio = clamp(primaryRatio, 0, 1);
    const red = Math.round(normalizedPrimary.red * ratio + normalizedSecondary.red * (1 - ratio));
    const green = Math.round(normalizedPrimary.green * ratio + normalizedSecondary.green * (1 - ratio));
    const blue = Math.round(normalizedPrimary.blue * ratio + normalizedSecondary.blue * (1 - ratio));

    return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Normalizes a hex-like color into numeric RGB channels.
 */
function normalizeHexColor(value: string): { red: number; green: number; blue: number } {
    const normalized = value.replace('#', '').trim();
    const longHex =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map((character) => `${character}${character}`)
                  .join('')
            : normalized.padEnd(6, '0').slice(0, 6);

    return {
        red: Number.parseInt(longHex.slice(0, 2), 16),
        green: Number.parseInt(longHex.slice(2, 4), 16),
        blue: Number.parseInt(longHex.slice(4, 6), 16),
    };
}

/**
 * Clamps a numeric value between two bounds.
 */
function clamp(value: number, minValue: number, maxValue: number): number {
    return Math.min(maxValue, Math.max(minValue, value));
}
