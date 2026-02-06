/**
 * Normalized singular/plural naming configuration for agents.
 */
export type AgentNaming = {
    /**
     * Singular agent label, lowercased for consistent casing.
     */
    readonly singular: string;
    /**
     * Plural agent label, lowercased for consistent casing.
     */
    readonly plural: string;
};

/**
 * Default agent naming configuration.
 */
export const DEFAULT_AGENT_NAMING: AgentNaming = {
    singular: 'agent',
    plural: 'agents',
};

/**
 * Parses AGENT_NAMING metadata into a normalized naming configuration.
 *
 * @param raw - Raw AGENT_NAMING metadata value.
 * @returns Normalized singular/plural naming configuration.
 */
export function parseAgentNaming(raw: string | null | undefined): AgentNaming {
    if (!raw) {
        return DEFAULT_AGENT_NAMING;
    }

    const [singularRaw, pluralRaw] = raw.split('/');
    const singular = singularRaw?.trim();
    const plural = pluralRaw?.trim();

    if (!singular || !plural) {
        return DEFAULT_AGENT_NAMING;
    }

    return {
        singular: singular.toLowerCase(),
        plural: plural.toLowerCase(),
    };
}

/**
 * Formats a replacement string to match the casing of the source word.
 *
 * @param source - Source word matched in the text.
 * @param replacement - Replacement text to apply.
 * @returns Replacement text with casing aligned to the source.
 */
function formatReplacementCase(source: string, replacement: string): string {
    const lowerReplacement = replacement.toLowerCase();

    if (source.toUpperCase() === source) {
        return lowerReplacement.toUpperCase();
    }

    const isTitleCase = source[0] === source[0]?.toUpperCase() && source.slice(1) === source.slice(1).toLowerCase();
    if (isTitleCase) {
        return lowerReplacement[0]?.toUpperCase() + lowerReplacement.slice(1);
    }

    return lowerReplacement;
}

/**
 * Replaces occurrences of "agent" and "agents" in a UI string using custom naming.
 *
 * @param text - Text to transform.
 * @param naming - Naming configuration to apply.
 * @returns Updated text with agent naming replacements.
 */
export function formatAgentNamingText(text: string, naming: AgentNaming): string {
    const replacePlural = (match: string) => formatReplacementCase(match, naming.plural);
    const replaceSingular = (match: string) => formatReplacementCase(match, naming.singular);

    return text.replace(/\bagents\b/gi, replacePlural).replace(/\bagent\b/gi, replaceSingular);
}
