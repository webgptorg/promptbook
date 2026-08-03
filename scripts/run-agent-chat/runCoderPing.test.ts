import { access } from 'fs/promises';
import { executeAgentChatTurn } from './executeAgentChatTurn';
import { runCoderPing } from './runCoderPing';

jest.mock('./executeAgentChatTurn', () => ({
    executeAgentChatTurn: jest.fn(),
}));

/**
 * Typed Jest mock for one disposable agent chat turn.
 */
function getExecuteAgentChatTurnMock(): jest.MockedFunction<typeof executeAgentChatTurn> {
    return executeAgentChatTurn as jest.MockedFunction<typeof executeAgentChatTurn>;
}

describe('runCoderPing', () => {
    beforeEach(() => {
        getExecuteAgentChatTurnMock().mockResolvedValue({
            answer: 'PONG',
            workspacePath: '',
            messageFilePath: '',
            agentPath: '',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('runs the dummy turn outside the current project and removes the temporary project afterwards', async () => {
        const originalWorkingDirectory = process.cwd();
        const result = await runCoderPing({
            agentName: 'openai-codex',
            model: 'gpt-5.6-sol',
            thinkingLevel: 'xhigh',
            isUiDisabled: false,
            isCreditsAllowed: false,
        });

        const executionOptions = getExecuteAgentChatTurnMock().mock.calls[0]![0];

        expect(result.result).toBe('PONG');
        expect(result.elapsedTimeMs).toBeGreaterThanOrEqual(0);
        expect(process.cwd()).toBe(originalWorkingDirectory);
        expect(executionOptions.currentWorkingDirectory).not.toBe(process.cwd());
        expect(executionOptions.agentPath).toContain('ping.book');
        expect(executionOptions.messages).toEqual([
            {
                sender: 'USER',
                content: 'Reply with exactly the single word PONG and nothing else.',
            },
        ]);
        expect(executionOptions.isVerbose).toBe(false);
        expect(executionOptions.noUi).toBe(false);
        expect(executionOptions.allowCredits).toBe(false);
        await expect(access(executionOptions.currentWorkingDirectory!)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('removes the temporary project when the harness turn fails', async () => {
        const connectionError = new Error('Connection failed');
        getExecuteAgentChatTurnMock().mockRejectedValue(connectionError);

        await expect(
            runCoderPing({
                agentName: 'claude-code',
                isUiDisabled: false,
                isCreditsAllowed: false,
            }),
        ).rejects.toBe(connectionError);

        const executionOptions = getExecuteAgentChatTurnMock().mock.calls[0]![0];
        await expect(access(executionOptions.currentWorkingDirectory!)).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
