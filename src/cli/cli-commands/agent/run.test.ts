import { Command } from 'commander';
import { runAgentChat } from '../../../../scripts/run-agent-chat/runAgentChat';
import { runAgentExec } from '../../../../scripts/run-agent-chat/runAgentExec';
import { PTBK_THINKING_LEVEL_ENV } from '../common/promptRunnerCliOptions';
import { $initializeAgentChatCommand } from './chat';
import { $initializeAgentExecCommand } from './exec';

jest.mock('../../../../scripts/run-agent-chat/runAgentChat', () => ({
    runAgentChat: jest.fn(),
}));

jest.mock('../../../../scripts/run-agent-chat/runAgentExec', () => ({
    runAgentExec: jest.fn(),
}));

/**
 * Typed Jest mock for the interactive local agent chat entrypoint.
 */
function getRunAgentChatMock(): jest.MockedFunction<typeof runAgentChat> {
    return runAgentChat as jest.MockedFunction<typeof runAgentChat>;
}

/**
 * Typed Jest mock for the non-interactive local agent exec entrypoint.
 */
function getRunAgentExecMock(): jest.MockedFunction<typeof runAgentExec> {
    return runAgentExec as jest.MockedFunction<typeof runAgentExec>;
}

describe('agent chat and exec commands', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    const originalThinkingLevel = process.env[PTBK_THINKING_LEVEL_ENV];

    beforeEach(() => {
        delete process.env[PTBK_THINKING_LEVEL_ENV];
        getRunAgentChatMock().mockResolvedValue(undefined);
        getRunAgentExecMock().mockResolvedValue('Agent answer');
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        restoreEnvironmentVariable(PTBK_THINKING_LEVEL_ENV, originalThinkingLevel);
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('passes agent book, context, and runner options to `agent chat`', async () => {
        const program = new Command();
        $initializeAgentChatCommand(program);

        await program.parseAsync(
            [
                'node',
                'test',
                'chat',
                '--agent',
                './agents/default/generic-chatter.book',
                '--harness',
                'openai-codex',
                '--model',
                'gpt-5.4',
                '--thinking-level',
                'xhigh',
                '--context',
                './context.md',
            ],
            { from: 'node' },
        );

        expect(getRunAgentChatMock()).toHaveBeenCalledWith({
            agentPath: './agents/default/generic-chatter.book',
            context: './context.md',
            currentWorkingDirectory: process.cwd(),
            agentName: 'openai-codex',
            model: 'gpt-5.4',
            noUi: false,
            thinkingLevel: 'xhigh',
            allowCredits: false,
        });
        expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('passes message and runner options to `agent exec`', async () => {
        const program = new Command();
        $initializeAgentExecCommand(program);

        await program.parseAsync(
            [
                'node',
                'test',
                'exec',
                '--agent',
                './agents/default/generic-chatter.book',
                '--harness',
                'github-copilot',
                '--model',
                'gpt-5.4',
                '--message',
                'Hello',
                '--no-ui',
                '--allow-credits',
            ],
            { from: 'node' },
        );

        expect(getRunAgentExecMock()).toHaveBeenCalledWith({
            agentPath: './agents/default/generic-chatter.book',
            context: undefined,
            message: 'Hello',
            currentWorkingDirectory: process.cwd(),
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            noUi: true,
            thinkingLevel: undefined,
            allowCredits: true,
        });
        expect(processExitSpy).toHaveBeenCalledWith(0);
    });
});

/**
 * Restores one environment variable after tests mutate Commander env defaults.
 */
function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}
