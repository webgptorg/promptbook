import { join } from 'path';
import { parsePromptFile } from '../run-codex-prompts/prompts/parsePromptFile';
import { findNextTodoPromptToVerify, partitionPromptFilesByIgnore } from './verify-prompts';

describe('partitionPromptFilesByIgnore', () => {
    it('ignores prompt files when the filename matches case-insensitively', () => {
        const refactorPromptFile = parsePromptFile(
            join(process.cwd(), 'prompts', '2026-04-0010-refactor-start-remote-server.md'),
            '[ ]\n\n[🧹] Improve startup helpers\n',
        );
        const fixPromptFile = parsePromptFile(
            join(process.cwd(), 'prompts', '2026-04-0020-startup-cleanup.md'),
            '[ ]\n\n[✨] Fix startup cleanup\n',
        );

        const { promptFiles, ignoredPromptFiles } = partitionPromptFilesByIgnore(
            [refactorPromptFile, fixPromptFile],
            ['REFACTOR'],
        );

        expect(promptFiles).toEqual([fixPromptFile]);
        expect(ignoredPromptFiles).toEqual([refactorPromptFile]);
    });

    it('ignores prompt files when the first prompt line matches case-insensitively', () => {
        const titleMatchedPromptFile = parsePromptFile(
            join(process.cwd(), 'prompts', '2026-04-0030-maintenance.md'),
            '[x] ~$0.00\n\n[✨🌊] Fix Prompt Notation\n',
        );
        const unrelatedPromptFile = parsePromptFile(
            join(process.cwd(), 'prompts', '2026-04-0040-unrelated.md'),
            '[ ]\n\n[✨] Improve unrelated flow\n',
        );

        const { promptFiles, ignoredPromptFiles } = partitionPromptFilesByIgnore(
            [titleMatchedPromptFile, unrelatedPromptFile],
            ['prompt notation'],
        );

        expect(promptFiles).toEqual([unrelatedPromptFile]);
        expect(ignoredPromptFiles).toEqual([titleMatchedPromptFile]);
    });
});

describe('findNextTodoPromptToVerify', () => {
    it('does not offer a todo prompt again once its file was skipped in this run', () => {
        const firstPromptFile = parsePromptFile(
            join(process.cwd(), 'prompts', '2026-09-0100-demo.md'),
            '[ ]\n\n[✨🧪] Demo\n\n- do something\n',
        );
        const secondPromptFile = parsePromptFile(
            join(process.cwd(), 'prompts', '2026-09-0110-other.md'),
            '[ ]\n\n[✨🧪] Other\n\n- do something else\n',
        );
        const skippedFiles = new Set<string>();

        expect(findNextTodoPromptToVerify([firstPromptFile, secondPromptFile], skippedFiles)?.file).toBe(
            firstPromptFile,
        );

        skippedFiles.add(firstPromptFile.path);
        expect(findNextTodoPromptToVerify([firstPromptFile, secondPromptFile], skippedFiles)?.file).toBe(
            secondPromptFile,
        );

        skippedFiles.add(secondPromptFile.path);
        expect(findNextTodoPromptToVerify([firstPromptFile, secondPromptFile], skippedFiles)).toBeUndefined();
    });
});
