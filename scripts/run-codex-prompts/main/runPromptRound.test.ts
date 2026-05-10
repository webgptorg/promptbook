import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { RunOptions } from '../cli/RunOptions';
import { appendCoderContext } from '../common/appendCoderContext';
import { captureChangedFilesSnapshot, normalizeLineEndingsInFilesChangedSinceSnapshot } from '../common/normalizeLineEndingsInChangedFiles';
import { withPromptRuntimeLog } from '../common/runGoScript/withPromptRuntimeLog';
import { waitForEnter } from '../common/waitForEnter';
import { commitChanges } from '../git/commitChanges';
import { runAutoMigrateTestingServers } from '../migrations/runAutoMigrateTestingServers';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { markPromptDone } from '../prompts/markPromptDone';
import { markPromptFailed } from '../prompts/markPromptFailed';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { writePromptFile } from '../prompts/writePromptFile';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptWithTestFeedback } from '../testing/runPromptWithTestFeedback';
import { runPromptRound } from './runPromptRound';

jest.mock('../common/appendCoderContext', () => ({
    appendCoderContext: jest.fn((prompt: string) => prompt),
}));

jest.mock('../common/normalizeLineEndingsInChangedFiles', () => ({
    captureChangedFilesSnapshot: jest.fn(),
    normalizeLineEndingsInFilesChangedSinceSnapshot: jest.fn(),
}));

jest.mock('../common/runGoScript/withPromptRuntimeLog', () => ({
    withPromptRuntimeLog: jest.fn(async (_scriptPath: string, callback: (logPath: string) => Promise<void>) =>
        callback('C:\\temp\\runtime.log'),
    ),
}));

jest.mock('../common/waitForEnter', () => ({
    waitForEnter: jest.fn(),
}));

jest.mock('../git/commitChanges', () => ({
    commitChanges: jest.fn(),
}));

jest.mock('../migrations/runAutoMigrateTestingServers', () => ({
    runAutoMigrateTestingServers: jest.fn(),
}));

jest.mock('../prompts/buildCodexPrompt', () => ({
    buildCodexPrompt: jest.fn(() => 'Prompt body'),
}));

jest.mock('../prompts/buildCommitMessage', () => ({
    buildCommitMessage: jest.fn(() => 'feat: example'),
}));

jest.mock('../prompts/buildScriptPath', () => ({
    buildScriptPath: jest.fn(() => 'C:\\temp\\prompt.sh'),
}));

jest.mock('../prompts/markPromptDone', () => ({
    markPromptDone: jest.fn(),
}));

jest.mock('../prompts/markPromptFailed', () => ({
    markPromptFailed: jest.fn(),
}));

jest.mock('../prompts/writePromptErrorLog', () => ({
    writePromptErrorLog: jest.fn(),
}));

jest.mock('../prompts/writePromptFile', () => ({
    writePromptFile: jest.fn(),
}));

jest.mock('../testing/runPromptWithTestFeedback', () => ({
    runPromptWithTestFeedback: jest.fn(),
}));

/**
 * Builds a complete set of run options for prompt-round tests.
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
        normalizeLineEndings: false,
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
 * Creates a minimal prompt selection for focused round execution tests.
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

describe('runPromptRound', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (appendCoderContext as jest.MockedFunction<typeof appendCoderContext>).mockImplementation((prompt) => prompt);
        (withPromptRuntimeLog as jest.MockedFunction<typeof withPromptRuntimeLog>).mockImplementation(
            async (_scriptPath, callback) => callback('C:\\temp\\runtime.log'),
        );
        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockResolvedValue({
            usage: UNCERTAIN_USAGE,
            attemptCount: 1,
        });
        (writePromptFile as jest.MockedFunction<typeof writePromptFile>).mockResolvedValue(undefined);
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockResolvedValue(undefined);
        (runAutoMigrateTestingServers as jest.MockedFunction<typeof runAutoMigrateTestingServers>).mockResolvedValue(
            undefined,
        );
        (waitForEnter as jest.MockedFunction<typeof waitForEnter>).mockResolvedValue(undefined);
        (
            captureChangedFilesSnapshot as jest.MockedFunction<typeof captureChangedFilesSnapshot>
        ).mockResolvedValue({ changedFileHashes: new Map() });
        (
            normalizeLineEndingsInFilesChangedSinceSnapshot as jest.MockedFunction<
                typeof normalizeLineEndingsInFilesChangedSinceSnapshot
            >
        ).mockResolvedValue({ scannedFiles: 0, normalizedFiles: 0, skippedBinaryFiles: 0 });
    });

    it('skips commit creation and commit confirmation when --no-commit is enabled', async () => {
        const runner: PromptRunner = {
            name: 'GitHub Copilot',
            runPrompt: jest.fn(),
        };

        await runPromptRound({
            options: createRunOptions({
                noCommit: true,
                waitForUser: true,
            }),
            runner,
            runnerMetadata: {
                runnerName: 'github-copilot',
                modelName: 'gpt-5.4',
            },
            nextPrompt: createPromptSelection(),
            promptLabel: 'example.md#1',
            resolvedCoderContext: undefined,
            isRichUiEnabled: false,
            progressDisplay: undefined,
            uiHandle: undefined,
            waitForRequestedPause: async () => undefined,
        });

        expect(buildCodexPrompt).toHaveBeenCalled();
        expect(buildCommitMessage).toHaveBeenCalled();
        expect(buildScriptPath).toHaveBeenCalled();
        expect(runPromptWithTestFeedback).toHaveBeenCalled();
        expect(markPromptDone).toHaveBeenCalled();
        expect(writePromptFile).toHaveBeenCalled();
        expect(commitChanges).not.toHaveBeenCalled();
        expect(waitForEnter).not.toHaveBeenCalled();
        expect(markPromptFailed).not.toHaveBeenCalled();
        expect(writePromptErrorLog).not.toHaveBeenCalled();
    });
});
