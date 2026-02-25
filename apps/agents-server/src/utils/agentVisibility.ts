/**
 * Supported visibility states for Agents Server agents.
 */
export const AGENT_VISIBILITY_VALUES = ['PRIVATE', 'UNLISTED', 'PUBLIC'] as const;

/**
 * Canonical visibility union for agents.
 */
export type AgentVisibility = (typeof AGENT_VISIBILITY_VALUES)[number];

/**
 * Metadata key used to configure default visibility for newly created agents.
 */
export const DEFAULT_VISIBILITY_METADATA_KEY = 'DEFAULT_VISIBILITY' as const;

/**
 * Legacy metadata key kept for backward compatibility during migration.
 */
export const LEGACY_DEFAULT_VISIBILITY_METADATA_KEY = 'DEFAULT_AGENT_VISIBILITY' as const;

/**
 * Fallback visibility used when metadata is missing or invalid.
 */
export const DEFAULT_AGENT_VISIBILITY: AgentVisibility = 'UNLISTED';

/**
 * Returns `true` when the value is one of supported visibility states.
 *
 * @param value - Raw value to validate.
 * @returns Whether the value is a valid `AgentVisibility`.
 */
export function isAgentVisibility(value: unknown): value is AgentVisibility {
    return typeof value === 'string' && AGENT_VISIBILITY_VALUES.includes(value as AgentVisibility);
}

/**
 * Parses visibility from an unknown value with a safe fallback.
 *
 * @param value - Raw visibility value.
 * @param fallback - Fallback when the value is invalid.
 * @returns Parsed visibility.
 */
export function parseAgentVisibility(
    value: unknown,
    fallback: AgentVisibility = DEFAULT_AGENT_VISIBILITY,
): AgentVisibility {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toUpperCase();
    return isAgentVisibility(normalized) ? normalized : fallback;
}

/**
 * Returns whether an agent should be listed publicly in anonymous views.
 *
 * @param visibility - Agent visibility to evaluate.
 * @returns `true` for publicly listed agents.
 */
export function isPublicAgentVisibility(visibility: AgentVisibility | null | undefined): boolean {
    return visibility === 'PUBLIC';
}

/**
 * Returns the next visibility in UI rotation order.
 *
 * @param visibility - Current visibility.
 * @returns Next visibility value.
 */
export function getNextAgentVisibility(
    visibility: AgentVisibility | null | undefined,
): AgentVisibility {
    switch (visibility) {
        case 'PRIVATE':
            return 'UNLISTED';
        case 'UNLISTED':
            return 'PUBLIC';
        case 'PUBLIC':
        default:
            return 'PRIVATE';
    }
}
