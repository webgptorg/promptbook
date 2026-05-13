import type { AgentRunOptions } from '../AgentRunOptions';
import type { AgentMessageFile } from '../messages/AgentMessageFile';
import { listQueuedAgentMessages } from '../messages/listQueuedAgentMessages';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { runAgentMessages } from './runAgentMessages';
import { tickAgentMessages } from './tickAgentMessages';

jest.mock('../messages/listQueuedAgentMessages', () => ({
    listQueuedAgentMessages: jest.fn(),
}));

jest.mock('./pullLatestChangesForAgentQueueIfEnabled', () => ({
    pullLatestChangesForAgentQueueIfEnabled: jest.fn(),
}));

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

/**
 * Minimal queued message used by mocked queue scans.
 */
function createQueuedMessage(): AgentMessageFile {
    return {
        absolutePath: 'C:\\repo\\messages\\queued\\question.book',
        relativePath: 'messages/queued/question.book',
        fileName: 'question.book',
    };
}

describe('runAgentMessages', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        (listQueuedAgentMessages as jest.MockedFunction<typeof listQueuedAgentMessages>).mockResolvedValue([]);
        (
            pullLatestChangesForAgentQueueIfEnabled as jest.MockedFunction<typeof pullLatestChangesForAgentQueueIfEnabled>
        ).mockResolvedValue(123_456);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('auto-pulls periodically while idle when --auto-pull is enabled', async () => {
        const stopError = new Error('Stop test loop');
        const queuedMessage = createQueuedMessage();
        let remainingEmptyQueueChecksBeforeIdlePull = 15;

        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>)
            .mockResolvedValueOnce({ isMessageProcessed: false })
            .mockRejectedValueOnce(stopError);
        (listQueuedAgentMessages as jest.MockedFunction<typeof listQueuedAgentMessages>).mockImplementation(async () => {
            if (remainingEmptyQueueChecksBeforeIdlePull > 0) {
                remainingEmptyQueueChecksBeforeIdlePull--;
                return [];
            }

            return [queuedMessage];
        });

        const runPromise = runAgentMessages(createAgentRunOptions({ autoPull: true }));
        const rejectionExpectation = expect(runPromise).rejects.toBe(stopError);

        await jest.advanceTimersByTimeAsync(32_000);

        await rejectionExpectation;
        expect(pullLatestChangesForAgentQueueIfEnabled).toHaveBeenCalledWith({
            projectPath: process.cwd(),
            runOptions: expect.objectContaining({ autoPull: true }),
            logMessage: 'Pulling latest changes while idle...',
        });
    });
});
