/**
 * Details about a file that should be refactored.
 *
 * @private type of findRefactorCandidates
 */
export type RefactorCandidate = {
    /**
     * Absolute path to the file on disk.
     */
    readonly absolutePath: string;

    /**
     * Repo-relative path used in prompt content.
     */
    readonly relativePath: string;

    /**
     * Reasons that triggered the refactor prompt.
     */
    readonly reasons: ReadonlyArray<string>;

    /**
     * Combined severity score used to rank candidates by importance.
     *
     * Higher means more important to refactor. It is the sum of `actual / threshold` ratios
     * across every exceeded threshold, so files that overshoot more thresholds (or overshoot
     * them further) score higher.
     */
    readonly severityScore: number;
};

// Note: [⚫] Code for repository script [RefactorCandidate](scripts/find-refactor-candidates/RefactorCandidate.ts) should never be published in any package
