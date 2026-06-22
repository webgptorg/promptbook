import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { updatePromptSection } from './updatePromptSection';

describe('updatePromptSection', () => {
    let temporaryDirectoryPath: string | undefined;

    afterEach(async () => {
        if (temporaryDirectoryPath) {
            await rm(temporaryDirectoryPath, { recursive: true, force: true });
            temporaryDirectoryPath = undefined;
        }
    });

    it('reports unchanged saves without rewriting the prompt file', async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'ptbk-coder-update-'));
        const filePath = join(temporaryDirectoryPath, 'prompt.md');
        const content = spaceTrim(`
            [ ]

            Existing prompt
        `);
        await writeFile(filePath, content, 'utf-8');

        await expect(updatePromptSection(filePath, 0, 'Existing prompt')).resolves.toEqual({ changed: false });
        await expect(readFile(filePath, 'utf-8')).resolves.toBe(content);
    });

    it('preserves the status line and reports changed saves', async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'ptbk-coder-update-'));
        const filePath = join(temporaryDirectoryPath, 'prompt.md');
        await writeFile(
            filePath,
            spaceTrim(`
                [.] Done manually

                Previous prompt
            `),
            'utf-8',
        );

        await expect(updatePromptSection(filePath, 0, 'Updated prompt')).resolves.toEqual({ changed: true });
        await expect(readFile(filePath, 'utf-8')).resolves.toBe(
            spaceTrim(`
                [.] Done manually

                Updated prompt
            `),
        );
    });
});
