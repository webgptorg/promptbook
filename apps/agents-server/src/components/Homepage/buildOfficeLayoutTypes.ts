import type { AgentOrganizationAgent, AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentWithVisibility } from './useFederatedAgents';

/**
 * Agent movement/activity states rendered by the office scene.
 *
 * @private function of buildOfficeLayout
 */
export type OfficeAgentState = 'idle' | 'working' | 'meeting' | 'moving';

/**
 * Room categories rendered in the office scene.
 *
 * @private function of buildOfficeLayout
 */
export type OfficeRoomKind = 'root' | 'folder' | 'remote' | 'head-office';

/**
 * Two-dimensional world coordinate.
 *
 * @private function of buildOfficeLayout
 */
export type OfficePoint = {
    x: number;
    y: number;
};

/**
 * One room in the computed office layout.
 *
 * @private function of buildOfficeLayout
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
 *
 * @private function of buildOfficeLayout
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
 *
 * @private function of buildOfficeLayout
 */
export type OfficeAgentPath = {
    from: OfficePoint;
    to: OfficePoint;
    durationMs: number;
    delayMs: number;
};

/**
 * One agent visualized in the office scene.
 *
 * @private function of buildOfficeLayout
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
 *
 * @private function of buildOfficeLayout
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
 *
 * @private function of buildOfficeLayout
 */
export type BuildOfficeLayoutOptions = {
    agents: ReadonlyArray<AgentOrganizationAgent>;
    federatedAgents: ReadonlyArray<AgentWithVisibility>;
    folders: ReadonlyArray<AgentOrganizationFolder>;
    publicUrl: string;
};

/**
 * Lightweight room grouping before screen coordinates are assigned.
 *
 * @private function of buildOfficeLayout
 */
export type OfficeRoomGroup = {
    id: string;
    label: string;
    subtitle: string;
    kind: OfficeRoomKind;
    color: string;
    agents: Array<AgentWithVisibility>;
};

/**
 * Group-local state assignment before positions are generated.
 *
 * @private function of buildOfficeLayout
 */
export type OfficeAgentAssignment = {
    agent: AgentWithVisibility;
    state: OfficeAgentState;
    seed: number;
};

