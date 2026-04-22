import { buildFreshAgentChatHrefFromAgentUrl } from '../../utils/agentRouting/agentRouteHrefs';
import type { AgentWithVisibility } from './useFederatedAgents';

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
 * Returns a deterministic fallback palette color by index.
 *
 * @param index - Index to map onto the fallback palette.
 * @returns Resolved fallback room color.
 *
 * @private function of buildOfficeLayout
 */
export function pickPaletteColor(index: number): string {
    return ROOM_COLOR_PALETTE[index % ROOM_COLOR_PALETTE.length] || ROOM_COLOR_PALETTE[0] || '#2563eb';
}

/**
 * Normalizes a possibly-missing base URL into a slash-terminated string.
 *
 * @param value - URL-like value to normalize.
 * @returns Normalized slash-terminated URL.
 *
 * @private function of buildOfficeLayout
 */
export function normalizeBaseUrl(value: string): string {
    if (!value) {
        return '';
    }

    return value.endsWith('/') ? value : `${value}/`;
}

/**
 * Builds a stable identifier for one agent.
 *
 * @param agent - Agent to identify.
 * @returns Stable local/federated agent identifier.
 *
 * @private function of buildOfficeLayout
 */
export function getAgentIdentifier(agent: AgentWithVisibility): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Resolves a readable hostname label from a server URL.
 *
 * @param serverUrl - Optional server URL.
 * @returns Hostname label or null for local agents.
 *
 * @private function of buildOfficeLayout
 */
export function resolveServerLabel(serverUrl: string | undefined): string | null {
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
 * Returns true when the agent originates from a federated server.
 *
 * @param agent - Agent to inspect.
 * @returns True for remote colleagues.
 *
 * @private function of buildOfficeLayout
 */
export function isRemoteAgent(agent: AgentWithVisibility): boolean {
    return typeof agent.serverUrl === 'string' && agent.serverUrl.trim().length > 0;
}

/**
 * Returns true when the agent exposes a TEAM capability.
 *
 * @param agent - Agent to inspect.
 * @returns True when the agent references teammates.
 *
 * @private function of buildOfficeLayout
 */
export function hasTeamCapability(agent: AgentWithVisibility): boolean {
    return agent.capabilities.some((capability) => capability.type === 'team');
}

/**
 * Returns true when the agent has capabilities associated with active desk work.
 *
 * @param agent - Agent to inspect.
 * @returns True when the agent likely shows a live desk preview.
 *
 * @private function of buildOfficeLayout
 */
export function hasWorkingCapability(agent: AgentWithVisibility): boolean {
    return agent.capabilities.some((capability) => WORKING_CAPABILITY_TYPES.has(capability.type));
}

/**
 * Returns true when the capability type implies active desk work.
 *
 * @param capabilityType - Capability type to inspect.
 * @returns True when the type should surface as desk activity.
 *
 * @private function of buildOfficeLayout
 */
export function isWorkingCapabilityType(capabilityType: string): boolean {
    return WORKING_CAPABILITY_TYPES.has(capabilityType);
}

/**
 * Detects whether a federated server should be rendered as the head office.
 *
 * @param serverLabel - Normalized hostname label.
 * @param agents - Agents originating from the server.
 * @returns True when the room should use the head-office visual treatment.
 *
 * @private function of buildOfficeLayout
 */
export function isHeadOfficeServer(serverLabel: string, agents: ReadonlyArray<AgentWithVisibility>): boolean {
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
 * Creates a deterministic numeric seed from a string identifier.
 *
 * @param value - Input string.
 * @returns Positive integer seed.
 *
 * @private function of buildOfficeLayout
 */
export function hashString(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index++) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash;
}

/**
 * Builds one agent-relative path for profile/chat/book navigation.
 *
 * @param agent - Agent to link to.
 * @param publicUrl - Base URL of the current server.
 * @param suffix - Optional agent sub-route suffix.
 * @returns URL path or absolute URL.
 *
 * @private function of buildOfficeLayout
 */
export function buildAgentPath(agent: AgentWithVisibility, publicUrl: string, suffix: '' | '/chat' | '/book'): string {
    const identifier = encodeURIComponent(agent.permanentId || agent.agentName);
    const remoteBase = isRemoteAgent(agent) ? normalizeBaseUrl(agent.serverUrl || publicUrl) : null;

    if (remoteBase) {
        return `${remoteBase}agents/${identifier}${suffix}`;
    }

    return `/agents/${identifier}${suffix}`;
}

/**
 * Builds the generic agent-entry href used by homepage visualizations.
 *
 * @param agent - Agent to link to.
 * @param publicUrl - Base URL of the current server.
 * @returns Relative or absolute href that starts a fresh chat.
 *
 * @private function of buildOfficeLayout
 */
export function buildAgentFreshChatPath(agent: AgentWithVisibility, publicUrl: string): string {
    return buildFreshAgentChatHrefFromAgentUrl(buildAgentPath(agent, publicUrl, ''));
}
