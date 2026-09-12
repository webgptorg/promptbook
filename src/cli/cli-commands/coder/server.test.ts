import { Command } from 'commander';
import { runCodexPromptsServer } from '../../../../scripts/run-codex-prompts/main/runCodexPromptsServer';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';
import { $initializeCoderServerCommand } from './server';

jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPromptsServer', () => ({
    runCodexPromptsServer: jest.fn(),
}));

jest.mock('../common/harness/$ensureHarnessInstallations', () => ({
    $ensureHarnessInstallations: jest.fn(),
}));

jest.mock('./$ensureCoderHarnessGitignoreRules', () => ({
    $ensureCoderHarnessGitignoreRules: jest.fn(),
}));

/**
 * Typed Jest mock for the coder server entrypoint.
 */
function getRunCodexPromptsServerMock(): jest.MockedFunction<typeof runCodexPromptsServer> {
    return runCodexPromptsServer as jest.MockedFunction<typeof runCodexPromptsServer>;
}

/**
 * Typed Jest mock for the selected-harness local ignore-rule check.
 */
function getEnsureCoderHarnessGitignoreRulesMock(): jest.MockedFunction<typeof $ensureCoderHarnessGitignoreRules> {
    return $ensureCoderHarnessGitignoreRules as jest.MockedFunction<typeof $ensureCoderHarnessGitignoreRules>;
}

/**
 * Creates a Commander program with the `coder server` subcommand registered.
 */
function createProgramWithServerCommand(): Command {
    const program = new Command();
    $initializeCoderServerCommand(program);
    return program;
}

describe('$initializeCoderServerCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getRunCodexPromptsServerMock().mockResolvedValue(undefined);
        getEnsureCoderHarnessGitignoreRulesMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('checks local ignore rules for the selected harness before starting the server', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--dry-run', '--harness', 'qwen-code'], {
            from: 'node',
        });

        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['qwen-code'], { isAskingQuestionsEnabled: true });
        expect($ensureCoderHarnessGitignoreRules).toHaveBeenCalledWith(process.cwd(), 'qwen-code', {
            isAskingQuestionsEnabled: true,
        });
        expect(getRunCodexPromptsServerMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'qwen-code',
                dryRun: true,
            }),
        );
    });

    it('asks nothing before starting a server with --no-questions', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--dry-run', '--harness', 'qwen-code', '--no-questions'], {
            from: 'node',
        });

        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['qwen-code'], { isAskingQuestionsEnabled: false });
        expect($ensureCoderHarnessGitignoreRules).toHaveBeenCalledWith(process.cwd(), 'qwen-code', {
            isAskingQuestionsEnabled: false,
        });
        expect(getRunCodexPromptsServerMock()).toHaveBeenCalledTimes(1);
    });

    it('refuses to combine --no-questions with the per-prompt confirmation of --no-auto', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--dry-run', '--no-auto', '--no-questions'], {
            from: 'node',
        });

        expect(getRunCodexPromptsServerMock()).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });
});
