import type { RefactorCandidate } from './RefactorCandidate';

/**
 * Keeps at most `limit` refactor candidates, preferring the most important ones.
 *
 * When there are more candidates than `limit`, only the highest-severity candidates are kept
 * (ties broken by relative path for determinism). When `limit` is `undefined` or there are fewer
 * candidates than the limit, every candidate is returned. The original input order is preserved
 * among the kept candidates, so `limit` acts purely as a filter and never reorders prompts.
 *
 * @private function of findRefactorCandidates
 */
export function selectMostImportantRefactorCandidates(
    candidates: ReadonlyArray<RefactorCandidate>,
    limit: number | undefined,
): ReadonlyArray<RefactorCandidate> {
    if (limit === undefined || candidates.length <= limit) {
        return candidates;
    }

    const candidatesRankedByImportance = [...candidates].sort(compareRefactorCandidatesByImportance);
    const keptRelativePaths = new Set(
        candidatesRankedByImportance.slice(0, limit).map((candidate) => candidate.relativePath),
    );

    return candidates.filter((candidate) => keptRelativePaths.has(candidate.relativePath));
}

/**
 * Orders refactor candidates from most to least important.
 *
 * @private function of selectMostImportantRefactorCandidates
 */
function compareRefactorCandidatesByImportance(
    candidateA: RefactorCandidate,
    candidateB: RefactorCandidate,
): number {
    if (candidateB.severityScore !== candidateA.severityScore) {
        return candidateB.severityScore - candidateA.severityScore;
    }

    return candidateA.relativePath.localeCompare(candidateB.relativePath);
}

// Note: [🟡] Code for repository script [selectMostImportantRefactorCandidates](scripts/find-refactor-candidates/selectMostImportantRefactorCandidates.ts) should never be published outside of `@promptbook/cli`
