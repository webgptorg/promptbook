import { Command } from 'commander';
import { resolveCoderAgentBook } from '../../../../scripts/run-codex-prompts/common/resolveCoderAgent';
import { runCodexPromptsServer } from '../../../../scripts/run-codex-prompts/main/runCodexPromptsServer';
import { NotFoundError } from '../../../errors/NotFoundError';
import { $assertSufficientFreeDiskSpace } from '../common/disk-space/$assertSufficientFreeDiskSpace';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';
import { $initializeCoderServerCommand } from './server';

jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPromptsServer', () => ({
    runCodexPromptsServer: jest.fn(),
}));

jest.mock('../../../../scripts/run-codex-prompts/common/resolveCoderAgent', () => ({
    resolveCoderAgentBook: jest.fn(),
}));

jest.mock('../common/disk-space/$assertSufficientFreeDiskSpace', () => ({
    $assertSufficientFreeDiskSpace: jest.fn(),
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
 * Typed Jest mock for the free disk space preflight check.
 */
function getAssertSufficientFreeDiskSpaceMock(): jest.MockedFunction<typeof $assertSufficientFreeDiskSpace> {
    return $assertSufficientFreeDiskSpace as jest.MockedFunction<typeof $assertSufficientFreeDiskSpace>;
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
        getAssertSufficientFreeDiskSpaceMock().mockResolvedValue(undefined);
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

        await program.parseAsync(['node', 'test', 'server', '--harness', 'qwen-code'], {
            from: 'node',
        });

        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['qwen-code'], { isAskingQuestionsEnabled: true });
        expect($ensureCoderHarnessGitignoreRules).toHaveBeenCalledWith(process.cwd(), 'qwen-code', {
            isAskingQuestionsEnabled: true,
        });
        expect(getRunCodexPromptsServerMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'qwen-code',
                dryRun: false,
            }),
        );
    });

    it('asks nothing before starting a server with --no-questions', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--harness', 'qwen-code', '--no-questions'], {
            from: 'node',
        });

        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['qwen-code'], { isAskingQuestionsEnabled: false });
        expect($ensureCoderHarnessGitignoreRules).toHaveBeenCalledWith(process.cwd(), 'qwen-code', {
            isAskingQuestionsEnabled: false,
        });
        expect(getRunCodexPromptsServerMock()).toHaveBeenCalledTimes(1);
    });

    it('previews with an explicit Book without installations or repository setup', async () => {
        const program = createProgramWithServerCommand();
        await program.parseAsync(
            ['node', 'test', 'server', '--dry-run', '--harness', 'openai-codex', '--agent', 'agents/custom role.book'],
            { from: 'node' },
        );
        expect($assertSufficientFreeDiskSpace).not.toHaveBeenCalled();
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect($ensureCoderHarnessGitignoreRules).not.toHaveBeenCalled();
        expect(getRunCodexPromptsServerMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agent: 'agents/custom role.book',
                agentName: 'openai-codex',
                dryRun: true,
            }),
        );
    });

    it('forwards the aggregate check command to the shared server runner', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(
            ['node', 'test', 'server', '--dry-run', '--harness', 'openai-codex', '--check', 'npm', 'run', 'check'],
            { from: 'node' },
        );

        expect(getRunCodexPromptsServerMock()).toHaveBeenCalledWith(
            expect.objectContaining({ checkCommand: 'npm run check' }),
        );
    });

    it('rejects an explicitly empty server check command', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--dry-run', '--check', ''], { from: 'node' });

        expect(getRunCodexPromptsServerMock()).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('non-empty project check command'));
    });

    it('rejects the removed server aggregate flag with migration guidance', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--dry-run', '--test', 'npm', 'test'], {
            from: 'node',
        });

        expect(getRunCodexPromptsServerMock()).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('`--test`'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('`--check`'));
    });

    it('rejects the removed server aggregate flag even without a value', async () => {
        const program = createProgramWithServerCommand();

        await program.parseAsync(['node', 'test', 'server', '--dry-run', '--test'], { from: 'node' });

        expect(getRunCodexPromptsServerMock()).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('`--test`'));
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('`--check`'));
    });

    it('rejects a missing Developer before setup or starting the server', async () => {
        (resolveCoderAgentBook as jest.MockedFunction<typeof resolveCoderAgentBook>).mockRejectedValueOnce(
            new NotFoundError('Missing Developer.'),
        );
        await createProgramWithServerCommand().parseAsync(['node', 'test', 'server', '--harness', 'openai-codex'], {
            from: 'node',
        });
        expect(resolveCoderAgentBook).toHaveBeenCalledWith(undefined, process.cwd(), { defaultRole: 'developer' });
        expect($ensureHarnessInstallations).not.toHaveBeenCalled();
        expect($ensureCoderHarnessGitignoreRules).not.toHaveBeenCalled();
        expect(getRunCodexPromptsServerMock()).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
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
