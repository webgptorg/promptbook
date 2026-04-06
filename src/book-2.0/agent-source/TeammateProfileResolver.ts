/**
 * Profile data for a teammate agent resolved from its source or backend.
 *
 * @private internal type for TEAM commitment profile enrichment
 */
export type TeammateProfile = {
    /**
     * The human-readable name of the agent.
     */
    readonly agentName: string;

    /**
     * Short description of what the agent does, from its PERSONA commitment.
     */
    readonly personaDescription: string | null;
};

/**
 * Resolves profile data for teammate agents referenced in TEAM commitments.
 *
 * Implementations are expected to return the actual human-readable name and
 * description of each teammate agent identified by URL, so TEAM tools can be
 * created with meaningful labels and descriptions rather than technical IDs.
 *
 * @private internal type for TEAM commitment profile enrichment
 */
export type TeammateProfileResolver = {
    /**
     * Returns profile data for the given teammate agent URL.
     *
     * @param url - Canonical teammate URL from the resolved TEAM commitment content.
     * @returns Teammate profile or `null` when the URL cannot be resolved locally.
     */
    resolveTeammateProfile(url: string): Promise<TeammateProfile | null>;
};
