import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { analyzeSourceFileForRefactorCandidate } from './analyzeSourceFileForRefactorCandidate';
import { getRefactorCandidateLevelConfiguration, type RefactorCandidateLevel } from './RefactorCandidateLevel';

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
 * Builds a source file with many simple constant lines.
 */
function buildLineHeavySource(lineCount: number): string {
    return Array.from(
        { length: lineCount },
        (_, index) => `export const value${index + 1} = ${index + 1};`,
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

/**
 * Analyzes one source file using the heuristics of the selected scan level.
 */
async function analyzeFileAtLevel(
    filePath: string,
    level: RefactorCandidateLevel,
    rootDir: string,
) {
    return analyzeSourceFileForRefactorCandidate({
        filePath,
        heuristics: getRefactorCandidateLevelConfiguration(level),
        lineCountExemptPaths: new Set<string>(),
        rootDir,
    });
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

        const lowLevelCandidate = await analyzeFileAtLevel(filePath, 'low', temporaryDirectory);

        const xhighLevelCandidate = await analyzeFileAtLevel(filePath, 'xhigh', temporaryDirectory);

        expect(lowLevelCandidate).toBeNull();
        expect(xhighLevelCandidate?.reasons).toContain('functions 10/7');
    });

    it('keeps borderline line-heavy files below the xlow threshold while low still flags them', async () => {
        const filePath = join(temporaryDirectory, 'lineHeavy.ts');
        await writeFile(filePath, buildLineHeavySource(3000), 'utf-8');

        const xlowLevelCandidate = await analyzeFileAtLevel(filePath, 'xlow', temporaryDirectory);
        const lowLevelCandidate = await analyzeFileAtLevel(filePath, 'low', temporaryDirectory);

        expect(xlowLevelCandidate).toBeNull();
        expect(lowLevelCandidate?.reasons).toContain('lines 3000/2800');
    });

    it('surfaces mildly function-heavy files at the extreme level only', async () => {
        const filePath = join(temporaryDirectory, 'mildlyFunctionHeavy.ts');
        await writeFile(filePath, buildFunctionHeavySource(5), 'utf-8');

        const xhighLevelCandidate = await analyzeFileAtLevel(filePath, 'xhigh', temporaryDirectory);
        const extremeLevelCandidate = await analyzeFileAtLevel(filePath, 'extreme', temporaryDirectory);

        expect(xhighLevelCandidate).toBeNull();
        expect(extremeLevelCandidate?.reasons).toContain('functions 5/4');
    });

    it('reports the most complex function when complexity exceeds the selected threshold', async () => {
        const filePath = join(temporaryDirectory, 'complexDecision.ts');
        await writeFile(filePath, buildComplexFunctionSource(), 'utf-8');

        const lowLevelCandidate = await analyzeFileAtLevel(filePath, 'low', temporaryDirectory);

        const mediumLevelCandidate = await analyzeFileAtLevel(filePath, 'medium', temporaryDirectory);

        expect(lowLevelCandidate).toBeNull();
        expect(mediumLevelCandidate?.reasons).toContain('complexity 17/16 in `complexDecision`');
    });
});
