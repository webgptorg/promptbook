import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { AgentRunOptions } from '../AgentRunOptions';
import { ensureWorkingTreeCleanForAgentQueue } from '../git/ensureWorkingTreeCleanForAgentQueue';
import { isGitPathTracked } from '../git/isGitPathTracked';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
} from '../../run-codex-prompts/common/normalizeLineEndingsInChangedFiles';
import { withPromptRuntimeLog } from '../../run-codex-prompts/common/runGoScript/withPromptRuntimeLog';
import { printAgentGitIdentityTipAtProcessExitIfNeeded } from '../../run-codex-prompts/git/agentGitIdentity';
import { commitChanges } from '../../run-codex-prompts/git/commitChanges';
import { resolvePromptRunner } from '../../run-codex-prompts/main/resolvePromptRunner';
import { runPromptWithTestFeedback } from '../../run-codex-prompts/testing/runPromptWithTestFeedback';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { tickAgentMessages } from './tickAgentMessages';

jest.mock('../../run-codex-prompts/common/normalizeLineEndingsInChangedFiles', () => ({
    captureChangedFilesSnapshot: jest.fn(),
    normalizeLineEndingsInFilesChangedSinceSnapshot: jest.fn(),
}));

jest.mock('../../run-codex-prompts/common/runGoScript/withPromptRuntimeLog', () => ({
    withPromptRuntimeLog: jest.fn(async (_scriptPath: string, callback: (logPath: string) => Promise<void>) =>
        callback('C:\\temp\\agent-message.log.txt'),
    ),
}));

jest.mock('../../run-codex-prompts/git/agentGitIdentity', () => ({
    printAgentGitIdentityTipAtProcessExitIfNeeded: jest.fn(),
}));

jest.mock('../../run-codex-prompts/git/commitChanges', () => ({
    commitChanges: jest.fn(),
}));

jest.mock('../../run-codex-prompts/main/resolvePromptRunner', () => ({
    resolvePromptRunner: jest.fn(),
}));

jest.mock('../../run-codex-prompts/testing/runPromptWithTestFeedback', () => ({
    runPromptWithTestFeedback: jest.fn(),
}));

jest.mock('../git/ensureWorkingTreeCleanForAgentQueue', () => ({
    ensureWorkingTreeCleanForAgentQueue: jest.fn(),
}));

jest.mock('../git/isGitPathTracked', () => ({
    isGitPathTracked: jest.fn(),
}));

jest.mock('./pullLatestChangesForAgentQueueIfEnabled', () => ({
    pullLatestChangesForAgentQueueIfEnabled: jest.fn(),
}));

/**
 * Original working directory restored after tests that switch to a temporary project.
 */
const ORIGINAL_WORKING_DIRECTORY = process.cwd();

/**
 * Creates a complete option set for one agent tick.
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
 * Creates one temporary project directory.
 */
async function createTemporaryProject(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'ptbk-agent-'));
}

describe('tickAgentMessages', () => {
    let temporaryProjectPath: string | undefined;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        (
            ensureWorkingTreeCleanForAgentQueue as jest.MockedFunction<typeof ensureWorkingTreeCleanForAgentQueue>
        ).mockResolvedValue(undefined);
        (isGitPathTracked as jest.MockedFunction<typeof isGitPathTracked>).mockResolvedValue(false);
        (captureChangedFilesSnapshot as jest.MockedFunction<typeof captureChangedFilesSnapshot>).mockResolvedValue({
            changedFileHashes: new Map(),
        });
        (
            normalizeLineEndingsInFilesChangedSinceSnapshot as jest.MockedFunction<
                typeof normalizeLineEndingsInFilesChangedSinceSnapshot
            >
        ).mockResolvedValue({ scannedFiles: 0, normalizedFiles: 0, skippedBinaryFiles: 0 });
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockResolvedValue(undefined);
        (resolvePromptRunner as jest.MockedFunction<typeof resolvePromptRunner>).mockReturnValue({
            runner: {
                name: 'github-copilot',
                runPrompt: jest.fn(),
            },
            actualRunnerModel: 'gpt-5.4',
            runnerMetadata: {
                runnerName: 'github-copilot',
                modelName: 'gpt-5.4',
            },
        });
        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockResolvedValue({
            usage: UNCERTAIN_USAGE,
            attemptCount: 1,
        });
        (
            pullLatestChangesForAgentQueueIfEnabled as jest.MockedFunction<typeof pullLatestChangesForAgentQueueIfEnabled>
        ).mockResolvedValue(undefined);
    });

    afterEach(async () => {
        process.chdir(ORIGINAL_WORKING_DIRECTORY);
        consoleInfoSpy.mockRestore();

        if (temporaryProjectPath) {
            await rm(temporaryProjectPath, { recursive: true, force: true });
            temporaryProjectPath = undefined;
        }
    });

    it('returns without resolving a runner when there are no queued messages', async () => {
        temporaryProjectPath = await createTemporaryProject();
        process.chdir(temporaryProjectPath);

        const result = await tickAgentMessages(createAgentRunOptions());

        expect(result.isMessageProcessed).toBe(false);
        expect(resolvePromptRunner).not.toHaveBeenCalled();
        expect(commitChanges).not.toHaveBeenCalled();
    });

    it('delegates pre-message auto-pull through the shared helper', async () => {
        temporaryProjectPath = await createTemporaryProject();
        process.chdir(temporaryProjectPath);
        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(join(temporaryProjectPath, 'messages', 'queued', 'question.book'), 'MESSAGE @User\nHi\n', 'utf-8');

        (
            pullLatestChangesForAgentQueueIfEnabled as jest.MockedFunction<typeof pullLatestChangesForAgentQueueIfEnabled>
        ).mockResolvedValue(123_456);

        const result = await tickAgentMessages(createAgentRunOptions({ autoPull: true }));

        expect(result.autoPullTimestamp).toBe(123_456);
        expect(pullLatestChangesForAgentQueueIfEnabled).toHaveBeenCalledWith({
            projectPath: temporaryProjectPath,
            runOptions: expect.objectContaining({ autoPull: true }),
            logMessage: 'Pulling latest changes before answering the next message...',
        });
    });

    it('answers one queued message, moves it to finished, and commits only that message', async () => {
        temporaryProjectPath = await createTemporaryProject();
        process.chdir(temporaryProjectPath);
        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(
            join(temporaryProjectPath, 'messages', 'queued', 'question.book'),
            'MESSAGE @User\nHow many events are in my calendar for this week?\n',
            'utf-8',
        );

        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockImplementation(
            async ({ prompt }) => {
                expect(prompt).toContain('Read `messages/queued/question.book` and answer the most recent `MESSAGE @User`');
                await appendFile(
                    join(temporaryProjectPath!, 'messages', 'queued', 'question.book'),
                    '\nMESSAGE @Agent\nThere are 5 events in your calendar for this week.\n',
                    'utf-8',
                );
                return { usage: UNCERTAIN_USAGE, attemptCount: 1 };
            },
        );

        const result = await tickAgentMessages(createAgentRunOptions({ autoPush: true }));

        expect(result.isMessageProcessed).toBe(true);
        expect(await readFile(join(temporaryProjectPath, 'messages', 'finished', 'question.book'), 'utf-8')).toContain(
            'MESSAGE @Agent',
        );
        expect(commitChanges).toHaveBeenCalledWith('Answering message question.book', {
            autoPush: true,
            includePaths: ['messages/finished/question.book'],
        });
        expect(printAgentGitIdentityTipAtProcessExitIfNeeded).toHaveBeenCalled();
    });

    it('includes the queued source path in the commit when the original message was tracked', async () => {
        temporaryProjectPath = await createTemporaryProject();
        process.chdir(temporaryProjectPath);
        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(
            join(temporaryProjectPath, 'messages', 'queued', 'tracked.book'),
            'MESSAGE @User\nHi\n',
            'utf-8',
        );
        (isGitPathTracked as jest.MockedFunction<typeof isGitPathTracked>).mockResolvedValue(true);

        await tickAgentMessages(createAgentRunOptions());

        expect(commitChanges).toHaveBeenCalledWith('Answering message tracked.book', {
            autoPush: false,
            includePaths: ['messages/queued/tracked.book', 'messages/finished/tracked.book'],
        });
    });

    it('replaces the previous finished thread file when answering the next message in the same chat', async () => {
        temporaryProjectPath = await createTemporaryProject();
        process.chdir(temporaryProjectPath);
        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await mkdir(join(temporaryProjectPath, 'messages', 'finished'), { recursive: true });
        await writeFile(
            join(temporaryProjectPath, 'messages', 'finished', 'thread.book'),
            'MESSAGE @User\nFirst question\n\nMESSAGE @Agent\nFirst answer\n',
            'utf-8',
        );
        await writeFile(
            join(temporaryProjectPath, 'messages', 'queued', 'thread.book'),
            'MESSAGE @User\nFirst question\n\nMESSAGE @Agent\nFirst answer\n\nMESSAGE @User\nSecond question\n',
            'utf-8',
        );

        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockImplementation(
            async () => {
                await appendFile(
                    join(temporaryProjectPath!, 'messages', 'queued', 'thread.book'),
                    '\nMESSAGE @Agent\nSecond answer\n',
                    'utf-8',
                );
                return { usage: UNCERTAIN_USAGE, attemptCount: 1 };
            },
        );

        await tickAgentMessages(createAgentRunOptions());

        expect(await readFile(join(temporaryProjectPath, 'messages', 'finished', 'thread.book'), 'utf-8')).toContain(
            'Second answer',
        );
    });
});
