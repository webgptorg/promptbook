import type { RunOptions } from '../cli/RunOptions';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { commitChanges } from '../git/commitChanges';
import { runPromptRound, type RunPromptRoundOptions } from '../main/runPromptRound';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { writePromptFile } from '../prompts/writePromptFile';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import type { PromptRunner } from '../runners/types/PromptRunner';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';
import { createCoderIsolationWorktree } from './createCoderIsolationWorktree';
import { mergeCoderIsolationWorktree } from './mergeCoderIsolationWorktree';
import { removeCoderIsolationWorktree } from './removeCoderIsolationWorktree';
import { runIsolatedPromptRound } from './runIsolatedPromptRound';

jest.mock('../git/coderCommitScope', () => ({
    captureCoderCommitScope: jest.fn(async (projectPath: string) => ({
        projectPath,
        snapshotBeforeOperation: { changedFileHashes: new Map() },
    })),
    resolveCoderCommitScopePaths: jest.fn(async () => ['prompts/example.md']),
}));

jest.mock('../git/commitChanges', () => ({
    commitChanges: jest.fn(),
}));

jest.mock('../main/runPromptRound', () => ({
    runPromptRound: jest.fn(),
}));

jest.mock('../prompts/writePromptErrorLog', () => ({
    writePromptErrorLog: jest.fn(),
}));

jest.mock('../prompts/writePromptFile', () => ({
    writePromptFile: jest.fn(),
}));

jest.mock('./createCoderIsolationWorktree', () => ({
    createCoderIsolationWorktree: jest.fn(),
}));

jest.mock('./mergeCoderIsolationWorktree', () => ({
    mergeCoderIsolationWorktree: jest.fn(),
}));

jest.mock('./removeCoderIsolationWorktree', () => ({
    removeCoderIsolationWorktree: jest.fn(),
}));

/**
 * The worktree every mocked isolation run works with.
 */
const WORKTREE: CoderIsolationWorktree = {
    taskName: 'example',
    projectPath: 'C:\\project',
    worktreePath: 'C:\\project/.promptbook/coder-isolation-worktrees/example',
    worktreeDisplayPath: '.promptbook/coder-isolation-worktrees/example',
    branchName: 'ptbk-coder-isolation/example',
    baseBranchName: 'main',
};

/**
 * Builds a complete set of run options for isolated prompt-round tests.
 */
function createRunOptions(overrides: Partial<RunOptions> = {}): RunOptions {
    return {
        dryRun: false,
        preserveLogs: false,
        noUi: true,
        waitForUser: false,
        waitAfterPrompt: 0,
        waitBetweenPrompts: 0,
        waitAfterError: 0,
        noCommit: false,
        gitChanges: 'fail',
        normalizeLineEndings: false,
        allowCredits: false,
        autoMigrate: false,
        allowDestructiveAutoMigrate: false,
        autoPush: false,
        autoPull: false,
        isIsolated: true,
        agentName: 'github-copilot',
        model: 'gpt-5.4',
        priority: 0,
        ...overrides,
    };
}

/**
 * Creates a prompt selection whose status line was already marked as done by the isolated round.
 */
function createPromptSelection(): { file: PromptFile; section: PromptSection } {
    const section: PromptSection = {
        index: 0,
        startLine: 0,
        endLine: 1,
        status: 'done',
        priority: 0,
        statusLineIndex: 0,
    };

    const file: PromptFile = {
        path: 'C:\\project\\prompts\\example.md',
        name: 'example.md',
        lines: ['[x] by github-copilot', 'Task body'],
        eol: '\n',
        hasFinalEol: true,
        sections: [section],
    };

    return { file, section };
}

/**
 * Builds the isolated round input with a mocked runner and pause waiter.
 */
function createIsolatedPromptRoundOptions(runOptions: RunOptions): RunPromptRoundOptions {
    const runner: PromptRunner = {
        name: 'GitHub Copilot',
        runPrompt: jest.fn(),
    };
    const waitForRequestedPause = jest.fn<
        ReturnType<WaitForCoderRunPauseCheckpoint>,
        Parameters<WaitForCoderRunPauseCheckpoint>
    >(async () => undefined);

    return {
        options: runOptions,
        runner,
        runnerMetadata: {
            runnerName: 'github-copilot',
            modelName: 'gpt-5.4',
        },
        nextPrompt: createPromptSelection(),
        promptLabel: 'prompts/example.md#1',
        isRichUiEnabled: false,
        waitForRequestedPause,
        projectPath: WORKTREE.projectPath,
    };
}

describe('runIsolatedPromptRound', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        (createCoderIsolationWorktree as jest.MockedFunction<typeof createCoderIsolationWorktree>).mockResolvedValue(
            WORKTREE,
        );
        (mergeCoderIsolationWorktree as jest.MockedFunction<typeof mergeCoderIsolationWorktree>).mockResolvedValue({
            isMerged: true,
        });
        (removeCoderIsolationWorktree as jest.MockedFunction<typeof removeCoderIsolationWorktree>).mockResolvedValue(
            true,
        );
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockResolvedValue(undefined);
        (writePromptFile as jest.MockedFunction<typeof writePromptFile>).mockResolvedValue(undefined);
        (writePromptErrorLog as jest.MockedFunction<typeof writePromptErrorLog>).mockResolvedValue(
            'C:\\project\\prompts\\example.error.log',
        );
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('runs the round inside the worktree without pushing the isolated commit', async () => {
        await runIsolatedPromptRound(createIsolatedPromptRoundOptions(createRunOptions({ autoPush: true })));

        expect(runPromptRound).toHaveBeenCalledWith(
            expect.objectContaining({
                projectPath: WORKTREE.worktreePath,
                options: expect.objectContaining({ autoPush: false, isIsolated: true }),
            }),
        );
    });

    it('commits the merged task in the original project and removes the worktree', async () => {
        await runIsolatedPromptRound(createIsolatedPromptRoundOptions(createRunOptions({ autoPush: true })));

        expect(mergeCoderIsolationWorktree).toHaveBeenCalledWith(WORKTREE);
        expect(commitChanges).toHaveBeenCalledWith(expect.any(String), {
            autoPush: true,
            projectPath: WORKTREE.projectPath,
            // Note: The prompt status update and the merged changes are the only relevant paths of the round
            relevantPaths: ['prompts/example.md'],
        });
        expect(removeCoderIsolationWorktree).toHaveBeenCalledWith(WORKTREE);
        expect(writePromptFile).not.toHaveBeenCalled();
    });

    /*
    it('marks the prompt as failed, keeps the worktree and does not throw when the merge fails', async () => {
        (mergeCoderIsolationWorktree as jest.MockedFunction<typeof mergeCoderIsolationWorktree>).mockResolvedValue({
            isMerged: false,
            failureDetails: 'CONFLICT (content): Merge conflict in src/index.ts',
        });
        const isolatedRoundOptions = createIsolatedPromptRoundOptions(createRunOptions());

        await runIsolatedPromptRound(isolatedRoundOptions);

        expect(isolatedRoundOptions.nextPrompt.file.lines[0]).toBe(
            '[!] by github-copilot - merge into `main` failed, merge `ptbk-coder-isolation/example` from `.promptbook/coder-isolation-worktrees/example` manually',
        );
        expect(writePromptFile).toHaveBeenCalledWith(isolatedRoundOptions.nextPrompt.file);
        expect(writePromptErrorLog).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.objectContaining({ name: 'ConflictError' }),
            }),
        );
        expect(commitChanges).toHaveBeenCalledWith(
            expect.stringContaining('Merging the isolated task `example` failed'),
            expect.objectContaining({
                projectPath: WORKTREE.projectPath,
                relevantPaths: ['prompts/example.md', 'prompts/example.error.log'],
            }),
        );
        expect(removeCoderIsolationWorktree).not.toHaveBeenCalled();
    });
    */

    it('keeps the worktree and rethrows when the round itself fails', async () => {
        const roundError = new Error('Runner crashed');
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockRejectedValue(roundError);

        await expect(runIsolatedPromptRound(createIsolatedPromptRoundOptions(createRunOptions()))).rejects.toThrow(
            roundError,
        );

        expect(mergeCoderIsolationWorktree).not.toHaveBeenCalled();
        expect(removeCoderIsolationWorktree).not.toHaveBeenCalled();
    });
});
