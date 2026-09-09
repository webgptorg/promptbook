import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { parsePromptFile } from '../prompts/parsePromptFile';
import { printUpcomingTasks } from '../prompts/printUpcomingTasks';
import { listCoderPrompts } from './listCoderPrompts';

jest.mock('../prompts/loadPromptFiles', () => ({
    loadPromptFiles: jest.fn(),
}));

jest.mock('../prompts/printUpcomingTasks', () => ({
    printUpcomingTasks: jest.fn(),
}));

/**
 * Typed Jest mock for loading the current project's prompt files.
 */
function getLoadPromptFilesMock(): jest.MockedFunction<typeof loadPromptFiles> {
    return loadPromptFiles as jest.MockedFunction<typeof loadPromptFiles>;
}

/**
 * Typed Jest mock for the priority-grouped task renderer.
 */
function getPrintUpcomingTasksMock(): jest.MockedFunction<typeof printUpcomingTasks> {
    return printUpcomingTasks as jest.MockedFunction<typeof printUpcomingTasks>;
}

describe('listCoderPrompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists only ready prompts matching the selected runner and priority range', async () => {
        const promptFile = parsePromptFile(
            join(process.cwd(), 'prompts', 'list-test.md'),
            spaceTrim(`
                [ ] !!!! use \`github-copilot\`
                Compatible harness
                ---
                [ ] !!! use \`gpt-5.5\`
                Compatible model
                ---
                [ ] !!!!! use \`claude\`
                Different model family
                ---
                [ ] !!
                @@@ Still needs authoring
                ---
                [x] Done
                Finished prompt
            `),
        );
        getLoadPromptFilesMock().mockResolvedValue([promptFile]);

        const listedPromptCount = await listCoderPrompts({
            minimumPriority: 3,
            maximumPriority: 4,
            promptRunnerIdentity: {
                harnessName: 'github-copilot',
                modelName: 'gpt-5.5',
            },
        });

        expect(listedPromptCount).toBe(2);
        expect(getPrintUpcomingTasksMock()).toHaveBeenCalledWith([
            {
                label: 'prompts/list-test.md#1',
                summary: 'Compatible harness',
                priority: 4,
            },
            {
                label: 'prompts/list-test.md#4',
                summary: 'Compatible model',
                priority: 3,
            },
        ]);
    });

    it('does not filter runner-specific prompts when no harness or model is selected', async () => {
        const promptFile = parsePromptFile(
            join(process.cwd(), 'prompts', 'list-test.md'),
            spaceTrim(`
                [ ] use \`gpt\`
                GPT task
                ---
                [ ] use \`claude\`
                Claude task
            `),
        );
        getLoadPromptFilesMock().mockResolvedValue([promptFile]);

        const listedPromptCount = await listCoderPrompts();

        expect(listedPromptCount).toBe(2);
        expect(getPrintUpcomingTasksMock()).toHaveBeenCalledWith([
            {
                label: 'prompts/list-test.md#1',
                summary: 'GPT task',
                priority: 0,
            },
            {
                label: 'prompts/list-test.md#4',
                summary: 'Claude task',
                priority: 0,
            },
        ]);
    });
});
