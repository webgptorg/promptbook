import type { PointerEvent as ReactPointerEvent } from 'react';
import type { OfficeAgentVisual, OfficeDesk, OfficeLayout, OfficePoint, OfficeRoom } from './buildOfficeLayout';

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
    sceneMetrics: {
        sceneWidth: number;
        sceneHeight: number;
        originX: number;
        originY: number;
    };
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
                        onHover: (event) => onAgentHover(event, agent.id),
                        onLeave: onAgentLeave,
                        onOpen: () => onAgentOpen(agent.profileHref),
                    }),
                )}
            </g>
        </svg>
    );
}

/**
 * Projects one world-space point into screen-space isometric coordinates.
 *
 * @param point - World-space point.
 * @param elevation - Projected vertical offset.
 * @param metrics - Scene projection metrics.
 * @returns Projected screen-space point.
 */
function projectPoint(point: OfficePoint, elevation: number, metrics: OfficeSceneProps['sceneMetrics']): OfficePoint {
    return {
        x: metrics.originX + (point.x - point.y) * ISO_X_SCALE,
        y: metrics.originY + (point.x + point.y) * ISO_Y_SCALE - elevation,
    };
}

/**
 * Renders the central corridor spine.
 *
 * @param corridorHub - Shared corridor hub point.
 * @param layout - Full office layout.
 * @param metrics - Scene projection metrics.
 * @returns Corridor SVG group.
 */
function renderCorridor(corridorHub: OfficePoint, layout: OfficeLayout, metrics: OfficeSceneProps['sceneMetrics']) {
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
 *
 * @param room - Room model to render.
 * @param roomAgents - Agents assigned to the room.
 * @param isFocused - Whether the room should be rendered at full opacity.
 * @param metrics - Scene projection metrics.
 * @returns Room SVG group.
 */
function renderRoom(
    room: OfficeRoom,
    roomAgents: ReadonlyArray<OfficeAgentVisual>,
    isFocused: boolean,
    metrics: OfficeSceneProps['sceneMetrics'],
) {
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
 *
 * @param room - Room model to style.
 * @returns Room-specific theme tokens.
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
 *
 * @param room - Room to populate with props.
 * @param hasMeeting - Whether the room currently hosts a meeting.
 * @returns Decorative room props.
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
 *
 * @param prop - Decorative prop to render.
 * @param theme - Room theme used for accents.
 * @param metrics - Scene projection metrics.
 * @returns Prop SVG group.
 */
function renderRoomProp(prop: OfficeRoomProp, theme: OfficeRoomTheme, metrics: OfficeSceneProps['sceneMetrics']) {
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
                        fill={['#f97316', '#0ea5e9', '#16a34a', '#f43f5e', '#a855f7'][shelfIndex % 5] || '#f97316'}
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
 *
 * @param room - Room hosting the meeting furniture.
 * @param metrics - Scene projection metrics.
 * @returns Lounge table SVG group.
 */
function renderLoungeTable(room: OfficeRoom, metrics: OfficeSceneProps['sceneMetrics']) {
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
 *
 * @param desk - Desk model to render.
 * @param occupant - Desk occupant, if any.
 * @param metrics - Scene projection metrics.
 * @returns Desk SVG group.
 */
function renderDesk(desk: OfficeDesk, occupant: OfficeAgentVisual | null, metrics: OfficeSceneProps['sceneMetrics']) {
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
 * Handlers used by one interactive agent avatar.
 */
type RenderAgentHandlers = {
    onHover: (event: ReactPointerEvent<SVGGElement>) => void;
    onLeave: () => void;
    onOpen: () => void;
};

/**
 * Renders one avatar with deterministic character styling and state bubble.
 *
 * @param agent - Agent visual record.
 * @param room - Hosting room, if available.
 * @param metrics - Scene projection metrics.
 * @param handlers - Interaction handlers.
 * @returns Agent SVG group.
 */
function renderAgent(
    agent: OfficeAgentVisual,
    room: OfficeRoom | null,
    metrics: OfficeSceneProps['sceneMetrics'],
    handlers: RenderAgentHandlers,
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
 *
 * @param state - Agent activity state.
 * @param bubblePoint - Screen-space bubble anchor.
 * @returns Activity bubble SVG group.
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
 * Geometry used by one isometric block primitive.
 */
type OfficeBlockGeometry = {
    x: number;
    y: number;
    width: number;
    depth: number;
    elevation: number;
};

/**
 * Renders one reusable isometric block with optional top-surface texture.
 *
 * @param key - Stable React key for the block.
 * @param geometry - Block geometry in world coordinates.
 * @param metrics - Scene projection metrics.
 * @param paint - Paint configuration for all visible faces.
 * @returns Block SVG group.
 */
function renderIsometricBlock(
    key: string,
    geometry: OfficeBlockGeometry,
    metrics: OfficeSceneProps['sceneMetrics'],
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
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param width - Block width.
 * @param depth - Block depth.
 * @param elevation - Block elevation.
 * @param metrics - Scene projection metrics.
 * @returns Polygon points string.
 */
function projectTopFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneProps['sceneMetrics'],
): string {
    const topLeft = projectPoint({ x, y }, elevation, metrics);
    const topRight = projectPoint({ x: x + width, y }, elevation, metrics);
    const bottomRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const bottomLeft = projectPoint({ x, y: y + depth }, elevation, metrics);

    return `${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`;
}

/**
 * Projects the front face of one isometric block.
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param width - Block width.
 * @param depth - Block depth.
 * @param elevation - Block elevation.
 * @param metrics - Scene projection metrics.
 * @returns Polygon points string.
 */
function projectFrontFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneProps['sceneMetrics'],
): string {
    const bottomLeft = projectPoint({ x, y: y + depth }, 0, metrics);
    const bottomRight = projectPoint({ x: x + width, y: y + depth }, 0, metrics);
    const topRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const topLeft = projectPoint({ x, y: y + depth }, elevation, metrics);

    return `${bottomLeft.x},${bottomLeft.y} ${bottomRight.x},${bottomRight.y} ${topRight.x},${topRight.y} ${topLeft.x},${topLeft.y}`;
}

/**
 * Projects the right face of one isometric block.
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param width - Block width.
 * @param depth - Block depth.
 * @param elevation - Block elevation.
 * @param metrics - Scene projection metrics.
 * @returns Polygon points string.
 */
function projectRightFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneProps['sceneMetrics'],
): string {
    const bottomRight = projectPoint({ x: x + width, y }, 0, metrics);
    const bottomFarRight = projectPoint({ x: x + width, y: y + depth }, 0, metrics);
    const topFarRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const topRight = projectPoint({ x: x + width, y }, elevation, metrics);

    return `${bottomRight.x},${bottomRight.y} ${bottomFarRight.x},${bottomFarRight.y} ${topFarRight.x},${topFarRight.y} ${topRight.x},${topRight.y}`;
}

/**
 * Converts a HEX color into an RGBA string with the provided alpha value.
 *
 * @param hexColor - Source hex color string.
 * @param alpha - Target alpha component.
 * @returns RGBA CSS color string.
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
 * Picks a deterministic color from a palette using one numeric seed.
 *
 * @param seed - Stable numeric seed.
 * @param palette - Candidate color palette.
 * @returns Deterministic palette entry.
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
 *
 * @param start - Start point.
 * @param end - End point.
 * @param progress - Value from 0..1.
 * @returns Interpolated point.
 */
function interpolatePoint(start: OfficePoint, end: OfficePoint, progress: number): OfficePoint {
    return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
    };
}

/**
 * Truncates short labels used inside the SVG scene.
 *
 * @param value - Text to truncate.
 * @param maxLength - Maximum text length.
 * @returns Truncated label text.
 */
function truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
}
