import prompts from 'prompts';
import { runAgentChat } from './runAgentChat';

jest.mock('prompts', () => jest.fn());

/**
 * Typed Jest mock for the interactive prompt library used by `ptbk agent chat`.
 */
function getPromptsMock(): jest.MockedFunction<typeof prompts> {
    return prompts as jest.MockedFunction<typeof prompts>;
}

describe('runAgentChat', () => {
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        getPromptsMock().mockResolvedValue({ userMessage: 'exit' });
    });

    afterEach(() => {
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('does not print the exit hint during normal chat runs', async () => {
        await runAgentChat({
            agentPath: './agents/default/generic-chatter.book',
            currentWorkingDirectory: process.cwd(),
            agentName: 'openai-codex',
            model: 'gpt-5.4',
            isVerbose: false,
            noUi: false,
            thinkingLevel: 'xhigh',
            allowCredits: false,
        });

        expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('prints the exit hint when verbose logging is enabled', async () => {
        await runAgentChat({
            agentPath: './agents/default/generic-chatter.book',
            currentWorkingDirectory: process.cwd(),
            agentName: 'openai-codex',
            model: 'gpt-5.4',
            isVerbose: true,
            noUi: false,
            thinkingLevel: 'xhigh',
            allowCredits: false,
        });

        expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Type "exit" or "quit" to end the chat.'));
    });
});
