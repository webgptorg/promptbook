import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { findRefactorCandidatesInProject } from './findRefactorCandidatesInProject';
import { getRefactorCandidateLevelConfiguration } from './RefactorCandidateLevel';
import { resolveRefactorCandidateProject } from './resolveRefactorCandidateProject';

/**
 * Creates an isolated temporary directory for project-scan tests.
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-refactor-scan-'));
}

/**
 * Builds a source file with many simple constant lines.
 */
function buildLineHeavySource(lineCount: number): string {
    return Array.from({ length: lineCount }, (_, index) => `export const value${index + 1} = ${index + 1};`).join('\n');
}

describe('findRefactorCandidatesInProject', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await createTemporaryDirectory();
    });

    afterEach(async () => {
        await rm(temporaryDirectory, { recursive: true, force: true });
    });

    it('skips source files matched by .gitignore while keeping later ! rules', async () => {
        const projectPath = join(temporaryDirectory, 'project');
        const ignoredDirectoryPath = join(projectPath, 'src', 'generated');

        await mkdir(ignoredDirectoryPath, { recursive: true });
        await writeFile(
            join(projectPath, '.gitignore'),
            spaceTrim(`
                src/generated/*
                !src/generated/keep.ts
            `),
            'utf-8',
        );
        await writeFile(join(ignoredDirectoryPath, 'ignored.ts'), buildLineHeavySource(700), 'utf-8');
        await writeFile(join(ignoredDirectoryPath, 'keep.ts'), buildLineHeavySource(700), 'utf-8');

        const { isIgnoredRelativePath, rootDir } = await resolveRefactorCandidateProject(projectPath);
        const candidates = await findRefactorCandidatesInProject({
            heuristics: getRefactorCandidateLevelConfiguration('extreme'),
            isIgnoredRelativePath,
            rootDir,
        });

        expect(candidates).toHaveLength(1);
        expect(candidates[0]?.relativePath).toBe('src/generated/keep.ts');
    });

    it('skips source files from directories listed in .gitignore', async () => {
        const projectPath = join(temporaryDirectory, 'project');
        const ignoredDirectoryPath = join(projectPath, 'src', 'vendor-cache');

        await mkdir(ignoredDirectoryPath, { recursive: true });
        await writeFile(
            join(projectPath, '.gitignore'),
            spaceTrim(`
                src/vendor-cache
            `),
            'utf-8',
        );
        await writeFile(join(ignoredDirectoryPath, 'ignored.ts'), buildLineHeavySource(700), 'utf-8');
        await writeFile(join(projectPath, 'src', 'service.ts'), buildLineHeavySource(700), 'utf-8');

        const { isIgnoredRelativePath, rootDir } = await resolveRefactorCandidateProject(projectPath);
        const candidates = await findRefactorCandidatesInProject({
            heuristics: getRefactorCandidateLevelConfiguration('extreme'),
            isIgnoredRelativePath,
            rootDir,
        });

        expect(candidates).toHaveLength(1);
        expect(candidates[0]?.relativePath).toBe('src/service.ts');
    });
});
