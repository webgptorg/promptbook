'use client';

import type { string_url } from '@promptbook-local/types';
import { BookOpen, Building2, Globe2, MessageSquare, RefreshCw, Search, Users, ZoomIn, ZoomOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent as ReactWheelEvent,
} from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../src/utils/color/Color';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { lighten } from '../../../../../src/utils/color/operators/lighten';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { shortenText } from '../../utils/shortenText';
import { buildFolderMaps } from './agentOrganizationUtils';
import styles from './AgentsOffice.module.css';
import type { AgentWithVisibility, FederatedServerStatus } from './useFederatedAgents';

/**
 * Supported visual office activity states.
 */
type OfficeActivity = 'IDLE' | 'WORKING' | 'MEETING' | 'MOVING';

/**
 * Derived tone palette used across rooms and agents.
 */
type OfficeTone = {
    readonly accent: string;
    readonly accentSoft: string;
    readonly accentMuted: string;
    readonly surface: string;
    readonly wall: string;
    readonly desk: string;
    readonly shadow: string;
    readonly badge: string;
};

/**
 * Absolute placement within a room or corridor.
 */
type OfficePlacement = {
    readonly left: number;
    readonly top: number;
    readonly rotation: number;
    readonly phase: number;
};

/**
 * One agent mapped into the office visualization.
 */
type OfficeAgentModel = {
    readonly id: string;
    readonly identifier: string;
    readonly displayName: string;
    readonly summary: string;
    readonly previewText: string;
    readonly activity: OfficeActivity;
    readonly activityLabel: string;
    readonly avatarUrl: string | null;
    readonly initials: string;
    readonly tone: OfficeTone;
    readonly roomId: string;
    readonly roomLabel: string;
    readonly isRemote: boolean;
    readonly profileHref: string;
    readonly messageHref: string;
    readonly bookHref: string;
    readonly capabilityBadges: ReadonlyArray<string>;
    readonly placement: OfficePlacement;
};

/**
 * One room rendered in the faux-3D office canvas.
 */
type OfficeRoomModel = {
    readonly id: string;
    readonly label: string;
    readonly subtitle: string;
    readonly kind: 'LOCAL' | 'REMOTE' | 'ROOT';
    readonly tone: OfficeTone;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly deskAgents: ReadonlyArray<OfficeAgentModel>;
    readonly meetingAgents: ReadonlyArray<OfficeAgentModel>;
    readonly deskGhosts: ReadonlyArray<OfficePlacement>;
};

/**
 * Fully built office scene ready for rendering.
 */
type OfficeScene = {
    readonly rooms: ReadonlyArray<OfficeRoomModel>;
    readonly corridorAgents: ReadonlyArray<OfficeAgentModel>;
    readonly width: number;
    readonly height: number;
    readonly counts: Record<OfficeActivity, number>;
};

/**
 * Camera position applied to the office world.
 */
type OfficeCamera = {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
};

/**
 * Pointer pan state stored between pointer events.
 */
type OfficePanState = {
    readonly pointerId: number;
    readonly startClientX: number;
    readonly startClientY: number;
    readonly camera: OfficeCamera;
};

/**
 * Props for the office homepage surface.
 */
type AgentsOfficeProps = {
    /**
     * Local agents available on the current server.
     */
    readonly agents: ReadonlyArray<AgentWithVisibility>;
    /**
     * Remote/federated agents fetched from connected servers.
     */
    readonly federatedAgents: ReadonlyArray<AgentWithVisibility>;
    /**
     * Per-server federation loading state.
     */
    readonly federatedServersStatus: Record<string, FederatedServerStatus>;
    /**
     * Current local folders used to derive room assignments.
     */
    readonly folders: ReadonlyArray<AgentOrganizationFolder>;
    /**
     * Public server URL used to resolve local agent asset URLs.
     */
    readonly publicUrl: string_url;
};

/**
 * Base office room width in canvas coordinates.
 */
const OFFICE_ROOM_WIDTH = 360;

/**
 * Base office room height in canvas coordinates.
 */
const OFFICE_ROOM_HEIGHT = 248;

/**
 * Horizontal space between room cards.
 */
const OFFICE_ROOM_GAP_X = 74;

/**
 * Top padding above the first row of rooms.
 */
const OFFICE_WORLD_PADDING_Y = 68;

/**
 * Left/right padding around the office world.
 */
const OFFICE_WORLD_PADDING_X = 72;

/**
 * Corridor height between the two room rows.
 */
const OFFICE_CORRIDOR_HEIGHT = 154;

/**
 * Vertical space between rooms and the central corridor.
 */
const OFFICE_ROW_GAP_Y = 68;

/**
 * Minimum camera zoom for the office scene.
 */
const OFFICE_MIN_ZOOM = 0.55;

/**
 * Maximum camera zoom for the office scene.
 */
const OFFICE_MAX_ZOOM = 1.7;

/**
 * Default label for agents that are not placed in any folder room.
 */
const OFFICE_ROOT_ROOM_LABEL = 'Open Space';

/**
 * Maximum capability badges shown in desk decorations and tooltips.
 */
const OFFICE_MAX_CAPABILITY_BADGES = 3;

/**
 * Fallback palette used when agents do not define a valid brand color.
 */
const OFFICE_FALLBACK_COLORS = ['#0f766e', '#0284c7', '#16a34a', '#ea580c', '#dc2626', '#475569'];

/**
 * Human-readable labels and small stat-card styling for each office activity.
 */
const OFFICE_ACTIVITY_META: Record<
    OfficeActivity,
    {
        readonly label: string;
        readonly cardClassName: string;
    }
> = {
    IDLE: {
        label: 'Idle',
        cardClassName: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    WORKING: {
        label: 'Working',
        cardClassName: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    MEETING: {
        label: 'In meeting',
        cardClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    MOVING: {
        label: 'Moving',
        cardClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    },
};

/**
 * Clamp one numeric value into a closed range.
 *
 * @param value - Value to constrain.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns Clamped numeric value.
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Hash a text seed into a stable positive integer.
 *
 * @param value - Text seed.
 * @returns Deterministic integer hash.
 */
function hashText(value: string): number {
    let hash = 0;

    for (const character of value) {
        hash = (hash << 5) - hash + character.charCodeAt(0);
        hash |= 0;
    }

    return Math.abs(hash);
}

/**
 * Build a stable office tone from optional metadata color input.
 *
 * @param colorSource - Raw metadata color string.
 * @param seedText - Stable fallback seed.
 * @returns Palette used for room and agent rendering.
 */
function createOfficeTone(colorSource: string | undefined, seedText: string): OfficeTone {
    const fallbackHex = OFFICE_FALLBACK_COLORS[hashText(seedText) % OFFICE_FALLBACK_COLORS.length]!;
    const preferredColor = (colorSource || fallbackHex).split(',')[0]?.trim() || fallbackHex;
    const baseColor = Color.fromSafe(preferredColor || fallbackHex);

    return {
        accent: baseColor.toHex(),
        accentSoft: baseColor.then(lighten(0.24)).toHex(),
        accentMuted: baseColor.then(lighten(0.38)).toHex(),
        surface: baseColor.then(lighten(0.48)).toHex(),
        wall: baseColor.then(lighten(0.3)).toHex(),
        desk: baseColor.then(darken(0.12)).toHex(),
        shadow: baseColor.then(darken(0.34)).toHex(),
        badge: baseColor.then(darken(0.2)).toHex(),
    };
}

/**
 * Create short initials for avatar fallbacks.
 *
 * @param value - Agent display name.
 * @returns One or two-character initials.
 */
function createInitials(value: string): string {
    const words = value
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (words.length === 0) {
        return '?';
    }

    return words
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

/**
 * Resolve one hostname-like label for a server URL.
 *
 * @param serverUrl - Remote server URL.
 * @returns Friendly hostname label.
 */
function toServerLabel(serverUrl: string): string {
    try {
        return new URL(serverUrl).hostname.replace(/^www\./, '');
    } catch {
        return serverUrl.replace(/^https?:\/\//, '');
    }
}

/**
 * Resolve the top-most folder ancestor that should act as a room.
 *
 * @param folderById - Folder lookup map.
 * @param folderId - Folder identifier assigned to one agent.
 * @returns Top-level folder or null for root agents.
 */
function resolveTopLevelFolder(
    folderById: Map<number, AgentOrganizationFolder>,
    folderId: number | null,
): AgentOrganizationFolder | null {
    if (folderId === null) {
        return null;
    }

    let currentFolder = folderById.get(folderId) || null;

    while (currentFolder && currentFolder.parentId !== null) {
        const parentFolder = folderById.get(currentFolder.parentId) || null;
        if (!parentFolder) {
            break;
        }
        currentFolder = parentFolder;
    }

    return currentFolder;
}

/**
 * Infer the office activity from existing capability metadata.
 *
 * This intentionally stays transparent: it does not pretend to expose live runtime status.
 *
 * @param agent - Agent being visualized.
 * @returns Derived office activity.
 */
function deriveOfficeActivity(agent: AgentWithVisibility): OfficeActivity {
    const capabilityTypes = new Set(agent.capabilities.map((capability) => capability.type));

    if (capabilityTypes.has('team')) {
        return 'MEETING';
    }

    if (
        capabilityTypes.has('browser') ||
        capabilityTypes.has('search-engine') ||
        capabilityTypes.has('user-location') ||
        capabilityTypes.has('time') ||
        capabilityTypes.has('inheritance') ||
        capabilityTypes.has('import')
    ) {
        return 'MOVING';
    }

    if (
        agent.capabilities.length > 0 ||
        Boolean(agent.meta.description) ||
        Boolean(agent.personaDescription) ||
        agent.knowledgeSources.length > 0
    ) {
        return 'WORKING';
    }

    return 'IDLE';
}

/**
 * Create a short screen/bubble preview for the office visualization.
 *
 * @param agent - Agent being visualized.
 * @param activity - Previously derived office activity.
 * @returns Short preview text shown on desks, notes, or corridor bubbles.
 */
function createPreviewText(agent: AgentWithVisibility, activity: OfficeActivity): string {
    const searchableCapability = agent.capabilities.find(
        (capability) =>
            capability.type === 'browser' ||
            capability.type === 'search-engine' ||
            capability.type === 'knowledge' ||
            capability.type === 'project' ||
            capability.type === 'image-generator',
    );

    if (activity === 'MEETING') {
        const teammateLabels = agent.capabilities
            .filter((capability) => capability.type === 'team')
            .map((capability) => capability.label)
            .filter(Boolean);

        return shortenText(teammateLabels.join(', ') || 'Team sync', 26);
    }

    if (activity === 'MOVING') {
        return shortenText(searchableCapability?.label || 'Cross-team handoff', 26);
    }

    if (activity === 'WORKING') {
        return shortenText(agent.meta.description || agent.personaDescription || searchableCapability?.label || 'Focused work', 26);
    }

    return 'Available';
}

/**
 * Build the descriptive tooltip summary for one agent.
 *
 * @param agent - Agent being visualized.
 * @returns Short summary paragraph.
 */
function createAgentSummary(agent: AgentWithVisibility): string {
    const rawSummary =
        agent.meta.description ||
        agent.personaDescription ||
        agent.initialMessage ||
        agent.capabilities.map((capability) => capability.label).join(', ') ||
        'Ready for new work.';

    return shortenText(rawSummary, 120);
}

/**
 * Build one local or federated agent action URL.
 *
 * @param agentIdentifier - Canonical local or remote agent identifier.
 * @param serverUrl - Optional remote server origin.
 * @param suffix - Route suffix after the agent page.
 * @returns URL used by the office quick actions.
 */
function createAgentActionHref(agentIdentifier: string, serverUrl: string | undefined, suffix: string = ''): string {
    const encodedIdentifier = encodeURIComponent(agentIdentifier);

    if (serverUrl) {
        return `${serverUrl.replace(/\/+$/g, '')}/agents/${encodedIdentifier}${suffix}`;
    }

    return `/agents/${encodedIdentifier}${suffix}`;
}

/**
 * Create desk placements around the perimeter of one room.
 *
 * @param count - Number of placements needed.
 * @returns Deterministic desk positions.
 */
function createDeskPlacements(count: number): OfficePlacement[] {
    const basePlacements: OfficePlacement[] = [
        { left: 86, top: 98, rotation: -6, phase: 0 },
        { left: OFFICE_ROOM_WIDTH - 114, top: 98, rotation: 6, phase: 0.18 },
        { left: 86, top: 174, rotation: -4, phase: 0.3 },
        { left: OFFICE_ROOM_WIDTH - 114, top: 174, rotation: 4, phase: 0.45 },
        { left: OFFICE_ROOM_WIDTH / 2 - 48, top: OFFICE_ROOM_HEIGHT - 80, rotation: 0, phase: 0.58 },
        { left: OFFICE_ROOM_WIDTH / 2 + 50, top: OFFICE_ROOM_HEIGHT - 80, rotation: 0, phase: 0.72 },
    ];

    if (count <= basePlacements.length) {
        return basePlacements.slice(0, count);
    }

    const placements = [...basePlacements];

    for (let index = basePlacements.length; index < count; index++) {
        const extraIndex = index - basePlacements.length;
        placements.push({
            left: 74 + (extraIndex % 3) * 98,
            top: OFFICE_ROOM_HEIGHT - 130 - Math.floor(extraIndex / 3) * 52,
            rotation: (extraIndex % 2 === 0 ? -1 : 1) * 3,
            phase: 0.18 * index,
        });
    }

    return placements;
}

/**
 * Create circular meeting placements around a shared table.
 *
 * @param count - Number of placements needed.
 * @returns Deterministic meeting positions.
 */
function createMeetingPlacements(count: number): OfficePlacement[] {
    const safeCount = Math.max(1, count);

    return Array.from({ length: safeCount }, (_, index) => {
        const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / Math.max(safeCount, 4);
        return {
            left: OFFICE_ROOM_WIDTH / 2 + Math.cos(angle) * 78,
            top: 136 + Math.sin(angle) * 46,
            rotation: Math.cos(angle) * 10,
            phase: 0.14 * index,
        };
    });
}

/**
 * Create corridor placements for moving agents shared across the office.
 *
 * @param count - Number of moving agents to place.
 * @param worldWidth - Current office world width.
 * @param corridorTop - Corridor top position.
 * @returns Deterministic corridor positions.
 */
function createCorridorPlacements(count: number, worldWidth: number, corridorTop: number): OfficePlacement[] {
    if (count === 0) {
        return [];
    }

    const usableWidth = Math.max(120, worldWidth - OFFICE_WORLD_PADDING_X * 2);
    const step = count === 1 ? 0 : usableWidth / (count - 1);

    return Array.from({ length: count }, (_, index) => ({
        left: count === 1 ? worldWidth / 2 : OFFICE_WORLD_PADDING_X + step * index,
        top: corridorTop + 48 + (index % 2) * 48,
        rotation: index % 2 === 0 ? -4 : 4,
        phase: 0.22 * index,
    }));
}

/**
 * Build one room-aware office agent model from existing agent metadata.
 *
 * @param agent - Agent to model.
 * @param roomId - Derived room identifier.
 * @param roomLabel - Derived room label.
 * @param publicUrl - Local server URL for resolving asset URLs.
 * @param isRemote - Whether the agent is federated.
 * @returns Office agent model without final placement.
 */
function createOfficeAgentModel(
    agent: AgentWithVisibility,
    roomId: string,
    roomLabel: string,
    publicUrl: string_url,
    isRemote: boolean,
): Omit<OfficeAgentModel, 'placement'> {
    const identifier = agent.permanentId || agent.agentName;
    const displayName = agent.meta.fullname || agent.agentName || 'Agent';
    const activity = deriveOfficeActivity(agent);

    return {
        id: `${roomId}:${identifier}`,
        identifier,
        displayName,
        summary: createAgentSummary(agent),
        previewText: createPreviewText(agent, activity),
        activity,
        activityLabel: OFFICE_ACTIVITY_META[activity].label,
        avatarUrl: resolveAgentAvatarImageUrl({
            agent,
            baseUrl: (agent.serverUrl || publicUrl) as string_url,
        }),
        initials: createInitials(displayName),
        tone: createOfficeTone(agent.meta.color, `${roomId}:${identifier}`),
        roomId,
        roomLabel,
        isRemote,
        profileHref: createAgentActionHref(identifier, agent.serverUrl),
        messageHref: createAgentActionHref(identifier, agent.serverUrl, '/chat'),
        bookHref: createAgentActionHref(identifier, agent.serverUrl, '/book'),
        capabilityBadges: agent.capabilities
            .map((capability) => capability.label)
            .filter(Boolean)
            .slice(0, OFFICE_MAX_CAPABILITY_BADGES),
    };
}

/**
 * Build the office scene from local folders plus local/federated agents.
 *
 * @param options - Raw scene inputs.
 * @returns Fully placed office scene.
 */
function buildOfficeScene(options: {
    agents: ReadonlyArray<AgentWithVisibility>;
    federatedAgents: ReadonlyArray<AgentWithVisibility>;
    folders: ReadonlyArray<AgentOrganizationFolder>;
    publicUrl: string_url;
}): OfficeScene {
    const { agents, federatedAgents, folders, publicUrl } = options;
    const { folderById } = buildFolderMaps([...folders]);
    const roomDrafts = new Map<
        string,
        {
            id: string;
            label: string;
            subtitle: string;
            kind: 'LOCAL' | 'REMOTE' | 'ROOT';
            tone: OfficeTone;
            agents: Array<Omit<OfficeAgentModel, 'placement'>>;
        }
    >();

    /**
     * Ensure a room draft exists and then append one agent into it.
     *
     * @param draftId - Stable room identifier.
     * @param draftLabel - Visible room label.
     * @param draftSubtitle - Short room helper text.
     * @param draftKind - Room kind.
     * @param toneSource - Optional tone source.
     * @param officeAgent - Agent to append.
     */
    const appendToRoom = (
        draftId: string,
        draftLabel: string,
        draftSubtitle: string,
        draftKind: 'LOCAL' | 'REMOTE' | 'ROOT',
        toneSource: string | undefined,
        officeAgent: Omit<OfficeAgentModel, 'placement'>,
    ) => {
        if (!roomDrafts.has(draftId)) {
            roomDrafts.set(draftId, {
                id: draftId,
                label: draftLabel,
                subtitle: draftSubtitle,
                kind: draftKind,
                tone: createOfficeTone(toneSource, draftId),
                agents: [],
            });
        }

        roomDrafts.get(draftId)!.agents.push(officeAgent);
    };

    const sortedLocalAgents = [...agents].sort((left, right) =>
        (left.meta.fullname || left.agentName).localeCompare(right.meta.fullname || right.agentName),
    );
    const sortedFederatedAgents = [...federatedAgents].sort((left, right) =>
        `${left.serverUrl || ''}:${left.meta.fullname || left.agentName}`.localeCompare(
            `${right.serverUrl || ''}:${right.meta.fullname || right.agentName}`,
        ),
    );

    for (const agent of sortedLocalAgents) {
        const topLevelFolder = resolveTopLevelFolder(folderById, agent.folderId ?? null);
        const roomId = topLevelFolder ? `folder:${topLevelFolder.id}` : 'room:root';
        const roomLabel = topLevelFolder?.name || OFFICE_ROOT_ROOM_LABEL;
        const roomKind = topLevelFolder ? 'LOCAL' : 'ROOT';

        appendToRoom(
            roomId,
            roomLabel,
            topLevelFolder ? 'Folder room' : 'Shared desks',
            roomKind,
            topLevelFolder?.color || agent.meta.color,
            createOfficeAgentModel(agent, roomId, roomLabel, publicUrl, false),
        );
    }

    for (const agent of sortedFederatedAgents) {
        const normalizedServerUrl = (agent.serverUrl || '').replace(/\/+$/g, '');
        const serverLabel = toServerLabel(normalizedServerUrl || 'remote');
        const roomId = `remote:${normalizedServerUrl || serverLabel}`;

        appendToRoom(
            roomId,
            serverLabel,
            'Remote colleagues',
            'REMOTE',
            agent.meta.color,
            createOfficeAgentModel(agent, roomId, serverLabel, publicUrl, true),
        );
    }

    const importantHeadOfficeNames = new Set(['adam', 'teacher']);
    for (const draft of roomDrafts.values()) {
        if (draft.kind !== 'REMOTE') {
            continue;
        }

        if (
            draft.agents.some(
                (agent) =>
                    importantHeadOfficeNames.has(agent.displayName.toLowerCase()) ||
                    importantHeadOfficeNames.has(agent.identifier.toLowerCase()),
            )
        ) {
            draft.label = 'Head Office';
        }
    }

    const orderedRooms = [...roomDrafts.values()].sort((left, right) => {
        const leftOrder = left.kind === 'ROOT' ? 0 : left.kind === 'LOCAL' ? 1 : 2;
        const rightOrder = right.kind === 'ROOT' ? 0 : right.kind === 'LOCAL' ? 1 : 2;

        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }

        return left.label.localeCompare(right.label);
    });

    const topRowCount = Math.max(1, Math.ceil(orderedRooms.length / 2));
    const bottomRowCount = Math.max(0, orderedRooms.length - topRowCount);
    const widestRowCount = Math.max(topRowCount, bottomRowCount, 1);
    const worldWidth =
        OFFICE_WORLD_PADDING_X * 2 + widestRowCount * OFFICE_ROOM_WIDTH + Math.max(0, widestRowCount - 1) * OFFICE_ROOM_GAP_X;
    const corridorTop = OFFICE_WORLD_PADDING_Y + OFFICE_ROOM_HEIGHT + OFFICE_ROW_GAP_Y;
    const bottomRowTop = corridorTop + OFFICE_CORRIDOR_HEIGHT + OFFICE_ROW_GAP_Y;
    const worldHeight = bottomRowTop + OFFICE_ROOM_HEIGHT + OFFICE_WORLD_PADDING_Y;
    const sceneCounts: Record<OfficeActivity, number> = {
        IDLE: 0,
        WORKING: 0,
        MEETING: 0,
        MOVING: 0,
    };
    const corridorDrafts: Array<Omit<OfficeAgentModel, 'placement'>> = [];

    const rooms = orderedRooms.map((draft, index) => {
        const isTopRow = index < topRowCount;
        const rowCount = isTopRow ? topRowCount : bottomRowCount;
        const rowIndex = isTopRow ? index : index - topRowCount;
        const rowWidth = rowCount * OFFICE_ROOM_WIDTH + Math.max(0, rowCount - 1) * OFFICE_ROOM_GAP_X;
        const rowStartX = (worldWidth - rowWidth) / 2;
        const x = rowStartX + rowIndex * (OFFICE_ROOM_WIDTH + OFFICE_ROOM_GAP_X);
        const y = isTopRow ? OFFICE_WORLD_PADDING_Y : bottomRowTop;
        const deskAgents = draft.agents.filter((agent) => agent.activity === 'IDLE' || agent.activity === 'WORKING');
        const meetingAgents = draft.agents.filter((agent) => agent.activity === 'MEETING');

        for (const agent of draft.agents) {
            sceneCounts[agent.activity] += 1;
            if (agent.activity === 'MOVING') {
                corridorDrafts.push(agent);
            }
        }

        const deskPlacements = createDeskPlacements(deskAgents.length);
        const meetingPlacements = createMeetingPlacements(meetingAgents.length);

        return {
            id: draft.id,
            label: draft.label,
            subtitle: draft.subtitle,
            kind: draft.kind,
            tone: draft.tone,
            x,
            y,
            width: OFFICE_ROOM_WIDTH,
            height: OFFICE_ROOM_HEIGHT,
            centerX: x + OFFICE_ROOM_WIDTH / 2,
            centerY: y + OFFICE_ROOM_HEIGHT / 2,
            deskAgents: deskAgents.map((agent, deskIndex) => ({
                ...agent,
                placement: deskPlacements[deskIndex]!,
            })),
            meetingAgents: meetingAgents.map((agent, meetingIndex) => ({
                ...agent,
                placement: meetingPlacements[meetingIndex]!,
            })),
            deskGhosts: createDeskPlacements(Math.max(4, deskAgents.length)),
        } satisfies OfficeRoomModel;
    });

    const corridorPlacements = createCorridorPlacements(corridorDrafts.length, worldWidth, corridorTop);
    const corridorAgents = corridorDrafts.map((agent, index) => ({
        ...agent,
        placement: corridorPlacements[index]!,
    }));

    return {
        rooms,
        corridorAgents,
        width: worldWidth,
        height: worldHeight,
        counts: sceneCounts,
    };
}

/**
 * Render the Office homepage view with rooms, desks, meetings, and moving agents.
 */
export function AgentsOffice({ agents, federatedAgents, federatedServersStatus, folders, publicUrl }: AgentsOfficeProps) {
    const router = useRouter();
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const panStateRef = useRef<OfficePanState | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [camera, setCamera] = useState<OfficeCamera>({ x: 0, y: 0, zoom: 1 });
    const [resizeRevision, setResizeRevision] = useState<number>(0);
    const [isPanning, setIsPanning] = useState<boolean>(false);

    const scene = useMemo(
        () =>
            buildOfficeScene({
                agents,
                federatedAgents,
                folders,
                publicUrl,
            }),
        [agents, federatedAgents, folders, publicUrl],
    );

    const remoteStatusSummary = useMemo(() => {
        return Object.values(federatedServersStatus).reduce(
            (summary, status) => {
                summary[status.status] += 1;
                return summary;
            },
            { loading: 0, success: 0, error: 0 },
        );
    }, [federatedServersStatus]);

    const roomOptions = useMemo(
        () =>
            scene.rooms.map((room) => ({
                id: room.id,
                label: room.kind === 'REMOTE' ? `${room.label} · Remote` : room.label,
            })),
        [scene.rooms],
    );

    /**
     * Create a camera that fits the full office into the current viewport.
     *
     * @returns Fitted camera.
     */
    const createFittedCamera = useCallback((): OfficeCamera => {
        const viewportWidth = viewportRef.current?.clientWidth || scene.width;
        const viewportHeight = viewportRef.current?.clientHeight || scene.height;
        const padding = 48;
        const zoom = clamp(
            Math.min(
                (viewportWidth - padding * 2) / scene.width,
                (viewportHeight - padding * 2) / scene.height,
                1,
            ),
            OFFICE_MIN_ZOOM,
            1,
        );

        return {
            x: (viewportWidth - scene.width * zoom) / 2,
            y: (viewportHeight - scene.height * zoom) / 2,
            zoom,
        };
    }, [scene.height, scene.width]);

    /**
     * Create a room-focused camera for one selected room.
     *
     * @param roomId - Room to focus.
     * @returns Focused camera.
     */
    const createRoomCamera = useCallback((roomId: string): OfficeCamera => {
        const room = scene.rooms.find((candidate) => candidate.id === roomId);
        if (!room) {
            return createFittedCamera();
        }

        const viewportWidth = viewportRef.current?.clientWidth || scene.width;
        const viewportHeight = viewportRef.current?.clientHeight || scene.height;
        const fittedCamera = createFittedCamera();
        const zoom = clamp(Math.max(fittedCamera.zoom * 1.34, 0.92), fittedCamera.zoom, OFFICE_MAX_ZOOM);

        return {
            x: viewportWidth / 2 - room.centerX * zoom,
            y: viewportHeight / 2 - room.centerY * zoom,
            zoom,
        };
    }, [createFittedCamera, scene.height, scene.rooms, scene.width]);

    /**
     * Apply one zoom change while keeping an optional focus point visually stable.
     *
     * @param nextZoom - Requested next zoom.
     * @param focusX - Focus point X within the viewport.
     * @param focusY - Focus point Y within the viewport.
     */
    function applyZoom(nextZoom: number, focusX?: number, focusY?: number): void {
        const clampedZoom = clamp(nextZoom, OFFICE_MIN_ZOOM, OFFICE_MAX_ZOOM);

        setCamera((previousCamera) => {
            if (focusX === undefined || focusY === undefined) {
                const viewportWidth = viewportRef.current?.clientWidth || 0;
                const viewportHeight = viewportRef.current?.clientHeight || 0;
                focusX = viewportWidth / 2;
                focusY = viewportHeight / 2;
            }

            const worldFocusX = (focusX - previousCamera.x) / previousCamera.zoom;
            const worldFocusY = (focusY - previousCamera.y) / previousCamera.zoom;

            return {
                x: focusX - worldFocusX * clampedZoom,
                y: focusY - worldFocusY * clampedZoom,
                zoom: clampedZoom,
            };
        });
    }

    useEffect(() => {
        const handleResize = () => setResizeRevision((previousRevision) => previousRevision + 1);

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        setCamera(selectedRoomId ? createRoomCamera(selectedRoomId) : createFittedCamera());
    }, [createFittedCamera, createRoomCamera, resizeRevision, scene.height, scene.width, selectedRoomId]);

    /**
     * Restore the full fitted overview.
     */
    const handleAutoArrange = () => {
        setSelectedRoomId('');
        setCamera(createFittedCamera());
    };

    /**
     * Restore the current room focus or the full overview.
     */
    const handleResetView = () => {
        setCamera(selectedRoomId ? createRoomCamera(selectedRoomId) : createFittedCamera());
    };

    /**
     * Focus the currently selected room if one is chosen.
     */
    const handleFocusSelectedRoom = () => {
        if (!selectedRoomId) {
            return;
        }

        setCamera(createRoomCamera(selectedRoomId));
    };

    /**
     * Start a pointer-driven pan interaction.
     *
     * @param event - Pointer down event from the viewport.
     */
    const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }

        if ((event.target as HTMLElement).closest('[data-office-interactive="true"]')) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        panStateRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            camera,
        };
        setIsPanning(true);
    };

    /**
     * Continue a pointer-driven pan interaction.
     *
     * @param event - Pointer move event from the viewport.
     */
    const handleViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const panState = panStateRef.current;

        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        setCamera({
            x: panState.camera.x + (event.clientX - panState.startClientX),
            y: panState.camera.y + (event.clientY - panState.startClientY),
            zoom: panState.camera.zoom,
        });
    };

    /**
     * Finish a pan interaction and clear pointer capture state.
     *
     * @param pointerId - Pointer identifier being released.
     */
    const finishPanInteraction = (pointerId: number) => {
        if (panStateRef.current?.pointerId !== pointerId) {
            return;
        }

        panStateRef.current = null;
        setIsPanning(false);
    };

    /**
     * Zoom the office scene with the mouse wheel around the cursor.
     *
     * @param event - Wheel event from the viewport.
     */
    const handleViewportWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const viewportRect = event.currentTarget.getBoundingClientRect();
        const focusX = event.clientX - viewportRect.left;
        const focusY = event.clientY - viewportRect.top;
        const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;

        applyZoom(camera.zoom * zoomFactor, focusX, focusY);
    };

    /**
     * Open one local or remote office quick action.
     *
     * @param href - Target route or absolute URL.
     * @param openInNewTab - Whether the action should open a new tab.
     */
    const openAction = (href: string, openInNewTab: boolean) => {
        if (openInNewTab) {
            window.open(href, '_blank', 'noopener');
            return;
        }

        router.push(href);
    };

    /**
     * Render one office agent positioned either in a room or in the corridor.
     *
     * @param agent - Agent to render.
     * @param isCorridorAgent - Whether the agent is placed in the shared corridor.
     * @returns Agent button JSX.
     */
    const renderAgent = (agent: OfficeAgentModel, isCorridorAgent: boolean) => {
        const activityClassName =
            agent.activity === 'WORKING'
                ? styles.agentWorking
                : agent.activity === 'MEETING'
                ? styles.agentMeeting
                : agent.activity === 'MOVING'
                ? styles.agentMoving
                : styles.agentIdle;
        const agentStyle = {
            left: `${agent.placement.left}px`,
            top: `${agent.placement.top}px`,
            '--agent-accent': agent.tone.accent,
            '--agent-accent-soft': agent.tone.accentSoft,
            '--agent-accent-muted': agent.tone.accentMuted,
            '--agent-desk': agent.tone.desk,
            '--agent-shadow': agent.tone.shadow,
            '--agent-badge': agent.tone.badge,
            '--agent-rotation': `${agent.placement.rotation}deg`,
            '--agent-phase': `${agent.placement.phase}s`,
        } as CSSProperties;

        return (
            <button
                key={agent.id}
                type="button"
                data-office-interactive="true"
                className={`${styles.agentButton} ${activityClassName} ${isCorridorAgent ? styles.corridorAgent : ''} ${
                    agent.isRemote ? styles.remoteAgent : ''
                }`}
                style={agentStyle}
                onPointerDown={(event) => {
                    event.stopPropagation();
                }}
                onClick={() => openAction(agent.profileHref, agent.isRemote)}
                title={`${agent.displayName} • ${agent.activityLabel}`}
            >
                <div className={styles.agentMotion}>
                    <div className={styles.stationDesk}>
                        <div className={styles.stationChair} />
                        <div className={styles.stationSurface}>
                            <div className={styles.stationScreen}>
                                <span>{agent.previewText}</span>
                            </div>
                            <div className={styles.stationBadgeRow}>
                                {agent.capabilityBadges.length > 0 ? (
                                    agent.capabilityBadges.map((badge) => (
                                        <span key={`${agent.id}:${badge}`} className={styles.stationBadge}>
                                            {shortenText(badge, 12)}
                                        </span>
                                    ))
                                ) : (
                                    <span className={styles.stationBadge}>Ready</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.meetingNote}>{agent.previewText}</div>
                    <div className={styles.corridorBubble}>{agent.previewText}</div>

                    <div className={styles.agentFigure}>
                        <div className={styles.agentShadow} />
                        <div className={styles.agentAvatar}>
                            <span className={styles.agentInitials}>{agent.initials}</span>
                            {agent.avatarUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={agent.avatarUrl}
                                    alt={agent.displayName}
                                    className={styles.agentAvatarImage}
                                    onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                    }}
                                />
                            )}
                            <span className={styles.presenceDot} />
                        </div>
                        <div className={styles.agentNameplate}>
                            <span>{shortenText(agent.displayName, 18)}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.agentTooltip} data-office-interactive="true">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-slate-900">{agent.displayName}</div>
                            <div className="mt-1 text-xs text-slate-600">{agent.summary}</div>
                        </div>
                        {agent.isRemote && (
                            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                                Remote
                            </span>
                        )}
                    </div>

                    <div className={styles.tooltipMetaRow}>
                        <span>{agent.activityLabel}</span>
                        <span>{agent.roomLabel}</span>
                    </div>

                    <div className={styles.tooltipActions}>
                        <button
                            type="button"
                            className={styles.tooltipAction}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                openAction(agent.profileHref, agent.isRemote);
                            }}
                        >
                            <Building2 className="h-3.5 w-3.5" />
                            Profile
                        </button>
                        <button
                            type="button"
                            className={styles.tooltipAction}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                openAction(agent.messageHref, agent.isRemote);
                            }}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Message
                        </button>
                        <button
                            type="button"
                            className={styles.tooltipAction}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                openAction(agent.bookHref, agent.isRemote);
                            }}
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Book
                        </button>
                    </div>
                </div>
            </button>
        );
    };

    if (scene.rooms.length === 0 && scene.corridorAgents.length === 0) {
        return <div className="py-12 text-center text-sm text-slate-500">No agents available for the office view.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Office</span>
                            {remoteStatusSummary.success > 0 && (
                                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-700">
                                    {remoteStatusSummary.success} remote room{remoteStatusSummary.success === 1 ? '' : 's'}
                                </span>
                            )}
                            {remoteStatusSummary.loading > 0 && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                                    {remoteStatusSummary.loading} remote server{remoteStatusSummary.loading === 1 ? '' : 's'} loading
                                </span>
                            )}
                            {remoteStatusSummary.error > 0 && (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                                    {remoteStatusSummary.error} remote error{remoteStatusSummary.error === 1 ? '' : 's'}
                                </span>
                            )}
                        </div>
                        <p className="max-w-3xl text-sm text-slate-600">
                            Activities in this first iteration are inferred from folders, capabilities, and federation metadata rather than
                            from live runtime state.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2" data-office-interactive="true">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-white hover:text-slate-900"
                                onClick={() => applyZoom(camera.zoom / 1.12)}
                                title="Zoom out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-white hover:text-slate-900"
                                onClick={() => applyZoom(camera.zoom * 1.12)}
                                title="Zoom in"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            type="button"
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                            onClick={handleResetView}
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                            onClick={handleAutoArrange}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Auto-arrange
                        </button>

                        <select
                            value={selectedRoomId}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            onChange={(event) => setSelectedRoomId(event.target.value)}
                        >
                            <option value="">All rooms</option>
                            {roomOptions.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.label}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            disabled={!selectedRoomId}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                selectedRoomId
                                    ? 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    : 'cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300'
                            }`}
                            onClick={handleFocusSelectedRoom}
                        >
                            <Search className="h-4 w-4" />
                            Focus room
                        </button>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {(['WORKING', 'MEETING', 'MOVING', 'IDLE'] as const).map((activity) => (
                        <div
                            key={activity}
                            className={`rounded-2xl border px-4 py-3 ${OFFICE_ACTIVITY_META[activity].cardClassName}`}
                        >
                            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
                                {OFFICE_ACTIVITY_META[activity].label}
                            </div>
                            <div className="mt-2 text-2xl font-semibold">{scene.counts[activity]}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                ref={viewportRef}
                className={`${styles.viewport} ${isPanning ? styles.viewportPanning : ''}`}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={(event) => finishPanInteraction(event.pointerId)}
                onPointerCancel={(event) => finishPanInteraction(event.pointerId)}
                onLostPointerCapture={(event) => finishPanInteraction(event.pointerId)}
                onWheel={handleViewportWheel}
            >
                <div
                    className={styles.world}
                    style={{
                        width: `${scene.width}px`,
                        height: `${scene.height}px`,
                        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                    }}
                >
                    <div className={styles.ambientGlowPrimary} />
                    <div className={styles.ambientGlowSecondary} />

                    <div
                        className={styles.corridor}
                        style={{
                            top: `${OFFICE_WORLD_PADDING_Y + OFFICE_ROOM_HEIGHT + OFFICE_ROW_GAP_Y}px`,
                            height: `${OFFICE_CORRIDOR_HEIGHT}px`,
                        }}
                    >
                        <div className={styles.corridorLane} />
                        <div className={styles.corridorLane} />
                        <div className={styles.corridorDivider} />
                    </div>

                    {scene.rooms.map((room) => {
                        const roomStyle = {
                            left: `${room.x}px`,
                            top: `${room.y}px`,
                            width: `${room.width}px`,
                            height: `${room.height}px`,
                            '--room-accent': room.tone.accent,
                            '--room-accent-soft': room.tone.accentSoft,
                            '--room-accent-muted': room.tone.accentMuted,
                            '--room-surface': room.tone.surface,
                            '--room-wall': room.tone.wall,
                            '--room-shadow': room.tone.shadow,
                            '--room-desk': room.tone.desk,
                        } as CSSProperties;

                        return (
                            <div
                                key={room.id}
                                className={`${styles.room} ${selectedRoomId === room.id ? styles.roomSelected : ''}`}
                                style={roomStyle}
                            >
                                <div className={styles.roomTopWall} />
                                <div className={styles.roomSideWall} />
                                <div className={styles.roomFloor}>
                                    <button
                                        type="button"
                                        data-office-interactive="true"
                                        className={styles.roomFocusButton}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={() => {
                                            setSelectedRoomId(room.id);
                                            setCamera(createRoomCamera(room.id));
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            {room.kind === 'REMOTE' ? (
                                                <Globe2 className="h-4 w-4 text-cyan-700" />
                                            ) : room.kind === 'ROOT' ? (
                                                <Building2 className="h-4 w-4 text-slate-700" />
                                            ) : (
                                                <Users className="h-4 w-4 text-emerald-700" />
                                            )}
                                            <span>{room.label}</span>
                                        </div>
                                        <span className={styles.roomBadge}>
                                            {room.deskAgents.length + room.meetingAgents.length} colleague
                                            {room.deskAgents.length + room.meetingAgents.length === 1 ? '' : 's'}
                                        </span>
                                    </button>

                                    <div className={styles.roomSubtitle}>{room.subtitle}</div>
                                    <div className={styles.roomWhiteboard} />
                                    <div className={styles.roomPlant} />
                                    <div className={styles.roomPlantSecondary} />

                                    {room.deskGhosts.map((deskGhost, index) => (
                                        <div
                                            key={`${room.id}:desk-ghost:${index}`}
                                            className={styles.deskGhost}
                                            style={{
                                                left: `${deskGhost.left}px`,
                                                top: `${deskGhost.top}px`,
                                                transform: `translate(-50%, -50%) rotate(${deskGhost.rotation}deg)`,
                                            }}
                                        />
                                    ))}

                                    {room.meetingAgents.length > 0 && (
                                        <div className={styles.meetingTable}>
                                            <div className={styles.meetingTableShadow} />
                                            <div className={styles.meetingTableTop} />
                                        </div>
                                    )}

                                    {room.deskAgents.map((agent) => renderAgent(agent, false))}
                                    {room.meetingAgents.map((agent) => renderAgent(agent, false))}
                                </div>
                            </div>
                        );
                    })}

                    {scene.corridorAgents.map((agent) => renderAgent(agent, true))}
                </div>
            </div>
        </div>
    );
}
