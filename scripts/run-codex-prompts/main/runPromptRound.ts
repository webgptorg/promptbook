import colors from 'colors';
import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import { increaseHeadings } from '../../../book/scripts/import-markdown/increaseHeadings';
import type { RunOptions } from '../cli/RunOptions';
import { appendCoderContext } from '../common/appendCoderContext';
import type { CliProgressDisplay } from '../common/cliProgressDisplay';
import { recordPromptDurationSample } from '../common/coderRunEstimateCache';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { formatCommitMessageForDisplay } from '../common/formatCommitMessageForDisplay';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
    type ChangedFilesSnapshot,
} from '../common/normalizeLineEndingsInChangedFiles';
import { printCommitMessage } from '../common/printCommitMessage';
import { withPromptRuntimeLog } from '../common/runGoScript/withPromptRuntimeLog';
import { sleepWithCountdown } from '../common/sleepWithCountdown';
import { waitForEnter } from '../common/waitForEnter';
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
 * Maximum number of retry attempts performed after a prompt round throws an error.
 * After this many retries the round is finalized as failed.
 *
 * @private internal constant of `runPromptRound`
 */
const MAX_RETRY_ATTEMPTS_AFTER_ERROR = 3;

/**
 * Input required to execute one prompt-processing round.
 */
export type RunPromptRoundOptions = {
    options: RunOptions;
    runner: PromptRunner;
    runnerMetadata: {
        runnerName: string;
        modelName?: string;
    };
    nextPrompt: PromptSelection;
    promptLabel: string;
    resolvedCoderContext?: string;
    resolvedAgentSystemMessage?: string;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;

    /**
     * Working directory the coding agent, the verification command and the round commit run in.
     *
     * Defaults to the project the coder was started from and is the temporary worktree
     * when the round is isolated through `--isolate`.
     */
    projectPath?: string;
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
    resolvedAgentSystemMessage,
    isRichUiEnabled,
    progressDisplay,
    uiHandle,
    waitForRequestedPause,
    projectPath,
}: RunPromptRoundOptions): Promise<void> {
    const roundProjectPath = projectPath ?? process.cwd();
    const commitMessage = buildCommitMessage(nextPrompt.file, nextPrompt.section);
    const taskPrompt = buildCodexPrompt(nextPrompt.file, nextPrompt.section);
    // Prepend agent system message before the task so the harness sees agent instructions first
    const promptWithAgent = resolvedAgentSystemMessage
        ? spaceTrim(
              (block) => `
                  
                  ## Your Task

                  ${block(taskPrompt)}

                  ## Your Behavior

                  ${block(increaseHeadings(resolvedAgentSystemMessage))}
              `,
          )
        : taskPrompt;
    const codexPrompt = appendCoderContext(promptWithAgent, resolvedCoderContext);
    // Note: Temporary scripts and runtime logs stay in the original project so they outlive an isolated worktree
    const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section);

    setPromptRoundRunningState({ isRichUiEnabled, promptLabel, scriptPath, uiHandle });
    await waitForRequestedPause({
        checkpointLabel: 'preparing the current prompt execution',
        phase: 'running',
        statusMessage: 'Preparing prompt execution',
    });

    const promptExecutionStartedDate = moment();
    let attemptCount = 1;
    const roundChangedFilesSnapshot = options.normalizeLineEndings
        ? await captureChangedFilesSnapshot(roundProjectPath)
        : undefined;

    await withPromptRuntimeLog(
        scriptPath,
        async (logPath) => {
            let lastError: unknown;

            for (let errorRetryAttempt = 0; errorRetryAttempt <= MAX_RETRY_ATTEMPTS_AFTER_ERROR; errorRetryAttempt++) {
                try {
                    uiHandle?.startCapturingAgentOutput();

                    const result = await runPromptWithTestFeedback({
                        runner,
                        prompt: codexPrompt,
                        scriptPath,
                        projectPath: roundProjectPath,
                        promptLabel,
                        testCommand: options.testCommand,
                        preserveArtifactsOnSuccess: options.preserveLogs,
                        logPath,
                        onAttemptStarted: (nextAttemptCount) => {
                            attemptCount = nextAttemptCount;
                            uiHandle?.state.setAttempt(nextAttemptCount);
                        },
                        waitForPauseCheckpoint: waitForRequestedPause,
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
                        waitForRequestedPause,
                        roundProjectPath,
                    });
                    return;
                } catch (error) {
                    uiHandle?.stopCapturingAgentOutput();
                    lastError = error;

                    if (errorRetryAttempt >= MAX_RETRY_ATTEMPTS_AFTER_ERROR) {
                        break;
                    }

                    await waitAfterErrorBeforeRetry({
                        options,
                        error,
                        attemptedRetries: errorRetryAttempt + 1,
                        isRichUiEnabled,
                        progressDisplay,
                        uiHandle,
                        waitForRequestedPause,
                    });
                }
            }

            await finalizeFailedPromptRound({
                nextPrompt,
                runnerMetadata,
                promptExecutionStartedDate,
                attemptCount,
                error: lastError,
                options,
                roundChangedFilesSnapshot,
                uiHandle,
                waitForRequestedPause,
                roundProjectPath,
            });

            throw lastError;
        },
        { preserveArtifactsOnSuccess: options.preserveLogs },
    );
}

/**
 * Sleeps `options.waitAfterError` while keeping the rich UI and plain console in sync, then resets state for the retry.
 */
async function waitAfterErrorBeforeRetry(options: {
    options: RunOptions;
    error: unknown;
    attemptedRetries: number;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
}): Promise<void> {
    const {
        options: runOptions,
        error,
        attemptedRetries,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
        waitForRequestedPause,
    } = options;

    const errorMessage = error instanceof Error ? error.message : String(error);

    uiHandle?.state.addError(errorMessage);
    uiHandle?.state.setPhase('waiting');

    if (!isRichUiEnabled) {
        console.warn(
            colors.yellow(
                `Prompt round failed (retry ${attemptedRetries}/${MAX_RETRY_ATTEMPTS_AFTER_ERROR}): ${errorMessage}`,
            ),
        );
    }

    const retryDeadlineTimeMs = Date.now() + runOptions.waitAfterError;

    await waitForRequestedPause({
        checkpointLabel: 'waiting after error before retrying the prompt',
        phase: 'waiting',
        statusMessage: `Waiting before retry ${attemptedRetries}/${MAX_RETRY_ATTEMPTS_AFTER_ERROR} after error`,
    });

    progressDisplay?.pauseTimer();
    uiHandle?.state.pauseTimer();

    await sleepWithCountdown({
        durationMs: runOptions.waitAfterError,
        deadlineTimeMs: retryDeadlineTimeMs,
        waitKind: 'after-error',
        isRichUiEnabled,
        uiHandle,
    });

    progressDisplay?.resumeTimer();
    uiHandle?.state.resumeTimer();
    uiHandle?.state.setPhase('running');
    uiHandle?.state.setStatusMessage(`Retrying prompt (retry ${attemptedRetries}/${MAX_RETRY_ATTEMPTS_AFTER_ERROR})`);
}

/**
 * Updates UI or console output to reflect that the selected prompt is being processed.
 */
function setPromptRoundRunningState(options: {
    isRichUiEnabled: boolean;
    promptLabel: string;
    scriptPath: string;
    uiHandle?: CoderRunUiHandle;
}): void {
    const { isRichUiEnabled, promptLabel, scriptPath, uiHandle } = options;

    uiHandle?.state.setCurrentPrompt(promptLabel);
    uiHandle?.state.setCurrentScriptPath(scriptPath);
    uiHandle?.state.setPhase('running');
    uiHandle?.state.setStatusMessage('Running');

    if (isRichUiEnabled) {
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
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
    roundProjectPath: string;
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
        waitForRequestedPause,
        roundProjectPath,
    } = options;

    uiHandle?.stopCapturingAgentOutput();
    await waitForRequestedPause({
        checkpointLabel: 'recording the successful prompt result',
        phase: 'running',
        statusMessage: 'Recording prompt result',
    });

    markPromptDone(
        nextPrompt.file,
        nextPrompt.section,
        result.steps,
        runnerMetadata.runnerName,
        runnerMetadata.modelName,
        result.attemptCount,
        result.loginMethod,
        runOptions.thinkingLevel,
    );
    // Note: The prompt status is always written into the original project, an isolated round transports
    //       its own changes back through the merge instead
    await writePromptFile(nextPrompt.file);
    await normalizeLineEndingsForCurrentRound(runOptions, roundProjectPath, roundChangedFilesSnapshot);
    await recordPromptDurationInEstimateCache({
        options: runOptions,
        runnerMetadata,
        promptExecutionStartedDate,
    });

    if (!runOptions.noCommit) {
        await waitForCommitConfirmationIfNeeded({
            options: runOptions,
            commitMessage,
            isRichUiEnabled,
            progressDisplay,
            uiHandle,
        });
        await waitForRequestedPause({
            checkpointLabel: 'committing the successful changes',
            phase: 'running',
            statusMessage: 'Committing changes',
        });
        await commitChanges(commitMessage, {
            autoPush: runOptions.autoPush,
            // Keep the live runtime log out of default commits because it is deleted after a successful round.
            excludePaths: runOptions.preserveLogs ? undefined : [logPath],
            projectPath: roundProjectPath,
            // Note: An isolated round commits only the agent changes, so a task that needed none must not fail here
            isEmptyCommitAllowed: runOptions.isIsolated,
        });
    } else {
        uiHandle?.state.setStatusMessage('Leaving changes uncommitted');
    }

    if (runOptions.autoMigrate) {
        await waitForRequestedPause({
            checkpointLabel: 'running testing-server auto-migration',
            phase: 'running',
            statusMessage: 'Running testing-server auto-migration',
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
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
    roundProjectPath: string;
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
        waitForRequestedPause,
        roundProjectPath,
    } = options;

    uiHandle?.stopCapturingAgentOutput();
    uiHandle?.state.setPhase('error');
    uiHandle?.state.addError(error instanceof Error ? error.message : String(error));
    await waitForRequestedPause({
        checkpointLabel: 'recording the prompt failure',
        phase: 'error',
        statusMessage: 'Recording prompt failure',
    });

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
    await normalizeLineEndingsForCurrentRound(runOptions, roundProjectPath, roundChangedFilesSnapshot);
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
    uiHandle?.state.setPhase('running');
    uiHandle?.state.setStatusMessage('Committing changes');
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
 * Persists the duration of one successful prompt round into the per-config estimate cache so the
 * next `ptbk coder run` / `ptbk coder server` invocation can show a meaningful completion estimate
 * before its own first prompt has finished.
 */
async function recordPromptDurationInEstimateCache(options: {
    options: RunOptions;
    runnerMetadata: {
        runnerName: string;
        modelName?: string;
    };
    promptExecutionStartedDate: moment.Moment;
}): Promise<void> {
    const { options: runOptions, runnerMetadata, promptExecutionStartedDate } = options;
    if (!runOptions.agentName) {
        return;
    }

    const promptDurationMs = moment().diff(promptExecutionStartedDate);
    await recordPromptDurationSample(
        {
            harness: runOptions.agentName,
            model: runnerMetadata.modelName ?? runOptions.model,
            thinkingLevel: runOptions.thinkingLevel,
        },
        promptDurationMs,
    );
}

/**
 * Normalizes line endings in files modified during the current coding round.
 */
async function normalizeLineEndingsForCurrentRound(
    options: RunOptions,
    roundProjectPath: string,
    roundChangedFilesSnapshot?: ChangedFilesSnapshot,
): Promise<void> {
    if (!options.normalizeLineEndings || !roundChangedFilesSnapshot) {
        return;
    }

    try {
        const result = await normalizeLineEndingsInFilesChangedSinceSnapshot({
            projectPath: roundProjectPath,
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
