import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AgentRunOptions } from '../AgentRunOptions';
import { withAgentWatchErrorContext } from './handleAgentWatchError';
import { runMultipleAgentMessages } from './runMultipleAgentMessages';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { synchronizeGithubAgentRunnerRepositories } from './synchronizeGithubAgentRunnerRepositories';
import { tickAgentMessages } from './tickAgentMessages';

jest.mock('./tickAgentMessages', () => ({
    tickAgentMessages: jest.fn(),
}));

jest.mock('./synchronizeGithubAgentRunnerRepositories', () => ({
    synchronizeGithubAgentRunnerRepositories: jest.fn(),
}));

jest.mock('./pullLatestChangesForAgentQueueIfEnabled', () => ({
    pullLatestChangesForAgentQueueIfEnabled: jest.fn(),
}));

/**
 * Original working directory restored after multi-agent runner tests that switch to temporary projects.
 */
const ORIGINAL_WORKING_DIRECTORY = process.cwd();

/**
 * Creates one complete option set for multi-agent watch runs.
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

/**
 * Creates one temporary root directory for multi-agent runner tests.
 */
async function createTemporaryRootDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-agent-multiple-run-'));
}

/**
 * Waits until one Jest assertion passes.
 */
async function waitForExpectation(assertion: () => void, timeoutMs = 1_000): Promise<void> {
    const startedAt = Date.now();
    let lastError: unknown;

    while (Date.now() - startedAt < timeoutMs) {
        try {
            assertion();
            return;
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
    }

    if (lastError) {
        throw lastError;
    }
}

describe('runMultipleAgentMessages', () => {
    let temporaryRootDirectory: string | undefined;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        (
            synchronizeGithubAgentRunnerRepositories as jest.MockedFunction<
                typeof synchronizeGithubAgentRunnerRepositories
            >
        ).mockResolvedValue({
            clonedRepositoryNames: [],
            synchronizedAt: Date.now(),
        });
        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockResolvedValue({
            isMessageProcessed: true,
        });
        (
            pullLatestChangesForAgentQueueIfEnabled as jest.MockedFunction<
                typeof pullLatestChangesForAgentQueueIfEnabled
            >
        ).mockResolvedValue(Date.now());
    });

    afterEach(async () => {
        process.chdir(ORIGINAL_WORKING_DIRECTORY);
        consoleErrorSpy.mockRestore();

        if (temporaryRootDirectory) {
            await rm(temporaryRootDirectory, { recursive: true, force: true });
            temporaryRootDirectory = undefined;
        }
    });

    it('runs one queued message from a direct child repository and restores the root working directory afterwards', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'agent-a', 'messages', 'queued'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'agent-b', 'messages', 'queued'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'nested', 'agent-c', 'messages', 'queued'), { recursive: true });
        await writeFile(join(temporaryRootDirectory, 'agent-a', 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'agent-b', 'agent.book'), 'Agent B', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'nested', 'agent-c', 'agent.book'), 'Agent C', 'utf-8');
        await writeFile(
            join(temporaryRootDirectory, 'agent-b', 'messages', 'queued', 'question.book'),
            'MESSAGE @User\nHi\n',
            'utf-8',
        );

        process.chdir(temporaryRootDirectory);

        const loopStates = [true, false];
        await runMultipleAgentMessages(createAgentRunOptions(), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(tickAgentMessages).toHaveBeenCalledTimes(1);
        expect(synchronizeGithubAgentRunnerRepositories).not.toHaveBeenCalled();
        expect(process.cwd()).toBe(temporaryRootDirectory);
        expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[0]).toEqual(
            expect.objectContaining({
                agentName: 'github-copilot',
            }),
        );
        expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[1]).toEqual(
            expect.objectContaining({
                isQuietWhenIdle: true,
                projectPath: join(temporaryRootDirectory, 'agent-b'),
            }),
        );
    });

    it('runs one queued message per direct child repository in parallel within one watch iteration', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'agent-a', 'messages', 'queued'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'agent-b', 'messages', 'queued'), { recursive: true });
        await writeFile(join(temporaryRootDirectory, 'agent-a', 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'agent-b', 'agent.book'), 'Agent B', 'utf-8');
        await writeFile(
            join(temporaryRootDirectory, 'agent-a', 'messages', 'queued', 'question-a.book'),
            'MESSAGE @User\nA\n',
            'utf-8',
        );
        await writeFile(
            join(temporaryRootDirectory, 'agent-b', 'messages', 'queued', 'question-b.book'),
            'MESSAGE @User\nB\n',
            'utf-8',
        );

        process.chdir(temporaryRootDirectory);

        const loopStates = [true, false];
        await runMultipleAgentMessages(createAgentRunOptions(), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(tickAgentMessages).toHaveBeenCalledTimes(2);
        expect(
            (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls.map(
                (call) => call[1]?.projectPath,
            ),
        ).toEqual([join(temporaryRootDirectory, 'agent-a'), join(temporaryRootDirectory, 'agent-b')]);
    });

    it('starts another same-project queued message before the previous harness finishes when parallelism allows it', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        const agentProjectPath = join(temporaryRootDirectory, 'agent-a');
        await mkdir(join(agentProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(join(agentProjectPath, 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(agentProjectPath, 'messages', 'queued', 'first.book'), 'MESSAGE @User\nFirst\n', 'utf-8');

        process.chdir(temporaryRootDirectory);

        let isContinuing = true;
        let resolveFirstMessageRun: () => void = () => undefined;
        let resolveFirstMessageStarted: () => void = () => undefined;
        const firstMessageStarted = new Promise<void>((resolve) => {
            resolveFirstMessageStarted = resolve;
        });
        const firstMessageRun = new Promise<void>((resolve) => {
            resolveFirstMessageRun = resolve;
        });

        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockImplementation(
            async (_options, tickOptions) => {
                if (tickOptions?.queuedMessage?.fileName === 'first.book') {
                    resolveFirstMessageStarted();
                    await firstMessageRun;
                    return {
                        isMessageProcessed: true,
                        queuedMessage: tickOptions.queuedMessage,
                    };
                }

                if (tickOptions?.queuedMessage?.fileName === 'second.book') {
                    isContinuing = false;
                    return {
                        isMessageProcessed: true,
                        queuedMessage: tickOptions.queuedMessage,
                    };
                }

                return { isMessageProcessed: false };
            },
        );

        const runPromise = runMultipleAgentMessages(createAgentRunOptions({ maxParallelMessages: 2 }), {
            shouldContinue: () => isContinuing,
            queuePollIntervalMs: 1,
        });

        await firstMessageStarted;
        await writeFile(
            join(agentProjectPath, 'messages', 'queued', 'second.book'),
            'MESSAGE @User\nSecond\n',
            'utf-8',
        );
        await waitForExpectation(() => expect(tickAgentMessages).toHaveBeenCalledTimes(2));
        resolveFirstMessageRun();
        await runPromise;

        expect(
            (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls.map(
                (call) => call[1]?.queuedMessage?.fileName,
            ),
        ).toEqual(['first.book', 'second.book']);
    });

    it('ignores local repositories by agent name, normalized agent name, and agent id', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        const agentSourcesByDirectoryName = new Map([
            ['agent-active', 'Active Agent'],
            ['agent-raw-name', 'JohnSmith'],
            ['agent-normalized-name', 'John Doe'],
            ['agent-id', 'Ignored By Id\nMETA ID ABC123'],
        ]);

        for (const [directoryName, agentSource] of agentSourcesByDirectoryName) {
            await mkdir(join(temporaryRootDirectory, directoryName, 'messages', 'queued'), { recursive: true });
            await writeFile(join(temporaryRootDirectory, directoryName, 'agent.book'), agentSource, 'utf-8');
            await writeFile(
                join(temporaryRootDirectory, directoryName, 'messages', 'queued', 'question.book'),
                'MESSAGE @User\nHi\n',
                'utf-8',
            );
        }

        process.chdir(temporaryRootDirectory);

        const loopStates = [true, false];
        await runMultipleAgentMessages(createAgentRunOptions({ ignorePatterns: ['johnsmith', 'john-doe', 'abc*'] }), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(tickAgentMessages).toHaveBeenCalledTimes(1);
        expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[1]).toEqual(
            expect.objectContaining({
                projectPath: join(temporaryRootDirectory, 'agent-active'),
            }),
        );
    });

    it('keeps synchronizing GitHub while waiting for the first local agent repository and starts watching the cloned repository', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        process.chdir(temporaryRootDirectory);

        let synchronizationCallCount = 0;
        (
            synchronizeGithubAgentRunnerRepositories as jest.MockedFunction<
                typeof synchronizeGithubAgentRunnerRepositories
            >
        ).mockImplementation(async () => {
            synchronizationCallCount++;

            if (synchronizationCallCount === 2) {
                await mkdir(join(temporaryRootDirectory!, 'agent-new', 'messages', 'queued'), { recursive: true });
                await writeFile(join(temporaryRootDirectory!, 'agent-new', 'agent.book'), 'Agent new', 'utf-8');
                await writeFile(
                    join(temporaryRootDirectory!, 'agent-new', 'messages', 'queued', 'question.book'),
                    'MESSAGE @User\nHi\n',
                    'utf-8',
                );

                return {
                    clonedRepositoryNames: ['agent-new'],
                    synchronizedAt: Date.now(),
                };
            }

            return {
                clonedRepositoryNames: [],
                synchronizedAt: Date.now(),
            };
        });

        const loopStates = [true, true, false];
        await runMultipleAgentMessages(createAgentRunOptions({ autoClone: true }), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(synchronizeGithubAgentRunnerRepositories).toHaveBeenCalledTimes(2);
        expect(tickAgentMessages).toHaveBeenCalledTimes(1);
        expect(process.cwd()).toBe(temporaryRootDirectory);
    });

    it('periodically pulls watched child repositories and then processes newly queued work without pulling twice', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'agent-a', 'messages', 'queued'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'agent-b', 'messages', 'queued'), { recursive: true });
        await writeFile(join(temporaryRootDirectory, 'agent-a', 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'agent-b', 'agent.book'), 'Agent B', 'utf-8');
        process.chdir(temporaryRootDirectory);

        const pulledProjectPaths: string[] = [];
        (
            pullLatestChangesForAgentQueueIfEnabled as jest.MockedFunction<
                typeof pullLatestChangesForAgentQueueIfEnabled
            >
        ).mockImplementation(async ({ projectPath }) => {
            pulledProjectPaths.push(projectPath);

            if (projectPath.endsWith('agent-b')) {
                await writeFile(
                    join(projectPath, 'messages', 'queued', 'question.book'),
                    'MESSAGE @User\nHi\n',
                    'utf-8',
                );
            }

            return 123_456;
        });

        const loopStates = [true, false];
        await runMultipleAgentMessages(createAgentRunOptions({ autoPull: true, autoPush: true }), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(pulledProjectPaths.sort()).toEqual([
            join(temporaryRootDirectory, 'agent-a'),
            join(temporaryRootDirectory, 'agent-b'),
        ]);
        expect(tickAgentMessages).toHaveBeenCalledTimes(1);
        expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[0]).toEqual(
            expect.objectContaining({
                autoPull: false,
                autoPush: true,
            }),
        );
        expect(process.cwd()).toBe(temporaryRootDirectory);
    });

    it('logs one failing child repository and keeps processing the other watched agents', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        await mkdir(join(temporaryRootDirectory, 'agent-a', 'messages', 'queued'), { recursive: true });
        await mkdir(join(temporaryRootDirectory, 'agent-b', 'messages', 'queued'), { recursive: true });
        await writeFile(join(temporaryRootDirectory, 'agent-a', 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(temporaryRootDirectory, 'agent-b', 'agent.book'), 'Agent B', 'utf-8');
        await writeFile(
            join(temporaryRootDirectory, 'agent-a', 'messages', 'queued', 'question-a.book'),
            'MESSAGE @User\nA\n',
            'utf-8',
        );
        await writeFile(
            join(temporaryRootDirectory, 'agent-b', 'messages', 'queued', 'question-b.book'),
            'MESSAGE @User\nB\n',
            'utf-8',
        );
        await mkdir(join(temporaryRootDirectory, '.promptbook', 'agent-messages'), { recursive: true });
        await writeFile(
            join(temporaryRootDirectory, '.promptbook', 'agent-messages', 'question-a.log.txt'),
            '--- raw input ---\necho failing agent\n',
            'utf-8',
        );

        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockImplementation(
            async (_options, tickOptions) => {
                if (tickOptions?.projectPath?.endsWith('agent-a')) {
                    throw withAgentWatchErrorContext(new Error('Agent A failed'), {
                        projectPath: tickOptions.projectPath,
                        queuedMessageRelativePath: 'messages/queued/question-a.book',
                        scriptPath: join(tickOptions.projectPath, '.promptbook', 'agent-messages', 'question-a.sh'),
                        runtimeLogPath: join(
                            temporaryRootDirectory!,
                            '.promptbook',
                            'agent-messages',
                            'question-a.log.txt',
                        ),
                    });
                }

                return { isMessageProcessed: true };
            },
        );

        process.chdir(temporaryRootDirectory);

        const loopStates = [true, false];
        await runMultipleAgentMessages(createAgentRunOptions(), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(tickAgentMessages).toHaveBeenCalledTimes(2);
        const errorLogFileName = (await readdir(temporaryRootDirectory)).find((fileName) =>
            /^ptbk-agent-error-.*\.log$/u.test(fileName),
        );

        expect(errorLogFileName).toBeDefined();
        expect(await readFile(join(temporaryRootDirectory, errorLogFileName!), 'utf-8')).toContain(
            'echo failing agent',
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('moves a repeatedly failing child message to failed after the configured retry cap', async () => {
        temporaryRootDirectory = await createTemporaryRootDirectory();
        const agentProjectPath = join(temporaryRootDirectory, 'agent-a');
        await mkdir(join(agentProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(join(agentProjectPath, 'agent.book'), 'Agent A', 'utf-8');
        await writeFile(join(agentProjectPath, 'messages', 'queued', 'question.book'), 'MESSAGE @User\nA\n', 'utf-8');

        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockImplementation(
            async (_options, tickOptions) => {
                throw withAgentWatchErrorContext(new Error('No authentication information found.'), {
                    projectPath: tickOptions?.projectPath,
                    queuedMessageRelativePath: 'messages/queued/question.book',
                });
            },
        );

        process.chdir(temporaryRootDirectory);

        const loopStates = [true, true, false];
        await runMultipleAgentMessages(createAgentRunOptions({ maxMessageProcessingFailures: 2 }), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(tickAgentMessages).toHaveBeenCalledTimes(2);
        expect(await readdir(join(agentProjectPath, 'messages', 'queued'))).toEqual([]);
        const failedMessage = await readFile(join(agentProjectPath, 'messages', 'failed', 'question.book'), 'utf-8');
        expect(failedMessage).toContain('Local agent runner failed after 2 attempt(s) and stopped retrying.');
        expect(failedMessage).toContain('No authentication information found.');
    });
});
