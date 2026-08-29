import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import type { RunOptions } from '../cli/RunOptions';
import { appendCoderContext } from '../common/appendCoderContext';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { normalizeLineEndingsInFilesChangedSinceSnapshot } from '../common/normalizeLineEndingsInChangedFiles';
import { withPromptRuntimeLog } from '../common/runGoScript/withPromptRuntimeLog';
import { waitForEnter } from '../common/waitForEnter';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from '../git/coderCommitScope';
import { commitChanges } from '../git/commitChanges';
import { runAutoMigrateTestingServers } from '../migrations/runAutoMigrateTestingServers';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { markPromptDone } from '../prompts/markPromptDone';
import { markPromptFailed } from '../prompts/markPromptFailed';
import { markPromptInProgress } from '../prompts/markPromptInProgress';
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
    normalizeLineEndingsInFilesChangedSinceSnapshot: jest.fn(),
}));

jest.mock('../git/coderCommitScope', () => ({
    captureCoderCommitScope: jest.fn(),
    resolveCoderCommitScopePaths: jest.fn(),
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

jest.mock('../prompts/markPromptInProgress', () => ({
    markPromptInProgress: jest.fn(),
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

/**
 * Creates the selection of a prompt another harness left behind in the in-progress `[^]` status.
 */
function createInterruptedPromptSelection(statusLine: string): PromptSelection {
    const file: PromptFile = {
        path: 'prompts\\example.md',
        name: 'example',
        lines: [statusLine, 'Implement the feature'],
        eol: '\n',
        hasFinalEol: true,
        sections: [],
    };
    const section: PromptSection = {
        index: 0,
        startLine: 0,
        endLine: 1,
        status: 'in-progress',
        priority: 0,
        statusLineIndex: 0,
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
            steps: [{ kind: 'implementation', usage: UNCERTAIN_USAGE, durationMs: 1000 }],
        });
        (writePromptFile as jest.MockedFunction<typeof writePromptFile>).mockResolvedValue(undefined);
        (commitChanges as jest.MockedFunction<typeof commitChanges>).mockResolvedValue(undefined);
        (runAutoMigrateTestingServers as jest.MockedFunction<typeof runAutoMigrateTestingServers>).mockResolvedValue(
            undefined,
        );
        (waitForEnter as jest.MockedFunction<typeof waitForEnter>).mockResolvedValue(undefined);
        (captureCoderCommitScope as jest.MockedFunction<typeof captureCoderCommitScope>).mockImplementation(
            async (projectPath: string) => ({
                projectPath,
                snapshotBeforeOperation: { changedFileHashes: new Map() },
            }),
        );
        (resolveCoderCommitScopePaths as jest.MockedFunction<typeof resolveCoderCommitScopePaths>).mockResolvedValue([
            'prompts/example.md',
        ]);
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
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        await runPromptRound({
            options: createRunOptions({
                noCommit: true,
                waitForUser: true,
                thinkingLevel: 'xhigh',
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
            waitForRequestedPause,
        });

        expect(buildCodexPrompt).toHaveBeenCalled();
        expect(buildCommitMessage).toHaveBeenCalled();
        expect(buildScriptPath).toHaveBeenCalled();
        expect(runPromptWithTestFeedback).toHaveBeenCalledWith(
            expect.objectContaining({
                waitForPauseCheckpoint: waitForRequestedPause,
            }),
        );
        expect(markPromptDone).toHaveBeenCalledWith(
            expect.objectContaining({
                runnerName: 'github-copilot',
                modelName: 'gpt-5.4',
                startedByRunnerSignature: undefined,
                attemptCount: 1,
                loginMethod: undefined,
                thinkingLevel: 'xhigh',
            }),
        );
        expect(writePromptFile).toHaveBeenCalled();
        expect(commitChanges).not.toHaveBeenCalled();
        expect(waitForEnter).not.toHaveBeenCalled();
        expect(markPromptFailed).not.toHaveBeenCalled();
        expect(writePromptErrorLog).not.toHaveBeenCalled();
        expect(waitForRequestedPause).toHaveBeenCalledWith({
            checkpointLabel: 'preparing the current prompt execution',
            phase: 'running',
            statusMessage: 'Preparing prompt execution',
        });
        expect(waitForRequestedPause).toHaveBeenCalledWith({
            checkpointLabel: 'recording the successful prompt result',
            phase: 'running',
            statusMessage: 'Recording prompt result',
        });
    });

    it('waits for pause checkpoints before committing and auto-migrating a successful round', async () => {
        const runner: PromptRunner = {
            name: 'GitHub Copilot',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        await runPromptRound({
            options: createRunOptions({
                noCommit: false,
                waitForUser: false,
                autoMigrate: true,
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
            waitForRequestedPause,
        });

        expect(commitChanges).toHaveBeenCalledWith('feat: example', {
            autoPush: false,
            excludePaths: ['C:\\temp\\runtime.log'],
            projectPath: process.cwd(),
            // Note: Only the prompt file and the files the coding agent has changed are committed
            relevantPaths: ['prompts/example.md'],
            isEmptyCommitAllowed: undefined,
        });
        expect(runAutoMigrateTestingServers).toHaveBeenCalled();
        expect(waitForRequestedPause).toHaveBeenCalledWith({
            checkpointLabel: 'committing the successful changes',
            phase: 'running',
            statusMessage: 'Committing changes',
        });
        expect(waitForRequestedPause).toHaveBeenCalledWith({
            checkpointLabel: 'running testing-server auto-migration',
            phase: 'running',
            statusMessage: 'Running testing-server auto-migration',
        });
    });

    it('records the in-progress status of every started step before the prompt is marked as done', async () => {
        const runner: PromptRunner = {
            name: 'OpenAI Codex',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);
        const implementationStep = { kind: 'implementation', usage: UNCERTAIN_USAGE, durationMs: 1000 } as const;

        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockImplementation(
            async (options) => {
                await options.onStepStarted?.({ startedStepKind: 'implementation', finishedSteps: [] });
                await options.onStepStarted?.({
                    startedStepKind: 'testing',
                    finishedSteps: [implementationStep],
                    loginMethod: 'chatgpt',
                });

                return { usage: UNCERTAIN_USAGE, attemptCount: 1, steps: [implementationStep] };
            },
        );

        await runPromptRound({
            options: createRunOptions({
                noCommit: true,
                waitForUser: false,
                thinkingLevel: 'max',
            }),
            runner,
            runnerMetadata: {
                runnerName: 'OpenAI Codex',
                modelName: 'gpt-5.6-luna',
            },
            nextPrompt: createPromptSelection(),
            promptLabel: 'example.md#1',
            resolvedCoderContext: undefined,
            isRichUiEnabled: false,
            progressDisplay: undefined,
            uiHandle: undefined,
            waitForRequestedPause,
        });

        expect(markPromptInProgress).toHaveBeenCalledTimes(2);
        expect(markPromptInProgress).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                steps: [],
                inProgressStepKind: 'implementation',
                runnerName: 'OpenAI Codex',
                modelName: 'gpt-5.6-luna',
                attemptCount: 1,
                loginMethod: undefined,
                thinkingLevel: 'max',
            }),
        );
        expect(markPromptInProgress).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                steps: [implementationStep],
                inProgressStepKind: 'testing',
                loginMethod: 'chatgpt',
            }),
        );
        // Note: Both in-progress writes plus the final done write reach the prompt file
        expect(writePromptFile).toHaveBeenCalledTimes(3);
        expect(
            (markPromptInProgress as jest.MockedFunction<typeof markPromptInProgress>).mock.invocationCallOrder[1],
        ).toBeLessThan((markPromptDone as jest.MockedFunction<typeof markPromptDone>).mock.invocationCallOrder[0]!);
    });

    it('records the harness which started an interrupted prompt continued by another harness', async () => {
        const runner: PromptRunner = {
            name: 'Claude Code',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockImplementation(
            async (options) => {
                await options.onStepStarted?.({ startedStepKind: 'implementation', finishedSteps: [] });

                return { usage: UNCERTAIN_USAGE, attemptCount: 1, steps: [] };
            },
        );

        await runPromptRound({
            options: createRunOptions({
                noCommit: true,
                waitForUser: false,
                gitChanges: 'continue',
                thinkingLevel: 'high',
            }),
            runner,
            runnerMetadata: {
                runnerName: 'Claude Code',
                modelName: 'claude-opus-5',
            },
            nextPrompt: createInterruptedPromptSelection(
                '[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress',
            ),
            promptLabel: 'example.md#1',
            resolvedCoderContext: undefined,
            isRichUiEnabled: false,
            progressDisplay: undefined,
            uiHandle: undefined,
            waitForRequestedPause,
        });

        expect(markPromptInProgress).toHaveBeenCalledWith(
            expect.objectContaining({
                runnerName: 'Claude Code',
                modelName: 'claude-opus-5',
                startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna` thinking `max`',
            }),
        );
        expect(markPromptDone).toHaveBeenCalledWith(
            expect.objectContaining({
                runnerName: 'Claude Code',
                startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna` thinking `max`',
            }),
        );
    });

    it('does not repeat the harness which continues its own interrupted prompt', async () => {
        const runner: PromptRunner = {
            name: 'Claude Code',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        await runPromptRound({
            options: createRunOptions({
                noCommit: true,
                waitForUser: false,
                gitChanges: 'continue',
                thinkingLevel: 'high',
            }),
            runner,
            runnerMetadata: {
                runnerName: 'Claude Code',
                modelName: 'claude-opus-5',
            },
            nextPrompt: createInterruptedPromptSelection(
                '[^] by Claude Code `claude-opus-5` thinking `high` - Implementation in progress',
            ),
            promptLabel: 'example.md#1',
            resolvedCoderContext: undefined,
            isRichUiEnabled: false,
            progressDisplay: undefined,
            uiHandle: undefined,
            waitForRequestedPause,
        });

        expect(markPromptDone).toHaveBeenCalledWith(
            expect.objectContaining({
                startedByRunnerSignature: undefined,
            }),
        );
    });

    it('records the harness which started an interrupted prompt that another harness failed', async () => {
        const runner: PromptRunner = {
            name: 'Claude Code',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockRejectedValue(
            new Error('The harness died'),
        );

        await expect(
            runPromptRound({
                options: createRunOptions({
                    noCommit: true,
                    waitForUser: false,
                    waitAfterError: 0,
                    gitChanges: 'continue',
                }),
                runner,
                runnerMetadata: {
                    runnerName: 'Claude Code',
                    modelName: 'claude-opus-5',
                },
                nextPrompt: createInterruptedPromptSelection(
                    '[^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress',
                ),
                promptLabel: 'example.md#1',
                resolvedCoderContext: undefined,
                isRichUiEnabled: false,
                progressDisplay: undefined,
                uiHandle: undefined,
                waitForRequestedPause,
            }),
        ).rejects.toThrow('The harness died');

        expect(markPromptFailed).toHaveBeenCalledWith(
            expect.objectContaining({
                runnerName: 'Claude Code',
                modelName: 'claude-opus-5',
                startedByRunnerSignature: 'OpenAI Codex `gpt-5.6-luna`',
            }),
        );
    });

    it('records the in-progress status even when the round ends as failed', async () => {
        const runner: PromptRunner = {
            name: 'OpenAI Codex',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);

        (runPromptWithTestFeedback as jest.MockedFunction<typeof runPromptWithTestFeedback>).mockImplementation(
            async (options) => {
                await options.onStepStarted?.({ startedStepKind: 'implementation', finishedSteps: [] });

                throw new Error('The harness died');
            },
        );

        await expect(
            runPromptRound({
                options: createRunOptions({ noCommit: true, waitForUser: false, waitAfterError: 0 }),
                runner,
                runnerMetadata: {
                    runnerName: 'OpenAI Codex',
                    modelName: 'gpt-5.6-luna',
                },
                nextPrompt: createPromptSelection(),
                promptLabel: 'example.md#1',
                resolvedCoderContext: undefined,
                isRichUiEnabled: false,
                progressDisplay: undefined,
                uiHandle: undefined,
                waitForRequestedPause,
            }),
        ).rejects.toThrow('The harness died');

        expect(markPromptInProgress).toHaveBeenCalled();
        expect(markPromptFailed).toHaveBeenCalled();
        expect(markPromptDone).not.toHaveBeenCalled();
    });

    it('runs the agent and the commit in the provided project path of an isolated round', async () => {
        const runner: PromptRunner = {
            name: 'GitHub Copilot',
            runPrompt: jest.fn(),
        };
        const waitForRequestedPause = jest.fn<
            ReturnType<WaitForCoderRunPauseCheckpoint>,
            Parameters<WaitForCoderRunPauseCheckpoint>
        >(async () => undefined);
        const worktreePath = 'C:\\project\\.promptbook\\coder-isolation-worktrees\\example';

        await runPromptRound({
            options: createRunOptions({
                waitForUser: false,
                isIsolated: true,
                normalizeLineEndings: true,
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
            waitForRequestedPause,
            projectPath: worktreePath,
        });

        expect(captureCoderCommitScope).toHaveBeenCalledWith(worktreePath);
        expect(runPromptWithTestFeedback).toHaveBeenCalledWith(
            expect.objectContaining({
                projectPath: worktreePath,
            }),
        );
        expect(normalizeLineEndingsInFilesChangedSinceSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                projectPath: worktreePath,
            }),
        );
        expect(commitChanges).toHaveBeenCalledWith(
            'feat: example',
            expect.objectContaining({
                projectPath: worktreePath,
                isEmptyCommitAllowed: true,
            }),
        );
        // Note: The prompt status update itself is written into the original project, not into the worktree
        expect(writePromptFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'prompts\\example.md' }));
    });
});
