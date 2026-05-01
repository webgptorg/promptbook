/**
 * Metadata key that controls which "new agent" creation experience is shown.
 */
export const NEW_AGENT_WIZZARD_METADATA_KEY = 'NEW_AGENT_WIZZARD' as const;

/**
 * Supported new-agent creation experiences.
 */
export const NEW_AGENT_WIZZARD_VALUES = ['BOILERPLATE', 'WIZARD'] as const;

/**
 * Canonical union of supported new-agent creation experiences.
 */
export type NewAgentWizardMode = (typeof NEW_AGENT_WIZZARD_VALUES)[number];

/**
 * Shared select options for the new-agent experience metadata.
 */
export const NEW_AGENT_WIZZARD_OPTIONS: ReadonlyArray<{
    readonly value: NewAgentWizardMode;
    readonly label: string;
}> = [
    {
        value: 'BOILERPLATE',
        label: 'Boilerplate',
    },
    {
        value: 'WIZARD',
        label: 'Wizard',
    },
] as const;

/**
 * Default creation experience used when metadata is missing or invalid.
 */
export const DEFAULT_NEW_AGENT_WIZZARD_MODE: NewAgentWizardMode = 'BOILERPLATE';

/**
 * Returns whether the provided value is a supported new-agent creation experience.
 *
 * @param value - Raw metadata value.
 * @returns `true` when the value matches a supported mode.
 */
export function isNewAgentWizardMode(value: unknown): value is NewAgentWizardMode {
    return typeof value === 'string' && NEW_AGENT_WIZZARD_VALUES.includes(value as NewAgentWizardMode);
}

/**
 * Parses the configured new-agent creation experience with a safe fallback.
 *
 * @param value - Raw metadata value.
 * @param fallback - Mode used when the value is missing or invalid.
 * @returns Parsed creation experience.
 */
export function parseNewAgentWizardMode(
    value: unknown,
    fallback: NewAgentWizardMode = DEFAULT_NEW_AGENT_WIZZARD_MODE,
): NewAgentWizardMode {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toUpperCase();
    return isNewAgentWizardMode(normalized) ? normalized : fallback;
}
