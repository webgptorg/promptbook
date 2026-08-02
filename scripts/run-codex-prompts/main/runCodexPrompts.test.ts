import { NotAllowed } from '../../../src/errors/NotAllowed';
import { resolveCoderContext } from '../common/resolveCoderContext';
import { toggleEndAfterCurrentPromptState } from '../common/waitForPause';
import type { RunOptions } from '../cli/RunOptions';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
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

jest.mock('../git/pullLatestChanges', () => ({
    pullLatestChanges: jest.fn(async () => undefined),
}));

jest.mock('../prompts/findNextTodoPrompt', () => ({
    findNextTodoPrompt: jest.fn(),
}));

jest.mock('../prompts/loadPromptFiles', () => ({
    loadPromptFiles: jest.fn(async () => []),
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
        ignoreGitChanges: false,
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
        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockResolvedValue({
            isPassed: true,
            testOutput: 'All tests passed',
        });
        (createTestBeforeRepairPrompt as jest.MockedFunction<typeof createTestBeforeRepairPrompt>).mockResolvedValue(
            createPromptSelection(),
        );
    });

    it('rejects --no-commit in auto mode unless --ignore-git-changes is also enabled', async () => {
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
        ).rejects.toThrow(/--ignore-git-changes/);
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
                    ignoreGitChanges: true,
                }),
            ),
        ).rejects.toThrow(/--isolate/);
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

    it('runs pre-coding tests before loading and running the first prompt', async () => {
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

        expect(events).toEqual(['test-before', 'load', 'run', 'load']);
        expect(runTestBefore).toHaveBeenCalledWith(
            expect.objectContaining({
                testCommand: 'npm run test',
            }),
        );
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
        expect(loadPromptFiles).not.toHaveBeenCalled();
    });

    it('runs one repair prompt before the queue when pre-coding tests fail in yes-and-fix mode', async () => {
        const events: string[] = [];
        const repairPrompt = createPromptSelection();
        const queuedPrompt = createPromptSelection();

        (runTestBefore as jest.MockedFunction<typeof runTestBefore>).mockResolvedValue({
            isPassed: false,
            testOutput: 'Expected true to be false',
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

        expect(events).toEqual(['create-repair', 'repair', 'load', 'run', 'load']);
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
                ignoreGitChanges: true,
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
                ignoreGitChanges: true,
            }),
        );

        expect(runPromptRound).toHaveBeenCalledTimes(1);
        expect(loadPromptFiles).toHaveBeenCalledTimes(1);
    });
});
