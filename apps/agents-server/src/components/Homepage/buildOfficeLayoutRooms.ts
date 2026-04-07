import type { OfficeAgentAssignment, OfficeAgentPath, OfficeDesk, OfficePoint, OfficeRoom, OfficeRoomGroup } from './buildOfficeLayoutTypes';
import { isRemoteAgent } from './buildOfficeLayoutShared';

/**
 * Width of one office room in world units.
 */
const ROOM_WIDTH = 260;

/**
 * Depth of one office room in world units.
 */
const ROOM_DEPTH = 170;

/**
 * Horizontal spacing between adjacent rooms.
 */
const ROOM_GAP_X = 110;

/**
 * Vertical spacing between adjacent room rows.
 */
const ROOM_GAP_Y = 120;

/**
 * Width reserved for the central corridor spine.
 */
const CORRIDOR_WIDTH = 210;

/**
 * Width of one rendered desk.
 */
const DESK_WIDTH = 54;

/**
 * Depth of one rendered desk.
 */
const DESK_DEPTH = 30;

/**
 * Extra world padding to keep the scene comfortably framed.
 */
const WORLD_PADDING = 220;

/**
 * Computed world bounds for the office scene.
 */
type OfficeWorldBounds = {
    worldWidth: number;
    worldHeight: number;
};

/**
 * Computes screen-independent room positions in the office world.
 *
 * @param localGroups - Local room groups.
 * @param remoteGroups - Remote server groups.
 * @returns Positioned rooms with desk/meeting slots.
 *
 * @private function of buildOfficeLayout
 */
export function placeRoomGroups(localGroups: Array<OfficeRoomGroup>, remoteGroups: Array<OfficeRoomGroup>): Array<OfficeRoom> {
    const rooms: Array<OfficeRoom> = [];
    const localColumns = localGroups.length > 1 ? 2 : 1;
    const remoteStartX = localColumns * (ROOM_WIDTH + ROOM_GAP_X) + CORRIDOR_WIDTH;

    localGroups.forEach((group, index) => {
        const column = index % localColumns;
        const row = Math.floor(index / localColumns);
        const x = column * (ROOM_WIDTH + ROOM_GAP_X);
        const y = row * (ROOM_DEPTH + ROOM_GAP_Y);

        rooms.push(createRoom(group, x, y, false));
    });

    remoteGroups.forEach((group, index) => {
        const x = remoteStartX;
        const y = index * (ROOM_DEPTH + ROOM_GAP_Y * 0.9) + 40;

        rooms.push(createRoom(group, x, y, true));
    });

    return rooms;
}

/**
 * Creates the shared corridor hub used by walking agents.
 *
 * @param localGroupCount - Number of local rooms in the scene.
 * @returns Corridor hub point.
 *
 * @private function of buildOfficeLayout
 */
export function createCorridorHub(localGroupCount: number): OfficePoint {
    const localColumns = localGroupCount > 1 ? 2 : 1;

    return {
        x: localColumns * (ROOM_WIDTH + ROOM_GAP_X) - ROOM_GAP_X / 2 + CORRIDOR_WIDTH / 2,
        y: ROOM_DEPTH + ROOM_GAP_Y / 2,
    };
}

/**
 * Creates desk models for all desk-based agents in a room.
 *
 * @param room - Room to populate.
 * @param assignments - Agent assignments for the room.
 * @returns Desk definitions used by the renderer.
 *
 * @private function of buildOfficeLayout
 */
export function createRoomDesks(room: OfficeRoom, assignments: Array<OfficeAgentAssignment>): Array<OfficeDesk> {
    return assignments
        .filter(({ state }) => state !== 'meeting' && state !== 'moving')
        .slice(0, room.deskSlots.length)
        .map((assignment, index) => {
            const slot = room.deskSlots[index];

            if (!slot) {
                throw new Error(`Missing desk slot ${index} for room ${room.id}.`);
            }

            return {
                id: `${room.id}:desk:${index}`,
                roomId: room.id,
                x: slot.x,
                y: slot.y,
                width: DESK_WIDTH,
                depth: DESK_DEPTH,
                color: room.color,
                isRemote: isRemoteAgent(assignment.agent),
            };
        });
}

/**
 * Creates a walking path from a room toward the corridor hub.
 *
 * @param room - Room the agent belongs to.
 * @param corridorHub - Shared corridor target point.
 * @param seed - Deterministic animation seed.
 * @param index - Agent index inside the room.
 * @returns Animated path configuration.
 *
 * @private function of buildOfficeLayout
 */
export function createWalkingPath(
    room: OfficeRoom,
    corridorHub: OfficePoint,
    seed: number,
    index: number,
): OfficeAgentPath {
    const offset = (seed % 26) - 13;

    return {
        from: {
            x: room.corridorAnchor.x,
            y: room.corridorAnchor.y + index * 6,
        },
        to: {
            x: corridorHub.x + offset,
            y: corridorHub.y + offset / 2,
        },
        durationMs: 3000 + (seed % 2400),
        delayMs: (seed % 900) + index * 140,
    };
}

/**
 * Resolves the avatar anchor point for a desk-based agent.
 *
 * @param desk - Desk assigned to the agent.
 * @returns Agent anchor point, or null when no desk exists.
 *
 * @private function of buildOfficeLayout
 */
export function deskPositionToAgentPosition(desk: OfficeDesk | null): OfficePoint | null {
    if (!desk) {
        return null;
    }

    return {
        x: desk.x + desk.width * 0.32,
        y: desk.y + desk.depth * 0.7,
    };
}

/**
 * Resolves a fallback position when no desk or meeting slot is available.
 *
 * @param room - Room that hosts the agent.
 * @param index - Stable index of the agent in the room.
 * @returns Fallback anchor point inside the room.
 *
 * @private function of buildOfficeLayout
 */
export function fallbackAgentPosition(room: OfficeRoom, index: number): OfficePoint {
    return {
        x: room.x + 42 + (index % 3) * 46,
        y: room.y + room.depth - 26 - Math.floor(index / 3) * 18,
    };
}

/**
 * Computes the overall office-world bounds.
 *
 * @param rooms - Rooms included in the layout.
 * @param corridorHub - Corridor center point.
 * @returns World width and height including framing padding.
 *
 * @private function of buildOfficeLayout
 */
export function createOfficeWorldBounds(rooms: ReadonlyArray<OfficeRoom>, corridorHub: OfficePoint): OfficeWorldBounds {
    const maxRoomX = Math.max(0, ...rooms.map((room) => room.x + room.width), corridorHub.x);
    const maxRoomY = Math.max(0, ...rooms.map((room) => room.y + room.depth), corridorHub.y);

    return {
        worldWidth: maxRoomX + WORLD_PADDING,
        worldHeight: maxRoomY + WORLD_PADDING,
    };
}

/**
 * Creates one positioned room model.
 *
 * @param group - Source room group.
 * @param x - Room origin on the office world plane.
 * @param y - Room origin on the office world plane.
 * @param isRemoteRoom - Whether the room sits on the remote wing side.
 * @returns Positioned room.
 */
function createRoom(group: OfficeRoomGroup, x: number, y: number, isRemoteRoom: boolean): OfficeRoom {
    return {
        id: group.id,
        label: group.label,
        subtitle: group.subtitle,
        kind: group.kind,
        color: group.color,
        x,
        y,
        width: ROOM_WIDTH,
        depth: ROOM_DEPTH,
        deskSlots: createDeskSlots(x, y),
        meetingSlots: createMeetingSlots(x, y),
        corridorAnchor: {
            x: isRemoteRoom ? x - 30 : x + ROOM_WIDTH + 30,
            y: y + ROOM_DEPTH / 2,
        },
    };
}

/**
 * Creates the room's desk anchor positions.
 *
 * @param roomX - Room world X coordinate.
 * @param roomY - Room world Y coordinate.
 * @returns Desk slot anchor points.
 */
function createDeskSlots(roomX: number, roomY: number): Array<OfficePoint> {
    return [
        { x: roomX + 46, y: roomY + 38 },
        { x: roomX + 116, y: roomY + 38 },
        { x: roomX + 186, y: roomY + 38 },
        { x: roomX + 46, y: roomY + 102 },
        { x: roomX + 116, y: roomY + 102 },
        { x: roomX + 186, y: roomY + 102 },
    ];
}

/**
 * Creates the room's meeting-seat anchor positions.
 *
 * @param roomX - Room world X coordinate.
 * @param roomY - Room world Y coordinate.
 * @returns Meeting slot anchor points.
 */
function createMeetingSlots(roomX: number, roomY: number): Array<OfficePoint> {
    const centerX = roomX + ROOM_WIDTH / 2;
    const centerY = roomY + ROOM_DEPTH / 2 + 10;

    return [
        { x: centerX - 44, y: centerY - 16 },
        { x: centerX + 44, y: centerY - 16 },
        { x: centerX - 44, y: centerY + 28 },
        { x: centerX + 44, y: centerY + 28 },
    ];
}

