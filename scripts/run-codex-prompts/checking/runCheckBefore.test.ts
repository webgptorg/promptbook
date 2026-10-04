import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { runCheckBefore } from './runCheckBefore';

/**
 * Creates a typed check-command executor mock for pre-coding check tests.
 */
function createTestCommandExecutor(): jest.MockedFunction<
    NonNullable<Parameters<typeof runCheckBefore>[0]['runPromptCheckCommandExecutor']>
> {
    return jest.fn();
}

describe('runCheckBefore', () => {
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('returns passing check output and waits immediately before the command', async () => {
        const runPromptCheckCommandExecutor = createTestCommandExecutor();
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >();
        runPromptCheckCommandExecutor.mockResolvedValue('All checks passed');

        const result = await runCheckBefore({
            checkCommand: 'npm run check',
            projectPath: 'C:\\repo',
            runPromptCheckCommandExecutor,
            waitForPauseCheckpoint,
        });

        expect(result).toEqual({ isPassed: true, checkOutput: 'All checks passed' });
        expect(runPromptCheckCommandExecutor).toHaveBeenCalledWith({
            command: 'npm run check',
            projectPath: 'C:\\repo',
            scriptPath: expect.stringContaining('.promptbook'),
        });
        expect(waitForPauseCheckpoint).toHaveBeenCalledWith({
            checkpointLabel: 'running initial check before the agent coding starts',
            phase: 'checking',
            statusMessage: 'Running initial check before the agent coding starts: npm run check',
        });
    });

    it('returns the failing check output so the caller can stop or create a repair prompt', async () => {
        const runPromptCheckCommandExecutor = createTestCommandExecutor();
        runPromptCheckCommandExecutor.mockRejectedValue(new Error('Expected true to be false'));

        const result = await runCheckBefore({
            checkCommand: 'npm run check',
            projectPath: 'C:\\repo',
            runPromptCheckCommandExecutor,
        });

        expect(result).toEqual({ isPassed: false, checkOutput: 'Expected true to be false' });
        expect(consoleErrorSpy).toHaveBeenCalledWith('Expected true to be false');
    });
});
