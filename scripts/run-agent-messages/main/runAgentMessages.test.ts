import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AgentRunOptions } from '../AgentRunOptions';
import { withAgentWatchErrorContext } from './handleAgentWatchError';
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
        autoClone: false,
        ...overrides,
    };
}

describe('runAgentMessages', () => {
    const ORIGINAL_WORKING_DIRECTORY = process.cwd();
    let temporaryProjectPath: string | undefined;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        process.chdir(ORIGINAL_WORKING_DIRECTORY);
        jest.useRealTimers();
        jest.restoreAllMocks();

        if (temporaryProjectPath) {
            await rm(temporaryProjectPath, { recursive: true, force: true });
            temporaryProjectPath = undefined;
        }
    });

    it('prints the watch log in `--no-ui` mode and keeps idle ticks quiet', async () => {
        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockResolvedValue({
            isMessageProcessed: false,
        });

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
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            expect.stringContaining('Watching messages/queued for queued agent messages.'),
        );
    });

    it('rejects `--no-commit` watch mode without `--ignore-git-changes`', async () => {
        await expect(
            runAgentMessages(createAgentRunOptions({ noCommit: true }), {
                shouldContinue: () => false,
            }),
        ).rejects.toThrow('requires `--ignore-git-changes`');
    });

    it('logs recoverable queued-message failures and keeps watching', async () => {
        temporaryProjectPath = await mkdtemp(join(tmpdir(), 'ptbk-agent-watch-'));
        process.chdir(temporaryProjectPath);
        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });

        const runtimeLogPath = join(temporaryProjectPath, '.promptbook', 'agent-messages', 'question.log.txt');
        await mkdir(join(temporaryProjectPath, '.promptbook', 'agent-messages'), { recursive: true });
        await writeFile(runtimeLogPath, '--- raw input ---\necho hello\n', 'utf-8');

        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>)
            .mockRejectedValueOnce(
                withAgentWatchErrorContext(new Error('Runner exploded'), {
                    projectPath: temporaryProjectPath,
                    queuedMessageRelativePath: 'messages/queued/question.book',
                    scriptPath: join(temporaryProjectPath, '.promptbook', 'agent-messages', 'question.sh'),
                    runtimeLogPath,
                }),
            )
            .mockResolvedValueOnce({ isMessageProcessed: true });

        const loopStates = [true, true, false];
        const watchPromise = runAgentMessages(createAgentRunOptions({ noUi: true }), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        await watchPromise;

        expect(tickAgentMessages).toHaveBeenCalledTimes(2);

        const errorLogFileName = (await readdir(temporaryProjectPath)).find((fileName) =>
            /^ptbk-agent-error-.*\.log$/u.test(fileName),
        );

        expect(errorLogFileName).toBeDefined();
        expect(await readFile(join(temporaryProjectPath, errorLogFileName!), 'utf-8')).toContain('echo hello');
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('moves a queued message to failed after the configured number of runner failures', async () => {
        temporaryProjectPath = await mkdtemp(join(tmpdir(), 'ptbk-agent-watch-'));
        process.chdir(temporaryProjectPath);
        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(
            join(temporaryProjectPath, 'messages', 'queued', 'question.book'),
            'MESSAGE @User\nHi\n',
            'utf-8',
        );

        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockImplementation(async () => {
            throw withAgentWatchErrorContext(new Error('Runner quota exceeded'), {
                projectPath: temporaryProjectPath,
                queuedMessageRelativePath: 'messages/queued/question.book',
            });
        });

        const loopStates = [true, true, true, false];
        const watchPromise = runAgentMessages(
            createAgentRunOptions({
                noUi: true,
                maxMessageProcessingFailures: 3,
            }),
            {
                shouldContinue: () => loopStates.shift() ?? false,
                queuePollIntervalMs: 0,
            },
        );
        await watchPromise;

        expect(tickAgentMessages).toHaveBeenCalledTimes(3);
        expect(await readdir(join(temporaryProjectPath, 'messages', 'queued'))).toEqual([]);
        const failedMessage = await readFile(
            join(temporaryProjectPath, 'messages', 'failed', 'question.book'),
            'utf-8',
        );
        expect(failedMessage).toContain('Local agent runner failed after 3 attempt(s) and stopped retrying.');
        expect(failedMessage).toContain('Runner quota exceeded');
    });
});
