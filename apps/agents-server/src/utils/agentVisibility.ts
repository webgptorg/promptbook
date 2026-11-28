import {
    AGENT_VISIBILITY_VALUES,
    DEFAULT_AGENT_VISIBILITY,
    getNextAgentVisibility,
    isAgentVisibility,
    isPublicAgentVisibility,
    normalizeAgentVisibility,
    parseAgentVisibility,
    parseAgentSourceVisibility,
    setAgentSourceVisibility,
    type AgentVisibility,
} from '../../../../src/book-2.0/agent-source/agentSourceVisibility';

/**
 * Supported visibility states for Agents Server agents.
 */
export { AGENT_VISIBILITY_VALUES };

/**
 * Canonical visibility union for agents.
 */
export type { AgentVisibility };

/**
 * Shared select options for agent-visibility pickers.
 */
export const AGENT_VISIBILITY_OPTIONS: ReadonlyArray<{
    readonly value: AgentVisibility;
    readonly label: string;
}> = [
    {
        value: 'PRIVATE',
        label: 'Private',
    },
    {
        value: 'UNLISTED',
        label: 'Unlisted',
    },
    {
        value: 'PUBLIC',
        label: 'Public',
    },
] as const;

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
export {
    DEFAULT_AGENT_VISIBILITY,
    getNextAgentVisibility,
    isAgentVisibility,
    isPublicAgentVisibility,
    normalizeAgentVisibility,
    parseAgentVisibility,
    parseAgentSourceVisibility,
    setAgentSourceVisibility,
};
