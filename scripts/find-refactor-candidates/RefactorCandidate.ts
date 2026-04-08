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
};

// Note: [⚫] Code for repository script [RefactorCandidate](scripts/find-refactor-candidates/RefactorCandidate.ts) should never be published in any package
