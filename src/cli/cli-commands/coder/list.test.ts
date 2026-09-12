import { Command } from 'commander';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { resolveCoderAgentBook } from '../../../../scripts/run-codex-prompts/common/resolveCoderAgent';
import { listCoderPrompts } from '../../../../scripts/run-codex-prompts/main/listCoderPrompts';
import { $initializeCoderListCommand } from './list';

jest.mock('../../../../scripts/run-codex-prompts/main/listCoderPrompts', () => ({
    listCoderPrompts: jest.fn(),
}));

jest.mock('../../../../scripts/run-codex-prompts/common/resolveCoderAgent', () => ({
    resolveCoderAgentBook: jest.fn(),
}));

/**
 * Typed Jest mock for the read-only coder prompt listing entrypoint.
 */
function getListCoderPromptsMock(): jest.MockedFunction<typeof listCoderPrompts> {
    return listCoderPrompts as jest.MockedFunction<typeof listCoderPrompts>;
}

/**
 * Typed Jest mock for the selected agent Book resolver.
 */
function getResolveCoderAgentBookMock(): jest.MockedFunction<typeof resolveCoderAgentBook> {
    return resolveCoderAgentBook as jest.MockedFunction<typeof resolveCoderAgentBook>;
}

/**
 * Creates a Commander program with the `coder list` subcommand registered.
 */
function createProgramWithListCommand(): Command {
    const program = new Command();
    $initializeCoderListCommand(program);
    return program;
}

describe('$initializeCoderListCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let originalHarnessEnvironmentValue: string | undefined;
    let originalModelEnvironmentValue: string | undefined;

    beforeAll(() => {
        originalHarnessEnvironmentValue = process.env.PTBK_HARNESS;
        originalModelEnvironmentValue = process.env.PTBK_MODEL;
        delete process.env.PTBK_HARNESS;
        delete process.env.PTBK_MODEL;
    });

    beforeEach(() => {
        getListCoderPromptsMock().mockResolvedValue(0);
        getResolveCoderAgentBookMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        jest.clearAllMocks();
    });

    afterAll(() => {
        if (originalHarnessEnvironmentValue === undefined) {
            delete process.env.PTBK_HARNESS;
        } else {
            process.env.PTBK_HARNESS = originalHarnessEnvironmentValue;
        }

        if (originalModelEnvironmentValue === undefined) {
            delete process.env.PTBK_MODEL;
        } else {
            process.env.PTBK_MODEL = originalModelEnvironmentValue;
        }
    });

    it('lists prompts without requiring a harness', async () => {
        const program = createProgramWithListCommand();

        await program.parseAsync(['node', 'test', 'list'], { from: 'node' });

        expect(getListCoderPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                promptRunnerIdentity: undefined,
            }),
        );
    });

    it('passes harness, model, and inclusive priority filters to the prompt listing', async () => {
        const program = createProgramWithListCommand();

        await program.parseAsync(
            [
                'node',
                'test',
                'list',
                '--harness',
                'github-copilot',
                '--model',
                'gpt-5.5',
                '--min-priority',
                '2',
                '--max-priority',
                '4',
            ],
            { from: 'node' },
        );

        expect(getListCoderPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                minimumPriority: 2,
                maximumPriority: 4,
                promptRunnerIdentity: {
                    harnessName: 'github-copilot',
                    modelName: 'gpt-5.5',
                },
            }),
        );
    });

    it('passes selected agent references to the prompt listing', async () => {
        getResolveCoderAgentBookMock().mockResolvedValue({
            agentSource: 'Developer Foo bar' as string_book,
            agentReferences: [
                'agents/coding/developer.book',
                'developer.book',
                'developer',
                'developer-foo-bar',
            ],
        });
        const program = createProgramWithListCommand();

        await program.parseAsync(['node', 'test', 'list', '--agent', 'agents/coding/developer.book'], {
            from: 'node',
        });

        expect(getListCoderPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                promptRunnerIdentity: {
                    harnessName: undefined,
                    modelName: undefined,
                    agentReferences: [
                        'agents/coding/developer.book',
                        'developer.book',
                        'developer',
                        'developer-foo-bar',
                    ],
                },
            }),
        );
    });

    it('passes --priority as the legacy minimum-priority alias', async () => {
        const program = createProgramWithListCommand();

        await program.parseAsync(['node', 'test', 'list', '--priority', '3'], { from: 'node' });

        expect(getListCoderPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                priority: 3,
            }),
        );
    });
});
