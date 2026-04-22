import { createLocalRoomGroups, createRemoteRoomGroups } from './buildOfficeLayoutGroups';
import { createCorridorHub, createOfficeWorldBounds, placeRoomGroups } from './buildOfficeLayoutRooms';
import { normalizeBaseUrl } from './buildOfficeLayoutShared';
import type { BuildOfficeLayoutOptions, OfficeAgentVisual, OfficeDesk, OfficeLayout } from './buildOfficeLayoutTypes';
import { buildOfficeRoomVisuals, countStates } from './buildOfficeLayoutVisuals';

export type {
    BuildOfficeLayoutOptions,
    OfficeAgentPath,
    OfficeAgentState,
    OfficeAgentVisual,
    OfficeDesk,
    OfficeLayout,
    OfficePoint,
    OfficeRoom,
    OfficeRoomKind,
} from './buildOfficeLayoutTypes';

/**
 * Builds the client-side office view model from the existing homepage agent datasets.
 *
 * @param options - Local agents, federated agents, folders, and public URL.
 * @returns Deterministic office layout ready for rendering.
 *
 * @private function of <AgentsOffice/>, <AgentsMaze/>, and <AgentsPixelOffice/>
 */
export function buildOfficeLayout(options: BuildOfficeLayoutOptions): OfficeLayout {
    const normalizedPublicUrl = normalizeBaseUrl(options.publicUrl);
    const localGroups = createLocalRoomGroups(options.agents, options.folders);
    const remoteGroups = createRemoteRoomGroups(options.federatedAgents);
    const roomGroups = [...localGroups, ...remoteGroups];
    const roomGroupById = new Map(roomGroups.map((roomGroup) => [roomGroup.id, roomGroup]));
    const rooms = placeRoomGroups(localGroups, remoteGroups);
    const corridorHub = createCorridorHub(localGroups.length);
    const desks: Array<OfficeDesk> = [];
    const agents: Array<OfficeAgentVisual> = [];

    for (const room of rooms) {
        const roomGroup = roomGroupById.get(room.id);
        if (!roomGroup) {
            continue;
        }

        const roomVisuals = buildOfficeRoomVisuals(room, roomGroup, corridorHub, normalizedPublicUrl);
        desks.push(...roomVisuals.desks);
        agents.push(...roomVisuals.agents);
    }

    const stateCounts = countStates(agents);
    const { worldWidth, worldHeight } = createOfficeWorldBounds(rooms, corridorHub);

    return {
        rooms,
        desks,
        agents,
        corridorHub,
        worldWidth,
        worldHeight,
        stateCounts,
    };
}
