/**
 * Minimum agent profile shape needed to resolve a human-readable chat name.
 *
 * @private type of the canonical agent chat
 */
export type AgentChatDisplayNameSource = {
    readonly agentName?: string | null;
    readonly meta?: {
        readonly fullname?: string | null;
    } | null;
};

/**
 * Resolves the display name shared across the chat title, participants, and fallback copy.
 *
 * @param agent - Loaded agent profile, when available.
 * @param fallbackDisplayName - Human-readable title resolved before the profile loads.
 * @returns Display name that never needs the opaque route identifier as a fallback.
 *
 * @private function of the canonical agent chat
 */
export function resolveAgentChatDisplayName(
    agent: AgentChatDisplayNameSource | null | undefined,
    fallbackDisplayName: string,
): string {
    return agent?.meta?.fullname || fallbackDisplayName || agent?.agentName || 'Agent';
}
