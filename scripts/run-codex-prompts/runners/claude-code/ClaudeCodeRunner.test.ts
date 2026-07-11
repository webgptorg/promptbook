import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import type { WaitForCoderRunPauseCheckpoint } from '../../common/CoderRunPauseCheckpoint';
import { ClaudeCodeRunner } from './ClaudeCodeRunner';

jest.mock('../../common/runGoScript/$runGoScriptWithOutput', () => ({
    $runGoScriptWithOutput: jest.fn(),
}));

/**
 * Minimal successful Claude Code JSON output used by runner tests.
 */
const CLAUDE_CODE_RESULT_JSON =
    '{"type":"result","subtype":"success","is_error":false,"duration_ms":1,"duration_api_ms":1,"num_turns":1,"result":"","session_id":"test","total_cost_usd":0,"usage":{"input_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":2,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard"},"permission_denials":[],"uuid":"test"}';

/**
 * Session id used by Claude Code resurrection tests.
 */
const CLAUDE_CODE_SESSION_ID = '61e19706-0dd7-4835-89b8-3ae12c0b57cc';

/**
 * Minimal Claude Code session-limit output used by runner tests.
 */
const CLAUDE_CODE_SESSION_LIMIT_OUTPUT = [
    `{"type":"system","subtype":"init","session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
    `{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","resetsAt":1000,"rateLimitType":"five_hour"},"session_id":"${CLAUDE_CODE_SESSION_ID}"}`,
    `{"type":"result","subtype":"success","is_error":true,"api_error_status":429,"result":"You've hit your session limit · resets 1:40pm (Europe/Prague)","session_id":"${CLAUDE_CODE_SESSION_ID}","total_cost_usd":0,"usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard"},"permission_denials":[],"uuid":"limit"}`,
].join('\n');

describe('ClaudeCodeRunner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ($runGoScriptWithOutput as jest.MockedFunction<typeof $runGoScriptWithOutput>).mockResolvedValue(
            CLAUDE_CODE_RESULT_JSON,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('passes thinking level to the Claude Code script', async () => {
        const runner = new ClaudeCodeRunner({ thinkingLevel: 'max' });

        await runner.runPrompt({
            prompt: 'Prompt body',
            projectPath: 'C:\\repo',
            scriptPath: 'C:\\repo\\temp\\runner.sh',
            preserveArtifactsOnSuccess: false,
        });

        expect($runGoScriptWithOutput).toHaveBeenCalledWith(
            expect.objectContaining({
                scriptContent: expect.stringContaining('--effort max'),
            }),
        );
    });

    it('passes model to the Claude Code script', async () => {
        const runner = new ClaudeCodeRunner({ model: 'claude-opus-4-8' });

        await runner.runPrompt({
            prompt: 'Prompt body',
            projectPath: 'C:\\repo',
            scriptPath: 'C:\\repo\\temp\\runner.sh',
            preserveArtifactsOnSuccess: false,
        });

        expect($runGoScriptWithOutput).toHaveBeenCalledWith(
            expect.objectContaining({
                scriptContent: expect.stringContaining('--model claude-opus-4-8'),
            }),
        );
    });

    it('automatically resumes the same Claude Code session after a session limit', async () => {
        jest.useFakeTimers({ now: new Date(1000 * 1000).getTime() });
        const waitForPauseCheckpoint = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);
        ($runGoScriptWithOutput as jest.MockedFunction<typeof $runGoScriptWithOutput>)
            .mockRejectedValueOnce(new Error(CLAUDE_CODE_SESSION_LIMIT_OUTPUT))
            .mockResolvedValueOnce(CLAUDE_CODE_RESULT_JSON);
        const runner = new ClaudeCodeRunner({ model: 'claude-opus-4-8' });

        const runPromise = runner.runPrompt({
            prompt: 'Prompt body',
            projectPath: 'C:\\repo',
            scriptPath: 'C:\\repo\\temp\\runner.sh',
            preserveArtifactsOnSuccess: false,
            shouldPrintLiveOutput: false,
            waitForPauseCheckpoint,
        });

        await jest.runAllTimersAsync();

        await expect(runPromise).resolves.toEqual({
            usage: expect.objectContaining({
                input: expect.objectContaining({
                    tokensCount: { value: 1 },
                }),
            }),
        });
        expect($runGoScriptWithOutput).toHaveBeenCalledTimes(2);
        expect(($runGoScriptWithOutput as jest.MockedFunction<typeof $runGoScriptWithOutput>).mock.calls[1]?.[0]).toEqual(
            expect.objectContaining({
                scriptContent: expect.stringContaining(`--resume "${CLAUDE_CODE_SESSION_ID}"`),
            }),
        );
        expect(($runGoScriptWithOutput as jest.MockedFunction<typeof $runGoScriptWithOutput>).mock.calls[1]?.[0]).toEqual(
            expect.objectContaining({
                scriptContent: expect.stringContaining('Claude Code session resurrection'),
            }),
        );
        expect(waitForPauseCheckpoint.mock.calls.map(([checkpoint]) => checkpoint.checkpointLabel)).toContain(
            'resurrecting the Claude Code session with --resume',
        );
    });
});
