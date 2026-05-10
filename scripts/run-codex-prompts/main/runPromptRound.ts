import colors from 'colors';
import moment from 'moment';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
    type ChangedFilesSnapshot,
} from '../common/normalizeLineEndingsInChangedFiles';
import { formatCommitMessageForDisplay } from '../common/formatCommitMessageForDisplay';
import { printCommitMessage } from '../common/printCommitMessage';
import { appendCoderContext } from '../common/appendCoderContext';
import { withPromptRuntimeLog } from '../common/runGoScript/withPromptRuntimeLog';
import { waitForEnter } from '../common/waitForEnter';
import type { CliProgressDisplay } from '../common/cliProgressDisplay';
import type { RunOptions } from '../cli/RunOptions';
import { commitChanges } from '../git/commitChanges';
import { runAutoMigrateTestingServers } from '../migrations/runAutoMigrateTestingServers';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { markPromptDone } from '../prompts/markPromptDone';
import { markPromptFailed } from '../prompts/markPromptFailed';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { writePromptFile } from '../prompts/writePromptFile';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptWithTestFeedback } from '../testing/runPromptWithTestFeedback';
import type { CoderRunUiHandle } from '../ui/renderCoderRunUi';

/**
 * Input required to execute one prompt-processing round.
 */
type RunPromptRoundOptions = {
    options: RunOptions;
    runner: PromptRunner;
    runnerMetadata: {
        runnerName: string;
        modelName?: string;
    };
    nextPrompt: PromptSelection;
    promptLabel: string;
    resolvedCoderContext?: string;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause(): Promise<void>;
};

/**
 * Runs one prompt round from prompt construction through commit or failure logging.
 *
 * @private function of runCodexPrompts
 */
export async function runPromptRound({
    options,
    runner,
    runnerMetadata,
    nextPrompt,
    promptLabel,
    resolvedCoderContext,
    isRichUiEnabled,
    progressDisplay,
    uiHandle,
    waitForRequestedPause,
}: RunPromptRoundOptions): Promise<void> {
    const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
    const codexPrompt = appendCoderContext(buildCodexPrompt(nextPrompt.file, nextPrompt.section), resolvedCoderContext);
    const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);

    await waitForRequestedPause();
    setPromptRoundRunningState({ isRichUiEnabled, promptLabel, uiHandle });

    const promptExecutionStartedDate = moment();
    let attemptCount = 1;
    const roundChangedFilesSnapshot = options.normalizeLineEndings
        ? await captureChangedFilesSnapshot(process.cwd())
        : undefined;

    await withPromptRuntimeLog(
        scriptPath,
        async (logPath) => {
            try {
                uiHandle?.startCapturingAgentOutput();

                const result = await runPromptWithTestFeedback({
                    runner,
                    prompt: codexPrompt,
                    scriptPath,
                    projectPath: process.cwd(),
                    promptLabel,
                    testCommand: options.testCommand,
                    preserveArtifactsOnSuccess: options.preserveLogs,
                    logPath,
                    onAttemptStarted: (nextAttemptCount) => {
                        attemptCount = nextAttemptCount;
                        uiHandle?.state.setAttempt(nextAttemptCount);
                        if (nextAttemptCount > 1) {
                            uiHandle?.state.setStatusMessage(`Retrying (attempt ${nextAttemptCount})`);
                            uiHandle?.state.setPhase('verifying');
                        }
                    },
                });

                await finalizeSuccessfulPromptRound({
                    options,
                    nextPrompt,
                    runnerMetadata,
                    promptExecutionStartedDate,
                    result,
                    commitMessage,
                    logPath,
                    roundChangedFilesSnapshot,
                    isRichUiEnabled,
                    progressDisplay,
                    uiHandle,
                });
            } catch (error) {
                await finalizeFailedPromptRound({
                    nextPrompt,
                    runnerMetadata,
                    promptExecutionStartedDate,
                    attemptCount,
                    error,
                    options,
                    roundChangedFilesSnapshot,
                    uiHandle,
                });

                throw error;
            }
        },
        { preserveArtifactsOnSuccess: options.preserveLogs },
    );
}

/**
 * Updates UI or console output to reflect that the selected prompt is being processed.
 */
function setPromptRoundRunningState(options: {
    isRichUiEnabled: boolean;
    promptLabel: string;
    uiHandle?: CoderRunUiHandle;
}): void {
    const { isRichUiEnabled, promptLabel, uiHandle } = options;

    if (isRichUiEnabled) {
        uiHandle?.state.setCurrentPrompt(promptLabel);
        uiHandle?.state.setPhase('running');
        uiHandle?.state.setStatusMessage('Running');
        return;
    }

    console.info(colors.blue(`Processing ${promptLabel}`));
}

/**
 * Finalizes a successful prompt round, including prompt bookkeeping and commit flow.
 */
async function finalizeSuccessfulPromptRound(options: {
    options: RunOptions;
    nextPrompt: PromptSelection;
    runnerMetadata: {
        runnerName: string;
        modelName?: string;
    };
    promptExecutionStartedDate: moment.Moment;
    result: Awaited<ReturnType<typeof runPromptWithTestFeedback>>;
    commitMessage: string;
    logPath: string;
    roundChangedFilesSnapshot?: ChangedFilesSnapshot;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
}): Promise<void> {
    const {
        options: runOptions,
        nextPrompt,
        runnerMetadata,
        promptExecutionStartedDate,
        result,
        commitMessage,
        logPath,
        roundChangedFilesSnapshot,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
    } = options;

    uiHandle?.stopCapturingAgentOutput();
    uiHandle?.state.setStatusMessage(runOptions.noCommit ? 'Leaving changes uncommitted' : 'Committing changes');

    markPromptDone(
        nextPrompt.file,
        nextPrompt.section,
        result.usage,
        runnerMetadata.runnerName,
        runnerMetadata.modelName,
        promptExecutionStartedDate,
        result.attemptCount,
    );
    await writePromptFile(nextPrompt.file);
    await normalizeLineEndingsForCurrentRound(runOptions, roundChangedFilesSnapshot);

    if (!runOptions.noCommit) {
        await waitForCommitConfirmationIfNeeded({
            options: runOptions,
            commitMessage,
            isRichUiEnabled,
            progressDisplay,
            uiHandle,
        });
        await commitChanges(commitMessage, {
            autoPush: runOptions.autoPush,
            // Keep the live runtime log out of default commits because it is deleted after a successful round.
            excludePaths: runOptions.preserveLogs ? undefined : [logPath],
        });
    }

    await runPostPromptAutoMigrationIfEnabled(runOptions);
}

/**
 * Finalizes a failed prompt round, persisting prompt failure metadata before rethrowing.
 */
async function finalizeFailedPromptRound(options: {
    nextPrompt: PromptSelection;
    runnerMetadata: {
        runnerName: string;
        modelName?: string;
    };
    promptExecutionStartedDate: moment.Moment;
    attemptCount: number;
    error: unknown;
    options: RunOptions;
    roundChangedFilesSnapshot?: ChangedFilesSnapshot;
    uiHandle?: CoderRunUiHandle;
}): Promise<void> {
    const {
        nextPrompt,
        runnerMetadata,
        promptExecutionStartedDate,
        attemptCount,
        error,
        options: runOptions,
        roundChangedFilesSnapshot,
        uiHandle,
    } = options;

    uiHandle?.stopCapturingAgentOutput();
    uiHandle?.state.setPhase('error');
    uiHandle?.state.addError(error instanceof Error ? error.message : String(error));

    markPromptFailed(
        nextPrompt.file,
        nextPrompt.section,
        runnerMetadata.runnerName,
        runnerMetadata.modelName,
        promptExecutionStartedDate,
        attemptCount,
    );
    await writePromptFile(nextPrompt.file);
    await writePromptErrorLog({
        file: nextPrompt.file,
        section: nextPrompt.section,
        runnerName: runnerMetadata.runnerName,
        modelName: runnerMetadata.modelName,
        error,
    });
    await normalizeLineEndingsForCurrentRound(runOptions, roundChangedFilesSnapshot);
}

/**
 * Waits for the optional user confirmation immediately before creating the commit.
 */
async function waitForCommitConfirmationIfNeeded(options: {
    options: RunOptions;
    commitMessage: string;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
}): Promise<void> {
    const { options: runOptions, commitMessage, isRichUiEnabled, progressDisplay, uiHandle } = options;

    if (!runOptions.waitForUser) {
        return;
    }

    progressDisplay?.pauseTimer();
    uiHandle?.state.pauseTimer();
    uiHandle?.state.setPhase('waiting');
    uiHandle?.state.setStatusMessage('Review the commit preview and confirm to continue');

    if (isRichUiEnabled) {
        uiHandle?.state.setDetailLines(buildCommitPreviewLines(commitMessage));
        await uiHandle?.waitForEnter('Commit');
        uiHandle?.state.setDetailLines([]);
    } else {
        printCommitMessage(commitMessage);
        await waitForEnter(colors.bgWhite('Press Enter to commit and continue...'));
    }

    progressDisplay?.resumeTimer();
    uiHandle?.state.resumeTimer();
}

/**
 * Formats commit preview lines for the rich terminal UI.
 */
function buildCommitPreviewLines(commitMessage: string): string[] {
    return formatCommitMessageForDisplay(commitMessage)
        .split(/\r?\n/)
        .map((line) => line.trim());
}

/**
 * Runs post-prompt testing-server auto-migration when enabled.
 */
async function runPostPromptAutoMigrationIfEnabled(options: RunOptions): Promise<void> {
    if (!options.autoMigrate) {
        return;
    }

    await runAutoMigrateTestingServers({
        allowDestructiveAutoMigrate: options.allowDestructiveAutoMigrate,
        logger: console,
    });
}

/**
 * Normalizes line endings in files modified during the current coding round.
 */
async function normalizeLineEndingsForCurrentRound(
    options: RunOptions,
    roundChangedFilesSnapshot?: ChangedFilesSnapshot,
): Promise<void> {
    if (!options.normalizeLineEndings || !roundChangedFilesSnapshot) {
        return;
    }

    try {
        const result = await normalizeLineEndingsInFilesChangedSinceSnapshot({
            projectPath: process.cwd(),
            snapshot: roundChangedFilesSnapshot,
        });

        if (result.normalizedFiles > 0) {
            console.info(colors.gray(`Normalized line endings to LF in ${result.normalizedFiles} changed file(s).`));
        }
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(colors.yellow(`Automatic line-ending normalization failed: ${details}`));
    }
}
