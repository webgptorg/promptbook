import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Mock } from 'jest-mock';
import { book } from '../pipeline/book-notation';
import { Book } from './Book';

jest.mock('../utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

const { $execCommand } = jest.requireMock('../utils/execCommand/$execCommand') as {
    $execCommand: Mock<(options: unknown) => Promise<string>>;
};

describe('CliAgent', () => {
    let CliAgent: typeof import('./CliAgent').CliAgent;
    let temporaryDirectoryPath: string;

    beforeAll(async () => {
        ({ CliAgent } = await import('./CliAgent'));
    });

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-cli-agent-'));
        $execCommand.mockResolvedValue('Agent answer');
    });

    afterAll(async () => {
        jest.resetModules();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('wraps `ptbk agent exec` for an existing agent path', async () => {
        const agentBookPath = join(temporaryDirectoryPath, 'agent.book');
        await writeFile(agentBookPath, 'Path Agent\n', 'utf-8');
        const cliAgent = new CliAgent({
            agentPath: agentBookPath,
            currentWorkingDirectory: temporaryDirectoryPath,
            harness: 'openai-codex',
            model: 'gpt-5.4',
        });

        await cliAgent.run('Hello there', {
            allowCredits: true,
            context: 'Background note',
        });

        expect($execCommand).toHaveBeenCalledWith({
            command: 'ptbk',
            args: [
                'agent',
                'exec',
                '--agent',
                agentBookPath,
                '--message',
                'Hello there',
                '--harness',
                'openai-codex',
                '--model',
                'gpt-5.4',
                '--no-ui',
                '--allow-credits',
                '--context',
                'Background note',
            ],
            cwd: temporaryDirectoryPath,
            crashOnError: true,
            timeout: Infinity,
            isVerbose: false,
        });
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
        });

        await cliAgent.run('Summarize this');

        const execOptions = $execCommand.mock.calls[0]![0] as {
            args: Array<string>;
        };
        const temporaryAgentPath = execOptions.args[3]!;
        const persistedBookSource = await readFile(temporaryAgentPath, 'utf-8');

        expect(temporaryAgentPath).toContain('.promptbook');
        expect(persistedBookSource).toContain('Temporary Agent');
        expect(persistedBookSource.endsWith('\n')).toBe(true);
    });
});
