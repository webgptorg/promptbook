import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { runTestBefore } from './runTestBefore';

/**
 * Creates a typed test-command executor mock for pre-coding verification tests.
 */
function createTestCommandExecutor(): jest.MockedFunction<
    NonNullable<Parameters<typeof runTestBefore>[0]['runPromptTestCommandExecutor']>
> {
    return jest.fn();
}

describe('runTestBefore', () => {
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('returns passing test output and waits immediately before the command', async () => {
        const runPromptTestCommandExecutor = createTestCommandExecutor();
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >();
        runPromptTestCommandExecutor.mockResolvedValue('All tests passed');

        const result = await runTestBefore({
            testCommand: 'npm run test',
            projectPath: 'C:\\repo',
            runPromptTestCommandExecutor,
            waitForPauseCheckpoint,
        });

        expect(result).toEqual({ isPassed: true, testOutput: 'All tests passed' });
        expect(runPromptTestCommandExecutor).toHaveBeenCalledWith({
            command: 'npm run test',
            projectPath: 'C:\\repo',
            scriptPath: expect.stringContaining('.promptbook'),
        });
        expect(waitForPauseCheckpoint).toHaveBeenCalledWith({
            checkpointLabel: 'running initial tests before the agent coding starts',
            phase: 'verifying',
            statusMessage: 'Running initial tests before the agent coding starts: npm run test',
        });
    });

    it('returns the failing test output so the caller can stop or create a repair prompt', async () => {
        const runPromptTestCommandExecutor = createTestCommandExecutor();
        runPromptTestCommandExecutor.mockRejectedValue(new Error('Expected true to be false'));

        const result = await runTestBefore({
            testCommand: 'npm test',
            projectPath: 'C:\\repo',
            runPromptTestCommandExecutor,
        });

        expect(result).toEqual({ isPassed: false, testOutput: 'Expected true to be false' });
        expect(consoleErrorSpy).toHaveBeenCalledWith('Expected true to be false');
    });
});
