import { spaceTrim } from 'spacetrim';
import { findNextTodoPrompt } from './findNextTodoPrompt';
import { listRunnablePrompts } from './listRunnablePrompts';
import { parsePromptFile } from './parsePromptFile';
import { isPromptInRunnerFilter, type RunnerFilter } from './runnerFilter';

/**
 * Runner used in the task examples: `--harness github-copilot --model gpt-5.5`.
 */
const GITHUB_COPILOT_RUNNER: RunnerFilter = { harness: 'github-copilot', model: 'gpt-5.5' };

/**
 * Creates parsed prompt files that mirror the required-model examples from the task.
 */
function createRunnerPromptFiles() {
    return [
        parsePromptFile(
            'prompts/runner-test.md',
            spaceTrim(`
                [ ] use \`gpt-5.5\`
                Exact model
                ---
                [ ] use model \`gpt-5.5\`
                Exact model written with a filler word
                ---
                [ ] !!!! \`gpt\`
                Model family combined with a priority
                ---
                [ ] use \`github-copilot\` !!!!!
                Harness combined with a priority
                ---
                [ ] use \`claude-opus\`
                Different family that should be skipped
                ---
                [ ] !!!
                No runner requirement
            `),
        ),
    ];
}

describe('runner filtering', () => {
    it('parses required model or harness tokens and priority from the status line', () => {
        const file = createRunnerPromptFiles()[0]!;

        expect(file.sections.map((section) => section.requiredModelOrHarnessTokens)).toEqual([
            ['gpt-5.5'],
            ['gpt-5.5'],
            ['gpt'],
            ['github-copilot'],
            ['claude-opus'],
            [],
        ]);
        expect(file.sections.map((section) => section.priority)).toEqual([0, 0, 4, 5, 0, 3]);
        expect(file.sections.every((section) => section.status === 'todo')).toBe(true);
    });

    it('runs prompts whose token matches the running model, harness or family and skips the rest', () => {
        const files = createRunnerPromptFiles();

        const runnable = listRunnablePrompts(files, {}, GITHUB_COPILOT_RUNNER);

        // Every prompt except the `claude-opus` one runs with `github-copilot` + `gpt-5.5`
        expect(runnable.map(({ section }) => section.index)).toEqual([0, 1, 2, 3, 5]);
    });

    it('picks the highest priority runnable prompt for the current runner', () => {
        const files = createRunnerPromptFiles();

        const next = findNextTodoPrompt(files, {}, GITHUB_COPILOT_RUNNER);

        // The `github-copilot !!!!!` prompt has the highest priority among matching prompts
        expect(next?.section.index).toBe(3);
        expect(next?.section.priority).toBe(5);
    });

    it('matches model families dynamically by normalized name', () => {
        const files = createRunnerPromptFiles();
        const claudeRunner: RunnerFilter = { harness: 'claude-code', model: 'claude-opus-4.8' };

        const runnable = listRunnablePrompts(files, {}, claudeRunner);

        // `claude-opus` matches `claude-opus-4.8`; the gpt / github-copilot prompts are skipped
        expect(runnable.map(({ section }) => section.index)).toEqual([4, 5]);
    });

    it('runs every runnable prompt when the runner is unknown', () => {
        const files = createRunnerPromptFiles();

        const runnable = listRunnablePrompts(files);

        expect(runnable.map(({ section }) => section.index)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('matches short family tokens against a longer normalized model name', () => {
        const file = parsePromptFile(
            'prompts/families.md',
            spaceTrim(`
                [ ] \`opus\`
                Opus family
                ---
                [ ] \`claude\`
                Claude family
                ---
                [ ] \`gpt\`
                Gpt family
            `),
        );
        const claudeRunner: RunnerFilter = { harness: 'claude-code', model: 'claude-opus-4.8' };

        expect(isPromptInRunnerFilter(file.sections[0]!, claudeRunner)).toBe(true); // `opus`
        expect(isPromptInRunnerFilter(file.sections[1]!, claudeRunner)).toBe(true); // `claude`
        expect(isPromptInRunnerFilter(file.sections[2]!, claudeRunner)).toBe(false); // `gpt`
    });

    it('keeps prompts without a runner requirement runnable and ignores non-status prose lines', () => {
        const file = parsePromptFile(
            'prompts/plain.md',
            spaceTrim(`
                [ ] !!
                Plain priority prompt
                ---
                [ ] fix the bug later
                @@@ not a real status line
            `),
        );

        // The prose "[ ] fix the bug later" is not read as a runnable todo status line
        expect(file.sections[0]!.status).toBe('todo');
        expect(file.sections[1]!.status).toBe('not-ready');

        // A prompt with no required tokens always matches, even against a concrete runner
        expect(file.sections[0]!.requiredModelOrHarnessTokens).toEqual([]);
        expect(isPromptInRunnerFilter(file.sections[0]!, GITHUB_COPILOT_RUNNER)).toBe(true);
    });
});
