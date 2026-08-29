import { NotAllowed } from '../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { resolveCoderContext } from '../common/resolveCoderContext';
import { toggleEndAfterCurrentPromptState } from '../common/waitForPause';
import type { RunOptions } from '../cli/RunOptions';
import { captureCoderCommitScope, resolveCoderCommitScopePaths, type CoderCommitScope } from '../git/coderCommitScope';
import { commitChanges } from '../git/commitChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { resolveInterruptedPrompt } from '../prompts/resolveInterruptedPrompt';
import { summarizePrompts } from '../prompts/summarizePrompts';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { resolvePromptRunner } from './resolvePromptRunner';
import { runCodexPrompts } from './runCodexPrompts';
import { runPromptRound } from './runPromptRound';
import { createTestBeforeRepairPrompt } from '../testing/createTestBeforeRepairPrompt';
import { runTestBefore } from '../testing/runTestBefore';

jest.mock('../common/resolveCoderContext', () => ({
    resolveCoderContext: jest.fn(async () => undefined),
}));

jest.mock('../git/ensureWorkingTreeClean', () => ({
    ensureWorkingTreeClean: jest.fn(async () => undefined),
}));

jest.mock('../git/coderCommitScope', () => ({
    captureCoderCommitScope: jest.fn(),
    resolveCoderCommitScopePaths: jest.fn(),
}));

jest.mock('../git/commitChanges', () => ({
    commitChanges: jest.fn(),
}));

jest.mock('../git/pullLatestChanges', () => ({
    pullLatestChanges: jest.fn(async () => undefined),
}));

jest.mock('../prompts/findNextTodoPrompt', () => ({
    findNextTodoPrompt: jest.fn(),
}));

jest.mock('../prompts/loadPromptFiles', () => ({
    loadPromptFiles: jest.fn(async () => []),
}));

jest.mock('../prompts/resolveInterruptedPrompt', () => ({
    resolveInterruptedPrompt: jest.fn(),
}));

jest.mock('../prompts/summarizePrompts', () => ({
    summarizePrompts: jest.fn(),
}));

jest.mock('./resolvePromptRunner', () => ({
    resolvePromptRunner: jest.fn(),
}));

jest.mock('./runPromptRound', () => ({
    runPromptRound: jest.fn(async () => undefined),
}));

jest.mock('../testing/runTestBefore', () => ({
    runTestBefore: jest.fn(),
}));

jest.mock('../testing/createTestBeforeRepairPrompt', () => ({
    createTestBeforeRepairPrompt: jest.fn(),
}));

/**
 * Commit scope captured before the pre-coding test in focused run-loop tests.
 */
const TEST_BEFORE_COMMIT_SCOPE: CoderCommitScope = {
    projectPath: process.cwd(),
    snapshotBeforeOperation: { changedFileHashes: new Map() },
};

/**
 * Builds a complete set of run options for focused validation tests.
 */
function createRunOptions(overrides: Partial<RunOptions> = {}): RunOptions {
    return {
        dryRun: false,
        context: undefined,
        testCommand: undefined,
        testBefore: 'no',
        preserveLogs: false,
        noUi: true,
        thinkingLevel: undefined,
        waitForUser: true,
        waitAfterPrompt: 0,
        waitBetweenPrompts: 0,
        waitAfterError: 0,
        noCommit: false,
        gitChanges: 'fail',
        normalizeLineEndings: true,
        allowCredits: false,
        autoMigrate: false,
        allowDestructiveAutoMigrate: false,
        autoPush: false,
        autoPull: false,
        agentName: 'github-copilot',
        model: 'gpt-5.4',
        priority: 0,
        ...overrides,
    };
}

/**
 * Creates a minimal prompt selection for focused run-loop tests.
 */
function createPromptSelection(): PromptSelection {
    const file: PromptFile = {
        path: 'prompts\\example.md',
        name: 'example',
        lines: ['# Example'],
        eol: '\n',
        hasFinalEol: true,
        sections: [],
    };
    const section: PromptSection = {
        index: 0,
        startLine: 1,
        endLine: 1,
        status: 'todo',
        priority: 0,
    };

    return { file, section };
}

describe('runCodexPrompts', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (resolveCoderContext as jest.MockedFunction<typeof resolveCoderContext>).mockResolvedValue(undefined);
        (ensureWorkingTreeClean as jest.MockedFunction<typeof ensureWorkingTreeClean>).mockResolvedValue(undefined);
        (captureCoderCommitScope as jest.MockedFunction<typeof captureCoderCommitScope>).mockResolvedValue(
            TEST_BEFORE_COMMIT_SCOPE,
        );
        (resolveCoderCommitScopePaths as jest.MockedFunction<typeof resolveCoderCommitScopePaths>).mockResolvedValue(
            [],
        );
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockResolvedValue(undefined);
        (pullLatestChanges as jest.MockedFunction<typeof pullLatestChanges>).mockResolvedValue(undefined);
        (loadPromptFiles as jest.MockedFunction<typeof loadPromptFiles>).mockResolvedValue([]);
        (summarizePrompts as jest.MockedFunction<typeof summarizePrompts>).mockReturnValue({
            done: 0,
            forAgent: 1,
            outsidePriorityRange: 0,
            toBeWritten: 0,
        });
        (resolvePromptRunner as jest.MockedFunction<typeof resolvePromptRunner>).mockReturnValue({
            runner: {
                name: 'GitHub Copilot',
                runPrompt: jest.fn(),
            } as PromptRunner,
            actualRunnerModel: 'gpt-5.4',
            runnerMetadata: {
                runnerName: 'github-copilot',
                modelName: 'gpt-5.4',
            },
        });
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockResolvedValue(undefined);
        (resolveInterruptedPrompt as jest.MockedFunction<typeof resolveInterruptedPrompt>).mockReturnValue(
            createPromptSelection(),
        );
        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockResolvedValue({
            isPassed: true,
            testOutput: 'All tests passed',
        });
        (createTestBeforeRepairPrompt as jest.MockedFunction<typeof createTestBeforeRepairPrompt>).mockResolvedValue(
            createPromptSelection(),
        );
    });

    it('rejects --no-commit in auto mode unless --git-changes ignore is also enabled', async () => {
        await expect(
            runCodexPrompts(
                createRunOptions({
                    noCommit: true,
                    waitForUser: false,
                }),
            ),
        ).rejects.toThrow(NotAllowed);

        await expect(
            runCodexPrompts(
                createRunOptions({
                    noCommit: true,
                    waitForUser: false,
                }),
            ),
        ).rejects.toThrow(/--git-changes ignore/);
    });

    it('rejects --auto-pull together with --no-commit in real runs', async () => {
        await expect(
            runCodexPrompts(
                createRunOptions({
                    autoPull: true,
                    noCommit: true,
                }),
            ),
        ).rejects.toThrow(NotAllowed);

        await expect(
            runCodexPrompts(
                createRunOptions({
                    autoPull: true,
                    noCommit: true,
                }),
            ),
        ).rejects.toThrow(/--no-commit/);
    });

    it('rejects --isolate together with --no-commit', async () => {
        await expect(
            runCodexPrompts(
                createRunOptions({
                    isIsolated: true,
                    noCommit: true,
                    gitChanges: 'ignore',
                }),
            ),
        ).rejects.toThrow(/--isolate/);
    });

    it('rejects --isolate together with --git-changes continue', async () => {
        await expect(
            runCodexPrompts(
                createRunOptions({
                    isIsolated: true,
                    gitChanges: 'continue',
                }),
            ),
        ).rejects.toThrow(/--git-changes continue/);
    });

    it('checks the clean working tree before each prompt by default', async () => {
        const promptSelection = createPromptSelection();

        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(undefined);

        await runCodexPrompts(createRunOptions({ waitForUser: false }));

        expect(ensureWorkingTreeClean).toHaveBeenCalledTimes(1);
        expect(resolveInterruptedPrompt).not.toHaveBeenCalled();
    });

    it('skips the clean working tree check with --git-changes ignore', async () => {
        const promptSelection = createPromptSelection();

        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(undefined);

        await runCodexPrompts(createRunOptions({ waitForUser: false, gitChanges: 'ignore' }));

        expect(ensureWorkingTreeClean).not.toHaveBeenCalled();
    });

    it('continues the interrupted prompt first and expects a clean working tree again afterwards', async () => {
        const interruptedPrompt = createPromptSelection();
        const queuedPrompt = createPromptSelection();

        (resolveInterruptedPrompt as jest.MockedFunction<typeof resolveInterruptedPrompt>).mockReturnValue(
            interruptedPrompt,
        );
        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(queuedPrompt)
            .mockReturnValueOnce(undefined);

        await runCodexPrompts(createRunOptions({ waitForUser: false, gitChanges: 'continue' }));

        expect(runPromptRound).toHaveBeenCalledTimes(2);
        expect((runPromptRound as jest.MockedFunction<typeof runPromptRound>).mock.calls[0]?.[0].nextPrompt).toBe(
            interruptedPrompt,
        );
        expect((runPromptRound as jest.MockedFunction<typeof runPromptRound>).mock.calls[1]?.[0].nextPrompt).toBe(
            queuedPrompt,
        );
        // Note: The continued round runs on the changes of the interrupted prompt, every later round starts clean
        expect(ensureWorkingTreeClean).toHaveBeenCalledTimes(1);
    });

    it('fails when --git-changes continue finds no interrupted prompt', async () => {
        (resolveInterruptedPrompt as jest.MockedFunction<typeof resolveInterruptedPrompt>).mockImplementation(() => {
            throw new NotFoundError('Flag `--git-changes continue` found no interrupted prompt to continue.');
        });

        await expect(
            runCodexPrompts(createRunOptions({ waitForUser: false, gitChanges: 'continue' })),
        ).rejects.toThrow(NotFoundError);

        expect(runPromptRound).not.toHaveBeenCalled();
    });

    it('rejects invalid run limits', async () => {
        await expect(
            runCodexPrompts(
                createRunOptions({
                    limit: 0,
                }),
            ),
        ).rejects.toThrow(NotAllowed);
    });

    it('pulls before loading prompts when --auto-pull is enabled', async () => {
        const events: string[] = [];
        const promptSelection = createPromptSelection();

        (pullLatestChanges as jest.MockedFunction<typeof pullLatestChanges>).mockImplementation(async () => {
            events.push('pull');
        });
        (loadPromptFiles as jest.MockedFunction<typeof loadPromptFiles>).mockImplementation(async () => {
            events.push('load');
            return [];
        });
        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(undefined);
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockImplementation(async () => {
            events.push('run');
        });

        await runCodexPrompts(createRunOptions({ autoPull: true, waitForUser: false }));

        expect(events).toEqual(['pull', 'load', 'run', 'pull', 'load']);
        expect(ensureWorkingTreeClean).toHaveBeenCalledTimes(1);
    });

    it('loads the prompt queue before running pre-coding tests', async () => {
        const events: string[] = [];
        const promptSelection = createPromptSelection();

        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockImplementation(async () => {
            events.push('test-before');
            return { isPassed: true, testOutput: 'All tests passed' };
        });
        (loadPromptFiles as jest.MockedFunction<typeof loadPromptFiles>).mockImplementation(async () => {
            events.push('load');
            return [];
        });
        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(undefined);
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockImplementation(async () => {
            events.push('run');
        });

        await runCodexPrompts(
            createRunOptions({
                testBefore: 'yes-and-fail',
                testCommand: 'npm run test',
                waitForUser: false,
            }),
        );

        expect(events).toEqual(['load', 'test-before', 'load', 'run', 'load']);
        expect(runTestBefore).toHaveBeenCalledWith(
            expect.objectContaining({
                testCommand: 'npm run test',
            }),
        );
    });

    it('commits files changed by passing pre-coding tests before checking the first prompt in yes-and-fix mode', async () => {
        const events: string[] = [];
        const promptSelection = createPromptSelection();

        (ensureWorkingTreeClean as jest.MockedFunction<typeof ensureWorkingTreeClean>).mockImplementation(async () => {
            events.push('check-clean-tree');
        });
        (captureCoderCommitScope as jest.MockedFunction<typeof captureCoderCommitScope>).mockImplementation(
            async () => {
                events.push('capture-test-scope');
                return TEST_BEFORE_COMMIT_SCOPE;
            },
        );
        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockImplementation(async () => {
            events.push('test-before');
            return { isPassed: true, testOutput: 'All tests passed' };
        });
        (resolveCoderCommitScopePaths as jest.MockedFunction<typeof resolveCoderCommitScopePaths>).mockImplementation(
            async () => {
                events.push('resolve-test-changes');
                return ['src/generated/pre-coding-test-output.ts'];
            },
        );
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockImplementation(async () => {
            events.push('commit-test-changes');
        });
        (loadPromptFiles as jest.MockedFunction<typeof loadPromptFiles>).mockImplementation(async () => {
            events.push('load');
            return [];
        });
        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(promptSelection)
            .mockReturnValueOnce(undefined);
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockImplementation(async () => {
            events.push('run');
        });

        await runCodexPrompts(
            createRunOptions({
                testBefore: 'yes-and-fix',
                testCommand: 'npm test',
                waitForUser: false,
                autoPush: true,
            }),
        );

        expect(events).toEqual([
            'load',
            'check-clean-tree',
            'capture-test-scope',
            'test-before',
            'resolve-test-changes',
            'commit-test-changes',
            'load',
            'check-clean-tree',
            'run',
            'load',
        ]);
        expect(captureCoderCommitScope).toHaveBeenCalledWith(process.cwd());
        expect(commitChanges).toHaveBeenCalledWith('test: Apply changes made by pre-coding tests', {
            autoPush: true,
            projectPath: process.cwd(),
            relevantPaths: ['src/generated/pre-coding-test-output.ts'],
        });
    });

    it('does not create an empty commit when pre-coding tests make no changes', async () => {
        await runCodexPrompts(
            createRunOptions({
                testBefore: 'yes-and-fix',
                testCommand: 'npm test',
                waitForUser: false,
            }),
        );

        expect(commitChanges).not.toHaveBeenCalled();
    });

    it('leaves pre-coding test changes uncommitted when --no-commit is used', async () => {
        (resolveCoderCommitScopePaths as jest.MockedFunction<typeof resolveCoderCommitScopePaths>).mockResolvedValue([
            'src/generated/pre-coding-test-output.ts',
        ]);

        await runCodexPrompts(
            createRunOptions({
                testBefore: 'yes-and-fix',
                testCommand: 'npm test',
                waitForUser: false,
                noCommit: true,
                gitChanges: 'ignore',
            }),
        );

        expect(captureCoderCommitScope).not.toHaveBeenCalled();
        expect(resolveCoderCommitScopePaths).not.toHaveBeenCalled();
        expect(commitChanges).not.toHaveBeenCalled();
    });

    it('stops before the agent when pre-coding tests fail in yes-and-fail mode', async () => {
        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockResolvedValue({
            isPassed: false,
            testOutput: 'Expected true to be false',
        });

        await expect(
            runCodexPrompts(
                createRunOptions({
                    testBefore: 'yes-and-fail',
                    testCommand: 'npm test',
                    waitForUser: false,
                }),
            ),
        ).rejects.toThrow(/coding agent was not started/);

        expect(createTestBeforeRepairPrompt).not.toHaveBeenCalled();
        expect(runPromptRound).not.toHaveBeenCalled();
        expect(captureCoderCommitScope).not.toHaveBeenCalled();
        expect(commitChanges).not.toHaveBeenCalled();
        expect(loadPromptFiles).toHaveBeenCalledTimes(1);
    });

    it('commits test changes before running one repair prompt when pre-coding tests fail in yes-and-fix mode', async () => {
        const events: string[] = [];
        const repairPrompt = createPromptSelection();
        const queuedPrompt = createPromptSelection();

        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockImplementation(async () => {
            events.push('test-before');
            return { isPassed: false, testOutput: 'Expected true to be false' };
        });
        (resolveCoderCommitScopePaths as jest.MockedFunction<typeof resolveCoderCommitScopePaths>).mockImplementation(
            async () => {
                events.push('resolve-test-changes');
                return ['generated-file.ts'];
            },
        );
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockImplementation(async () => {
            events.push('commit-test-changes');
        });
        (createTestBeforeRepairPrompt as jest.MockedFunction<typeof createTestBeforeRepairPrompt>).mockImplementation(
            async () => {
                events.push('create-repair');
                return repairPrompt;
            },
        );
        (loadPromptFiles as jest.MockedFunction<typeof loadPromptFiles>).mockImplementation(async () => {
            events.push('load');
            return [];
        });
        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>)
            .mockReturnValueOnce(queuedPrompt)
            .mockReturnValueOnce(queuedPrompt)
            .mockReturnValueOnce(undefined);
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockImplementation(async ({ nextPrompt }) => {
            events.push(nextPrompt === repairPrompt ? 'repair' : 'run');
        });

        await runCodexPrompts(
            createRunOptions({
                testBefore: 'yes-and-fix',
                testCommand: 'npm test',
                waitForUser: false,
            }),
        );

        expect(events).toEqual([
            'load',
            'test-before',
            'resolve-test-changes',
            'commit-test-changes',
            'create-repair',
            'repair',
            'load',
            'run',
            'load',
        ]);
        expect(runPromptRound).toHaveBeenCalledTimes(2);
        expect((runPromptRound as jest.MockedFunction<typeof runPromptRound>).mock.calls[0]?.[0].nextPrompt).toBe(
            repairPrompt,
        );
        expect((runPromptRound as jest.MockedFunction<typeof runPromptRound>).mock.calls[1]?.[0].nextPrompt).toBe(
            queuedPrompt,
        );
    });

    it('stops after the configured successful prompt run limit', async () => {
        const promptSelection = createPromptSelection();

        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>).mockReturnValue(promptSelection);

        await runCodexPrompts(
            createRunOptions({
                limit: 2,
                waitForUser: false,
                gitChanges: 'ignore',
            }),
        );

        expect(runPromptRound).toHaveBeenCalledTimes(2);
        expect(loadPromptFiles).toHaveBeenCalledTimes(2);
    });

    it('stops after the current prompt when the dynamic end control is requested', async () => {
        const promptSelection = createPromptSelection();

        (findNextTodoPrompt as jest.MockedFunction<typeof findNextTodoPrompt>).mockReturnValue(promptSelection);
        (runPromptRound as jest.MockedFunction<typeof runPromptRound>).mockImplementation(async () => {
            toggleEndAfterCurrentPromptState();
        });

        await runCodexPrompts(
            createRunOptions({
                waitForUser: false,
                gitChanges: 'ignore',
            }),
        );

        expect(runPromptRound).toHaveBeenCalledTimes(1);
        expect(loadPromptFiles).toHaveBeenCalledTimes(1);
    });
});
