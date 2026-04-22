import type { AgentWithVisibility } from './useFederatedAgents';
import {
    buildAgentFreshChatPath,
    buildAgentPath,
    getAgentIdentifier,
    hashString,
    hasTeamCapability,
    hasWorkingCapability,
    isWorkingCapabilityType,
    isRemoteAgent,
    resolveServerLabel,
} from './buildOfficeLayoutShared';
import {
    createRoomDesks,
    createWalkingPath,
    deskPositionToAgentPosition,
    fallbackAgentPosition,
} from './buildOfficeLayoutRooms';
import type {
    OfficeAgentAssignment,
    OfficeAgentState,
    OfficeAgentVisual,
    OfficeDesk,
    OfficePoint,
    OfficeRoom,
    OfficeRoomGroup,
} from './buildOfficeLayoutTypes';

/**
 * Output generated for one room while building the office scene.
 *
 * @private function of buildOfficeLayout
 */
type OfficeRoomVisuals = {
    desks: Array<OfficeDesk>;
    agents: Array<OfficeAgentVisual>;
};

/**
 * Creates room-level desks and agent visuals for one positioned room.
 *
 * @param room - Positioned room currently being rendered.
 * @param roomGroup - Source group assigned to the room.
 * @param corridorHub - Shared corridor waypoint.
 * @param normalizedPublicUrl - Slash-normalized local server URL.
 * @returns Visual records for the room.
 *
 * @private function of buildOfficeLayout
 */
export function buildOfficeRoomVisuals(
    room: OfficeRoom,
    roomGroup: OfficeRoomGroup,
    corridorHub: OfficePoint,
    normalizedPublicUrl: string,
): OfficeRoomVisuals {
    const assignments = assignOfficeStates(roomGroup.agents);
    const desks = createRoomDesks(room, assignments);
    const roomDeskQueue = [...desks];
    const roomMeetingQueue = [...room.meetingSlots];

    const agents = assignments.map((assignment, index) => {
        const desk = assignment.state === 'meeting' || assignment.state === 'moving' ? null : roomDeskQueue.shift() || null;
        const meetingPosition = assignment.state === 'meeting' ? roomMeetingQueue.shift() || room.meetingSlots[0] : null;
        const path = assignment.state === 'moving' ? createWalkingPath(room, corridorHub, assignment.seed, index) : null;
        const position =
            assignment.state === 'moving'
                ? path?.from || room.corridorAnchor
                : meetingPosition || deskPositionToAgentPosition(desk) || fallbackAgentPosition(room, index);

        return createOfficeAgentVisual(assignment, room, position, desk, path, normalizedPublicUrl);
    });

    return { desks, agents };
}

/**
 * Counts how many agents were assigned to each office state.
 *
 * @param agents - Agent visuals in the computed layout.
 * @returns State counts keyed by state name.
 *
 * @private function of buildOfficeLayout
 */
export function countStates(agents: Array<OfficeAgentVisual>): Record<OfficeAgentState, number> {
    return agents.reduce<Record<OfficeAgentState, number>>(
        (counts, agent) => {
            counts[agent.state] += 1;
            return counts;
        },
        { idle: 0, working: 0, meeting: 0, moving: 0 },
    );
}

/**
 * Assigns office activity states to one room's agents.
 *
 * @param agents - Agents assigned to a single room.
 * @returns Deterministic state assignments for rendering.
 *
 * @private function of buildOfficeLayout
 */
export function assignOfficeStates(agents: Array<AgentWithVisibility>): Array<OfficeAgentAssignment> {
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
 * Creates one rendered agent record from an assignment and positioned room.
 *
 * @param assignment - Deterministic room-level agent assignment.
 * @param room - Room the agent belongs to.
 * @param position - Final rendered anchor position.
 * @param desk - Optional desk assigned to the agent.
 * @param path - Optional walking path assigned to the agent.
 * @param normalizedPublicUrl - Slash-normalized local server URL.
 * @returns Fully prepared room agent visual.
 */
function createOfficeAgentVisual(
    assignment: OfficeAgentAssignment,
    room: OfficeRoom,
    position: OfficePoint,
    desk: OfficeDesk | null,
    path: ReturnType<typeof createWalkingPath> | null,
    normalizedPublicUrl: string,
): OfficeAgentVisual {
    return {
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
        defaultHref: buildAgentFreshChatPath(assignment.agent, normalizedPublicUrl),
        profileHref: buildAgentPath(assignment.agent, normalizedPublicUrl, ''),
        chatHref: buildAgentFreshChatPath(assignment.agent, normalizedPublicUrl),
        bookHref: buildAgentPath(assignment.agent, normalizedPublicUrl, '/book'),
        seed: assignment.seed,
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

    const capabilityLabel = agent.capabilities.find((capability) => isWorkingCapabilityType(capability.type))?.label;
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
