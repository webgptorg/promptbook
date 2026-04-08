import type { OfficeAgentVisual, OfficeRoom } from './buildOfficeLayout';
import { OfficeSceneGeometry, type OfficeSceneMetrics } from './OfficeSceneGeometry';

/**
 * Props for one room renderer.
 */
type OfficeSceneRenderRoomProps = {
    room: OfficeRoom;
    roomAgents: ReadonlyArray<OfficeAgentVisual>;
    isFocused: boolean;
    metrics: OfficeSceneMetrics;
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
 * Renders one room floor, wall treatment, label, and decorative props.
 *
 * @private function of <OfficeScene/>
 */
export function OfficeSceneRenderRoom(props: OfficeSceneRenderRoomProps) {
    const { room, roomAgents, isFocused, metrics } = props;
    const theme = resolveRoomTheme(room);
    const hasMeeting = roomAgents.some((agent) => agent.state === 'meeting');
    const hasRemoteStyle = room.kind === 'remote' || room.kind === 'head-office';
    const patternId = hasRemoteStyle ? 'office-room-remote-pattern' : 'office-room-local-pattern';
    const labelPlateWidth = Math.min(132, room.width - 40);
    const labelPlate = OfficeSceneGeometry.projectTopFace(
        room.x + 14,
        room.y + 8,
        labelPlateWidth,
        26,
        OfficeSceneGeometry.ROOM_PROP_HEIGHT + 5,
        metrics,
    );
    const labelPoint = OfficeSceneGeometry.projectPoint(
        { x: room.x + 22, y: room.y + 17 },
        OfficeSceneGeometry.ROOM_PROP_HEIGHT + 15,
        metrics,
    );
    const roomProps = createRoomProps(room, hasMeeting);

    return (
        <g opacity={isFocused ? 1 : 0.72}>
            {OfficeSceneGeometry.renderIsometricBlock(
                `${room.id}:shell`,
                {
                    x: room.x,
                    y: room.y,
                    width: room.width,
                    depth: room.depth,
                    elevation: OfficeSceneGeometry.ROOM_WALL_HEIGHT,
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
    const isRemoteStyle = room.kind === 'remote' || room.kind === 'head-office';
    const isHeadOffice = room.kind === 'head-office';

    if (isHeadOffice) {
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

    if (isRemoteStyle) {
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
        floorFill: OfficeSceneGeometry.hexToRgba(room.color, 0.16),
        floorOverlayOpacity: 0.62,
        borderStroke: 'rgba(15,23,42,0.35)',
        wallFrontFill: OfficeSceneGeometry.hexToRgba(room.color, 0.22),
        wallRightFill: OfficeSceneGeometry.hexToRgba(room.color, 0.18),
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
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT,
        },
        {
            id: `${room.id}:bookshelf-right`,
            kind: 'bookshelf',
            x: room.x + room.width - 84,
            y: room.y + 16,
            width: 66,
            depth: 14,
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT,
        },
        {
            id: `${room.id}:plant-left`,
            kind: 'plant',
            x: room.x + 18,
            y: room.y + room.depth - 26,
            width: 18,
            depth: 12,
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT - 2,
        },
        {
            id: `${room.id}:plant-right`,
            kind: 'plant',
            x: room.x + room.width - 36,
            y: room.y + room.depth - 26,
            width: 18,
            depth: 12,
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT - 2,
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
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT + 3,
        });
        props.push({
            id: `${room.id}:storage`,
            kind: 'storage',
            x: room.x + room.width - 84,
            y: room.y + 54,
            width: 20,
            depth: 16,
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT + 2,
        });
    } else {
        props.push({
            id: `${room.id}:whiteboard`,
            kind: 'whiteboard',
            x: room.x + room.width - 88,
            y: room.y + 54,
            width: 72,
            depth: 10,
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT + 6,
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
            elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT - 1,
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
function renderRoomProp(prop: OfficeRoomProp, theme: OfficeRoomTheme, metrics: OfficeSceneMetrics) {
    switch (prop.kind) {
        case 'bookshelf':
            return (
                <g key={prop.id}>
                    {OfficeSceneGeometry.renderIsometricBlock(
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
                            points={OfficeSceneGeometry.projectTopFace(
                                prop.x + 8 + shelfIndex * 12,
                                prop.y + 3,
                                8,
                                5,
                                prop.elevation + 3.4,
                                metrics,
                            )}
                            fill={['#f97316', '#0ea5e9', '#16a34a', '#f43f5e', '#a855f7'][shelfIndex % 5] || '#f97316'}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth={0.5}
                        />
                    ))}
                </g>
            );

        case 'plant': {
            const leafAnchor = OfficeSceneGeometry.projectPoint(
                { x: prop.x + prop.width / 2, y: prop.y + prop.depth / 2 },
                prop.elevation + 9,
                metrics,
            );

            return (
                <g key={prop.id}>
                    {OfficeSceneGeometry.renderIsometricBlock(
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
                        d={`M ${leafAnchor.x - 3} ${leafAnchor.y + 1} Q ${leafAnchor.x - 8} ${leafAnchor.y - 8} ${
                            leafAnchor.x - 1
                        } ${leafAnchor.y - 13}`}
                        stroke="rgba(22,163,74,0.9)"
                        strokeWidth={2.1}
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${leafAnchor.x + 2} ${leafAnchor.y + 1} Q ${leafAnchor.x + 8} ${leafAnchor.y - 8} ${
                            leafAnchor.x + 1
                        } ${leafAnchor.y - 13}`}
                        stroke="rgba(34,197,94,0.9)"
                        strokeWidth={2.1}
                        fill="none"
                        strokeLinecap="round"
                    />
                </g>
            );
        }

        case 'whiteboard':
            return (
                <g key={prop.id}>
                    {OfficeSceneGeometry.renderIsometricBlock(
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
                        points={OfficeSceneGeometry.projectTopFace(
                            prop.x + 10,
                            prop.y + 2,
                            prop.width - 24,
                            2.3,
                            prop.elevation + 2.8,
                            metrics,
                        )}
                        fill={OfficeSceneGeometry.hexToRgba(theme.propAccentColor, 0.76)}
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth={0.5}
                    />
                    <polygon
                        points={OfficeSceneGeometry.projectTopFace(
                            prop.x + 10,
                            prop.y + 6,
                            prop.width - 14,
                            2.3,
                            prop.elevation + 2.2,
                            metrics,
                        )}
                        fill="rgba(15,23,42,0.3)"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth={0.5}
                    />
                </g>
            );

        case 'coffee': {
            const mugPoint = OfficeSceneGeometry.projectPoint(
                { x: prop.x + prop.width * 0.67, y: prop.y + prop.depth * 0.44 },
                prop.elevation + 5,
                metrics,
            );

            return (
                <g key={prop.id}>
                    {OfficeSceneGeometry.renderIsometricBlock(
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

        case 'storage':
            return (
                <g key={prop.id}>
                    {OfficeSceneGeometry.renderIsometricBlock(
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
                        points={OfficeSceneGeometry.projectTopFace(
                            prop.x + 4,
                            prop.y + 4,
                            prop.width - 8,
                            5,
                            prop.elevation + 3,
                            metrics,
                        )}
                        fill="rgba(37,99,235,0.5)"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={0.6}
                    />
                </g>
            );

        case 'lounge':
            return (
                <g key={prop.id}>
                    {OfficeSceneGeometry.renderIsometricBlock(
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
}

/**
 * Renders the central meeting table and chairs for active team rooms.
 *
 * @param room - Room hosting the meeting furniture.
 * @param metrics - Scene projection metrics.
 * @returns Lounge table SVG group.
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
            {OfficeSceneGeometry.renderIsometricBlock(
                `${room.id}:meeting-table`,
                {
                    x: tableX,
                    y: tableY,
                    width: 88,
                    depth: 34,
                    elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT + 1,
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
                OfficeSceneGeometry.renderIsometricBlock(
                    `${room.id}:chair:${chairIndex}`,
                    {
                        x: chairPoint.x,
                        y: chairPoint.y,
                        width: 14,
                        depth: 10,
                        elevation: OfficeSceneGeometry.ROOM_PROP_HEIGHT - 2,
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
