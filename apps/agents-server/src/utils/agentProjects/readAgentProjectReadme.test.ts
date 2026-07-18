import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { readAgentProjectReadme } from './readAgentProjectReadme';

describe('readAgentProjectReadme', () => {
    let temporaryDirectory: string | null = null;

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }
    });

    it('returns null when the project has no README file', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-readme-'));

        await expect(readAgentProjectReadme(temporaryDirectory)).resolves.toBe(null);
    });

    it('reads README files case-insensitively and preserves the disk filename', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-readme-'));
        await writeFile(join(temporaryDirectory, 'ReadMe.MD'), '# Project\n\nPublic notes', 'utf-8');

        await expect(readAgentProjectReadme(temporaryDirectory)).resolves.toEqual({
            fileName: 'ReadMe.MD',
            content: '# Project\n\nPublic notes',
        });
    });

    it('prefers markdown README files over text README files', async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-readme-'));
        await mkdir(temporaryDirectory, { recursive: true });
        await writeFile(join(temporaryDirectory, 'README.txt'), 'Text notes', 'utf-8');
        await writeFile(join(temporaryDirectory, 'README.md'), '# Markdown notes', 'utf-8');

        await expect(readAgentProjectReadme(temporaryDirectory)).resolves.toEqual({
            fileName: 'README.md',
            content: '# Markdown notes',
        });
    });
});
