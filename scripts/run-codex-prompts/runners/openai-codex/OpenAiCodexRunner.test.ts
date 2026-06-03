import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { ProgressiveBackoff } from '../../common/ProgressiveBackoff';
import { $runGoScriptUntilMarkerIdle } from '../../common/runGoScript/$runGoScriptUntilMarkerIdle';
import type { WaitForCoderRunPauseCheckpoint } from '../../common/CoderRunPauseCheckpoint';
import { OpenAiCodexRunner } from './OpenAiCodexRunner';
import { buildCodexUsageFromOutput } from './buildCodexUsageFromOutput';

jest.mock('../../common/runGoScript/$runGoScriptUntilMarkerIdle', () => ({
    $runGoScriptUntilMarkerIdle: jest.fn(),
}));

jest.mock('./buildCodexUsageFromOutput', () => ({
    buildCodexUsageFromOutput: jest.fn(() => UNCERTAIN_USAGE),
}));

describe('OpenAiCodexRunner', () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('waits for pause checkpoints during rate-limit backoff and before retrying Codex', async () => {
        jest.useFakeTimers();
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        jest.spyOn(ProgressiveBackoff.prototype, 'nextDelayMs').mockReturnValue(10);
        jest.spyOn(ProgressiveBackoff.prototype, 'retryCount', 'get').mockReturnValue(1);
        ($runGoScriptUntilMarkerIdle as jest.MockedFunction<typeof $runGoScriptUntilMarkerIdle>)
            .mockRejectedValueOnce(new Error('rate limit reached'))
            .mockResolvedValueOnce('tokens used');

        const runner = new OpenAiCodexRunner({
            codexCommand: 'codex',
            model: 'gpt-5.2-codex',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
            allowCredits: false,
        });

        const runPromise = runner.runPrompt({
            prompt: 'Implement the feature',
            projectPath: 'C:\\repo',
            scriptPath: 'C:\\repo\\temp\\prompt.sh',
            waitForPauseCheckpoint,
        });

        await jest.runAllTimersAsync();

        await expect(runPromise).resolves.toEqual({ usage: UNCERTAIN_USAGE });
        expect($runGoScriptUntilMarkerIdle).toHaveBeenCalledTimes(2);
        expect(buildCodexUsageFromOutput).toHaveBeenCalledWith('tokens used', 'gpt-5.2-codex');
        expect(waitForPauseCheckpoint.mock.calls.map(([checkpoint]) => checkpoint.checkpointLabel)).toEqual([
            'the next OpenAI Codex retry after rate limit',
            'retrying the OpenAI Codex model call after rate limit',
        ]);
    });
});
