import type { RefactorCandidate } from './RefactorCandidate';
import { selectMostImportantRefactorCandidates } from './selectMostImportantRefactorCandidates';

/**
 * Builds a refactor candidate stub for selection tests.
 */
function createRefactorCandidate(relativePath: string, severityScore: number): RefactorCandidate {
    return {
        absolutePath: `/repo/${relativePath}`,
        relativePath,
        reasons: [`severity ${severityScore}`],
        severityScore,
    };
}

/**
 * Extracts the relative paths of a candidate list for concise assertions.
 */
function toRelativePaths(candidates: ReadonlyArray<RefactorCandidate>): ReadonlyArray<string> {
    return candidates.map((candidate) => candidate.relativePath);
}

describe('selectMostImportantRefactorCandidates', () => {
    const candidates: ReadonlyArray<RefactorCandidate> = [
        createRefactorCandidate('src/a.ts', 1.2),
        createRefactorCandidate('src/b.ts', 4.5),
        createRefactorCandidate('src/c.ts', 2.0),
        createRefactorCandidate('src/d.ts', 3.1),
    ];

    it('returns every candidate when the limit is undefined', () => {
        expect(selectMostImportantRefactorCandidates(candidates, undefined)).toBe(candidates);
    });

    it('returns every candidate when there are fewer than the limit', () => {
        expect(selectMostImportantRefactorCandidates(candidates, 10)).toBe(candidates);
    });

    it('keeps only the most important candidates when there are more than the limit', () => {
        const selected = selectMostImportantRefactorCandidates(candidates, 2);

        // Note: `b.ts` (4.5) and `d.ts` (3.1) are the highest-severity candidates.
        expect(toRelativePaths(selected)).toEqual(['src/b.ts', 'src/d.ts']);
    });

    it('preserves the original input order among the kept candidates', () => {
        const selected = selectMostImportantRefactorCandidates(candidates, 3);

        // Note: The three highest severities are `b`, `d`, `c`, but the output keeps input order.
        expect(toRelativePaths(selected)).toEqual(['src/b.ts', 'src/c.ts', 'src/d.ts']);
    });

    it('breaks severity ties deterministically by relative path', () => {
        const tiedCandidates: ReadonlyArray<RefactorCandidate> = [
            createRefactorCandidate('src/z.ts', 2.0),
            createRefactorCandidate('src/a.ts', 2.0),
            createRefactorCandidate('src/m.ts', 2.0),
        ];

        const selected = selectMostImportantRefactorCandidates(tiedCandidates, 2);

        // Note: On equal severity, `a.ts` and `m.ts` win over `z.ts`, still emitted in input order.
        expect(toRelativePaths(selected)).toEqual(['src/a.ts', 'src/m.ts']);
    });
});
