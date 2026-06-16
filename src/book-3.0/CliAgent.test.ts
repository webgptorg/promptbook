import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Mock } from 'jest-mock';
import type { AgentChatTurnResult } from '../../scripts/run-agent-chat/executeAgentChatTurn';
import { book } from '../pipeline/book-notation';
import { Book } from './Book';

jest.mock('../../scripts/run-agent-chat/executeAgentChatTurn', () => ({
    executeAgentChatTurn: jest.fn(),
}));

const { executeAgentChatTurn } = jest.requireMock('../../scripts/run-agent-chat/executeAgentChatTurn') as {
    executeAgentChatTurn: Mock<(options: unknown) => Promise<AgentChatTurnResult>>;
};

describe('CliAgent', () => {
    let CliAgent: typeof import('./CliAgent').CliAgent;
    let temporaryDirectoryPath: string;

    beforeAll(async () => {
        ({ CliAgent } = await import('./CliAgent'));
    });

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-cli-agent-'));
        executeAgentChatTurn.mockResolvedValue({
            answer: 'Agent answer',
            workspacePath: temporaryDirectoryPath,
            messageFilePath: join(temporaryDirectoryPath, 'thread.book'),
            agentPath: join(temporaryDirectoryPath, 'agent.book'),
        });
    });

    afterAll(async () => {
        jest.resetModules();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        if (temporaryDirectoryPath) {
            await rm(temporaryDirectoryPath, { recursive: true, force: true });
        }
    });

    it('calls executeAgentChatTurn directly for an existing agent path', async () => {
        const agentBookPath = join(temporaryDirectoryPath, 'agent.book');
        await writeFile(agentBookPath, 'Path Agent\n', 'utf-8');
        const cliAgent = new CliAgent({
            agentPath: agentBookPath,
            currentWorkingDirectory: temporaryDirectoryPath,
            harness: 'openai-codex',
            model: 'gpt-5.4',
        });

        const answer = await cliAgent.run('Hello there', {
            allowCredits: true,
            context: 'Background note',
        });

        expect(answer).toBe('Agent answer');
        expect(executeAgentChatTurn).toHaveBeenCalledWith(
            expect.objectContaining({
                agentPath: agentBookPath,
                messages: [{ sender: 'USER', content: 'Hello there' }],
                agentName: 'openai-codex',
                model: 'gpt-5.4',
                noUi: true,
                allowCredits: true,
                context: 'Background note',
                isVerbose: false,
                currentWorkingDirectory: temporaryDirectoryPath,
            }),
        );
    });

    it('materializes one temporary `.book` file for in-memory Book source', async () => {
        const cliAgent = new CliAgent({
            book: Book.parse(
                book`
                    Temporary Agent

                    PERSONA Helpful
                `,
            ),
            currentWorkingDirectory: temporaryDirectoryPath,
            harness: 'claude-code',
        });

        await cliAgent.run('Summarize this');

        const callOptions = executeAgentChatTurn.mock.calls[0]![0] as {
            agentPath: string;
        };
        const temporaryAgentPath = callOptions.agentPath;
        const persistedBookSource = await readFile(temporaryAgentPath, 'utf-8');

        expect(temporaryAgentPath).toContain('.promptbook');
        expect(persistedBookSource).toContain('Temporary Agent');
        expect(persistedBookSource.endsWith('\n')).toBe(true);
    });
});
