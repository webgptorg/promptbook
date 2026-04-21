import type { OfficeAgentState, OfficeAgentVisual, OfficeLayout, OfficePoint, OfficeRoom } from './buildOfficeLayout';
import { hashString } from './buildOfficeLayoutShared';

/**
 * Outer padding that frames the full maze stage.
 */
const MAZE_STAGE_PADDING = 120;

/**
 * Width of rendered corridor segments in world-space pixels.
 */
const MAZE_CORRIDOR_WIDTH = 28;

/**
 * Additional extension beyond the highest and lowest corridor lanes.
 */
const MAZE_SPINE_PADDING = 76;

/**
 * Deterministic lane offsets used to create a more maze-like corridor network.
 */
const MAZE_BRANCH_OFFSETS = [-84, -42, 18, 54, 92, 128];

/**
 * Length of decorative dead-end corridor branches.
 */
const MAZE_ALCOVE_LENGTH = 48;

/**
 * Inset used when starting walking paths from just inside a room doorway.
 */
const MAZE_DOOR_INSET = 26;

/**
 * Prepared corridor rectangle for the maze scene.
 *
 * @private function of <AgentsMazeOffice/>
 */
export type MazeCorridorSegment = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    tone: 'spine' | 'branch' | 'alcove';
};

/**
 * Deterministic ribbon/tentacle record rendered behind one avatar pod.
 *
 * @private function of <AgentsMazeOffice/>
 */
export type MazeTentacleVisual = {
    angleDeg: number;
    length: number;
    thickness: number;
    delayMs: number;
    durationMs: number;
};

/**
 * Prepared room record with maze-specific route anchors.
 *
 * @private function of <AgentsMazeOffice/>
 */
export type MazeRoomVisual = {
    room: OfficeRoom;
    x: number;
    y: number;
    width: number;
    height: number;
    doorPoint: OfficePoint;
    roomInteriorPoint: OfficePoint;
    corridorEntryPoint: OfficePoint;
    lanePoint: OfficePoint;
    spinePoint: OfficePoint;
    alcovePoint: OfficePoint;
    agentCount: number;
};

/**
 * Prepared maze agent record derived from one office agent visual.
 *
 * @private function of <AgentsMazeOffice/>
 */
export type MazeAgentVisual = {
    id: string;
    officeAgent: OfficeAgentVisual;
    position: OfficePoint;
    motionPath: Array<OfficePoint> | null;
    motionDurationMs: number;
    motionDelayMs: number;
    pulseColor: string;
    tentacles: Array<MazeTentacleVisual>;
};

/**
 * Full maze scene payload consumed by the homepage maze renderer.
 *
 * @private function of <AgentsMazeOffice/>
 */
export type MazeScene = {
    width: number;
    height: number;
    hubPoint: OfficePoint;
    corridors: Array<MazeCorridorSegment>;
    rooms: Array<MazeRoomVisual>;
    agents: Array<MazeAgentVisual>;
};

/**
 * Builds the top-down maze scene from the shared office layout.
 *
 * @param layout - Shared office layout used by homepage office-based views.
 * @returns Maze-ready rooms, corridors, and agent render records.
 *
 * @private function of <AgentsMazeOffice/>
 */
export function buildMazeScene(layout: OfficeLayout): MazeScene {
    const roomAgentCounts = layout.agents.reduce<Map<string, number>>((counts, agent) => {
        counts.set(agent.roomId, (counts.get(agent.roomId) || 0) + 1);
        return counts;
    }, new Map());
    const hubPoint = translatePoint(layout.corridorHub);
    const rooms = layout.rooms.map((room, roomIndex) =>
        createMazeRoomVisual(room, roomIndex, roomAgentCounts.get(room.id) || 0, hubPoint, layout.worldHeight),
    );

    const laneYs = rooms.flatMap((room) => [room.lanePoint.y, room.doorPoint.y, room.spinePoint.y]);
    const spineTop = Math.max(32, Math.min(hubPoint.y, ...laneYs) - MAZE_SPINE_PADDING);
    const spineBottom = Math.max(spineTop + MAZE_CORRIDOR_WIDTH, Math.max(hubPoint.y, ...laneYs) + MAZE_SPINE_PADDING);
    const corridors: Array<MazeCorridorSegment> = [
        {
            id: 'spine',
            x: hubPoint.x - MAZE_CORRIDOR_WIDTH / 2,
            y: spineTop,
            width: MAZE_CORRIDOR_WIDTH,
            height: spineBottom - spineTop,
            tone: 'spine',
        },
    ];

    for (const room of rooms) {
        corridors.push(
            createCorridorSegment(`${room.room.id}:door`, room.doorPoint, room.corridorEntryPoint, 'branch'),
            createCorridorSegment(`${room.room.id}:lane`, room.corridorEntryPoint, room.lanePoint, 'branch'),
            createCorridorSegment(`${room.room.id}:spine`, room.lanePoint, room.spinePoint, 'branch'),
            createCorridorSegment(`${room.room.id}:alcove`, room.lanePoint, room.alcovePoint, 'alcove'),
        );
    }

    const roomById = new Map(rooms.map((room) => [room.room.id, room]));
    const agents = layout.agents.map((agent) => createMazeAgentVisual(agent, roomById.get(agent.roomId) || null, hubPoint));

    return {
        width: layout.worldWidth + MAZE_STAGE_PADDING * 2,
        height: layout.worldHeight + MAZE_STAGE_PADDING * 2,
        hubPoint,
        corridors,
        rooms,
        agents,
    };
}

/**
 * Creates one maze room record with deterministic route anchors.
 *
 * @param room - Shared office room source.
 * @param roomIndex - Stable room index in layout order.
 * @param agentCount - Number of agents assigned to the room.
 * @param hubPoint - Shared maze hub point.
 * @param worldHeight - Original office world height.
 * @returns Maze room visual model.
 */
function createMazeRoomVisual(
    room: OfficeRoom,
    roomIndex: number,
    agentCount: number,
    hubPoint: OfficePoint,
    worldHeight: number,
): MazeRoomVisual {
    const isRemoteWing = room.kind === 'remote' || room.kind === 'head-office';
    const translatedRoomX = room.x + MAZE_STAGE_PADDING;
    const translatedRoomY = room.y + MAZE_STAGE_PADDING;
    const doorY = translatedRoomY + room.depth / 2;
    const doorX = isRemoteWing ? translatedRoomX : translatedRoomX + room.width;
    const branchSeed = hashString(`${room.id}:${roomIndex}`);
    const laneOffset = MAZE_BRANCH_OFFSETS[roomIndex % MAZE_BRANCH_OFFSETS.length] || 0;
    const laneY = clamp(
        hubPoint.y + laneOffset + (branchSeed % 24) - 12,
        MAZE_STAGE_PADDING / 2,
        worldHeight + MAZE_STAGE_PADDING * 1.5,
    );
    const corridorEntryPoint = translatePoint(room.corridorAnchor);
    const alcoveDirection = roomIndex % 2 === 0 ? -1 : 1;
    const alcoveMidX = corridorEntryPoint.x + (hubPoint.x - corridorEntryPoint.x) * 0.48;
    const alcoveLength = MAZE_ALCOVE_LENGTH + (branchSeed % 18);

    return {
        room,
        x: translatedRoomX,
        y: translatedRoomY,
        width: room.width,
        height: room.depth,
        roomInteriorPoint: {
            x: isRemoteWing ? translatedRoomX + MAZE_DOOR_INSET : translatedRoomX + room.width - MAZE_DOOR_INSET,
            y: doorY,
        },
        doorPoint: { x: doorX, y: doorY },
        corridorEntryPoint,
        lanePoint: { x: corridorEntryPoint.x, y: laneY },
        spinePoint: { x: hubPoint.x, y: laneY },
        alcovePoint: {
            x: alcoveMidX,
            y: laneY + alcoveDirection * alcoveLength,
        },
        agentCount,
    };
}

/**
 * Creates one maze agent visual with optional corridor motion path.
 *
 * @param agent - Shared office agent visual.
 * @param room - Maze room visual hosting the agent.
 * @param hubPoint - Shared maze hub point.
 * @returns Maze agent record.
 */
function createMazeAgentVisual(agent: OfficeAgentVisual, room: MazeRoomVisual | null, hubPoint: OfficePoint): MazeAgentVisual {
    const position = translatePoint(agent.position);
    const motionPath =
        agent.state === 'moving' && room
            ? compactPath([
                  room.roomInteriorPoint,
                  room.doorPoint,
                  room.corridorEntryPoint,
                  room.lanePoint,
                  room.spinePoint,
                  {
                      x: hubPoint.x + (agent.isRemote ? 34 : -34),
                      y: hubPoint.y + ((agent.seed % 3) - 1) * 18,
                  },
                  hubPoint,
              ])
            : null;

    return {
        id: agent.id,
        officeAgent: agent,
        position,
        motionPath,
        motionDurationMs: Math.max(3800, agent.path?.durationMs || 0),
        motionDelayMs: Math.max(0, agent.path?.delayMs || 0),
        pulseColor: resolveStatePulseColor(agent.state, agent.isRemote),
        tentacles: createTentacles(agent),
    };
}

/**
 * Builds one deterministic set of avatar ribbons/tentacles for an agent.
 *
 * @param agent - Office agent visual.
 * @returns Tentacle visuals rendered around the avatar pod.
 */
function createTentacles(agent: OfficeAgentVisual): Array<MazeTentacleVisual> {
    const capabilityCount = Math.max(1, agent.capabilityBadges.length);
    const tentacleCount = Math.min(10, Math.max(6, capabilityCount + 4));
    const baseStartAngle = 138;
    const spreadAngle = 264;

    return Array.from({ length: tentacleCount }, (_, index) => {
        const seedOffset = (agent.seed + index * 31) % 17;
        return {
            angleDeg: baseStartAngle + (spreadAngle / Math.max(1, tentacleCount - 1)) * index,
            length: 22 + ((agent.seed + index * 13) % 16),
            thickness: 7 + ((agent.seed + index * 7) % 4),
            delayMs: (seedOffset + index) * 120,
            durationMs: 1800 + ((agent.seed + index * 41) % 900),
        };
    });
}

/**
 * Resolves the pulse/accent color used around one animated avatar pod.
 *
 * @param state - Current office-derived agent state.
 * @param isRemote - Whether the agent is federated.
 * @returns CSS color string.
 */
function resolveStatePulseColor(state: OfficeAgentState, isRemote: boolean): string {
    if (state === 'meeting') {
        return 'rgba(16,185,129,0.82)';
    }

    if (state === 'moving') {
        return 'rgba(56,189,248,0.82)';
    }

    if (state === 'working') {
        return 'rgba(59,130,246,0.82)';
    }

    return isRemote ? 'rgba(96,165,250,0.72)' : 'rgba(148,163,184,0.78)';
}

/**
 * Creates one axis-aligned corridor rectangle between two route points.
 *
 * @param id - Stable segment identifier.
 * @param from - Start point.
 * @param to - End point.
 * @param tone - Segment styling tone.
 * @returns Corridor rectangle.
 */
function createCorridorSegment(
    id: string,
    from: OfficePoint,
    to: OfficePoint,
    tone: MazeCorridorSegment['tone'],
): MazeCorridorSegment {
    if (Math.abs(from.x - to.x) <= 1) {
        const y = Math.min(from.y, to.y);
        return {
            id,
            x: from.x - MAZE_CORRIDOR_WIDTH / 2,
            y,
            width: MAZE_CORRIDOR_WIDTH,
            height: Math.max(MAZE_CORRIDOR_WIDTH, Math.abs(from.y - to.y)),
            tone,
        };
    }

    const x = Math.min(from.x, to.x);
    return {
        id,
        x,
        y: from.y - MAZE_CORRIDOR_WIDTH / 2,
        width: Math.max(MAZE_CORRIDOR_WIDTH, Math.abs(from.x - to.x)),
        height: MAZE_CORRIDOR_WIDTH,
        tone,
    };
}

/**
 * Adds stage padding to one point from the shared office world space.
 *
 * @param point - Office world point.
 * @returns Maze-stage point.
 */
function translatePoint(point: OfficePoint): OfficePoint {
    return {
        x: point.x + MAZE_STAGE_PADDING,
        y: point.y + MAZE_STAGE_PADDING,
    };
}

/**
 * Removes repeated consecutive points from one polyline.
 *
 * @param points - Polyline points that may contain duplicates.
 * @returns De-duplicated polyline.
 */
function compactPath(points: ReadonlyArray<OfficePoint>): Array<OfficePoint> {
    return points.reduce<Array<OfficePoint>>((result, point) => {
        const previousPoint = result[result.length - 1];
        if (previousPoint && Math.abs(previousPoint.x - point.x) <= 1 && Math.abs(previousPoint.y - point.y) <= 1) {
            return result;
        }

        result.push(point);
        return result;
    }, []);
}

/**
 * Clamps a numeric value to the provided bounds.
 *
 * @param value - Input value.
 * @param minValue - Lower bound.
 * @param maxValue - Upper bound.
 * @returns Clamped value.
 */
function clamp(value: number, minValue: number, maxValue: number): number {
    return Math.min(maxValue, Math.max(minValue, value));
}
