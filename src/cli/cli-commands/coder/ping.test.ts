import { Command } from 'commander';
import { pingCoderHarness } from '../../../../scripts/run-codex-prompts/ping/pingCoderHarness';
import { printCoderPingResult } from '../../../../scripts/run-codex-prompts/ping/printCoderPingResult';
import { ZERO_USAGE } from '../../../execution/utils/usage-constants';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { $initializeCoderPingCommand } from './ping';

jest.mock('../common/harness/$ensureHarnessInstallations', () => ({
    $ensureHarnessInstallations: jest.fn(),
}));

jest.mock('../../../../scripts/run-codex-prompts/ping/pingCoderHarness', () => ({
    pingCoderHarness: jest.fn(),
}));

jest.mock('../../../../scripts/run-codex-prompts/ping/printCoderPingResult', () => ({
    printCoderPingResult: jest.fn(),
}));

/**
 * Typed Jest mock for the harness ping entrypoint.
 */
function getPingCoderHarnessMock(): jest.MockedFunction<typeof pingCoderHarness> {
    return pingCoderHarness as jest.MockedFunction<typeof pingCoderHarness>;
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
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getPingCoderHarnessMock().mockResolvedValue({
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-sol',
            thinkingLevel: 'xhigh',
            answer: '42',
            isAnswerCorrect: true,
            durationMs: 1234,
            usage: ZERO_USAGE,
        });
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('pings the selected harness, model and thinking level', async () => {
        const program = createProgramWithPingCommand();

        await program.parseAsync(
            ['node', 'test', 'ping', '--harness', 'openai-codex', '--model', 'gpt-5.6-sol', '--thinking-level', 'xhigh'],
            { from: 'node' },
        );

        expect(getPingCoderHarnessMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'openai-codex',
                model: 'gpt-5.6-sol',
                thinkingLevel: 'xhigh',
            }),
        );
    });

    it('checks the harness installation before pinging it', async () => {
        const program = createProgramWithPingCommand();

        await program.parseAsync(['node', 'test', 'ping', '--harness', 'claude-code'], { from: 'node' });

        expect($ensureHarnessInstallations).toHaveBeenCalledWith(['claude-code']);
    });

    it('keeps the compact result without streaming the raw harness output by default', async () => {
        const program = createProgramWithPingCommand();

        await program.parseAsync(['node', 'test', 'ping', '--harness', 'claude-code'], { from: 'node' });

        expect(getPingCoderHarnessMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                shouldPrintLiveOutput: false,
            }),
        );
        expect(printCoderPingResult).toHaveBeenCalledTimes(1);
    });

    it('streams the raw harness output when --no-ui is provided', async () => {
        const program = createProgramWithPingCommand();

        await program.parseAsync(['node', 'test', 'ping', '--harness', 'claude-code', '--no-ui'], { from: 'node' });

        expect(getPingCoderHarnessMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                shouldPrintLiveOutput: true,
            }),
        );
    });

    it('refuses to ping without a selected harness', async () => {
        const program = createProgramWithPingCommand();

        await program.parseAsync(['node', 'test', 'ping'], { from: 'node' });

        expect(getPingCoderHarnessMock()).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });
});
