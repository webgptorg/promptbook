import { Command } from 'commander';
import { runCodexPrompts } from '../../../../scripts/run-codex-prompts/main/runCodexPrompts';
import { LimitReachedError } from '../../../errors/LimitReachedError';
import { $assertSufficientFreeDiskSpace } from '../common/disk-space/$assertSufficientFreeDiskSpace';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $ensurePromptbookCliInstallations } from '../common/promptbook-cli/$ensurePromptbookCliInstallations';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';
import { $initializeCoderRunCommand } from './run';

jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPrompts', () => ({
    runCodexPrompts: jest.fn(),
}));

jest.mock('../common/disk-space/$assertSufficientFreeDiskSpace', () => ({
    $assertSufficientFreeDiskSpace: jest.fn(),
}));

jest.mock('../common/promptbook-cli/$ensurePromptbookCliInstallations', () => ({
    $ensurePromptbookCliInstallations: jest.fn(),
}));

jest.mock('../common/harness/$ensureHarnessInstallations', () => ({
    $ensureHarnessInstallations: jest.fn(),
}));

jest.mock('./$ensureCoderHarnessGitignoreRules', () => ({
    $ensureCoderHarnessGitignoreRules: jest.fn(),
}));

/**
 * Typed Jest mock for the coding prompt runner entrypoint.
 */
function getRunCodexPromptsMock(): jest.MockedFunction<typeof runCodexPrompts> {
    return runCodexPrompts as jest.MockedFunction<typeof runCodexPrompts>;
}

/**
 * Typed Jest mock for the interactive Promptbook CLI update check.
 */
function getEnsurePromptbookCliInstallationsMock(): jest.MockedFunction<typeof $ensurePromptbookCliInstallations> {
    return $ensurePromptbookCliInstallations as jest.MockedFunction<typeof $ensurePromptbookCliInstallations>;
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
 * Creates a Commander program with the `coder run` subcommand registered.
 */
function createProgramWithRunCommand(): Command {
    const program = new Command();
    $initializeCoderRunCommand(program);
    return program;
}

describe('$initializeCoderRunCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getRunCodexPromptsMock().mockResolvedValue(undefined);
        getEnsurePromptbookCliInstallationsMock().mockResolvedValue(false);
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

    it('passes waitForUser as false when --no-auto is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                waitForUser: false,
            }),
        );
    });

    it('passes waitForUser as true when --no-auto is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-auto'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                waitForUser: true,
            }),
        );
    });

    it('checks Promptbook CLI installations before a default coder run', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect($ensurePromptbookCliInstallations).toHaveBeenCalledTimes(1);
    });

    it('also checks Promptbook CLI installations when per-prompt confirmation is enabled', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-auto'], { from: 'node' });

        expect($ensurePromptbookCliInstallations).toHaveBeenCalledTimes(1);
    });

    it('checks local ignore rules for the selected harness before a run', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--harness', 'qwen-code'], { from: 'node' });

        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['qwen-code'], { isAskingQuestionsEnabled: true });
        expect($ensureCoderHarnessGitignoreRules).toHaveBeenCalledWith(process.cwd(), 'qwen-code', {
            isAskingQuestionsEnabled: true,
        });
    });

    it('asks nothing before a run started with --no-questions', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--harness', 'qwen-code', '--no-questions'], {
            from: 'node',
        });

        expect($ensurePromptbookCliInstallations).toHaveBeenCalledWith({ isAskingQuestionsEnabled: false });
        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['qwen-code'], { isAskingQuestionsEnabled: false });
        expect($ensureCoderHarnessGitignoreRules).toHaveBeenCalledWith(process.cwd(), 'qwen-code', {
            isAskingQuestionsEnabled: false,
        });
        expect(getRunCodexPromptsMock()).toHaveBeenCalledTimes(1);
    });

    it('checks the free disk space before anything is installed or written', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect($assertSufficientFreeDiskSpace).toHaveBeenCalledWith(process.cwd());
    });

    it('never starts a run on a nearly full disk', async () => {
        getAssertSufficientFreeDiskSpaceMock().mockRejectedValue(
            new LimitReachedError('There is not enough free disk space to run `ptbk coder`.'),
        );
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect($ensurePromptbookCliInstallations).not.toHaveBeenCalled();
        expect(getRunCodexPromptsMock()).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('passes the interactive questions setting to the run so it knows whether it may pause', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-questions'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                isAskingQuestionsEnabled: false,
            }),
        );
    });

    it('refuses to combine --no-questions with the per-prompt confirmation of --no-auto', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-auto', '--no-questions'], { from: 'node' });

        expect(getRunCodexPromptsMock()).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('stops the current run after a Promptbook CLI installation was updated', async () => {
        getEnsurePromptbookCliInstallationsMock().mockResolvedValue(true);
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('defaults noCommit to false when --no-commit is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                noCommit: false,
            }),
        );
    });

    it('passes noCommit as true when --no-commit is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-commit'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                noCommit: true,
            }),
        );
    });

    it('defaults autoPush to false when --auto-push is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                autoPush: false,
            }),
        );
    });

    it('passes autoPush as true when --auto-push is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--auto-push'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                autoPush: true,
            }),
        );
    });

    it('defaults autoPull to false when --auto-pull is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                autoPull: false,
            }),
        );
    });

    it('passes autoPull as true when --auto-pull is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--auto-pull'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                autoPull: true,
            }),
        );
    });

    it('passes thinkingLevel through when provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--thinking-level', 'max'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                thinkingLevel: 'max',
            }),
        );
    });

    it('passes an agent selection alongside the harness and model', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(
            [
                'node',
                'test',
                'run',
                '--dry-run',
                '--harness',
                'openai-codex',
                '--model',
                'gpt-5.6-astra',
                '--agent',
                'agents/coding/developer.book',
            ],
            { from: 'node' },
        );

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                agentName: 'openai-codex',
                model: 'gpt-5.6-astra',
                agent: 'agents/coding/developer.book',
            }),
        );
    });

    it('passes the verification command through when provided as unquoted tokens', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--test', 'npm', 'run', 'test'], {
            from: 'node',
        });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                testCommand: 'npm run test',
            }),
        );
    });

    it('defaults pre-coding verification to no', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                testBefore: 'no',
                testCommand: undefined,
            }),
        );
    });

    it('passes pre-coding verification mode and uses npm test when no command is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--test-before', 'yes-and-fix'], {
            from: 'node',
        });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                testBefore: 'yes-and-fix',
                testCommand: 'npm test',
            }),
        );
    });

    it('keeps an explicit verification command when pre-coding verification is enabled', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(
            [
                'node',
                'test',
                'run',
                '--dry-run',
                '--test',
                'npm',
                'run',
                'test-for-ptbk-coder',
                '--test-before',
                'yes-and-fail',
            ],
            { from: 'node' },
        );

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                testBefore: 'yes-and-fail',
                testCommand: 'npm run test-for-ptbk-coder',
            }),
        );
    });

    it('defaults preserveLogs to false when --preserve-logs is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                preserveLogs: false,
            }),
        );
    });

    it('passes preserveLogs as true when --preserve-logs is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--preserve-logs'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                preserveLogs: true,
            }),
        );
    });

    it('defaults noUi to false when --no-ui is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                noUi: false,
            }),
        );
    });

    it('passes noUi as true when --no-ui is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-ui'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                noUi: true,
            }),
        );
    });

    it('defaults isIsolated to false when --isolate is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                isIsolated: false,
            }),
        );
    });

    it('passes isIsolated as true when --isolate is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--isolate'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                isIsolated: true,
            }),
        );
    });

    it('passes run limit through when provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--limit', '2'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                limit: 2,
            }),
        );
    });
});
