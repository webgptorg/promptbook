import { Command } from 'commander';
import { runCodexPrompts } from '../../../../scripts/run-codex-prompts/main/runCodexPrompts';
import { $initializeCoderRunCommand } from './run';

jest.mock('../../../../scripts/run-codex-prompts/main/runCodexPrompts', () => ({
    runCodexPrompts: jest.fn(),
}));

/**
 * Typed Jest mock for the coding prompt runner entrypoint.
 */
function getRunCodexPromptsMock(): jest.MockedFunction<typeof runCodexPrompts> {
    return runCodexPrompts as jest.MockedFunction<typeof runCodexPrompts>;
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
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('passes waitForUser as true when --no-wait is omitted', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                waitForUser: true,
            }),
        );
    });

    it('passes waitForUser as false when --no-wait is provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--no-wait'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                waitForUser: false,
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

    it('passes thinkingLevel through when provided', async () => {
        const program = createProgramWithRunCommand();

        await program.parseAsync(['node', 'test', 'run', '--dry-run', '--thinking-level', 'xhigh'], { from: 'node' });

        expect(getRunCodexPromptsMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                dryRun: true,
                thinkingLevel: 'xhigh',
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
});
