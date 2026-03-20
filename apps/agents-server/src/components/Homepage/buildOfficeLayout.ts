import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentWithVisibility } from './useFederatedAgents';

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
 * Color palette used when folders do not provide a custom color.
 */
const ROOM_COLOR_PALETTE = ['#d97706', '#0f766e', '#2563eb', '#be123c', '#7c3aed', '#0891b2'];

/**
 * Capability types that imply screen-focused work.
 */
const WORKING_CAPABILITY_TYPES = new Set([
    'browser',
    'search-engine',
    'knowledge',
    'image-generator',
    'project',
    'email',
    'wallet',
    'timeout',
    'time',
    'user-location',
]);

/**
 * Agent movement/activity states rendered by the office scene.
 */
export type OfficeAgentState = 'idle' | 'working' | 'meeting' | 'moving';

/**
 * Room categories rendered in the office scene.
 */
export type OfficeRoomKind = 'root' | 'folder' | 'remote' | 'head-office';

/**
 * Two-dimensional world coordinate.
 */
export type OfficePoint = {
    x: number;
    y: number;
};

/**
 * One room in the computed office layout.
 */
export type OfficeRoom = {
    id: string;
    label: string;
    subtitle: string;
    kind: OfficeRoomKind;
    color: string;
    x: number;
    y: number;
    width: number;
    depth: number;
    deskSlots: Array<OfficePoint>;
    meetingSlots: Array<OfficePoint>;
    corridorAnchor: OfficePoint;
};

/**
 * One desk rendered inside a room.
 */
export type OfficeDesk = {
    id: string;
    roomId: string;
    x: number;
    y: number;
    width: number;
    depth: number;
    color: string;
    isRemote: boolean;
};

/**
 * Animated corridor path used by walking agents.
 */
export type OfficeAgentPath = {
    from: OfficePoint;
    to: OfficePoint;
    durationMs: number;
    delayMs: number;
};

/**
 * One agent visualized in the office scene.
 */
export type OfficeAgentVisual = {
    id: string;
    agent: AgentWithVisibility;
    state: OfficeAgentState;
    roomId: string;
    roomLabel: string;
    serverLabel: string | null;
    position: OfficePoint;
    deskId: string | null;
    path: OfficeAgentPath | null;
    previewText: string;
    summaryText: string;
    capabilityBadges: Array<string>;
    isRemote: boolean;
    profileHref: string;
    chatHref: string;
    bookHref: string;
    seed: number;
};

/**
 * View-model payload consumed by the Office homepage component.
 */
export type OfficeLayout = {
    rooms: Array<OfficeRoom>;
    desks: Array<OfficeDesk>;
    agents: Array<OfficeAgentVisual>;
    corridorHub: OfficePoint;
    worldWidth: number;
    worldHeight: number;
    stateCounts: Record<OfficeAgentState, number>;
};

/**
 * Parameters used when computing the office visualization.
 */
export type BuildOfficeLayoutOptions = {
    agents: ReadonlyArray<AgentOrganizationAgent>;
    federatedAgents: ReadonlyArray<AgentWithVisibility>;
    folders: ReadonlyArray<AgentOrganizationFolder>;
    publicUrl: string;
};

/**
 * Lightweight room grouping before screen coordinates are assigned.
 */
type OfficeRoomGroup = {
    id: string;
    label: string;
    subtitle: string;
    kind: OfficeRoomKind;
    color: string;
    agents: Array<AgentWithVisibility>;
};

/**
 * Group-local state assignment before positions are generated.
 */
type OfficeAgentAssignment = {
    agent: AgentWithVisibility;
    state: OfficeAgentState;
    seed: number;
};

/**
 * Builds the client-side office view model from the existing homepage agent datasets.
 *
 * @param options - Local agents, federated agents, folders, and public URL.
 * @returns Deterministic office layout ready for rendering.
 */
export function buildOfficeLayout(options: BuildOfficeLayoutOptions): OfficeLayout {
    const normalizedPublicUrl = normalizeBaseUrl(options.publicUrl);
    const localGroups = createLocalRoomGroups(options.agents, options.folders);
    const remoteGroups = createRemoteRoomGroups(options.federatedAgents);
    const rooms = placeRoomGroups(localGroups, remoteGroups);
    const corridorHub = createCorridorHub(localGroups.length);
    const desks: Array<OfficeDesk> = [];
    const visuals: Array<OfficeAgentVisual> = [];

    for (const room of rooms) {
        const group = [...localGroups, ...remoteGroups].find((candidate) => candidate.id === room.id);
        if (!group) {
            continue;
        }

        const assignments = assignOfficeStates(group.agents);
        const roomDesks = createRoomDesks(room, assignments);
        roomDesks.forEach((desk) => desks.push(desk));
        const roomDeskQueue = [...roomDesks];
        const roomMeetingQueue = [...room.meetingSlots];

        assignments.forEach((assignment, index) => {
            const desk = assignment.state === 'meeting' || assignment.state === 'moving' ? null : roomDeskQueue.shift() || null;
            const meetingPosition = assignment.state === 'meeting' ? roomMeetingQueue.shift() || room.meetingSlots[0] : null;
            const path =
                assignment.state === 'moving'
                    ? createWalkingPath(room, corridorHub, assignment.seed, index)
                    : null;
            const position =
                assignment.state === 'moving'
                    ? path?.from || room.corridorAnchor
                    : meetingPosition || deskPositionToAgentPosition(desk) || fallbackAgentPosition(room, index);

            visuals.push({
                id: getAgentIdentifier(assignment.agent),
                agent: assignment.agent,
                state: assignment.state,
                roomId: room.id,
                roomLabel: room.label,
                serverLabel: resolveServerLabel(assignment.agent.serverUrl),
                position,
                deskId: desk?.id || null,
                path,
                previewText: createPreviewText(assignment.agent, assignment.state),
                summaryText: assignment.agent.personaDescription || assignment.agent.meta.description || room.subtitle,
                capabilityBadges: (assignment.agent.capabilities || []).slice(0, 3).map((capability) => capability.label),
                isRemote: isRemoteAgent(assignment.agent),
                profileHref: buildAgentPath(assignment.agent, normalizedPublicUrl, ''),
                chatHref: buildAgentPath(assignment.agent, normalizedPublicUrl, '/chat'),
                bookHref: buildAgentPath(assignment.agent, normalizedPublicUrl, '/book'),
                seed: assignment.seed,
            });
        });
    }

    const stateCounts = countStates(visuals);
    const worldWidth = Math.max(...rooms.map((room) => room.x + room.width), corridorHub.x) + 220;
    const worldHeight = Math.max(...rooms.map((room) => room.y + room.depth), corridorHub.y) + 220;

    return {
        rooms,
        desks,
        agents: visuals,
        corridorHub,
        worldWidth,
        worldHeight,
        stateCounts,
    };
}

/**
 * Creates room groups for local folders/root agents.
 *
 * @param agents - Local agents in the current homepage scope.
 * @param folders - Folder metadata used for room labels/colors.
 * @returns Ordered room groups for local agents.
 */
function createLocalRoomGroups(
    agents: ReadonlyArray<AgentOrganizationAgent>,
    folders: ReadonlyArray<AgentOrganizationFolder>,
): Array<OfficeRoomGroup> {
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const grouped = new Map<string, OfficeRoomGroup>();
    const orderedAgents = [...agents].sort((left, right) => left.sortOrder - right.sortOrder || left.agentName.localeCompare(right.agentName));

    orderedAgents.forEach((agent, index) => {
        const folder = agent.folderId === null ? null : folderById.get(agent.folderId) || null;
        const groupId = folder ? `folder:${folder.id}` : 'root';
        const currentGroup = grouped.get(groupId);

        if (currentGroup) {
            currentGroup.agents.push(agent);
            return;
        }

        grouped.set(groupId, {
            id: groupId,
            label: folder?.name || 'Core Floor',
            subtitle: folder ? 'Project room' : 'Shared desks',
            kind: folder ? 'folder' : 'root',
            color: folder?.color || pickPaletteColor(index),
            agents: [agent],
        });
    });

    return [...grouped.values()];
}

/**
 * Creates room groups for federated servers.
 *
 * @param federatedAgents - Federated agents loaded for the office scene.
 * @returns Ordered room groups for remote servers.
 */
function createRemoteRoomGroups(federatedAgents: ReadonlyArray<AgentWithVisibility>): Array<OfficeRoomGroup> {
    const grouped = new Map<string, OfficeRoomGroup>();

    [...federatedAgents]
        .sort((left, right) => getAgentIdentifier(left).localeCompare(getAgentIdentifier(right)))
        .forEach((agent, index) => {
            const serverUrl = normalizeBaseUrl(agent.serverUrl || '');
            const serverLabel = resolveServerLabel(serverUrl) || 'Remote server';
            const currentGroup = grouped.get(serverUrl);

            if (currentGroup) {
                currentGroup.agents.push(agent);
                if (currentGroup.kind !== 'head-office' && isHeadOfficeServer(serverLabel, currentGroup.agents)) {
                    currentGroup.label = 'Head Office';
                    currentGroup.subtitle = 'Core federation';
                    currentGroup.kind = 'head-office';
                    currentGroup.color = '#2563eb';
                }
                return;
            }

            const headOffice = isHeadOfficeServer(serverLabel, [agent]);
            grouped.set(serverUrl, {
                id: `remote:${serverLabel}`,
                label: headOffice ? 'Head Office' : serverLabel,
                subtitle: headOffice ? 'Core federation' : 'Remote colleagues',
                kind: headOffice ? 'head-office' : 'remote',
                color: headOffice ? '#2563eb' : pickPaletteColor(index + 2),
                agents: [agent],
            });
        });

    return [...grouped.values()];
}

/**
 * Computes screen-independent room positions in the office world.
 *
 * @param localGroups - Local room groups.
 * @param remoteGroups - Remote server groups.
 * @returns Positioned rooms with desk/meeting slots.
 */
function placeRoomGroups(localGroups: Array<OfficeRoomGroup>, remoteGroups: Array<OfficeRoomGroup>): Array<OfficeRoom> {
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

/**
 * Creates the shared corridor hub used by walking agents.
 *
 * @param localGroupCount - Number of local rooms in the scene.
 * @returns Corridor hub point.
 */
function createCorridorHub(localGroupCount: number): OfficePoint {
    const localColumns = localGroupCount > 1 ? 2 : 1;

    return {
        x: localColumns * (ROOM_WIDTH + ROOM_GAP_X) - ROOM_GAP_X / 2 + CORRIDOR_WIDTH / 2,
        y: ROOM_DEPTH + ROOM_GAP_Y / 2,
    };
}

/**
 * Assigns office activity states to one room's agents.
 *
 * @param agents - Agents assigned to a single room.
 * @returns Deterministic state assignments for rendering.
 */
function assignOfficeStates(agents: Array<AgentWithVisibility>): Array<OfficeAgentAssignment> {
    const assignments = [...agents]
        .sort((left, right) => getAgentIdentifier(left).localeCompare(getAgentIdentifier(right)))
        .map((agent) => ({
            agent,
            state: inferBaseState(agent),
            seed: hashString(getAgentIdentifier(agent)),
        }));

    const teamCandidates = assignments.filter(({ agent }) => hasTeamCapability(agent));
    const meetingCount = assignments.length >= 4 ? Math.min(4, Math.max(2, teamCandidates.length || 2)) : Math.min(2, teamCandidates.length);

    if (meetingCount > 0) {
        const prioritizedMeetingCandidates = (teamCandidates.length > 0 ? teamCandidates : assignments).slice(0, meetingCount);
        prioritizedMeetingCandidates.forEach((candidate) => {
            candidate.state = 'meeting';
        });
    }

    const movingCandidates = assignments.filter(({ state }) => state === 'moving');
    if (movingCandidates.length === 0 && assignments.length >= 3) {
        const movable = assignments.find(({ state }) => state !== 'meeting');
        if (movable) {
            movable.state = 'moving';
        }
    }

    const workingCandidates = assignments.filter(({ state }) => state === 'working');
    if (workingCandidates.length === 0) {
        const worker = assignments.find(({ state }) => state === 'idle');
        if (worker) {
            worker.state = 'working';
        }
    }

    return assignments;
}

/**
 * Infers a base office state from the available agent metadata.
 *
 * @param agent - Agent to classify.
 * @returns Base activity state before room-level balancing.
 */
function inferBaseState(agent: AgentWithVisibility): OfficeAgentState {
    if (isRemoteAgent(agent)) {
        return 'moving';
    }

    if (hasTeamCapability(agent)) {
        return 'meeting';
    }

    if (hasWorkingCapability(agent)) {
        return 'working';
    }

    return 'idle';
}

/**
 * Creates desk models for all desk-based agents in a room.
 *
 * @param room - Room to populate.
 * @param assignments - Agent assignments for the room.
 * @returns Desk definitions used by the renderer.
 */
function createRoomDesks(room: OfficeRoom, assignments: Array<OfficeAgentAssignment>): Array<OfficeDesk> {
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
                isRemote: assignment.agent.serverUrl !== undefined,
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
 */
function createWalkingPath(
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
 */
function deskPositionToAgentPosition(desk: OfficeDesk | null): OfficePoint | null {
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
 */
function fallbackAgentPosition(room: OfficeRoom, index: number): OfficePoint {
    return {
        x: room.x + 42 + (index % 3) * 46,
        y: room.y + room.depth - 26 - Math.floor(index / 3) * 18,
    };
}

/**
 * Creates compact screen-preview text shown in the office UI.
 *
 * @param agent - Agent being visualized.
 * @param state - Inferred office state.
 * @returns Short preview string for the desk screen/tooltip.
 */
function createPreviewText(agent: AgentWithVisibility, state: OfficeAgentState): string {
    if (state === 'meeting') {
        return 'Team sync';
    }

    if (state === 'moving') {
        return 'Walking the corridor';
    }

    const capabilityLabel = agent.capabilities.find((capability) => WORKING_CAPABILITY_TYPES.has(capability.type))?.label;
    if (capabilityLabel) {
        return capabilityLabel;
    }

    const description = agent.meta.description || agent.personaDescription || '';
    if (description) {
        const firstSentence = description.split(/[.!?]/)[0];
        if (firstSentence) {
            return firstSentence.trim().slice(0, 48);
        }
    }

    return state === 'working' ? 'Focused work' : 'Available at desk';
}

/**
 * Counts how many agents were assigned to each office state.
 *
 * @param agents - Agent visuals in the computed layout.
 * @returns State counts keyed by state name.
 */
function countStates(agents: Array<OfficeAgentVisual>): Record<OfficeAgentState, number> {
    return agents.reduce<Record<OfficeAgentState, number>>(
        (counts, agent) => {
            counts[agent.state] += 1;
            return counts;
        },
        { idle: 0, working: 0, meeting: 0, moving: 0 },
    );
}

/**
 * Builds one agent-relative path for profile/chat/book navigation.
 *
 * @param agent - Agent to link to.
 * @param publicUrl - Base URL of the current server.
 * @param suffix - Optional agent sub-route suffix.
 * @returns URL path or absolute URL.
 */
function buildAgentPath(agent: AgentWithVisibility, publicUrl: string, suffix: '' | '/chat' | '/book'): string {
    const identifier = encodeURIComponent(agent.permanentId || agent.agentName);
    const remoteBase = isRemoteAgent(agent) ? normalizeBaseUrl(agent.serverUrl || publicUrl) : null;

    if (remoteBase) {
        return `${remoteBase}agents/${identifier}${suffix}`;
    }

    return `/agents/${identifier}${suffix}`;
}

/**
 * Returns true when the agent originates from a federated server.
 *
 * @param agent - Agent to inspect.
 * @returns True for remote colleagues.
 */
function isRemoteAgent(agent: AgentWithVisibility): boolean {
    return typeof agent.serverUrl === 'string' && agent.serverUrl.trim().length > 0;
}

/**
 * Returns true when the agent exposes a TEAM capability.
 *
 * @param agent - Agent to inspect.
 * @returns True when the agent references teammates.
 */
function hasTeamCapability(agent: AgentWithVisibility): boolean {
    return agent.capabilities.some((capability) => capability.type === 'team');
}

/**
 * Returns true when the agent has capabilities associated with active desk work.
 *
 * @param agent - Agent to inspect.
 * @returns True when the agent likely shows a live desk preview.
 */
function hasWorkingCapability(agent: AgentWithVisibility): boolean {
    return agent.capabilities.some((capability) => WORKING_CAPABILITY_TYPES.has(capability.type));
}

/**
 * Builds a stable identifier for one agent.
 *
 * @param agent - Agent to identify.
 * @returns Stable local/federated agent identifier.
 */
function getAgentIdentifier(agent: AgentWithVisibility): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Resolves a readable hostname label from a server URL.
 *
 * @param serverUrl - Optional server URL.
 * @returns Hostname label or null for local agents.
 */
function resolveServerLabel(serverUrl: string | undefined): string | null {
    if (!serverUrl) {
        return null;
    }

    try {
        return new URL(serverUrl).hostname;
    } catch {
        return serverUrl;
    }
}

/**
 * Detects whether a federated server should be rendered as the head office.
 *
 * @param serverLabel - Normalized hostname label.
 * @param agents - Agents originating from the server.
 * @returns True when the room should use the head-office visual treatment.
 */
function isHeadOfficeServer(serverLabel: string, agents: ReadonlyArray<AgentWithVisibility>): boolean {
    const normalizedServerLabel = serverLabel.toLowerCase();

    if (
        normalizedServerLabel.includes('ptbk') ||
        normalizedServerLabel.includes('promptbook') ||
        normalizedServerLabel.includes('core')
    ) {
        return true;
    }

    return agents.some((agent) => {
        const name = `${agent.agentName} ${agent.meta.fullname || ''}`.toLowerCase();
        return name.includes('adam') || name.includes('teacher');
    });
}

/**
 * Normalizes a possibly-missing base URL into a slash-terminated string.
 *
 * @param value - URL-like value to normalize.
 * @returns Normalized slash-terminated URL.
 */
function normalizeBaseUrl(value: string): string {
    if (!value) {
        return '';
    }

    return value.endsWith('/') ? value : `${value}/`;
}

/**
 * Returns a deterministic fallback palette color by index.
 *
 * @param index - Index to map onto the fallback palette.
 * @returns Resolved fallback room color.
 */
function pickPaletteColor(index: number): string {
    return ROOM_COLOR_PALETTE[index % ROOM_COLOR_PALETTE.length] || ROOM_COLOR_PALETTE[0] || '#2563eb';
}

/**
 * Creates a deterministic numeric seed from a string identifier.
 *
 * @param value - Input string.
 * @returns Positive integer seed.
 */
function hashString(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash;
}
