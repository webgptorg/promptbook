/**
 * Utility functions for handling singular and plural forms of commitment types
 *
 * @private
 */

/**
 * Maps singular commitment types to their plural forms
 * Handles irregular plurals and special cases
 */
const SINGULAR_TO_PLURAL_MAP: Record<string, string> = {
    // Regular plurals (add 's')
    'ACTION': 'ACTIONS',
    'DELETE': 'DELETES', // Though DELETE has multiple aliases
    'FORMAT': 'FORMATS',
    'GOAL': 'GOALS',
    'KNOWLEDGE': 'KNOWLEDGES', // Though KNOWLEDGE is typically uncountable
    'MEMORY': 'MEMORIES',
    'MESSAGE': 'MESSAGES',
    'MODEL': 'MODELS',
    'NOTE': 'NOTES',
    'RULE': 'RULES',
    'SAMPLE': 'SAMPLES',
    'SCENARIO': 'SCENARIOS',
    'STYLE': 'STYLES',

    // Irregular plurals
    'PERSONA': 'PERSONAE', // Latin plural

    // Special cases/aliases that already exist
    'EXAMPLE': 'EXAMPLES', // EXAMPLE is alias for SAMPLE

    // Meta commitments
    'META': 'METAS',
    'META_IMAGE': 'META_IMAGES',
    'META_LINK': 'META_LINKS',

    // Future commitments (from NotYetImplementedCommitmentDefinition)
    'EXPECT': 'EXPECTS',
    'BEHAVIOUR': 'BEHAVIOURS',
    'AVOID': 'AVOIDANCE', // Special case - different word
    'CONTEXT': 'CONTEXTS',
};

/**
 * Maps plural commitment types to their singular forms
 */
const PLURAL_TO_SINGULAR_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(SINGULAR_TO_PLURAL_MAP).map(([singular, plural]) => [plural, singular])
);

/**
 * Gets the plural form of a commitment type
 * @param singular The singular commitment type
 * @returns The plural form if known, otherwise adds 'S' as fallback
 */
export function getPluralForm(singular: string): string {
    return SINGULAR_TO_PLURAL_MAP[singular] || `${singular}S`;
}

/**
 * Gets the singular form of a commitment type
 * @param plural The plural commitment type
 * @returns The singular form if known, otherwise removes trailing 'S' as fallback
 */
export function getSingularForm(plural: string): string {
    return PLURAL_TO_SINGULAR_MAP[plural] || (plural.endsWith('S') ? plural.slice(0, -1) : plural);
}

/**
 * Checks if a commitment type is singular
 * @param type The commitment type to check
 * @returns True if the type is singular
 */
export function isSingular(type: string): boolean {
    return type in SINGULAR_TO_PLURAL_MAP;
}

/**
 * Checks if a commitment type is plural
 * @param type The commitment type to check
 * @returns True if the type is plural
 */
export function isPlural(type: string): boolean {
    return type in PLURAL_TO_SINGULAR_MAP;
}

/**
 * Gets the canonical (singular) form of a commitment type
 * This is useful for normalizing commitment types to their base form
 * @param type The commitment type (singular or plural)
 * @returns The canonical singular form
 */
export function getCanonicalForm(type: string): string {
    if (isSingular(type)) {
        return type;
    }
    if (isPlural(type)) {
        return getSingularForm(type);
    }
    // If neither, assume it's already canonical
    return type;
}

/**
 * Gets both singular and plural forms of a commitment type
 * @param type The commitment type (can be singular or plural)
 * @returns Array containing [singular, plural] forms
 */
export function getBothForms(type: string): [string, string] {
    const canonical = getCanonicalForm(type);
    const plural = getPluralForm(canonical);
    return [canonical, plural];
}

/**
 * Generates all known commitment type variations
 * Used for creating comprehensive registries
 * @returns Array of all known commitment types (both singular and plural)
 */
export function getAllKnownCommitmentTypes(): string[] {
    const types = new Set<string>();

    // Add all singular forms
    Object.keys(SINGULAR_TO_PLURAL_MAP).forEach(singular => types.add(singular));

    // Add all plural forms
    Object.values(SINGULAR_TO_PLURAL_MAP).forEach(plural => types.add(plural));

    return Array.from(types).sort();
}
