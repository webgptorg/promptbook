import { spaceTrim } from 'spacetrim';
import { findNextTodoPrompt } from './findNextTodoPrompt';
import { listRunnablePrompts } from './listRunnablePrompts';
import { parsePromptFile } from './parsePromptFile';

describe('prompt runner filtering', () => {
    it('matches model, model family, and harness tokens while preserving priority markers', () => {
        const file = parsePromptFile(
            'prompts/runner-filtering.md',
            spaceTrim(`
                [ ] use \`gpt-5.5\`
                Exact model
                ---
                [ ] use model \`gpt-5.5\`
                Exact model with wording
                ---
                [ ] !!!! \`gpt\`
                Model family
                ---
                [ ] use \`github-copilot\` !!!!!
                Harness
                ---
                [ ] use \`claude-opus\` or \`github-copilot\`
                One of multiple tokens
                ---
                [ ] use \`claude-opus\`
                Different model family
                ---
                [ ]
                Unrestricted
            `),
        );

        const runnable = listRunnablePrompts(
            [file],
            {},
            {
                harnessName: 'github-copilot',
                modelName: 'gpt-5.5',
            },
        );

        expect(runnable.map(({ section }) => section.index)).toEqual([0, 1, 2, 3, 4, 6]);
        expect(runnable.map(({ section }) => section.priority)).toEqual([0, 0, 4, 5, 0, 0]);
        expect(
            findNextTodoPrompt([file], {}, { harnessName: 'github-copilot', modelName: 'gpt-5.5' })?.section.index,
        ).toBe(3);
    });

    it('matches normalized model families and aliases dynamically', () => {
        const file = parsePromptFile(
            'prompts/runner-filtering.md',
            spaceTrim(`
                [ ] use \`CLAUDE\`
                Claude family
                ---
                [ ] \`claude-opus\`
                Claude Opus family
                ---
                [ ] \`opus\`
                Opus alias
                ---
                [ ] \`claude-opus-4.8\`
                Exact normalized model
                ---
                [ ] \`gpt\`
                Different family
            `),
        );

        const runnable = listRunnablePrompts(
            [file],
            {},
            {
                harnessName: 'claude-code',
                modelName: 'claude-opus-4.8',
            },
        );

        expect(runnable.map(({ section }) => section.index)).toEqual([0, 1, 2, 3]);
    });

    it('matches agent path aliases and Book titles alongside harness and model tokens', () => {
        const file = parsePromptFile(
            'prompts/runner-filtering.md',
            spaceTrim(`
                [ ] use \`agents/coding/developer.book\`
                Full agent path
                ---
                [ ] use \`developer.book\`
                Agent filename
                ---
                [ ] use \`developer\`
                Agent filename without extension
                ---
                [ ] use \`Developer Foo bar\`
                Agent Book title
                ---
                [ ] use \`openai-codex\`
                Harness alongside agent routing
                ---
                [ ] use \`gpt-5.6-astra\`
                Model alongside agent routing
                ---
                [ ] use \`unslopper\`
                Different agent
            `),
        );

        const runnable = listRunnablePrompts(
            [file],
            {},
            {
                harnessName: 'openai-codex',
                modelName: 'gpt-5.6-astra',
                agentReferences: [
                    'agents/coding/developer.book',
                    'developer.book',
                    'developer',
                    'developer-foo-bar',
                ],
            },
        );

        expect(runnable.map(({ section }) => section.index)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('does not constrain prompts when no runner identity is provided', () => {
        const file = parsePromptFile(
            'prompts/runner-filtering.md',
            spaceTrim(`
                [ ] use \`gpt\`
                Model-specific task
                ---
                [ ]
                General task
            `),
        );

        expect(listRunnablePrompts([file])).toHaveLength(2);
    });
});
