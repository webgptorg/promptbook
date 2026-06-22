import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { parsePromptFile } from '../prompts/parsePromptFile';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import { classifyPromptSectionForCoderBoard } from './classifyPromptSectionForCoderBoard';

/**
 * Creates one parsed prompt file for board-classification tests.
 */
function createPromptFile(content: string): PromptFile {
    return parsePromptFile(join(process.cwd(), 'prompts', 'board-test.md'), spaceTrim(content));
}

/**
 * Classifies one prompt section with a compact test helper.
 */
function classify(
    file: PromptFile,
    section: PromptSection,
    options: {
        readonly minimumPriority?: number;
        readonly phase?: string;
    } = {},
) {
    return classifyPromptSectionForCoderBoard({
        activePrompt: options.phase
            ? {
                  currentPromptLabel: buildPromptLabelForDisplay(file, section),
                  phase: options.phase,
              }
            : undefined,
        file,
        minimumPriority: options.minimumPriority ?? 0,
        section,
    });
}

describe('classifyPromptSectionForCoderBoard', () => {
    it('places not-ready and authoring-placeholder prompts in backlog with explanatory tags', () => {
        const file = createPromptFile(`
            [-]
            @@@ Draft this prompt
            ---
            [ ] !!
            @@@ Fill in details
        `);

        expect(classify(file, file.sections[0]!).boardStatus).toBe('backlog');
        expect(classify(file, file.sections[0]!).tags.map((tag) => tag.label)).toEqual(['[-]', '@@@']);
        expect(classify(file, file.sections[1]!).boardStatus).toBe('backlog');
        expect(classify(file, file.sections[1]!).tags.map((tag) => tag.label)).toEqual(['@@@']);
    });

    it('separates low-priority prompts from runnable todo prompts', () => {
        const file = createPromptFile(`
            [ ] !
            Low priority but ready
            ---
            [ ] !!!
            Ready for agent
        `);

        expect(classify(file, file.sections[0]!, { minimumPriority: 2 }).boardStatus).toBe('low-priority');
        expect(classify(file, file.sections[0]!, { minimumPriority: 2 }).tags[0]?.label).toBe('Below priority');
        expect(classify(file, file.sections[1]!, { minimumPriority: 2 }).boardStatus).toBe('todo');
    });

    it('marks the active todo prompt as implementing or verifying based on runner phase', () => {
        const file = createPromptFile(`
            [ ] !!
            Current task
        `);
        const section = file.sections[0]!;

        expect(classify(file, section, { phase: 'running' })).toMatchObject({
            boardStatus: 'in-progress',
            tags: [{ label: 'Implementing' }],
        });
        expect(classify(file, section, { phase: 'verifying' })).toMatchObject({
            boardStatus: 'in-progress',
            tags: [{ label: 'Verifying' }],
        });
    });

    it('maps completed, failed, and manually finished prompt markers to their board columns', () => {
        const file = createPromptFile(`
            [x] by GitHub Copilot
            Done by agent
            ---
            [!] failed by GitHub Copilot
            Failed by agent
            ---
            [.] Done manually
            Human verified
        `);

        expect(classify(file, file.sections[0]!).boardStatus).toBe('done');
        expect(classify(file, file.sections[1]!).boardStatus).toBe('errors');
        expect(classify(file, file.sections[2]!).boardStatus).toBe('finished');
    });
});
