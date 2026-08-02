import { Command } from 'commander';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $initializeCoderPingCommand } from './ping';
import { runCoderPing } from '../../../../scripts/run-agent-chat/runCoderPing';

jest.mock('../common/harness/$ensureHarnessInstallations', () => ({
    $ensureHarnessInstallations: jest.fn(),
}));

jest.mock('../../../../scripts/run-agent-chat/runCoderPing', () => ({
    runCoderPing: jest.fn(),
}));

/**
 * Typed Jest mock for the harness installation check.
 */
function getEnsureHarnessInstallationsMock(): jest.MockedFunction<typeof $ensureHarnessInstallations> {
    return $ensureHarnessInstallations as jest.MockedFunction<typeof $ensureHarnessInstallations>;
}

/**
 * Typed Jest mock for the disposable coder ping executor.
 */
function getRunCoderPingMock(): jest.MockedFunction<typeof runCoderPing> {
    return runCoderPing as jest.MockedFunction<typeof runCoderPing>;
}

/**
 * Creates a Commander program with the `coder ping` subcommand registered.
 */
function createProgramWithPingCommand(): Command {
    const program = new Command();
    $initializeCoderPingCommand(program);
    return program;
}

describe('$initializeCoderPingCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getEnsureHarnessInstallationsMock().mockResolvedValue(undefined);
        getRunCoderPingMock().mockResolvedValue({
            result: 'PONG',
            elapsedTimeMs: 1234,
        });
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('passes harness, model, thinking level, and credit options to the ping executor', async () => {
        const program = createProgramWithPingCommand();

        await program.parseAsync(
            [
                'node',
                'test',
                'ping',
                '--harness',
                'openai-codex',
                '--model',
                'gpt-5.6-sol',
                '--thinking-level',
                'xhigh',
                '--no-ui',
                '--allow-credits',
            ],
            { from: 'node' },
        );

        expect(getEnsureHarnessInstallationsMock()).toHaveBeenCalledWith(['openai-codex']);
        expect(getRunCoderPingMock()).toHaveBeenCalledWith({
            agentName: 'openai-codex',
            model: 'gpt-5.6-sol',
            thinkingLevel: 'xhigh',
            isUiDisabled: true,
            isCreditsAllowed: true,
        });
        expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Result: PONG'));
        expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Time: 1234 ms'));
        expect(processExitSpy).toHaveBeenCalledWith(0);
    });
});
