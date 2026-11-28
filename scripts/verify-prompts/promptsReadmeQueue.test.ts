import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PROMPTS_README_TEMPLATE } from '../../src/cli/cli-commands/coder/promptsReadmeTemplate';
import { loadPromptsModule } from '../../src/cli/common/loadPromptsModule';
import { loadExistingPromptTargets } from '../find-refactor-candidates/loadExistingPromptTargets';
import { findNextTodoPrompt } from '../run-codex-prompts/prompts/findNextTodoPrompt';
import { loadPromptFiles } from '../run-codex-prompts/prompts/loadPromptFiles';
import { getPromptNumbering } from '../utils/prompts/getPromptNumbering';

jest.mock('../../src/cli/common/loadPromptsModule', () => ({ loadPromptsModule: jest.fn() }));

describe('prompts README queue safety', () => {
    it('preserves selection, listing and numbering, and never archives the guide', async () => {
        const projectPath = await mkdtemp(join(tmpdir(), 'ptbk-readme-queue-'));
        const originalDirectory = process.cwd();
        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        try {
            await promisify(execFile)('git', ['init'], { cwd: projectPath });
            const promptsDir = join(projectPath, 'prompts');
            for (const directory of ['done', 'templates', 'traces']) {
                await mkdir(join(promptsDir, directory), { recursive: true });
                await writeFile(join(promptsDir, directory, 'context.md'), '[ ] !!!!!\nNot in the active queue.');
            }
            const filename = '2026-09-0010-search.md';
            await writeFile(join(promptsDir, filename), '[ ] !\nSearch task.\n- Target file: `src/search.ts`');
            await writeFile(join(promptsDir, 'done/2026-09-0040-history.md'), '[x]\nPast work.');
            const numberingBefore = await getPromptNumbering({ promptsDir, date: new Date(2026, 8, 1) });
            expect(numberingBefore.startNumber).toBe(50);
            const selectionBefore = findNextTodoPrompt(await loadPromptFiles(promptsDir));
            // Remove the documented ignore comment to prove the filename exclusion also works independently.
            const readme = `${PROMPTS_README_TEMPLATE.replace(
                '<!--ptbk-coder-ignore-->',
                'ignore comment omitted',
            )}\n- Target file: \`src/documentation-example.ts\`\n`;
            await writeFile(join(promptsDir, 'README.md'), readme);
            expect(findNextTodoPrompt(await loadPromptFiles(promptsDir))).toEqual(selectionBefore);
            expect(await getPromptNumbering({ promptsDir, date: new Date(2026, 8, 1) })).toEqual(numberingBefore);
            expect(await loadExistingPromptTargets(promptsDir)).toEqual(new Set(['src/search.ts']));

            process.chdir(projectPath);
            await jest.isolateModulesAsync(async () => {
                const { listCoderPrompts } = await import('../run-codex-prompts/main/listCoderPrompts');
                expect(await listCoderPrompts()).toBe(1);
                expect(consoleInfoSpy.mock.calls.flat().join('\n')).not.toContain('README.md');

                // A customized README can look entirely like a completed PRD and must still stay in place.
                const customReadme = '[x]\nOur customized guide.\n';
                await writeFile(join(promptsDir, 'README.md'), customReadme);
                await writeFile(join(promptsDir, filename), '[x]\nSearch task checked.');
                const review = jest.fn().mockResolvedValue({ verified: 'done' });
                const isolatedLoader = await import('../../src/cli/common/loadPromptsModule');
                jest.mocked(isolatedLoader.loadPromptsModule).mockResolvedValue({ default: review } as never);
                const { verifyPrompts } = await import('./verify-prompts');
                await verifyPrompts({});
                expect(review).toHaveBeenCalledTimes(1);
                expect(await readFile(join(promptsDir, 'README.md'), 'utf-8')).toBe(customReadme);
                expect(await readdir(join(promptsDir, 'done'))).toContain(filename);
                expect(await readdir(join(promptsDir, 'done'))).not.toContain('README.md');
            });
        } finally {
            process.chdir(originalDirectory);
            consoleInfoSpy.mockRestore();
            jest.mocked(loadPromptsModule).mockReset();
            await rm(projectPath, { recursive: true, force: true });
        }
    });
});
