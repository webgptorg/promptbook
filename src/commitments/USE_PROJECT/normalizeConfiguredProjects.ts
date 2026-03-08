/**
 * Configured project reference stored in model requirements metadata.
 *
 * @private type of UseProjectCommitmentDefinition
 */
export type UseProjectConfiguredProjectReference = {
    url: string;
    slug: string;
    defaultBranch?: string;
};

/**
 * Parses previously stored metadata value into a normalized project list.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function normalizeConfiguredProjects(rawValue: unknown): Array<UseProjectConfiguredProjectReference> {
    if (!Array.isArray(rawValue)) {
        return [];
    }

    const configuredProjects: Array<UseProjectConfiguredProjectReference> = [];

    for (const rawEntry of rawValue) {
        if (!rawEntry || typeof rawEntry !== 'object') {
            continue;
        }

        const entry = rawEntry as Record<string, unknown>;
        const url = typeof entry.url === 'string' ? entry.url : null;
        const slug = typeof entry.slug === 'string' ? entry.slug : null;

        if (!url || !slug) {
            continue;
        }

        configuredProjects.push({
            url,
            slug,
            defaultBranch: typeof entry.defaultBranch === 'string' ? entry.defaultBranch : undefined,
        });
    }

    return configuredProjects;
}
