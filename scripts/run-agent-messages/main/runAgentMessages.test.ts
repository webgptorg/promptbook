import type { AgentRunOptions } from '../AgentRunOptions';
import { runAgentMessages } from './runAgentMessages';
import { tickAgentMessages } from './tickAgentMessages';

jest.mock('./tickAgentMessages', () => ({
    tickAgentMessages: jest.fn(),
}));

/**
 * Complete option set for the agent watch loop.
 */
function createAgentRunOptions(overrides: Partial<AgentRunOptions> = {}): AgentRunOptions {
    return {
        agentName: 'github-copilot',
        model: 'gpt-5.4',
        noUi: true,
        thinkingLevel: undefined,
        noCommit: false,
        ignoreGitChanges: false,
        normalizeLineEndings: false,
        allowCredits: false,
        autoPush: false,
        autoPull: false,
        ...overrides,
    };
}

describe('runAgentMessages', () => {
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('prints the watch log in `--no-ui` mode and keeps idle ticks quiet', async () => {
        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockResolvedValue({ isMessageProcessed: false });

        const loopStates = [true, false, false];
        await expect(
            runAgentMessages(createAgentRunOptions({ noUi: true }), {
                shouldContinue: () => loopStates.shift() ?? false,
            }),
        ).resolves.toBeUndefined();

        expect(tickAgentMessages).toHaveBeenCalledWith(expect.anything(), {
            isQuietWhenIdle: true,
            uiHandle: undefined,
        });
        expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Watching messages/queued for queued agent messages.'));
    });

    it('rejects `--no-commit` watch mode without `--ignore-git-changes`', async () => {
        await expect(
            runAgentMessages(createAgentRunOptions({ noCommit: true }), {
                shouldContinue: () => false,
            }),
        ).rejects.toThrow('requires `--ignore-git-changes`');
    });
});
