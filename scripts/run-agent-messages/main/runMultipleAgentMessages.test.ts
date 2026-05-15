import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AgentRunOptions } from '../AgentRunOptions';
import { runMultipleAgentMessages } from './runMultipleAgentMessages';
import { synchronizeGithubAgentRunnerRepositories } from './synchronizeGithubAgentRunnerRepositories';
import { tickAgentMessages } from './tickAgentMessages';

jest.mock('./tickAgentMessages', () => ({
    tickAgentMessages: jest.fn(),
}));

jest.mock('./synchronizeGithubAgentRunnerRepositories', () => ({
    synchronizeGithubAgentRunnerRepositories: jest.fn(),
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
        ...overrides,
    };
}

/**
 * Creates one temporary root directory for multi-agent runner tests.
 */
async function createTemporaryRootDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-agent-multiple-run-'));
}

describe('runMultipleAgentMessages', () => {
    let temporaryRootDirectory: string | undefined;

    beforeEach(() => {
        jest.clearAllMocks();
        (synchronizeGithubAgentRunnerRepositories as jest.MockedFunction<typeof synchronizeGithubAgentRunnerRepositories>)
            .mockResolvedValue({
                clonedRepositoryNames: [],
                synchronizedAt: Date.now(),
            });
        (tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mockResolvedValue({
            isMessageProcessed: true,
        });
    });

    afterEach(async () => {
        process.chdir(ORIGINAL_WORKING_DIRECTORY);

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
        expect(process.cwd()).toBe(temporaryRootDirectory);
        expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[0]).toEqual(
            expect.objectContaining({
                agentName: 'github-copilot',
            }),
        );
        expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[1]).toEqual(
            expect.objectContaining({
                isQuietWhenIdle: true,
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
        await runMultipleAgentMessages(createAgentRunOptions(), {
            shouldContinue: () => loopStates.shift() ?? false,
        });

        expect(synchronizeGithubAgentRunnerRepositories).toHaveBeenCalledTimes(2);
        expect(tickAgentMessages).toHaveBeenCalledTimes(1);
        expect(process.cwd()).toBe(temporaryRootDirectory);
    });
});
