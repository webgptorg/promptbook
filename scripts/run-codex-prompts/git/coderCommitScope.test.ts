import { mkdir, mkdtemp, rename, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from './coderCommitScope';

/**
 * Creates one temporary git repository with one committed file.
 */
async function createTemporaryRepository(): Promise<string> {
    const projectPath = await mkdtemp(join(tmpdir(), 'ptbk-coder-commit-scope-'));

    await runInRepository(projectPath, 'git init --quiet --initial-branch=main .');
    await runInRepository(projectPath, 'git config user.email "coder@promptbook.studio"');
    await runInRepository(projectPath, 'git config user.name "Promptbook Coder"');
    await writeFile(join(projectPath, 'already-committed.txt'), 'committed\n', 'utf-8');
    await runInRepository(projectPath, 'git add .');
    await runInRepository(projectPath, 'git commit --quiet --message "Initial commit"');

    return projectPath;
}

/**
 * Runs one command inside the temporary repository.
 */
async function runInRepository(projectPath: string, command: string): Promise<void> {
    await $execCommand({ command, cwd: projectPath, isVerbose: false });
}

describe('coderCommitScope', () => {
    let projectPath: string;

    beforeEach(async () => {
        projectPath = await createTemporaryRepository();
    });

    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it('lists the file one operation has created', async () => {
        const commitScope = await captureCoderCommitScope(projectPath);
        await mkdir(join(projectPath, 'prompts'), { recursive: true });
        await writeFile(join(projectPath, 'prompts', 'added.md'), '[ ]\n', 'utf-8');

        expect(await resolveCoderCommitScopePaths(commitScope)).toEqual(['prompts/added.md']);
    });

    it('lists both sides of a prompt file which one verification has archived', async () => {
        await mkdir(join(projectPath, 'prompts', 'done'), { recursive: true });
        await writeFile(join(projectPath, 'prompts', 'verified.md'), '[x]\n', 'utf-8');
        await runInRepository(projectPath, 'git add .');
        await runInRepository(projectPath, 'git commit --quiet --message "Add prompt"');

        const commitScope = await captureCoderCommitScope(projectPath);
        await rename(join(projectPath, 'prompts', 'verified.md'), join(projectPath, 'prompts', 'done', 'verified.md'));

        expect([...(await resolveCoderCommitScopePaths(commitScope))].sort()).toEqual([
            'prompts/done/verified.md',
            'prompts/verified.md',
        ]);
    });

    it('lists both sides of a file whose move is already staged', async () => {
        await mkdir(join(projectPath, 'prompts', 'done'), { recursive: true });
        await writeFile(join(projectPath, 'prompts', 'verified.md'), '[x]\n', 'utf-8');
        await runInRepository(projectPath, 'git add .');
        await runInRepository(projectPath, 'git commit --quiet --message "Add prompt"');

        const commitScope = await captureCoderCommitScope(projectPath);
        await runInRepository(projectPath, 'git mv "prompts/verified.md" "prompts/done/verified.md"');

        expect([...(await resolveCoderCommitScopePaths(commitScope))].sort()).toEqual([
            'prompts/done/verified.md',
            'prompts/verified.md',
        ]);
    });

    it('leaves changes made before the operation out of the resolved paths', async () => {
        await writeFile(join(projectPath, 'already-committed.txt'), 'work in progress\n', 'utf-8');
        await writeFile(join(projectPath, 'untracked-work-in-progress.txt'), 'work in progress\n', 'utf-8');

        const commitScope = await captureCoderCommitScope(projectPath);
        await writeFile(join(projectPath, 'changed-by-the-operation.txt'), 'operation\n', 'utf-8');

        expect(await resolveCoderCommitScopePaths(commitScope)).toEqual(['changed-by-the-operation.txt']);
    });

    it('lists a file which was already changed before and changed again by the operation', async () => {
        await writeFile(join(projectPath, 'already-committed.txt'), 'work in progress\n', 'utf-8');

        const commitScope = await captureCoderCommitScope(projectPath);
        await writeFile(join(projectPath, 'already-committed.txt'), 'changed by the operation\n', 'utf-8');

        expect(await resolveCoderCommitScopePaths(commitScope)).toEqual(['already-committed.txt']);
    });

    it('lists a file the operation has deleted', async () => {
        const commitScope = await captureCoderCommitScope(projectPath);
        await rm(join(projectPath, 'already-committed.txt'));

        expect(await resolveCoderCommitScopePaths(commitScope)).toEqual(['already-committed.txt']);
    });

    it('never lists a file ignored by gitignore, so it can never break the staging', async () => {
        await writeFile(join(projectPath, '.gitignore'), '.env\n', 'utf-8');
        await runInRepository(projectPath, 'git add .');
        await runInRepository(projectPath, 'git commit --quiet --message "Add gitignore"');

        const commitScope = await captureCoderCommitScope(projectPath);
        await writeFile(join(projectPath, '.env'), 'CODING_AGENT_GIT_NAME=Coder\n', 'utf-8');
        await writeFile(join(projectPath, 'AGENTS.md'), '# Agents\n', 'utf-8');

        expect(await resolveCoderCommitScopePaths(commitScope)).toEqual(['AGENTS.md']);
    });

    it('resolves no path when the operation has changed nothing', async () => {
        const commitScope = await captureCoderCommitScope(projectPath);

        expect(await resolveCoderCommitScopePaths(commitScope)).toEqual([]);
    });
});
