import { Command } from 'commander';
import { buildCodexPrompt } from '../../../../scripts/run-codex-prompts/prompts/buildCodexPrompt';
import { findNextTodoPrompt } from '../../../../scripts/run-codex-prompts/prompts/findNextTodoPrompt';
import { listRunnablePrompts } from '../../../../scripts/run-codex-prompts/prompts/listRunnablePrompts';
import { parsePromptFile } from '../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import { $initializeCoderCommand } from '../coder';
import { PROMPTS_README_TEMPLATE } from './promptsReadmeTemplate';

/** Status rows are read from the shipped guide so the reference cannot silently diverge from parsing. */
const DOCUMENTED_STATUSES = Array.from(
    PROMPTS_README_TEMPLATE.matchAll(
        /^\|\s+`([^`]+)`\s+\|\s+(todo|done|in-progress|failed|not-ready)\s+\|\s+(\d+)\s+\|/gm,
    ),
    ([, statusLine, status, priority]) => ({ statusLine: statusLine!, status: status!, priority: Number(priority) }),
);

/** Complete copyable PRDs, including the multiline routing example. */
const DOCUMENTED_PROMPT_EXAMPLES = Array.from(
    PROMPTS_README_TEMPLATE.matchAll(/```markdown\n([\s\S]*?)\n```/gu),
    ([, body]) => body!,
);

describe('prompts README examples', () => {
    it('covers every supported status spelling in the reference table', () => {
        expect(DOCUMENTED_STATUSES.map(({ statusLine }) => statusLine)).toEqual(
            expect.arrayContaining(['[ ]', '[^]', '[x]', '[X]', '[!]', '[-]', '[.]']),
        );
    });

    it.each(DOCUMENTED_STATUSES)(
        'parses $statusLine as $status at priority $priority',
        ({ statusLine, status, priority }) => {
            const file = parsePromptFile('example.md', `\n  ${statusLine}  \n\nExample title\nRequirements here.\n`);
            expect(file.sections).toHaveLength(1);
            expect(file.sections[0]).toMatchObject({ status, priority, statusLineIndex: 1 });
        },
    );

    it('keeps the complete example ready and the routing example split into independent multiline sections', () => {
        expect(DOCUMENTED_PROMPT_EXAMPLES).toHaveLength(2);
        const example = parsePromptFile('example.md', DOCUMENTED_PROMPT_EXAMPLES[0]!);
        expect(listRunnablePrompts([example])).toHaveLength(1);
        expect(example.sections[0]).toMatchObject({ status: 'todo', priority: 1, statusLineIndex: 0 });
        const prompt = buildCodexPrompt(example, example.sections[0]!);
        expect(prompt).toContain('## Acceptance criteria');
        expect(prompt).toContain('src/search/filterItems.ts');
        expect(prompt).not.toContain('[ ] !');
        expect(prompt).not.toContain('[✨🔎]');

        const targeting = parsePromptFile('targeting.md', DOCUMENTED_PROMPT_EXAMPLES[1]!);
        expect(targeting.sections.map(({ status, priority }) => ({ status, priority }))).toEqual([
            { status: 'todo', priority: 2 },
            { status: 'todo', priority: 3 },
            { status: 'todo', priority: 0 },
            { status: 'todo', priority: 1 },
        ]);
        expect(
            listRunnablePrompts([targeting], {}, { harnessName: 'openai-codex' }).map(({ section }) => section.index),
        ).toEqual([1]);
        expect(
            listRunnablePrompts([targeting], {}, { modelName: 'GPT-example' }).map(({ section }) => section.index),
        ).toEqual([0]);
        expect(
            listRunnablePrompts([targeting], {}, { agentReferences: ['agents/developer.book'] }).map(
                ({ section }) => section.index,
            ),
        ).toEqual([2, 3]);
        expect(
            listRunnablePrompts([targeting], {}, { harnessName: 'claude-code' }).map(({ section }) => section.index),
        ).toEqual([3]);
        expect(findNextTodoPrompt([targeting])?.section.index).toBe(1);
        expect(findNextTodoPrompt([targeting], { maximumPriority: 2 })?.section.index).toBe(0);
    });

    it('documents safe drafts without treating historical markers or ordinary prose as skip syntax', () => {
        for (const marker of ['[-]', '[.]', '[?]', '[ ] implement search']) {
            expect(PROMPTS_README_TEMPLATE).toContain(marker);
        }
        const file = parsePromptFile(
            'drafts.md',
            [
                '[-]\nDraft',
                '[.]\nDraft',
                '[ ]\n@@@',
                '[?]\nOrdinary content',
                'Unmarked task',
                '[ ] implement search',
            ].join('\n---\n'),
        );
        expect(listRunnablePrompts([file]).map(({ section }) => section.index)).toEqual([3, 4]);
    });

    it('only documents commands and command-example flags available in the registry', () => {
        const program = new Command();
        $initializeCoderCommand(program);
        const coder = program.commands.find((command) => command.name() === 'coder')!;
        const examples = Array.from(
            PROMPTS_README_TEMPLATE.matchAll(/`ptbk coder ([^`]+)`/gu),
            ([, example]) => example!,
        );
        expect(examples.length).toBeGreaterThanOrEqual(8);
        for (const example of examples) {
            const [commandName] = example.split(' ');
            if (commandName === '--help') continue;
            const command = coder.commands.find((candidate) => candidate.name() === commandName);
            expect(command).toBeDefined();
            for (const [flag] of example.matchAll(/--[a-z-]+/gu)) {
                expect(command!.options.some((option) => option.long === flag)).toBe(true);
            }
        }
    });

    it('links to upstream documentation over HTTPS instead of assuming a monorepo checkout', () => {
        const links = Array.from(PROMPTS_README_TEMPLATE.matchAll(/\]\(([^)]+)\)/gu), ([, target]) => target!);
        expect(links).toContain('https://coder.ptbk.io');
        expect(links).toContain('https://github.com/webgptorg/promptbook');
        expect(links.filter((target) => !target.startsWith('https://'))).toEqual(['../AGENTS.md']);
    });
});
