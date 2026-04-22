import {
    buildOfficeLayout,
    type BuildOfficeLayoutOptions,
    type OfficeAgentPath,
    type OfficeAgentVisual,
    type OfficeLayout,
    type OfficePoint,
} from './buildOfficeLayout';
import { hashString } from './buildOfficeLayoutShared';
import { filterMazeRenderableAgents } from './mazeOfficeAgentSupport';

/**
 * Maximum number of room columns used by the maze scene.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_MAX_COLUMNS = 3;

/**
 * Base width of one maze room in world units.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_ROOM_BASE_WIDTH = 218;

/**
 * Base depth of one maze room in world units.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_ROOM_BASE_DEPTH = 150;

/**
 * Horizontal spacing between room columns.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_COLUMN_SPACING = 338;

/**
 * Vertical pitch between corridor rows.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_ROW_PITCH = 336;

/**
 * Gap between a room edge and its attached corridor.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_ROOM_CORRIDOR_GAP = 48;

/**
 * Width of the main maze corridors.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_CORRIDOR_WIDTH = 42;

/**
 * Width of the short room connector corridor.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_ROOM_CONNECTOR_WIDTH = 32;

/**
 * Extra world padding added around the maze for camera framing.
 *
 * @private function of buildMazeOfficeLayout
 */
const MAZE_WORLD_PADDING = 220;

/**
 * Type of one maze corridor segment.
 *
 * @private function of buildMazeOfficeLayout
 */
export type MazeCorridorKind = 'spine' | 'connector' | 'bridge';

/**
 * One room rendered by the maze office scene.
 *
 * @private function of buildMazeOfficeLayout
 */
export type MazeRoom = OfficeLayout['rooms'][number] & {
    rowIndex: number;
    columnIndex: number;
    corridorCenterY: number;
    connectorX: number;
    connectorWidth: number;
    isAboveCorridor: boolean;
    deskSlots: Array<OfficePoint>;
    meetingSlots: Array<OfficePoint>;
    seed: number;
};

/**
 * One corridor floor block rendered between maze rooms.
 *
 * @private function of buildMazeOfficeLayout
 */
export type MazeCorridor = {
    id: string;
    kind: MazeCorridorKind;
    x: number;
    y: number;
    width: number;
    depth: number;
};

/**
 * One soft communication beam rendered between two agents.
 *
 * @private function of buildMazeOfficeLayout
 */
export type MazeCommunicationLink = {
    id: string;
    fromAgentId: string;
    toAgentId: string;
    from: OfficePoint;
    to: OfficePoint;
    tone: 'meeting' | 'working' | 'handoff';
};

/**
 * Final deterministic scene model consumed by the homepage maze component.
 *
 * @private function of buildMazeOfficeLayout
 */
export type MazeOfficeLayout = {
    rooms: Array<MazeRoom>;
    corridors: Array<MazeCorridor>;
    agents: Array<OfficeAgentVisual>;
    links: Array<MazeCommunicationLink>;
    worldWidth: number;
    worldHeight: number;
    stateCounts: OfficeLayout['stateCounts'];
};

/**
 * Row-level corridor context used when positioning connectors and moving agents.
 *
 * @private function of buildMazeOfficeLayout
 */
type MazeRowContext = {
    rowIndex: number;
    corridorCenterY: number;
    startX: number;
    endX: number;
    bridgeToNextX: number | null;
    bridgeFromPreviousX: number | null;
};

/**
 * Builds the deterministic isometric maze layout from the shared office dataset.
 *
 * The maze intentionally reuses the office grouping and activity-state pipeline so
 * the homepage keeps one source of truth for room membership, profile routes, and
 * per-agent summaries while rendering a distinct corridor-heavy scene.
 *
 * @param options - Local agents, federated agents, folders, and public URL.
 * @returns Maze-ready view model for the homepage visualization.
 *
 * @private function of <AgentsMazeOffice/>
 */
export function buildMazeOfficeLayout(options: BuildOfficeLayoutOptions): MazeOfficeLayout {
    const localAgents = filterMazeRenderableAgents(options.agents, options.publicUrl);
    const federatedAgents = filterMazeRenderableAgents(options.federatedAgents, options.publicUrl);
    const sourceLayout = buildOfficeLayout({
        ...options,
        agents: localAgents,
        federatedAgents,
    });
    const agentsByRoomId = groupAgentsByRoom(sourceLayout.agents);
    const columnCount = resolveMazeColumnCount(sourceLayout.rooms.length);
    const rooms = sourceLayout.rooms.map((sourceRoom, index) =>
        createMazeRoom(sourceRoom, agentsByRoomId.get(sourceRoom.id) || [], index, columnCount),
    );
    const rowContexts = createMazeRowContexts(rooms);
    const corridors = createMazeCorridors(rooms, rowContexts);
    const agents = createMazeAgents(sourceLayout.agents, rooms, rowContexts);
    const links = createMazeCommunicationLinks(rooms, agents);
    const worldWidth = resolveWorldWidth(rooms, corridors);
    const worldHeight = resolveWorldHeight(rooms, corridors);

    return {
        rooms,
        corridors,
        agents,
        links,
        worldWidth,
        worldHeight,
        stateCounts: sourceLayout.stateCounts,
    };
}

/**
 * Groups office agents by their source room identifier.
 *
 * @param agents - Source agents from the shared office layout.
 * @returns Stable room-indexed agent lookup.
 *
 * @private function of buildMazeOfficeLayout
 */
function groupAgentsByRoom(agents: ReadonlyArray<OfficeAgentVisual>): Map<string, Array<OfficeAgentVisual>> {
    return agents.reduce<Map<string, Array<OfficeAgentVisual>>>((map, agent) => {
        const roomAgents = map.get(agent.roomId) || [];
        roomAgents.push(agent);
        map.set(agent.roomId, roomAgents);
        return map;
    }, new Map());
}

/**
 * Resolves how many columns the maze should use for the current room count.
 *
 * @param roomCount - Number of source rooms in the scene.
 * @returns Stable column count in the inclusive range `1..3`.
 *
 * @private function of buildMazeOfficeLayout
 */
function resolveMazeColumnCount(roomCount: number): number {
    if (roomCount <= 1) {
        return 1;
    }

    if (roomCount <= 4) {
        return 2;
    }

    return Math.min(MAZE_MAX_COLUMNS, Math.max(2, Math.ceil(Math.sqrt(roomCount))));
}

/**
 * Creates one maze room from its shared office-room source.
 *
 * @param sourceRoom - Shared office room record.
 * @param roomAgents - Agents assigned to the room.
 * @param index - Stable room index in source order.
 * @param columnCount - Number of room columns used by the scene.
 * @returns Maze room with deterministic corridor and slot anchors.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeRoom(
    sourceRoom: OfficeLayout['rooms'][number],
    roomAgents: ReadonlyArray<OfficeAgentVisual>,
    index: number,
    columnCount: number,
): MazeRoom {
    const rowIndex = Math.floor(index / columnCount);
    const columnIndex = index % columnCount;
    const corridorCenterY = rowIndex * MAZE_ROW_PITCH + 210;
    const roomWidth =
        MAZE_ROOM_BASE_WIDTH +
        Math.min(3, Math.floor(Math.max(0, roomAgents.length - 2) / 2)) * 24 +
        (sourceRoom.kind === 'head-office' ? 18 : 0);
    const roomDepth =
        MAZE_ROOM_BASE_DEPTH +
        Math.min(2, Math.floor(Math.max(0, roomAgents.length - 3) / 2)) * 18 +
        (sourceRoom.kind === 'remote' ? 12 : 0);
    const x = columnIndex * MAZE_COLUMN_SPACING + (rowIndex % 2) * 44 + 56;
    const isAboveCorridor = (rowIndex + columnIndex) % 2 === 0;
    const y = isAboveCorridor
        ? corridorCenterY - roomDepth - MAZE_ROOM_CORRIDOR_GAP
        : corridorCenterY + MAZE_ROOM_CORRIDOR_GAP;
    const connectorX = x + roomWidth / 2;
    const connectorWidth =
        MAZE_ROOM_CONNECTOR_WIDTH +
        (sourceRoom.kind === 'head-office' ? 6 : sourceRoom.kind === 'remote' ? 4 : 0);

    return {
        id: sourceRoom.id,
        label: sourceRoom.label,
        subtitle: sourceRoom.subtitle,
        kind: sourceRoom.kind,
        color: sourceRoom.color,
        x,
        y,
        width: roomWidth,
        depth: roomDepth,
        rowIndex,
        columnIndex,
        corridorCenterY,
        connectorX,
        connectorWidth,
        corridorAnchor: {
            x: connectorX,
            y: corridorCenterY,
        },
        isAboveCorridor,
        deskSlots: createMazeDeskSlots(x, y, roomWidth, roomDepth),
        meetingSlots: createMazeMeetingSlots(x, y, roomWidth, roomDepth),
        seed: hashString(`${sourceRoom.id}|${sourceRoom.label}|${index}`),
    };
}

/**
 * Creates row-level corridor extents from positioned rooms.
 *
 * @param rooms - Positioned maze rooms.
 * @returns Per-row corridor ranges and bridge anchor points.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeRowContexts(rooms: ReadonlyArray<MazeRoom>): Array<MazeRowContext> {
    const roomsByRow = new Map<number, Array<MazeRoom>>();

    for (const room of rooms) {
        const rowRooms = roomsByRow.get(room.rowIndex) || [];
        rowRooms.push(room);
        roomsByRow.set(room.rowIndex, rowRooms);
    }

    const rowIndices = [...roomsByRow.keys()].sort((left, right) => left - right);

    return rowIndices.map((rowIndex, index) => {
        const rowRooms = [...(roomsByRow.get(rowIndex) || [])].sort((left, right) => left.columnIndex - right.columnIndex);
        const startX = Math.min(...rowRooms.map((room) => room.connectorX)) - 92;
        const endX = Math.max(...rowRooms.map((room) => room.connectorX)) + 92;
        const bridgeToNextX =
            index < rowIndices.length - 1 ? (rowIndex % 2 === 0 ? endX + 32 : startX - 32) : null;

        return {
            rowIndex,
            corridorCenterY: rowRooms[0]?.corridorCenterY || 0,
            startX,
            endX,
            bridgeToNextX,
            bridgeFromPreviousX: null,
        };
    }).map((context, index, contexts) => ({
        ...context,
        bridgeFromPreviousX: index === 0 ? null : contexts[index - 1]?.bridgeToNextX || null,
    }));
}

/**
 * Creates all corridor segments needed by the maze scene.
 *
 * @param rooms - Positioned maze rooms.
 * @param rowContexts - Row-level corridor extents and bridge anchors.
 * @returns Corridor segments rendered by the maze scene.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeCorridors(
    rooms: ReadonlyArray<MazeRoom>,
    rowContexts: ReadonlyArray<MazeRowContext>,
): Array<MazeCorridor> {
    const corridors: Array<MazeCorridor> = [];

    rowContexts.forEach((context, index) => {
        corridors.push({
            id: `maze:spine:${context.rowIndex}`,
            kind: 'spine',
            x: context.startX,
            y: context.corridorCenterY - MAZE_CORRIDOR_WIDTH / 2,
            width: context.endX - context.startX,
            depth: MAZE_CORRIDOR_WIDTH,
        });

        const nextContext = rowContexts[index + 1];
        if (nextContext && context.bridgeToNextX !== null) {
            corridors.push({
                id: `maze:bridge:${context.rowIndex}`,
                kind: 'bridge',
                x: context.bridgeToNextX - MAZE_CORRIDOR_WIDTH / 2,
                y:
                    Math.min(context.corridorCenterY, nextContext.corridorCenterY) -
                    MAZE_CORRIDOR_WIDTH / 2,
                width: MAZE_CORRIDOR_WIDTH,
                depth:
                    Math.abs(nextContext.corridorCenterY - context.corridorCenterY) +
                    MAZE_CORRIDOR_WIDTH,
            });
        }
    });

    rooms.forEach((room) => {
        const roomEdgeY = room.isAboveCorridor ? room.y + room.depth : room.y;
        corridors.push({
            id: `maze:connector:${room.id}`,
            kind: 'connector',
            x: room.connectorX - room.connectorWidth / 2,
            y: Math.min(roomEdgeY, room.corridorCenterY) - room.connectorWidth / 2,
            width: room.connectorWidth,
            depth: Math.abs(room.corridorCenterY - roomEdgeY) + room.connectorWidth,
        });
    });

    return corridors;
}

/**
 * Repositions office agents into the maze room and corridor anchors.
 *
 * @param sourceAgents - Agents from the shared office layout.
 * @param rooms - Maze rooms keyed by the same room identifiers.
 * @param rowContexts - Row-level corridor extents and bridge anchors.
 * @returns Repositioned maze agents.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeAgents(
    sourceAgents: ReadonlyArray<OfficeAgentVisual>,
    rooms: ReadonlyArray<MazeRoom>,
    rowContexts: ReadonlyArray<MazeRowContext>,
): Array<OfficeAgentVisual> {
    const roomById = new Map(rooms.map((room) => [room.id, room]));
    const rowContextByIndex = new Map(rowContexts.map((context) => [context.rowIndex, context]));
    const roomAgentIndexByRoomId = new Map<string, number>();
    const roomMeetingIndexByRoomId = new Map<string, number>();
    const roomDeskIndexByRoomId = new Map<string, number>();

    return sourceAgents.map((agent) => {
        const room = roomById.get(agent.roomId);
        if (!room) {
            return agent;
        }

        const rowContext = rowContextByIndex.get(room.rowIndex);
        const roomAgentIndex = roomAgentIndexByRoomId.get(room.id) || 0;
        roomAgentIndexByRoomId.set(room.id, roomAgentIndex + 1);

        if (agent.state === 'meeting') {
            const meetingIndex = roomMeetingIndexByRoomId.get(room.id) || 0;
            roomMeetingIndexByRoomId.set(room.id, meetingIndex + 1);
            const meetingPosition = room.meetingSlots[meetingIndex] || fallbackMazeAgentPosition(room, roomAgentIndex);

            return {
                ...agent,
                position: meetingPosition,
                deskId: null,
                path: null,
            };
        }

        if (agent.state === 'moving') {
            const movingPath = createMazeMovingPath(agent, room, rowContext, roomAgentIndex);

            return {
                ...agent,
                position: movingPath.from,
                deskId: null,
                path: movingPath,
            };
        }

        const deskIndex = roomDeskIndexByRoomId.get(room.id) || 0;
        roomDeskIndexByRoomId.set(room.id, deskIndex + 1);
        const deskPosition = room.deskSlots[deskIndex] || fallbackMazeAgentPosition(room, roomAgentIndex);

        return {
            ...agent,
            position: deskPosition,
            deskId: `${room.id}:maze-desk:${deskIndex}`,
            path: null,
        };
    });
}

/**
 * Creates one corridor path for a moving agent.
 *
 * @param agent - Source office agent record.
 * @param room - Room hosting the agent.
 * @param rowContext - Corridor context for the room row.
 * @param roomAgentIndex - Stable index of the agent inside the room.
 * @returns Animated corridor path used by the maze component.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeMovingPath(
    agent: OfficeAgentVisual,
    room: MazeRoom,
    rowContext: MazeRowContext | undefined,
    roomAgentIndex: number,
): OfficeAgentPath {
    const seedOffset = agent.seed % 54;
    const from = {
        x: room.connectorX,
        y: room.corridorCenterY,
    };
    const travelTargets: Array<OfficePoint> = rowContext
        ? [
              {
                  x: rowContext.startX + 44 + seedOffset,
                  y: room.corridorCenterY,
              },
              {
                  x: rowContext.endX - 44 - seedOffset,
                  y: room.corridorCenterY,
              },
          ]
        : [
              {
                  x: room.connectorX + 40,
                  y: room.corridorCenterY,
              },
          ];

    if (rowContext?.bridgeToNextX !== null && rowContext?.bridgeToNextX !== undefined) {
        travelTargets.push({
            x: rowContext.bridgeToNextX,
            y: room.corridorCenterY,
        });
    }

    if (rowContext?.bridgeFromPreviousX !== null && rowContext?.bridgeFromPreviousX !== undefined) {
        travelTargets.push({
            x: rowContext.bridgeFromPreviousX,
            y: room.corridorCenterY,
        });
    }

    const target = travelTargets[agent.seed % travelTargets.length] || from;

    return {
        from,
        to: target,
        durationMs: 3200 + (agent.seed % 2600),
        delayMs: (agent.seed % 900) + roomAgentIndex * 120,
    };
}

/**
 * Creates a small set of communication links that make the maze feel collaborative.
 *
 * @param rooms - Maze rooms keyed by room id.
 * @param agents - Repositioned maze agents.
 * @returns Communication links rendered as animated scene beams.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeCommunicationLinks(
    rooms: ReadonlyArray<MazeRoom>,
    agents: ReadonlyArray<OfficeAgentVisual>,
): Array<MazeCommunicationLink> {
    const roomById = new Map(rooms.map((room) => [room.id, room]));
    const agentsByRoomId = groupAgentsByRoom(agents);
    const links: Array<MazeCommunicationLink> = [];

    agentsByRoomId.forEach((roomAgents, roomId) => {
        const room = roomById.get(roomId);
        if (!room) {
            return;
        }

        const meetingAgents = roomAgents.filter((agent) => agent.state === 'meeting');
        for (let index = 1; index < meetingAgents.length; index++) {
            const previousAgent = meetingAgents[index - 1];
            const nextAgent = meetingAgents[index];

            if (!previousAgent || !nextAgent) {
                continue;
            }

            links.push({
                id: `maze:meeting:${previousAgent.id}:${nextAgent.id}`,
                fromAgentId: previousAgent.id,
                toAgentId: nextAgent.id,
                from: previousAgent.position,
                to: nextAgent.position,
                tone: 'meeting',
            });
        }

        const workingAgents = roomAgents.filter((agent) => agent.state === 'working' || agent.state === 'idle');
        if (workingAgents.length >= 2) {
            const fromAgent = workingAgents[0];
            const toAgent = workingAgents[1];

            if (fromAgent && toAgent) {
                links.push({
                    id: `maze:working:${fromAgent.id}:${toAgent.id}`,
                    fromAgentId: fromAgent.id,
                    toAgentId: toAgent.id,
                    from: fromAgent.position,
                    to: toAgent.position,
                    tone: 'working',
                });
            }
        }

        if (room.kind === 'head-office') {
            const remotePartner = rooms
                .filter((candidateRoom) => candidateRoom.kind === 'remote' && candidateRoom.id !== room.id)
                .sort((left, right) => left.id.localeCompare(right.id))[0];
            const roomLead = roomAgents[0];
            const partnerLead = remotePartner ? (agentsByRoomId.get(remotePartner.id) || [])[0] : null;

            if (roomLead && partnerLead) {
                links.push({
                    id: `maze:handoff:${roomLead.id}:${partnerLead.id}`,
                    fromAgentId: roomLead.id,
                    toAgentId: partnerLead.id,
                    from: roomLead.position,
                    to: partnerLead.position,
                    tone: 'handoff',
                });
            }
        }
    });

    return links;
}

/**
 * Creates stable desk anchors for one maze room.
 *
 * @param roomX - Room world X coordinate.
 * @param roomY - Room world Y coordinate.
 * @param roomWidth - Room width in world units.
 * @param roomDepth - Room depth in world units.
 * @returns Desk positions used for working and idle agents.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeDeskSlots(
    roomX: number,
    roomY: number,
    roomWidth: number,
    roomDepth: number,
): Array<OfficePoint> {
    const columnCount = roomWidth >= 250 ? 3 : 2;
    const rowCount = 2;
    const left = roomX + 46;
    const top = roomY + 40;
    const horizontalGap = columnCount === 3 ? 72 : 96;
    const verticalGap = 52;

    return Array.from({ length: columnCount * rowCount }, (_, index) => {
        const column = index % columnCount;
        const row = Math.floor(index / columnCount);

        return {
            x: left + column * horizontalGap,
            y: Math.min(roomY + roomDepth - 34, top + row * verticalGap),
        };
    });
}

/**
 * Creates stable meeting anchors for one maze room.
 *
 * @param roomX - Room world X coordinate.
 * @param roomY - Room world Y coordinate.
 * @param roomWidth - Room width in world units.
 * @param roomDepth - Room depth in world units.
 * @returns Meeting positions used by collaborative agents.
 *
 * @private function of buildMazeOfficeLayout
 */
function createMazeMeetingSlots(
    roomX: number,
    roomY: number,
    roomWidth: number,
    roomDepth: number,
): Array<OfficePoint> {
    const centerX = roomX + roomWidth / 2;
    const centerY = roomY + roomDepth / 2;

    return [
        { x: centerX - 40, y: centerY - 18 },
        { x: centerX + 40, y: centerY - 18 },
        { x: centerX - 40, y: centerY + 24 },
        { x: centerX + 40, y: centerY + 24 },
    ];
}

/**
 * Resolves a safe fallback position inside one room.
 *
 * @param room - Room hosting the agent.
 * @param index - Stable per-room agent index.
 * @returns Fallback point within the room bounds.
 *
 * @private function of buildMazeOfficeLayout
 */
function fallbackMazeAgentPosition(room: MazeRoom, index: number): OfficePoint {
    return {
        x: room.x + 44 + (index % 3) * 52,
        y: room.y + room.depth - 34 - Math.floor(index / 3) * 18,
    };
}

/**
 * Resolves the padded world width for the final maze scene.
 *
 * @param rooms - Positioned maze rooms.
 * @param corridors - Corridor floor segments.
 * @returns World width including framing padding.
 *
 * @private function of buildMazeOfficeLayout
 */
function resolveWorldWidth(rooms: ReadonlyArray<MazeRoom>, corridors: ReadonlyArray<MazeCorridor>): number {
    return (
        Math.max(
            0,
            ...rooms.map((room) => room.x + room.width),
            ...corridors.map((corridor) => corridor.x + corridor.width),
        ) + MAZE_WORLD_PADDING
    );
}

/**
 * Resolves the padded world height for the final maze scene.
 *
 * @param rooms - Positioned maze rooms.
 * @param corridors - Corridor floor segments.
 * @returns World height including framing padding.
 *
 * @private function of buildMazeOfficeLayout
 */
function resolveWorldHeight(rooms: ReadonlyArray<MazeRoom>, corridors: ReadonlyArray<MazeCorridor>): number {
    return (
        Math.max(
            0,
            ...rooms.map((room) => room.y + room.depth),
            ...corridors.map((corridor) => corridor.y + corridor.depth),
        ) + MAZE_WORLD_PADDING
    );
}

export type { BuildOfficeLayoutOptions };
