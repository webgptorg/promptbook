/**
 * Normalizes a repo-relative path to use forward slashes.
 *
 * @private function of findRefactorCandidates
 */
export function normalizeRefactorCandidatePath(pathValue: string): string {
    const normalized = pathValue.replaceAll('\\', '/');
    return normalized.replace(/^\.\//, '');
}

/** Note: [🟡] Code for repository script [normalizeRefactorCandidatePath](scripts/find-refactor-candidates/normalizeRefactorCandidatePath.ts) should never be published outside of `@promptbook/cli`*/
