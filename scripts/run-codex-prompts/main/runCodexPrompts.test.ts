import { NotAllowed } from '../../../src/errors/NotAllowed';
import { resolveCoderContext } from '../common/resolveCoderContext';
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

/**
 * Builds a complete set of run options for focused validation tests.
 */
function createRunOptions(overrides: Partial<RunOptions> = {}): RunOptions {
    return {
        dryRun: false,
        context: undefined,
        testCommand: undefined,
        preserveLogs: false,
        noUi: true,
        thinkingLevel: undefined,
        waitForUser: true,
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
            belowMinimumPriority: 0,
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
    });

    it('rejects --no-commit together with --no-wait unless --ignore-git-changes is also enabled', async () => {
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
});
