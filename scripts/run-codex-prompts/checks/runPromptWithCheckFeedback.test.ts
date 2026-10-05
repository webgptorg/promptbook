import { spaceTrim } from 'spacetrim';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptWithCheckFeedback } from './runPromptWithCheckFeedback';

/**
 * Creates a typed prompt-runner mock for check-loop tests.
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
 * Convenience alias for the optional check-command executor dependency.
 */
type RunPromptCheckCommandExecutor = NonNullable<
    Parameters<typeof runPromptWithCheckFeedback>[0]['runPromptCheckCommandExecutor']
>;

describe('runPromptWithCheckFeedback', () => {
    it('does not start a prompt when its check repair has already been cancelled', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const controller = new AbortController();
        controller.abort(new Error('Repair cancelled'));
        await expect(
            runPromptWithCheckFeedback({
                runner,
                prompt: 'Repair checks',
                scriptPath: 'prompts/repair.sh',
                projectPath: 'C:\\repo',
                promptLabel: 'repair',
                signal: controller.signal,
            }),
        ).rejects.toThrow('Repair cancelled');
        expect(runPromptMock).not.toHaveBeenCalled();
    });

    it('forwards cancellation to the harness and never passes or retries a cancelled check', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const controller = new AbortController();
        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });
        const runPromptCheckCommandExecutor = jest.fn<
            ReturnType<RunPromptCheckCommandExecutor>,
            Parameters<RunPromptCheckCommandExecutor>
        >(async () => {
            controller.abort(new Error('Repair check cancelled'));
            return 'All checks passed!';
        });
        await expect(
            runPromptWithCheckFeedback({
                runner,
                prompt: 'Repair checks',
                scriptPath: 'prompts/repair.sh',
                projectPath: 'C:\\repo',
                promptLabel: 'repair',
                checkCommand: 'npm run test',
                signal: controller.signal,
                runPromptCheckCommandExecutor,
            }),
        ).rejects.toThrow('Repair check cancelled');
        expect(runPromptMock).toHaveBeenCalledTimes(1);
        expect(runPromptMock.mock.calls[0]?.[0].signal).toBe(controller.signal);
        expect(runPromptCheckCommandExecutor).toHaveBeenCalledTimes(1);
    });

    it('runs the runner only once when no check command is configured', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const runPromptCheckCommandExecutor = jest.fn<
            ReturnType<RunPromptCheckCommandExecutor>,
            Parameters<RunPromptCheckCommandExecutor>
        >();
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >();

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });

        const result = await runPromptWithCheckFeedback({
            runner,
            prompt: 'Implement the feature',
            scriptPath: 'prompts/feature.sh',
            projectPath: 'C:\\repo',
            promptLabel: 'prompts/feature.md#1',
            runPromptCheckCommandExecutor,
            waitForPauseCheckpoint,
        });

        expect(result.attemptCount).toBe(1);
        expect(result.steps).toEqual([
            { kind: 'implementation', usage: UNCERTAIN_USAGE, durationMs: expect.any(Number) },
        ]);
        expect(runPromptMock).toHaveBeenCalledTimes(1);
        expect(runPromptCheckCommandExecutor).not.toHaveBeenCalled();
        expect(waitForPauseCheckpoint).toHaveBeenCalledWith({
            checkpointLabel: 'calling github-copilot (attempt 1)',
            phase: 'running',
            statusMessage: 'Calling github-copilot (attempt 1)',
        });
        expect(runPromptMock.mock.calls[0]?.[0].waitForPauseCheckpoint).toBe(waitForPauseCheckpoint);
    });

    it('retries the prompt with check feedback until the check command passes', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const attemptCounts: number[] = [];
        const pauseCheckpointLabels: string[] = [];
        const runPromptCheckCommandExecutor = jest
            .fn<ReturnType<RunPromptCheckCommandExecutor>, Parameters<RunPromptCheckCommandExecutor>>()
            .mockRejectedValueOnce(
                new Error(
                    spaceTrim(`
                Test suite failed
                Expected \`true\` to equal \`false\`
            `),
                ),
            )
            .mockResolvedValueOnce('All tests passed');
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async (checkpoint) => {
            pauseCheckpointLabels.push(checkpoint.checkpointLabel);
        });

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });

        const result = await runPromptWithCheckFeedback({
            runner,
            prompt: 'Implement the feature',
            scriptPath: 'prompts/feature.sh',
            projectPath: 'C:\\repo',
            promptLabel: 'prompts/feature.md#1',
            checkCommand: 'npm run test',
            onAttemptStarted: (attemptCount) => attemptCounts.push(attemptCount),
            runPromptCheckCommandExecutor,
            waitForPauseCheckpoint,
        });

        expect(result.attemptCount).toBe(2);
        expect(result.steps.map((step) => step.kind)).toEqual(['implementation', 'checking', 'fixing', 'checking']);
        expect(attemptCounts).toEqual([1, 2]);
        expect(runPromptMock).toHaveBeenCalledTimes(2);
        expect(runPromptCheckCommandExecutor).toHaveBeenCalledTimes(2);
        expect(pauseCheckpointLabels).toEqual([
            'calling github-copilot (attempt 1)',
            'running check after attempt #1',
            'calling github-copilot (attempt 2)',
            'running check after attempt #2',
        ]);
        expect(runPromptMock.mock.calls[1]?.[0].prompt).toContain('Retry attempt: 2 of 3');
        expect(runPromptMock.mock.calls[1]?.[0].prompt).toContain('Check command: `npm run test`');
        expect(runPromptMock.mock.calls[1]?.[0].prompt).toContain('Expected `true` to equal `false`');
    });

    it('announces every started step with the steps which already finished', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const startedSteps: Array<{ startedStepKind: string; finishedStepKinds: string[]; loginMethod?: string }> = [];
        const runPromptCheckCommandExecutor = jest
            .fn<ReturnType<RunPromptCheckCommandExecutor>, Parameters<RunPromptCheckCommandExecutor>>()
            .mockRejectedValueOnce(new Error('Test suite failed'))
            .mockResolvedValueOnce('All tests passed');

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE, loginMethod: 'chatgpt' });

        await runPromptWithCheckFeedback({
            runner,
            prompt: 'Implement the feature',
            scriptPath: 'prompts/feature.sh',
            projectPath: 'C:\\repo',
            promptLabel: 'prompts/feature.md#1',
            checkCommand: 'npm run test',
            onStepStarted: async (progress) => {
                startedSteps.push({
                    startedStepKind: progress.startedStepKind,
                    finishedStepKinds: progress.finishedSteps.map((step) => step.kind),
                    loginMethod: progress.loginMethod,
                });
            },
            runPromptCheckCommandExecutor,
        });

        expect(startedSteps).toEqual([
            { startedStepKind: 'implementation', finishedStepKinds: [], loginMethod: undefined },
            { startedStepKind: 'checking', finishedStepKinds: ['implementation'], loginMethod: 'chatgpt' },
            {
                startedStepKind: 'fixing',
                finishedStepKinds: ['implementation', 'checking'],
                loginMethod: 'chatgpt',
            },
            {
                startedStepKind: 'checking',
                finishedStepKinds: ['implementation', 'checking', 'fixing'],
                loginMethod: 'chatgpt',
            },
        ]);
    });

    it('verifies transformed content on every feedback attempt without changing it after a pass', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const events: string[] = [];
        runPromptMock.mockImplementation(async () => {
            events.push('repair');
            return { usage: UNCERTAIN_USAGE };
        });
        const onBeforeCheck = jest.fn(async () => {
            events.push('normalize');
        });
        const runPromptCheckCommandExecutor = jest.fn<
            ReturnType<RunPromptCheckCommandExecutor>,
            Parameters<RunPromptCheckCommandExecutor>
        >(async () => {
            events.push('check');
            if (runPromptCheckCommandExecutor.mock.calls.length === 1) throw new Error('Still failing');
            return 'Checks passed';
        });

        const result = await runPromptWithCheckFeedback({
            runner,
            prompt: 'Repair selected checks',
            scriptPath: 'prompts/repair.sh',
            projectPath: 'C:\\repo',
            promptLabel: 'repair',
            checkCommand: 'npm run check',
            onBeforeCheck,
            runPromptCheckCommandExecutor,
        });
        expect(result.attemptCount).toBe(2);
        expect(events).toEqual(['repair', 'normalize', 'check', 'repair', 'normalize', 'check']);
    });

    it('fails after the maximum number of check attempts', async () => {
        const { runner, runPromptMock } = createMockRunner();
        const attemptCounts: number[] = [];
        const runPromptCheckCommandExecutor = jest
            .fn<ReturnType<RunPromptCheckCommandExecutor>, Parameters<RunPromptCheckCommandExecutor>>()
            .mockRejectedValue(new Error('Test suite failed hard'));

        runPromptMock.mockResolvedValue({ usage: UNCERTAIN_USAGE });

        await expect(
            runPromptWithCheckFeedback({
                runner,
                prompt: 'Implement the feature',
                scriptPath: 'prompts/feature.sh',
                projectPath: 'C:\\repo',
                promptLabel: 'prompts/feature.md#1',
                checkCommand: 'npm run test',
                onAttemptStarted: (attemptCount) => attemptCounts.push(attemptCount),
                runPromptCheckCommandExecutor,
            }),
        ).rejects.toThrow('Check command `npm run test` failed for `prompts/feature.md#1` after 3 attempts.');

        expect(attemptCounts).toEqual([1, 2, 3]);
        expect(runPromptMock).toHaveBeenCalledTimes(3);
        expect(runPromptCheckCommandExecutor).toHaveBeenCalledTimes(3);
    });
});
