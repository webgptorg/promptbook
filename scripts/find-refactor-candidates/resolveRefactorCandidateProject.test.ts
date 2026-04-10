import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveRefactorCandidateProject } from './resolveRefactorCandidateProject';

/**
 * Creates an isolated temporary directory for project-resolution tests.
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-refactor-project-'));
}

describe('resolveRefactorCandidateProject', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await createTemporaryDirectory();
    });

    afterEach(async () => {
        await rm(temporaryDirectory, { recursive: true, force: true });
    });

    it('uses the nearest ancestor .gitignore as the project root', async () => {
        const projectPath = join(temporaryDirectory, 'project');
        const nestedPath = join(projectPath, 'packages', 'feature');

        await mkdir(nestedPath, { recursive: true });
        await writeFile(
            join(projectPath, '.gitignore'),
            ['dist/', '*.generated.ts', '!src/keep.generated.ts'].join('\n'),
            'utf-8',
        );

        const { isIgnoredRelativePath, rootDir } = await resolveRefactorCandidateProject(nestedPath);

        expect(rootDir).toBe(projectPath);
        expect(isIgnoredRelativePath('dist/output.ts')).toBe(true);
        expect(isIgnoredRelativePath('src/generated/example.generated.ts')).toBe(true);
        expect(isIgnoredRelativePath('src/keep.generated.ts')).toBe(false);
        expect(isIgnoredRelativePath('src/index.ts')).toBe(false);
    });

    it('falls back to the current directory when no project .gitignore exists', async () => {
        const projectPath = join(temporaryDirectory, 'project-without-gitignore');

        await mkdir(projectPath, { recursive: true });

        const { isIgnoredRelativePath, rootDir } = await resolveRefactorCandidateProject(projectPath);

        expect(rootDir).toBe(projectPath);
        expect(isIgnoredRelativePath('src/index.ts')).toBe(false);
    });
});
