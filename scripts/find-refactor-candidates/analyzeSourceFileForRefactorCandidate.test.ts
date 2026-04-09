import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { analyzeSourceFileForRefactorCandidate } from './analyzeSourceFileForRefactorCandidate';
import { getRefactorCandidateLevelConfiguration } from './RefactorCandidateLevel';

/**
 * Creates a temporary directory for refactor-candidate analysis tests.
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-refactor-candidates-'));
}

/**
 * Builds a source file with many simple named functions.
 */
function buildFunctionHeavySource(functionCount: number): string {
    return Array.from(
        { length: functionCount },
        (_, index) => `
            export function helper${index + 1}(): number {
                return ${index + 1};
            }
        `,
    ).join('\n');
}

/**
 * Builds a source file with one function that intentionally exceeds the medium complexity threshold.
 */
function buildComplexFunctionSource(): string {
    return `
        export function complexDecision(value: number): number {
            let result = 0;

            if (value > 0 && value < 10) {
                result += 1;
            }

            if (value > 1 && value < 11) {
                result += 1;
            }

            if (value > 2 && value < 12) {
                result += 1;
            }

            if (value > 3 && value < 13) {
                result += 1;
            }

            if (value > 4 && value < 14) {
                result += 1;
            }

            if (value > 5 && value < 15) {
                result += 1;
            }

            if (value > 6 && value < 16) {
                result += 1;
            }

            if (value > 7 && value < 17) {
                result += 1;
            }

            return result;
        }
    `;
}

describe('analyzeSourceFileForRefactorCandidate', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await createTemporaryDirectory();
    });

    afterEach(async () => {
        await rm(temporaryDirectory, { recursive: true, force: true });
    });

    it('flags function-heavy files only at stricter levels', async () => {
        const filePath = join(temporaryDirectory, 'manyFunctions.ts');
        await writeFile(filePath, buildFunctionHeavySource(10), 'utf-8');

        const lowLevelCandidate = await analyzeSourceFileForRefactorCandidate({
            filePath,
            heuristics: getRefactorCandidateLevelConfiguration('low'),
            lineCountExemptPaths: new Set<string>(),
            rootDir: temporaryDirectory,
        });

        const xhighLevelCandidate = await analyzeSourceFileForRefactorCandidate({
            filePath,
            heuristics: getRefactorCandidateLevelConfiguration('xhigh'),
            lineCountExemptPaths: new Set<string>(),
            rootDir: temporaryDirectory,
        });

        expect(lowLevelCandidate).toBeNull();
        expect(xhighLevelCandidate?.reasons).toContain('functions 10/8');
    });

    it('reports the most complex function when complexity exceeds the selected threshold', async () => {
        const filePath = join(temporaryDirectory, 'complexDecision.ts');
        await writeFile(filePath, buildComplexFunctionSource(), 'utf-8');

        const lowLevelCandidate = await analyzeSourceFileForRefactorCandidate({
            filePath,
            heuristics: getRefactorCandidateLevelConfiguration('low'),
            lineCountExemptPaths: new Set<string>(),
            rootDir: temporaryDirectory,
        });

        const mediumLevelCandidate = await analyzeSourceFileForRefactorCandidate({
            filePath,
            heuristics: getRefactorCandidateLevelConfiguration('medium'),
            lineCountExemptPaths: new Set<string>(),
            rootDir: temporaryDirectory,
        });

        expect(lowLevelCandidate).toBeNull();
        expect(mediumLevelCandidate?.reasons).toContain('complexity 17/16 in `complexDecision`');
    });
});
