import { $runGoScriptWithOutput } from '../../common/runGoScript/$runGoScriptWithOutput';
import { ClaudeCodeRunner } from './ClaudeCodeRunner';

jest.mock('../../common/runGoScript/$runGoScriptWithOutput', () => ({
    $runGoScriptWithOutput: jest.fn(),
}));

/**
 * Minimal successful Claude Code JSON output used by runner tests.
 */
const CLAUDE_CODE_RESULT_JSON =
    '{"type":"result","subtype":"success","is_error":false,"duration_ms":1,"duration_api_ms":1,"num_turns":1,"result":"","session_id":"test","total_cost_usd":0,"usage":{"input_tokens":1,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":2,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard"},"permission_denials":[],"uuid":"test"}';

describe('ClaudeCodeRunner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ($runGoScriptWithOutput as jest.MockedFunction<typeof $runGoScriptWithOutput>).mockResolvedValue(
            CLAUDE_CODE_RESULT_JSON,
        );
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
});
