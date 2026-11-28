import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { runCheckBefore } from './runCheckBefore';

/**
 * Creates a typed check-command executor mock for pre-coding verification tests.
 */
function createCheckCommandExecutor(): jest.MockedFunction<
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

    it('cannot report success when cancellation races with a completed command', async () => {
        const controller = new AbortController();
        const runPromptCheckCommandExecutor = createCheckCommandExecutor();
        runPromptCheckCommandExecutor.mockImplementation(async () => {
            controller.abort(new Error('Initial check cancelled'));
            return 'All checks passed!';
        });
        await expect(
            runCheckBefore({
                checkCommand: 'npm run test',
                projectPath: 'C:\\repo',
                signal: controller.signal,
                runPromptCheckCommandExecutor,
            }),
        ).rejects.toThrow('Initial check cancelled');
    });

    it('returns passing check output and waits immediately before the command', async () => {
        const runPromptCheckCommandExecutor = createCheckCommandExecutor();
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >();
        runPromptCheckCommandExecutor.mockResolvedValue('All tests passed');

        const result = await runCheckBefore({
            checkCommand: 'npm run test',
            projectPath: 'C:\\repo',
            runPromptCheckCommandExecutor,
            waitForPauseCheckpoint,
        });

        expect(result).toEqual({ isPassed: true, checkOutput: 'All tests passed' });
        expect(runPromptCheckCommandExecutor).toHaveBeenCalledWith({
            command: 'npm run test',
            projectPath: 'C:\\repo',
            scriptPath: expect.stringContaining('.promptbook'),
        });
        expect(waitForPauseCheckpoint).toHaveBeenCalledWith({
            checkpointLabel: 'running initial checks before the agent coding starts',
            phase: 'checking',
            statusMessage: 'Running initial checks before the agent coding starts: npm run test',
        });
    });

    it('returns the failing check output so the caller can stop or create a repair prompt', async () => {
        const runPromptCheckCommandExecutor = createCheckCommandExecutor();
        runPromptCheckCommandExecutor.mockRejectedValue(new Error('Expected true to be false'));

        const result = await runCheckBefore({
            checkCommand: 'npm test',
            projectPath: 'C:\\repo',
            runPromptCheckCommandExecutor,
        });

        expect(result).toEqual({ isPassed: false, checkOutput: 'Expected true to be false' });
        expect(consoleErrorSpy).toHaveBeenCalledWith('Expected true to be false');
    });
});
