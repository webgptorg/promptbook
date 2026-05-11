import { Command } from 'commander';
import { runAgentMessages } from '../../../../scripts/run-agent-messages/main/runAgentMessages';
import { tickAgentMessages } from '../../../../scripts/run-agent-messages/main/tickAgentMessages';
import { $initializeAgentRunCommand } from './run';
import { $initializeAgentTickCommand } from './tick';

jest.mock('../../../../scripts/run-agent-messages/main/runAgentMessages', () => ({
    runAgentMessages: jest.fn(),
}));

jest.mock('../../../../scripts/run-agent-messages/main/tickAgentMessages', () => ({
    tickAgentMessages: jest.fn(),
}));

/**
 * Typed Jest mock for the agent watch runner entrypoint.
 */
function getRunAgentMessagesMock(): jest.MockedFunction<typeof runAgentMessages> {
    return runAgentMessages as jest.MockedFunction<typeof runAgentMessages>;
}

/**
 * Typed Jest mock for the agent tick entrypoint.
 */
function getTickAgentMessagesMock(): jest.MockedFunction<typeof tickAgentMessages> {
    return tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>;
}

describe('agent runner commands', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getRunAgentMessagesMock().mockResolvedValue(undefined);
        getTickAgentMessagesMock().mockResolvedValue({ isMessageProcessed: false });
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('passes shared runner options to `agent run`', async () => {
        const program = new Command();
        $initializeAgentRunCommand(program);

        await program.parseAsync(
            [
                'node',
                'test',
                'run',
                '--agent',
                'github-copilot',
                '--model',
                'gpt-5.4',
                '--thinking-level',
                'xhigh',
                '--no-ui',
                '--auto-push',
                '--auto-pull',
            ],
            { from: 'node' },
        );

        expect(getRunAgentMessagesMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'github-copilot',
                model: 'gpt-5.4',
                thinkingLevel: 'xhigh',
                noUi: true,
                autoPush: true,
                autoPull: true,
            }),
        );
    });

    it('passes shared runner options to `agent tick`', async () => {
        const program = new Command();
        $initializeAgentTickCommand(program);

        await program.parseAsync(['node', 'test', 'tick', '--agent', 'github-copilot', '--no-commit'], {
            from: 'node',
        });

        expect(getTickAgentMessagesMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                agentName: 'github-copilot',
                noCommit: true,
            }),
        );
    });
});
