import colors from 'colors';
import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import { increaseHeadings } from '../../../book/scripts/import-markdown/increaseHeadings';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import { AuthenticationError } from '../../../src/errors/AuthenticationError';
import { EnvironmentMismatchError } from '../../../src/errors/EnvironmentMismatchError';
import type { RunOptions } from '../cli/RunOptions';
import { appendCoderContext } from '../common/appendCoderContext';
import type { CliProgressDisplay } from '../common/cliProgressDisplay';
import { recordPromptDurationSample } from '../common/coderRunEstimateCache';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import type { CoderRunStepProgress } from '../common/createCoderRunStepTracker';
import { formatCommitMessageForDisplay } from '../common/formatCommitMessageForDisplay';
import { normalizeLineEndingsInFilesChangedSinceSnapshot } from '../common/normalizeLineEndingsInChangedFiles';
import { printCommitMessage } from '../common/printCommitMessage';
import type { PromptRunnerMetadata } from '../common/PromptRunnerMetadata';
import { withPromptRuntimeLog } from '../common/runGoScript/withPromptRuntimeLog';
import { sleepWithCountdown } from '../common/sleepWithCountdown';
import { waitForEnter } from '../common/waitForEnter';
import type { CoderCommitScope } from '../git/coderCommitScope';
import {
    captureCoderCommitScope,
    continueCoderCommitScopeOwnership,
    resolveCoderCommitScopePaths,
} from '../git/coderCommitScope';
import { commitChanges } from '../git/commitChanges';
import { runAutoMigrateTestingServers } from '../migrations/runAutoMigrateTestingServers';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import type { PromptRunTraceOutcome } from '../prompts/buildPromptRunTraceContent';
import { buildScriptPath } from '../prompts/buildScriptPath';
import { markPromptDone } from '../prompts/markPromptDone';
import { markPromptFailed } from '../prompts/markPromptFailed';
import { markPromptInProgress } from '../prompts/markPromptInProgress';
import { parsePromptRunnerAttribution, type PromptRunnerAttribution } from '../prompts/promptRunnerAttribution';
import { resolvePromptStatusLine } from '../prompts/resolvePromptStatusLine';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { buildPromptErrorLogPath, writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { buildPromptFileContent, writePromptFile } from '../prompts/writePromptFile';
import { writePromptRunTrace } from '../prompts/writePromptRunTrace';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptWithCheckFeedback } from '../checks/runPromptWithCheckFeedback';
import { CoderCheckSetupError } from '../checks/projectCheck';
import { CoderCheckFailedError } from '../checks/CoderCheckFailedError';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import type { CoderRunUiHandle } from '../ui/renderCoderRunUi';
import { CoderPhasePersistence } from '../git/CoderPhasePersistence';
import { CoderCheckExecutionError } from '../checks/CoderCheckExecutionError';
import { withCoderWorkspaceLock } from '../common/withCoderWorkspaceLock';
import { buildScriptLogPath } from '../common/runGoScript/buildScriptLogPath';
import { buildCoderExecutionArtifactPaths } from '../common/runGoScript/buildCoderExecutionArtifactPaths';
import { relative } from 'path';
import { readFile, unlink, writeFile } from 'fs/promises';
import { refreshPromptSelection } from '../prompts/refreshPromptSelection';
import { buildPromptRunTracePath } from '../prompts/buildPromptRunTracePath';
import type { CoderFinalizationFile } from '../git/coderFinalizationFiles';
import { listWorkingTreeChangedFiles } from '../git/workingTreeChanges';

/**
 * Maximum number of retry attempts performed after a prompt round throws an error.
 * After this many retries the round is finalized as failed.
 *
 * @private internal constant of `runPromptRound`
 */
const MAX_RETRY_ATTEMPTS_AFTER_ERROR = 3;

/** Execution policy for one selected task; no queue, watcher or priority state is required. */
export type PromptRoundExecutionOptions = Pick<
    RunOptions,
    | 'workspace'
    | 'projectPath'
    | 'checkCommand'
    | 'preserveLogs'
    | 'thinkingLevel'
    | 'waitForUser'
    | 'waitAfterError'
    | 'noCommit'
    | 'normalizeLineEndings'
    | 'autoMigrate'
    | 'allowDestructiveAutoMigrate'
    | 'autoPush'
    | 'isIsolated'
    | 'agentName'
    | 'model'
    | 'agent'
    | 'context'
    | 'projectContext'
>;

/**
 * Input required to execute one prompt-processing round.
 */
export type RunPromptRoundOptions = {
    options: PromptRoundExecutionOptions;
    runner: PromptRunner;
    runnerMetadata: PromptRunnerMetadata;
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
    /** Explicit durable artifact location when a temporary execution worktree will be deleted. */
    artifactsProjectPath?: string;
    /** Scope captured before check-repair authoring and lazy Book initialization. */
    commitScope?: CoderCommitScope;
    /** Last retained no-commit phase of this same job, never an unrelated worker's dirty-file list. */
    ownershipScope?: CoderCommitScope;
    onScopeRetained?: (scope: CoderCommitScope) => void;
    /** Cancels only this round's owned subprocesses and retry waits. */
    signal?: AbortSignal;
};

/**
 * Runs one prompt round from prompt construction through commit or failure logging.
 *
 * @private function of runCodexPrompts
 */
export async function runPromptRound(options: RunPromptRoundOptions): Promise<void> {
    const projectPath =
        options.projectPath ?? options.options.workspace?.projectPath ?? options.options.projectPath ?? process.cwd();
    const project = options.options.workspace?.projectPath === projectPath ? options.options.workspace : projectPath;
    return withCoderWorkspaceLock(project, () => runOwnedPromptRound(options), { isNestedOwnershipAllowed: true });
}

/** Runs one selected round while agent/check/bookkeeping/Git mutations share workspace ownership. */
async function runOwnedPromptRound({
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
    artifactsProjectPath,
    commitScope,
    ownershipScope,
    onScopeRetained,
    signal,
}: RunPromptRoundOptions): Promise<void> {
    const roundProjectPath = projectPath ?? options.workspace?.projectPath ?? options.projectPath ?? process.cwd();
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
    const scriptPath = buildScriptPath(nextPrompt.file, nextPrompt.section, artifactsProjectPath ?? roundProjectPath);
    // Note: Read before the first `[^]` rewrite of this round, which would overwrite the report recorded so far
    const previousRunnerSignatures = resolvePreviousRunnerSignatures(nextPrompt);

    setPromptRoundRunningState({ isRichUiEnabled, promptLabel, scriptPath, uiHandle });
    await waitForRequestedPause({
        checkpointLabel: 'preparing the current prompt execution',
        phase: 'running',
        statusMessage: 'Preparing prompt execution',
    });

    const promptExecutionStartedDate = moment();
    let attemptCount = 1;
    // Note: The very same snapshot tells which files this round has changed, both for normalizing their line
    //       endings and for committing only them instead of everything which is changed in the project
    const capturedScope = commitScope ?? (await captureRoundCommitScopeIfNeeded(options, roundProjectPath));
    const roundCommitScope = capturedScope
        ? continueCoderCommitScopeOwnership(capturedScope, ownershipScope)
        : undefined;
    const repositoryRoot = roundCommitScope?.repositoryRoot ?? roundProjectPath;
    const excludedPaths = buildCoderExecutionArtifactPaths(scriptPath).map((path) =>
        relative(repositoryRoot, path).replace(/\\/gu, '/'),
    );
    const persistence = roundCommitScope
        ? new CoderPhasePersistence({
              scope: roundCommitScope,
              isCommitEnabled: !options.noCommit,
              isAutoPushEnabled: options.autoPush,
              implementationMessage: commitMessage,
              task: promptLabel,
              excludedPaths,
              signal,
              onRetained: onScopeRetained,
              beforePersist: () =>
                  waitForCommitConfirmationIfNeeded({
                      options,
                      commitMessage,
                      isRichUiEnabled,
                      progressDisplay,
                      uiHandle,
                  }),
              onPersisted: (result) => {
                  if (result.commit) {
                      const message = `Committed ${result.phase} changes: ${result.commit}`;
                      uiHandle?.state.setStatusMessage(message);
                      if (!isRichUiEnabled) console.info(colors.gray(message));
                  }
              },
          })
        : undefined;
    if (commitScope && persistence) await persistence.adoptPreparation();
    await persistence?.assertRetained();
    await persistence?.assertWritablePaths([
        nextPrompt.file.path,
        buildPromptRunTracePath(nextPrompt.file, nextPrompt.section),
        buildPromptErrorLogPath(nextPrompt.file.path),
        scriptPath,
        buildScriptLogPath(scriptPath),
    ]);

    await withPromptRuntimeLog(
        scriptPath,
        async (logPath) => {
            let lastError: unknown;

            for (let errorRetryAttempt = 0; errorRetryAttempt <= MAX_RETRY_ATTEMPTS_AFTER_ERROR; errorRetryAttempt++) {
                let isVerified = false;
                let retainedRuntimeLog: string | undefined;
                try {
                    signal?.throwIfAborted();
                    uiHandle?.startCapturingAgentOutput();

                    const result = await runPromptWithCheckFeedback({
                        runner,
                        prompt: codexPrompt,
                        scriptPath,
                        projectPath: roundProjectPath,
                        promptLabel,
                        checkCommand: options.checkCommand,
                        preserveArtifactsOnSuccess: options.preserveLogs,
                        logPath,
                        persistence,
                        onBeforeCheck: () =>
                            normalizeLineEndingsForCurrentRound(options, roundProjectPath, roundCommitScope),
                        onAttemptStarted: (nextAttemptCount) => {
                            attemptCount = nextAttemptCount;
                            uiHandle?.state.setAttempt(nextAttemptCount);
                        },
                        onStepStarted: (progress) =>
                            recordPromptRoundInProgress({
                                nextPrompt,
                                runnerMetadata,
                                previousRunnerSignatures,
                                thinkingLevel: options.thinkingLevel,
                                attemptCount,
                                progress,
                            }),
                        waitForPauseCheckpoint: waitForRequestedPause,
                        ...(signal ? { signal } : {}),
                    });
                    isVerified = true;
                    // Successful temporary-log cleanup belongs to finalization. Keep its bytes available if a
                    // later hook/signature/status commit fails, so failure recovery still has the transcript.
                    if (persistence) retainedRuntimeLog = await readFile(logPath, 'utf-8').catch(() => undefined);

                    await finalizeSuccessfulPromptRound({
                        options,
                        nextPrompt,
                        runnerMetadata,
                        previousRunnerSignatures,
                        promptExecutionStartedDate,
                        result,
                        commitMessage,
                        logPath,
                        roundCommitScope,
                        isRichUiEnabled,
                        progressDisplay,
                        uiHandle,
                        waitForRequestedPause,
                        roundProjectPath,
                        signal,
                        persistence,
                    });
                    return;
                } catch (error) {
                    uiHandle?.stopCapturingAgentOutput();
                    if (isVerified) {
                        // Verification succeeded. Persistence failures must not re-enter the model/check retry loop,
                        // overwrite a committed success, or duplicate a commit after a rejected push.
                        const persistenceError =
                            error instanceof CoderGitOperationError
                                ? error
                                : new CoderGitOperationError(
                                      'record',
                                      error instanceof Error ? error.message : String(error),
                                  );
                        if (options.checkCommand?.trim()) persistenceError.checkOutcome ??= 'passed';
                        if (retainedRuntimeLog !== undefined) {
                            // Never replace a concurrent writer's log while recovering our own cleanup.
                            await writeFile(logPath, retainedRuntimeLog, { flag: 'wx' }).catch(() => undefined);
                        }
                        if (persistence) {
                            const failurePath = await persistence.recordFailure(persistenceError);
                            if (failurePath) console.warn(`Persistence failure retained in \`${failurePath}\`.`);
                            await reportRetainedChanges(repositoryRoot);
                        } else {
                            await writePromptErrorLog({
                                file: nextPrompt.file,
                                section: nextPrompt.section,
                                runnerName: runnerMetadata.runnerName,
                                modelName: runnerMetadata.modelName,
                                error: persistenceError,
                            });
                            if (persistenceError.operation !== 'push')
                                await recordPromptRoundTrace({
                                    options,
                                    nextPrompt,
                                    runnerMetadata,
                                    promptExecutionStartedDate,
                                    attemptCount,
                                    logPath,
                                    outcome: { kind: 'failed', error: persistenceError },
                                });
                        }
                        throw persistenceError;
                    }
                    lastError = error;

                    // Note: A harness which is not logged in answers every retry the same way, so the user gets
                    //       the sign-in instructions right away instead of after every retry has waited its delay
                    if (
                        error instanceof AuthenticationError ||
                        error instanceof EnvironmentMismatchError ||
                        error instanceof CoderCheckSetupError ||
                        error instanceof CoderCheckExecutionError ||
                        error instanceof CoderCheckFailedError ||
                        error instanceof CoderGitOperationError ||
                        signal?.aborted ||
                        errorRetryAttempt >= MAX_RETRY_ATTEMPTS_AFTER_ERROR
                    ) {
                        break;
                    }

                    try {
                        await waitAfterErrorBeforeRetry({
                            options,
                            error,
                            attemptedRetries: errorRetryAttempt + 1,
                            isRichUiEnabled,
                            progressDisplay,
                            uiHandle,
                            waitForRequestedPause,
                            signal,
                        });
                    } catch (waitError) {
                        lastError = waitError;
                        break;
                    }
                }
            }

            await finalizeFailedPromptRound({
                nextPrompt,
                runnerMetadata,
                previousRunnerSignatures,
                promptExecutionStartedDate,
                attemptCount,
                error: lastError,
                options,
                logPath,
                roundCommitScope,
                uiHandle,
                waitForRequestedPause,
                roundProjectPath,
                isInterrupted: signal?.aborted,
                persistence,
            });

            throw lastError;
        },
        { preserveArtifactsOnSuccess: options.preserveLogs },
    );
}

/**
 * Reads the chronological harness report left on the prompt before this round rewrites its in-progress status.
 *
 * Only a prompt resumed through `--git-changes continue` still carries the in-progress `[^]` status when its
 * round starts, so every other round starts a fresh report.
 */
function resolvePreviousRunnerSignatures(nextPrompt: PromptSelection): PromptRunnerAttribution | undefined {
    if (nextPrompt.section.status !== 'in-progress') {
        return undefined;
    }

    const { line } = resolvePromptStatusLine(nextPrompt.file, nextPrompt.section);
    return parsePromptRunnerAttribution(line);
}

/**
 * Records into the prompt file that the prompt is being implemented right now.
 *
 * The `[^]` in-progress status is written before every single step, so it always names the step which is
 * running and the steps already finished. It is intentionally never reverted: a coder which is killed or
 * crashes leaves the `[^]` status behind as the signal that this task was left in the middle.
 */
async function recordPromptRoundInProgress(options: {
    nextPrompt: PromptSelection;
    runnerMetadata: PromptRunnerMetadata;
    previousRunnerSignatures?: PromptRunnerAttribution;
    thinkingLevel?: ThinkingLevel;
    attemptCount: number;
    progress: CoderRunStepProgress;
}): Promise<void> {
    const { nextPrompt, runnerMetadata, previousRunnerSignatures, thinkingLevel, attemptCount, progress } = options;
    await refreshPromptSelection(nextPrompt);

    markPromptInProgress({
        file: nextPrompt.file,
        section: nextPrompt.section,
        steps: progress.finishedSteps,
        inProgressStepKind: progress.startedStepKind,
        ...runnerMetadata,
        previousRunnerSignatures,
        attemptCount,
        loginMethod: progress.loginMethod,
        thinkingLevel,
    });
    // Note: The prompt status is always written into the original project, an isolated round transports
    //       its own changes back through the merge instead
    try {
        await writePromptFile(nextPrompt.file);
    } catch (error) {
        throw new CoderGitOperationError('record', error instanceof Error ? error.message : String(error));
    }
}

/**
 * Sleeps `options.waitAfterError` while keeping the rich UI and plain console in sync, then resets state for the retry.
 */
async function waitAfterErrorBeforeRetry(options: {
    options: PromptRoundExecutionOptions;
    error: unknown;
    attemptedRetries: number;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
    signal?: AbortSignal;
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
        signal: options.signal,
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
    options: PromptRoundExecutionOptions;
    nextPrompt: PromptSelection;
    runnerMetadata: PromptRunnerMetadata;
    previousRunnerSignatures?: PromptRunnerAttribution;
    promptExecutionStartedDate: moment.Moment;
    result: Awaited<ReturnType<typeof runPromptWithCheckFeedback>>;
    commitMessage: string;
    logPath: string;
    roundCommitScope?: CoderCommitScope;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
    roundProjectPath: string;
    signal?: AbortSignal;
    persistence?: CoderPhasePersistence;
}): Promise<void> {
    const {
        options: runOptions,
        nextPrompt,
        runnerMetadata,
        previousRunnerSignatures,
        promptExecutionStartedDate,
        result,
        commitMessage,
        logPath,
        roundCommitScope,
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
    if (options.persistence) {
        await options.persistence.assertRetained();
        await refreshPromptSelection(nextPrompt);
    }
    // Prepare a completion candidate without publishing done in queue memory before local persistence succeeds.
    const completionPrompt = options.persistence
        ? {
              file: { ...nextPrompt.file, lines: [...nextPrompt.file.lines] },
              section: { ...nextPrompt.section },
          }
        : nextPrompt;

    const finalizationFiles: CoderFinalizationFile[] = [];
    /** The status/trace candidate is Coder finalization, never part of the check command delta. */
    const recordCompletion = async (): Promise<void> => {
        if (!runOptions.checkCommand?.trim() && runOptions.normalizeLineEndings) completionPrompt.file.eol = '\n';
        markPromptDone({
            file: completionPrompt.file,
            section: completionPrompt.section,
            steps: result.steps,
            ...runnerMetadata,
            previousRunnerSignatures,
            attemptCount: result.attemptCount,
            loginMethod: result.loginMethod,
            thinkingLevel: runOptions.thinkingLevel,
        });
        // Note: The prompt status is always written into the original project, an isolated round transports
        //       its own changes back through the merge instead
        if (!options.persistence) await writePromptFile(completionPrompt.file);
        // Note: Written before the round is committed, so the trace of the round lands in the very same commit
        //       as the prompt it describes, and before the live runtime log it is built from is deleted
        await recordPromptRoundTrace({
            options: runOptions,
            nextPrompt: completionPrompt,
            runnerMetadata,
            promptExecutionStartedDate,
            attemptCount: result.attemptCount,
            logPath,
            outcome: { kind: 'succeeded', steps: result.steps, loginMethod: result.loginMethod },
            persistence: options.persistence,
            writeContent: options.persistence
                ? async (path, content) => {
                      finalizationFiles.push({
                          path,
                          content: Buffer.from(
                              runOptions.normalizeLineEndings ? content.replace(/\r\n/gu, '\n') : content,
                          ),
                      });
                  }
                : undefined,
        });
        // Publish the selected status last, after trace/artifact persistence has succeeded.
        if (options.persistence)
            finalizationFiles.push({
                path: completionPrompt.file.path,
                content: Buffer.from(buildPromptFileContent(completionPrompt.file)),
            });
        // Checked rounds normalize before each verification, so successful content is never changed afterwards.
        // Preserve normalization for ordinary rounds which have no selected check command.
        if (!runOptions.checkCommand?.trim()) {
            await normalizeLineEndingsForCurrentRound(runOptions, roundProjectPath, roundCommitScope);
        }
        if (options.persistence && !runOptions.preserveLogs) {
            try {
                await unlink(logPath);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
        }
    };
    if (options.persistence) await options.persistence.mutate(recordCompletion, 'finalization');
    else await recordCompletion();
    // Include retained artifacts and intentional removals of previously tracked temporary files. No Coder
    // writer will subsequently change these paths; default live-log cleanup above precedes this boundary.
    await options.persistence?.includeDurableArtifacts();
    await recordPromptDurationInEstimateCache({
        options: runOptions,
        runnerMetadata,
        promptExecutionStartedDate,
    });

    if (!runOptions.noCommit) {
        if (!options.persistence)
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
        if (options.persistence) {
            await options.persistence.finalize(undefined, finalizationFiles);
            Object.assign(nextPrompt.section, completionPrompt.section, { status: 'done' });
            nextPrompt.file.lines = completionPrompt.file.lines;
            nextPrompt.file.eol = completionPrompt.file.eol;
            await options.persistence.push();
        } else
            await commitChanges(commitMessage, {
                autoPush: runOptions.autoPush,
                // Note: Only the prompt file and the files the coding agent has changed belong to this round,
                //       everything which was already changed before the round started stays in the working tree
                relevantPaths: roundCommitScope && (await resolveCoderCommitScopePaths(roundCommitScope)),
                // Keep the live runtime log out of default commits because it is deleted after a successful round.
                excludePaths: runOptions.preserveLogs ? undefined : [logPath],
                projectPath: roundCommitScope?.repositoryRoot ?? roundProjectPath,
                // Note: An isolated round commits only the agent changes, so a task that needed none must not fail here
                isEmptyCommitAllowed: runOptions.isIsolated,
                ...(options.signal ? { signal: options.signal } : {}),
            });
    } else {
        if (options.persistence) {
            await options.persistence.finalize(undefined, finalizationFiles);
            Object.assign(nextPrompt.section, completionPrompt.section, { status: 'done' });
            nextPrompt.file.lines = completionPrompt.file.lines;
            nextPrompt.file.eol = completionPrompt.file.eol;
        }
        const retainedPaths = options.persistence?.outstandingPaths() ?? [];
        const status = `Leaving changes uncommitted${retainedPaths.length ? `: ${retainedPaths.join(', ')}` : ''}`;
        uiHandle?.state.setStatusMessage(status);
        if (!isRichUiEnabled) console.info(colors.gray(status));
    }

    if (runOptions.autoMigrate) {
        await waitForRequestedPause({
            checkpointLabel: 'running testing-server auto-migration',
            phase: 'running',
            statusMessage: 'Running testing-server auto-migration',
        });
    }
    await runPostPromptAutoMigrationIfEnabled(runOptions);
    await options.persistence?.assertRetained();
}

/**
 * Finalizes a failed prompt round, persisting prompt failure metadata before rethrowing.
 */
async function finalizeFailedPromptRound(options: {
    nextPrompt: PromptSelection;
    runnerMetadata: PromptRunnerMetadata;
    previousRunnerSignatures?: PromptRunnerAttribution;
    promptExecutionStartedDate: moment.Moment;
    attemptCount: number;
    error: unknown;
    options: PromptRoundExecutionOptions;
    logPath: string;
    roundCommitScope?: CoderCommitScope;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
    roundProjectPath: string;
    isInterrupted?: boolean;
    persistence?: CoderPhasePersistence;
}): Promise<void> {
    const {
        nextPrompt,
        runnerMetadata,
        previousRunnerSignatures,
        promptExecutionStartedDate,
        attemptCount,
        error,
        options: runOptions,
        logPath,
        roundCommitScope,
        uiHandle,
        waitForRequestedPause,
        roundProjectPath,
    } = options;

    uiHandle?.stopCapturingAgentOutput();
    uiHandle?.state.setPhase('error');
    uiHandle?.state.addError(error instanceof Error ? error.message : String(error));
    if (options.persistence && error instanceof CoderGitOperationError) {
        // Hooks/concurrent writers may have changed canonical status/trace/error files. Keep those bytes and
        // report from a unique recovery record, rather than overwriting evidence to tidy up the failure.
        const failurePath = await options.persistence.recordFailure(error);
        if (failurePath) console.warn(`Persistence failure retained in \`${failurePath}\`.`);
        await reportRetainedChanges(roundCommitScope?.repositoryRoot ?? roundProjectPath);
        return;
    }
    if (!options.isInterrupted && !(error instanceof CoderGitOperationError && error.operation === 'record'))
        await waitForRequestedPause({
            checkpointLabel: 'recording the prompt failure',
            phase: 'error',
            statusMessage: 'Recording prompt failure',
        });

    /** Failed/interrupted bookkeeping remains serialized and never becomes a check transformation. */
    const recordFailure = async (): Promise<void> => {
        // Cancellation keeps the last [^] step; unsafe attribution keeps the on-disk task content unchanged.
        if (!(error instanceof CoderGitOperationError && error.operation === 'record')) {
            await refreshPromptSelection(nextPrompt);
            if (!options.isInterrupted)
                markPromptFailed({
                    file: nextPrompt.file,
                    section: nextPrompt.section,
                    ...runnerMetadata,
                    previousRunnerSignatures,
                    promptExecutionStartedDate,
                    attemptCount,
                });
            await writePromptFile(nextPrompt.file);
        }
        await writePromptErrorLog({
            file: nextPrompt.file,
            section: nextPrompt.section,
            runnerName: runnerMetadata.runnerName,
            modelName: runnerMetadata.modelName,
            error,
        });
        // Note: A failed round is exactly the round whose trace is worth reading, so it is written before the live
        //       runtime log it is built from is deleted
        await recordPromptRoundTrace({
            options: runOptions,
            nextPrompt,
            runnerMetadata,
            promptExecutionStartedDate,
            attemptCount,
            logPath,
            outcome: { kind: 'failed', error },
            persistence: options.persistence,
        });
        if (!options.isInterrupted && !(error instanceof CoderGitOperationError))
            await normalizeLineEndingsForCurrentRound(runOptions, roundProjectPath, roundCommitScope);
    };
    if (options.persistence) {
        try {
            await options.persistence.mutate(recordFailure, 'finalization');
        } catch (recordError) {
            const failurePath = await options.persistence.recordFailure(recordError);
            console.warn(
                `Failure bookkeeping could not be safely recorded; the original failure and partial work were retained${
                    failurePath ? ` in \`${failurePath}\`` : ''
                }.`,
            );
        }
    } else await recordFailure();
    await reportRetainedChanges(roundCommitScope?.repositoryRoot ?? roundProjectPath);
}

/** Reports actual retained Git state on failure/interruption, without claiming unrelated user changes as owned. */
async function reportRetainedChanges(repositoryRoot: string): Promise<void> {
    try {
        const paths = await listWorkingTreeChangedFiles(repositoryRoot);
        if (paths.length)
            console.warn(`Retained uncommitted changes: ${paths.map((path) => `\`${path}\``).join(', ')}`);
    } catch (error) {
        console.warn(`Could not inspect retained Git state: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Persists the run trace of one prompt round, so the round can still be analyzed after its temporary
 * artifacts are gone.
 *
 * This is the single place where both the successful and the failed round record what they did, which agent,
 * harness, model and thinking level did it and everything that harness has written while doing it.
 */
async function recordPromptRoundTrace(options: {
    options: PromptRoundExecutionOptions;
    nextPrompt: PromptSelection;
    runnerMetadata: PromptRunnerMetadata;
    promptExecutionStartedDate: moment.Moment;
    attemptCount: number;
    logPath: string;
    outcome: PromptRunTraceOutcome;
    persistence?: CoderPhasePersistence;
    writeContent?: (path: string, content: string) => Promise<void>;
}): Promise<void> {
    const {
        options: runOptions,
        nextPrompt,
        runnerMetadata,
        promptExecutionStartedDate,
        attemptCount,
        logPath,
        outcome,
    } = options;

    await writePromptRunTrace({
        projectPath: runOptions.workspace?.projectPath ?? runOptions.projectPath,
        file: nextPrompt.file,
        section: nextPrompt.section,
        ...runnerMetadata,
        thinkingLevel: runOptions.thinkingLevel,
        checkCommand: runOptions.checkCommand,
        attemptCount,
        startedDate: promptExecutionStartedDate,
        finishedDate: moment(),
        outcome,
        logPath,
        phaseCommits: options.persistence?.commits,
        ...(options.writeContent ? { writeContent: options.writeContent } : {}),
    });
}

/**
 * Waits for the optional user confirmation immediately before creating the commit.
 */
async function waitForCommitConfirmationIfNeeded(options: {
    options: PromptRoundExecutionOptions;
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
async function runPostPromptAutoMigrationIfEnabled(options: PromptRoundExecutionOptions): Promise<void> {
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
    options: PromptRoundExecutionOptions;
    runnerMetadata: PromptRunnerMetadata;
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
 * Captures which files are already changed before the round starts, when the round needs to know it later.
 *
 * The scope is needed to commit only the files of this round and to normalize the line endings of exactly
 * those files, so a round which does neither of them does not pay for hashing the working tree.
 */
async function captureRoundCommitScopeIfNeeded(
    options: PromptRoundExecutionOptions,
    roundProjectPath: string,
): Promise<CoderCommitScope | undefined> {
    if (!options.workspace && options.noCommit && !options.normalizeLineEndings && !options.checkCommand?.trim()) {
        return undefined;
    }

    return captureCoderCommitScope(
        options.workspace?.projectPath === roundProjectPath ? options.workspace : roundProjectPath,
        { isContentSnapshotRequired: true },
    );
}

/**
 * Normalizes line endings in files modified during the current coding round.
 */
async function normalizeLineEndingsForCurrentRound(
    options: PromptRoundExecutionOptions,
    roundProjectPath: string,
    roundCommitScope?: CoderCommitScope,
): Promise<void> {
    if (!options.normalizeLineEndings || !roundCommitScope) {
        return;
    }

    try {
        const result = await normalizeLineEndingsInFilesChangedSinceSnapshot({
            projectPath: roundCommitScope.repositoryRoot ?? roundProjectPath,
            snapshot: roundCommitScope.snapshotBeforeOperation,
        });

        if (result.normalizedFiles > 0) {
            console.info(colors.gray(`Normalized line endings to LF in ${result.normalizedFiles} changed file(s).`));
        }
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(colors.yellow(`Automatic line-ending normalization failed: ${details}`));
    }
}
