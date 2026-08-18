import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { commitAgentProjectChanges } from './commitAgentProjectChanges';
import { runAgentProjectGitCommand } from './runAgentProjectGitCommand';

describe('commitAgentProjectChanges', () => {
    let temporaryDirectory: string | null = null;

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }
    });

    it('turns a plain project folder into a git repository and commits its files', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-commit-'));
        const projectPath = join(temporaryDirectory, 'my-website');
        await mkdir(projectPath, { recursive: true });
        await writeFile(join(projectPath, 'index.html'), '<html></html>\n', 'utf-8');

        const projectChange = await commitAgentProjectChanges({
            projectPath,
            projectName: 'my-website',
            commitMessage: 'Answering message 2026-08-17-thread.book',
        });

        expect(projectChange).not.toBeNull();
        expect(projectChange!.projectName).toBe('my-website');
        expect(projectChange!.commitHash).toMatch(/^[0-9a-f]{40}$/u);
        expect(projectChange!.changedFiles.map((changedFile) => changedFile.path)).toContain('index.html');
        expect(projectChange!.insertionCount).toBeGreaterThan(0);
        expect(projectChange!.diff).toContain('<html></html>');
        expect(projectChange!.isDiffTruncated).toBe(false);
    });

    it('keeps installed dependencies out of a repository it initializes', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-commit-'));
        const projectPath = join(temporaryDirectory, 'my-website');
        await mkdir(join(projectPath, 'node_modules', 'left-pad'), { recursive: true });
        await writeFile(join(projectPath, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n', 'utf-8');
        await writeFile(join(projectPath, 'index.html'), '<html></html>\n', 'utf-8');

        const projectChange = await commitAgentProjectChanges({
            projectPath,
            projectName: 'my-website',
            commitMessage: 'Answering message 2026-08-17-thread.book',
        });

        expect(projectChange!.changedFiles.map((changedFile) => changedFile.path)).toEqual(
            expect.arrayContaining(['.gitignore', 'index.html']),
        );
        expect(projectChange!.changedFiles.map((changedFile) => changedFile.path)).not.toContain(
            'node_modules/left-pad/index.js',
        );
        expect(await readFile(join(projectPath, '.gitignore'), 'utf-8')).toContain('node_modules/');
    });

    it('commits only what changed since the previous message', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-commit-'));
        const projectPath = join(temporaryDirectory, 'my-website');
        await mkdir(projectPath, { recursive: true });
        await writeFile(join(projectPath, 'index.html'), '<html></html>\n', 'utf-8');
        await commitAgentProjectChanges({
            projectPath,
            projectName: 'my-website',
            commitMessage: 'Answering message 2026-08-17-first.book',
        });

        await writeFile(join(projectPath, 'index.html'), '<html>Hello</html>\n', 'utf-8');
        const projectChange = await commitAgentProjectChanges({
            projectPath,
            projectName: 'my-website',
            commitMessage: 'Answering message 2026-08-17-second.book',
        });

        expect(projectChange!.changedFiles).toEqual([{ path: 'index.html', insertionCount: 1, deletionCount: 1 }]);
        expect(projectChange!.diff).toContain('+<html>Hello</html>');
    });

    it('commits nothing when the message left the project untouched', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-commit-'));
        const projectPath = join(temporaryDirectory, 'my-website');
        await mkdir(projectPath, { recursive: true });
        await writeFile(join(projectPath, 'index.html'), '<html></html>\n', 'utf-8');
        await commitAgentProjectChanges({
            projectPath,
            projectName: 'my-website',
            commitMessage: 'Answering message 2026-08-17-first.book',
        });

        await expect(
            commitAgentProjectChanges({
                projectPath,
                projectName: 'my-website',
                commitMessage: 'Answering message 2026-08-17-second.book',
            }),
        ).resolves.toBeNull();
    });

    it('leaves a project tracked by an outer repository to that repository', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-commit-'));
        const projectPath = join(temporaryDirectory, 'projects', 'my-website');
        await mkdir(projectPath, { recursive: true });
        await writeFile(join(projectPath, 'index.html'), '<html></html>\n', 'utf-8');
        await runAgentProjectGitCommand({ projectPath: temporaryDirectory, args: ['init'] });
        await runAgentProjectGitCommand({ projectPath: temporaryDirectory, args: ['add', '--all', '--', '.'] });
        await runAgentProjectGitCommand({
            projectPath: temporaryDirectory,
            args: ['commit', '--message', 'Outer repository owns the project'],
        });

        await writeFile(join(projectPath, 'index.html'), '<html>Hello</html>\n', 'utf-8');

        await expect(
            commitAgentProjectChanges({
                projectPath,
                projectName: 'my-website',
                commitMessage: 'Answering message 2026-08-17-thread.book',
            }),
        ).resolves.toBeNull();
        expect(
            (await runAgentProjectGitCommand({ projectPath, args: ['rev-parse', '--show-toplevel'] })).output,
        ).not.toContain('my-website');
    });
});
