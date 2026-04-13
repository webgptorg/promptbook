import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptWithTestFeedback } from './runPromptWithTestFeedback';

/**
 * Creates a typed prompt-runner mock for verification-loop tests.
 */
function createMockRunner(): {
    runner: PromptRunner;
    runPromptMock: jest.MockedFunction<PromptRunner['runPrompt']>;
} {
    const runPromptMock = jest.fn<ReturnType<PromptRunner['runPrompt']>, Parameters<PromptRunner['runPrompt']>>();
    const runner: PromptRunner = {
        name: 'github-copilot',
        runPrompt: runPromptMock,
    };

    return { runner, runPromptMock };
}

/**
 * Convenience alias for the optional verification-command executor dependency.
 */
type RunPromptTestCommandExecutor = NonNullable<
    Parameters<typeof runPromptWithTestFeedback>[0]['runPromptTestCommandExecutor']
>;

describe('runPromptWithTestFeedback', () => {
    it('runs the runner only once when no verification command is configured', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const runPromptTestCommandExecutor = jest.fn<ReturnType<RunPromptTestCommandExecutor>, Parameters<RunPromptTestCommandExecutor>>();

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });

        const result = await runPromptWithTestFeedback({
            runner,
            prompt: 'Implement the feature',
            scriptPath: 'prompts/feature.sh',
            projectPath: 'C:\\repo',
            promptLabel: 'prompts/feature.md#1',
            runPromptTestCommandExecutor,
        });

        expect(result.attemptCount).toBe(1);
        expect(runPromptMock).toHaveBeenCalledTimes(1);
        expect(runPromptTestCommandExecutor).not.toHaveBeenCalled();
    });

    it('retries the prompt with verification feedback until the verification command passes', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const attemptCounts: number[] = [];
        const runPromptTestCommandExecutor = jest
            .fn<ReturnType<RunPromptTestCommandExecutor>, Parameters<RunPromptTestCommandExecutor>>()
            .mockRejectedValueOnce(new Error('Test suite failed\nExpected `true` to equal `false`'))
            .mockResolvedValueOnce('All tests passed');

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });

        const result = await runPromptWithTestFeedback({
            runner,
            prompt: 'Implement the feature',
            scriptPath: 'prompts/feature.sh',
            projectPath: 'C:\\repo',
            promptLabel: 'prompts/feature.md#1',
            testCommand: 'npm run test',
            onAttemptStarted: (attemptCount) => attemptCounts.push(attemptCount),
            runPromptTestCommandExecutor,
        });

        expect(result.attemptCount).toBe(2);
        expect(attemptCounts).toEqual([1, 2]);
        expect(runPromptMock).toHaveBeenCalledTimes(2);
        expect(runPromptTestCommandExecutor).toHaveBeenCalledTimes(2);
        expect(runPromptMock.mock.calls[1]?.[0].prompt).toContain('Retry attempt: 2 of 3');
        expect(runPromptMock.mock.calls[1]?.[0].prompt).toContain('Verification command: `npm run test`');
        expect(runPromptMock.mock.calls[1]?.[0].prompt).toContain('Expected `true` to equal `false`');
    });

    it('fails after the maximum number of verification attempts', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const attemptCounts: number[] = [];
        const runPromptTestCommandExecutor = jest
            .fn<ReturnType<RunPromptTestCommandExecutor>, Parameters<RunPromptTestCommandExecutor>>()
            .mockRejectedValue(new Error('Test suite failed hard'));

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });

        await expect(
            runPromptWithTestFeedback({
                runner,
                prompt: 'Implement the feature',
                scriptPath: 'prompts/feature.sh',
                projectPath: 'C:\\repo',
                promptLabel: 'prompts/feature.md#1',
                testCommand: 'npm run test',
                onAttemptStarted: (attemptCount) => attemptCounts.push(attemptCount),
                runPromptTestCommandExecutor,
            }),
        ).rejects.toThrow('Verification command `npm run test` failed for `prompts/feature.md#1` after 3 attempts.');

        expect(attemptCounts).toEqual([1, 2, 3]);
        expect(runPromptMock).toHaveBeenCalledTimes(3);
        expect(runPromptTestCommandExecutor).toHaveBeenCalledTimes(3);
    });
});
