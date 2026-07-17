import { spaceTrim } from 'spacetrim';
import { findNextTodoPrompt } from './findNextTodoPrompt';
import { listPromptsToBeWritten } from './listPromptsToBeWritten';
import { listRunnablePrompts } from './listRunnablePrompts';
import { listUpcomingTasks } from './listUpcomingTasks';
import { parsePromptFile } from './parsePromptFile';
import { summarizePrompts } from './summarizePrompts';

/**
 * Creates parsed prompt files used across priority-filtering tests.
 */
function createPromptFiles() {
    const file = parsePromptFile(
        'prompts/priority-test.md',
        spaceTrim(`
            [ ] !!!!
            High runnable
            ---
            [ ] !!!
            Medium runnable
            ---
            [ ] !!
            Low runnable
            ---
            [ ] !!!
            @@@ High to be written
            ---
            [ ] !
            @@@ Low to be written
            ---
            [x] done
            Finished task
        `),
    );

    return [file];
}

describe('priority filtering', () => {
    it('filters runnable prompts and picks the highest priority above threshold', () => {
        const files = createPromptFiles();

        const runnable = listRunnablePrompts(files, { minimumPriority: 3 });
        const next = findNextTodoPrompt(files, { minimumPriority: 3 });

        expect(runnable).toHaveLength(2);
        expect(runnable.map(({ section }) => section.priority)).toEqual([4, 3]);
        expect(next?.section.priority).toBe(4);
    });

    it('filters upcoming and to-be-written lists by minimum priority', () => {
        const files = createPromptFiles();

        const upcoming = listUpcomingTasks(files, { minimumPriority: 3 });
        const toBeWritten = listPromptsToBeWritten(files, { minimumPriority: 3 });

        expect(upcoming).toHaveLength(2);
        expect(upcoming.map((task) => task.priority)).toEqual([4, 3]);
        expect(toBeWritten).toHaveLength(1);
        expect(toBeWritten[0]!.section.priority).toBe(3);
    });

    it('reports stats with low-priority runnable prompts separated', () => {
        const files = createPromptFiles();
        const stats = summarizePrompts(files, { minimumPriority: 3 });

        expect(stats).toEqual({
            done: 1,
            forAgent: 2,
            outsidePriorityRange: 1,
            toBeWritten: 1,
        });
    });

    it('filters runnable prompts by an inclusive priority range', () => {
        const files = createPromptFiles();

        const runnable = listRunnablePrompts(files, { minimumPriority: 2, maximumPriority: 3 });
        const next = findNextTodoPrompt(files, { minimumPriority: 2, maximumPriority: 3 });

        expect(runnable.map(({ section }) => section.priority)).toEqual([3, 2]);
        expect(next?.section.priority).toBe(3);
    });

    it('parses failed prompts and excludes them from runnable tasks', () => {
        const file = parsePromptFile(
            'prompts/failed-test.md',
            spaceTrim(`
                [!] (failed after 3 attempts) 1 minute by Gemini CLI \`gemini-3-flash\`
                Already attempted task

                ---

                [ ] !!
                Runnable task
            `),
        );

        const runnable = listRunnablePrompts([file]);

        expect(file.sections[0]?.status).toBe('failed');
        expect(runnable).toHaveLength(1);
        expect(runnable[0]?.section.index).toBe(1);
    });
});
