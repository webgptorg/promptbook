import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadPromptFiles } from './loadPromptFiles';

/**
 * Temporary directory used to isolate prompt-loader filesystem tests.
 */
let temporaryPromptsDirectoryPath: string;

describe('loadPromptFiles', () => {
    beforeEach(async () => {
        temporaryPromptsDirectoryPath = await mkdtemp(join(tmpdir(), 'ptbk-coder-prompts-'));
    });

    afterEach(async () => {
        await rm(temporaryPromptsDirectoryPath, { recursive: true, force: true });
    });

    it('ignores an entire Markdown file containing the ptbk-coder ignore marker', async () => {
        await writeFile(
            join(temporaryPromptsDirectoryPath, 'ignored.md'),
            '[ ]\nThis task must not appear in the queue.\n\n<!--ptbk-coder-ignore-->',
            'utf-8',
        );
        await writeFile(
            join(temporaryPromptsDirectoryPath, 'ready.md'),
            '[ ]\nThis task remains available.',
            'utf-8',
        );

        const promptFiles = await loadPromptFiles(temporaryPromptsDirectoryPath);

        expect(promptFiles.map((promptFile) => promptFile.name)).toEqual(['ready.md']);
    });
});
