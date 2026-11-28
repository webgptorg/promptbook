import { join } from 'path';
import { parsePromptFile } from '../run-codex-prompts/prompts/parsePromptFile';
import type { PromptFile } from '../run-codex-prompts/prompts/types/PromptFile';
import { $orderPromptFiles } from './$orderPromptFiles';

/**
 * Creates one parsed prompt file used by the ordering tests.
 */
function createPromptFile(name: string): PromptFile {
    return parsePromptFile(join(process.cwd(), 'prompts', name), '[ ]\n\n[✨] Do something\n');
}

describe('$orderPromptFiles', () => {
    const earliestPromptFile = createPromptFile('2026-04-0010-earliest.md');
    const middlePromptFile = createPromptFile('2026-04-0020-middle.md');
    const latestPromptFile = createPromptFile('2026-04-0030-latest.md');
    const promptFiles = [earliestPromptFile, middlePromptFile, latestPromptFile];

    it('keeps the loaded order for `from-earliest`', () => {
        expect($orderPromptFiles(promptFiles, 'from-earliest')).toEqual([
            earliestPromptFile,
            middlePromptFile,
            latestPromptFile,
        ]);
    });

    it('reverses the loaded order for `from-latest`', () => {
        expect($orderPromptFiles(promptFiles, 'from-latest')).toEqual([
            latestPromptFile,
            middlePromptFile,
            earliestPromptFile,
        ]);
    });

    it('keeps all prompt files for `random`', () => {
        const orderedPromptFiles = $orderPromptFiles(promptFiles, 'random');

        expect(orderedPromptFiles).toHaveLength(promptFiles.length);
        expect(orderedPromptFiles).toEqual(expect.arrayContaining(promptFiles));
    });

    it('does not mutate the given prompt files', () => {
        $orderPromptFiles(promptFiles, 'from-latest');
        $orderPromptFiles(promptFiles, 'random');

        expect(promptFiles).toEqual([earliestPromptFile, middlePromptFile, latestPromptFile]);
    });
});
