import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import type { GitChangesMode } from '../../../src/cli/cli-commands/coder/GitChangesMode';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { just } from '../../../src/utils/organization/just';
import type { RunOptions } from '../cli/RunOptions';
import { parseRunOptions } from '../cli/parseRunOptions';
import type { CoderRunPauseCheckpointOptions, WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { CliProgressDisplay } from '../common/cliProgressDisplay';
import { loadCachedAveragePromptDurationMs } from '../common/coderRunEstimateCache';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { sleepWithCountdown } from '../common/sleepWithCountdown';
import { resolveCoderContext } from '../common/resolveCoderContext';
import { listenForCoderRunControls } from '../common/listenForCoderRunControls';
import {
    announcePauseTargetLabel,
    checkPause,
    getEndAfterCurrentPromptState,
    resetCoderRunControls,
    resetPauseTargetLabel,
} from '../common/waitForPause';
import { waitForSkippableWorldTimeDeadline } from '../common/waitForSkippableWorldTimeDeadline';
import { printAgentGitIdentityTipIfNeeded } from '../git/agentGitIdentity';
import { captureCoderCommitScope, resolveCoderCommitScopePaths, type CoderCommitScope } from '../git/coderCommitScope';
import { commitChanges } from '../git/commitChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { runIsolatedPromptRound } from '../isolation/runIsolatedPromptRound';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import type { PromptRunnerIdentity } from '../prompts/isPromptCompatibleWithRunner';
import { listUpcomingTasks } from '../prompts/listUpcomingTasks';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { printPromptsToBeWritten } from '../prompts/printPromptsToBeWritten';
import { printStats } from '../prompts/printStats';
import { normalizePriorityFilter, type PriorityFilter } from '../prompts/priorityFilter';
import { printUpcomingTasks } from '../prompts/printUpcomingTasks';
import { resolveInterruptedPrompt } from '../prompts/resolveInterruptedPrompt';
import { summarizePrompts } from '../prompts/summarizePrompts';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { PromptStats } from '../prompts/types/PromptStats';
import { waitForPromptStart } from '../prompts/waitForPromptStart';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { buildCoderRunAgentVisual } from '../ui/buildCoderRunAgentVisual';
import { renderCoderRunUi, type CoderRunUiHandle } from '../ui/renderCoderRunUi';
import { refreshCoderRunUiSubscriptionUsage } from '../ui/refreshCoderRunUiSubscriptionUsage';
import { createTestBeforeRepairPrompt } from '../testing/createTestBeforeRepairPrompt';
import { DEFAULT_CODER_TEST_COMMAND, isTestBeforeMode, type TestBeforeMode } from '../testing/TestBeforeMode';
import { limitTestOutput } from '../testing/limitTestOutput';
import { runTestBefore } from '../testing/runTestBefore';
import { resolvePromptRunner } from './resolvePromptRunner';
import { runPromptRound } from './runPromptRound';

/**
 * Constant for prompts dir.
 */
const PROMPTS_DIR = join(process.cwd(), 'prompts');

/**
 * Commit message for files changed by a successful or failed pre-coding test in repair mode.
 */
const PRE_CODING_TEST_CHANGES_COMMIT_MESSAGE = 'test: Apply changes made by pre-coding tests';

/**
 * Prompt queue snapshot for one top-level loop iteration.
 */
type PromptQueueSnapshot = {
    promptFiles: PromptFile[];
    stats: PromptStats;
    nextPrompt?: PromptSelection;
};

/**
 * Main entry point for running prompts with the selected agent.
 *
 * @param providedOptions - Optional pre-parsed options. If not provided, will parse from process.argv
 *
 * @public exported from `@promptbook/cli`
 */
export async function runCodexPrompts(providedOptions?: RunOptions): Promise<void> {
    const options = normalizeRunOptions(providedOptions ?? parseRunOptions(process.argv.slice(2)));
    validateRunCodexPromptOptions(options);
    resetCoderRunControls();

    const runStartDate = moment();
    const { isRichUiEnabled, progressDisplay, uiHandle } = createRunDisplays(options, runStartDate);
    const waitForRequestedPause = createPauseWaiter({ isRichUiEnabled, progressDisplay, uiHandle });

    startPauseListenerIfNeeded(isRichUiEnabled);

    try {
        const resolvedCoderContext = await resolveCoderContext(options.context, process.cwd());
        const resolvedCoderAgent = await resolveCoderAgent(options.agent, process.cwd());
        const resolvedAgentSystemMessage = resolvedCoderAgent?.systemMessage;

        if (await runDryRunIfRequested(options)) {
            return;
        }

        const { runner, actualRunnerModel, runnerMetadata } = resolvePromptRunner(options);
        const promptRunnerIdentity: PromptRunnerIdentity = {
            harnessName: options.agentName,
            modelName: actualRunnerModel,
        };
        console.info(colors.green(`Running prompts with ${runner.name}`));

        initializeRunUi(uiHandle, runner.name, actualRunnerModel, options);
        await initializeRunUiAgentVisual(uiHandle, resolvedCoderAgent?.agentSource);
        await refreshCoderRunUiSubscriptionUsage({
            runner,
            uiState: uiHandle?.state,
        });
        await seedCachedAveragePromptDuration({
            options,
            actualRunnerModel,
            progressDisplay,
            uiHandle,
        });

        let hasShownUpcomingTasks = false;
        let hasWaitedForStart = false;
        let previousRoundStartTime: number | undefined;
        let previousRoundEndTime: number | undefined;
        let completedRunCount = 0;
        let hasRunTestBefore = false;
        // Note: Only the very first round resumes the interrupted prompt, every later round starts from a clean tree
        let isContinuingInterruptedPrompt = options.gitChanges === 'continue';

        while (just(true)) {
            if (options.autoPull && !options.dryRun) {
                await waitForRequestedPause({
                    checkpointLabel: 'pulling the latest repository changes',
                    phase: 'loading',
                    statusMessage: 'Pulling latest changes...',
                });
            }
            await pullLatestChangesIfEnabled({
                options,
                isRichUiEnabled,
            });

            if (!hasRunTestBefore && options.testBefore !== 'no') {
                await waitForRequestedPause({
                    checkpointLabel: 'loading prompts before running initial tests',
                    phase: 'loading',
                    statusMessage: 'Loading prompts before running initial tests...',
                });
                await loadPromptQueueSnapshot({
                    options,
                    isRichUiEnabled,
                    progressDisplay,
                    uiHandle,
                    promptRunnerIdentity,
                    isContinuingInterruptedPrompt,
                });
            }

            if (!hasRunTestBefore) {
                hasWaitedForStart = await runTestBeforeIfNeeded({
                    options,
                    runner,
                    runnerMetadata,
                    resolvedCoderContext,
                    resolvedAgentSystemMessage,
                    isRichUiEnabled,
                    progressDisplay,
                    uiHandle,
                    waitForRequestedPause,
                    hasWaitedForStart,
                    isContinuingInterruptedPrompt,
                });
                hasRunTestBefore = true;
            }

            await waitForRequestedPause({
                checkpointLabel: 'loading prompts',
                phase: 'loading',
                statusMessage: 'Loading prompts...',
            });
            const promptQueueSnapshot = await loadPromptQueueSnapshot({
                options,
                isRichUiEnabled,
                progressDisplay,
                uiHandle,
                promptRunnerIdentity,
                isContinuingInterruptedPrompt,
            });

            hasShownUpcomingTasks ||= showUpcomingTasksOnce({
                hasShownUpcomingTasks,
                promptFiles: promptQueueSnapshot.promptFiles,
                stats: promptQueueSnapshot.stats,
                priorityFilter: options.priorityFilter,
                isRichUiEnabled,
                promptRunnerIdentity,
            });

            if (!promptQueueSnapshot.nextPrompt) {
                if (isEndAfterCurrentPromptRequested(completedRunCount)) {
                    finishWhenEndAfterCurrentPromptIsRequested({
                        completedRunCount,
                        isRichUiEnabled,
                        uiHandle,
                    });
                    return;
                }

                if (options.keepAlive) {
                    announceKeepAliveStatus(promptQueueSnapshot, isRichUiEnabled, uiHandle);
                    // Note: The keep-alive poll runs in the `waiting` phase, where `S  Skip current waiting`
                    //       is offered, so pressing `S` looks for new prompts right away
                    await waitForSkippableWorldTimeDeadline({
                        deadlineTimeMs: Date.now() + KEEP_ALIVE_POLL_INTERVAL_MS,
                        pollIntervalMs: KEEP_ALIVE_POLL_INTERVAL_MS,
                    });
                    continue;
                }
                finishWhenNoPromptIsAvailable(promptQueueSnapshot, isRichUiEnabled, uiHandle);
                return;
            }

            const nextPrompt = promptQueueSnapshot.nextPrompt!;
            const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section);

            // Wait between prompt rounds (skipped for the first round)
            if (previousRoundStartTime !== undefined && previousRoundEndTime !== undefined) {
                await waitBetweenPromptRoundsIfNeeded({
                    options,
                    previousRoundStartTime,
                    previousRoundEndTime,
                    isRichUiEnabled,
                    progressDisplay,
                    uiHandle,
                });
            }

            if (isEndAfterCurrentPromptRequested(completedRunCount)) {
                finishWhenEndAfterCurrentPromptIsRequested({
                    completedRunCount,
                    isRichUiEnabled,
                    uiHandle,
                });
                return;
            }

            hasWaitedForStart = await waitForPromptConfirmationIfNeeded({
                options,
                nextPrompt,
                promptLabel,
                hasWaitedForStart,
                isRichUiEnabled,
                progressDisplay,
                uiHandle,
            });

            if (isCleanWorkingTreeRequired(options.gitChanges, isContinuingInterruptedPrompt)) {
                await waitForRequestedPause({
                    checkpointLabel: 'checking the git working tree',
                    phase: 'loading',
                    statusMessage: 'Checking the working tree...',
                });
                await ensureWorkingTreeClean();
            }

            const currentRoundStartTime = Date.now();
            // Note: An isolated round implements the prompt in a temporary worktree and merges it back afterwards
            const runCurrentPromptRound = options.isIsolated ? runIsolatedPromptRound : runPromptRound;
            await runCurrentPromptRound({
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
            });
            isContinuingInterruptedPrompt = false;
            previousRoundStartTime = currentRoundStartTime;
            previousRoundEndTime = Date.now();
            completedRunCount += 1;

            if (isRunLimitReached({ completedRunCount, limit: options.limit })) {
                finishWhenRunLimitIsReached({
                    completedRunCount,
                    isRichUiEnabled,
                    uiHandle,
                });
                return;
            }

            if (isEndAfterCurrentPromptRequested(completedRunCount)) {
                finishWhenEndAfterCurrentPromptIsRequested({
                    completedRunCount,
                    isRichUiEnabled,
                    uiHandle,
                });
                return;
            }
        }
    } finally {
        cleanupRunDisplays(progressDisplay, uiHandle, options);
        resetCoderRunControls();
    }
}

/**
 * Validates cross-flag constraints before the run starts.
 */
function validateRunCodexPromptOptions(options: RunOptions): void {
    if (!isTestBeforeMode(options.testBefore ?? 'no')) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid ${'`--test-before`'} mode: \`${String(options.testBefore)}\`.

                Use one of: \`no\`, \`yes-and-fail\`, \`yes-and-fix\`.
            `),
        );
    }

    if (options.allowDestructiveAutoMigrate && !options.autoMigrate) {
        throw new DatabaseError(
            spaceTrim(`
                Flag \`--allow-destructive-auto-migrate\` requires \`--auto-migrate\`.
            `),
        );
    }

    if (options.noCommit && !options.waitForUser && options.gitChanges !== 'ignore') {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--no-commit\` requires \`--git-changes ignore\` when running in auto mode (the default; pass \`--no-auto\` for interactive confirmation).

                Without commits, the next prompt round would fail the clean working tree check.
            `),
        );
    }

    if (options.autoPull && options.noCommit && !options.dryRun) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--auto-pull\` requires commits, so it cannot be combined with \`--no-commit\`.

                Auto-pull keeps the repository up to date between prompt rounds, which requires each successful round to end with a clean committed working tree.
            `),
        );
    }

    if (options.isIsolated && options.noCommit) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--isolate\` cannot be combined with \`--no-commit\`.

                An isolated task is implemented in a temporary worktree and reaches the original branch only through a merge, which requires the round to end with a commit.
            `),
        );
    }

    if (options.isIsolated && options.gitChanges === 'continue') {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--isolate\` cannot be combined with \`--git-changes continue\`.

                An isolated task is implemented in a fresh temporary worktree checked out from the last commit, so the uncommitted changes of the interrupted prompt would be left behind instead of being continued.
            `),
        );
    }

    if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--limit\` expects a positive integer.

                Received: \`${options.limit}\`
            `),
        );
    }
}

/**
 * Decides whether the working tree has to be verified clean before the next prompt starts.
 *
 * `--git-changes continue` waives the check for the single round which resumes the interrupted prompt,
 * because that round is started exactly for the uncommitted changes the interrupted prompt left behind.
 */
function isCleanWorkingTreeRequired(gitChanges: GitChangesMode, isContinuingInterruptedPrompt: boolean): boolean {
    if (gitChanges === 'ignore') {
        return false;
    }

    return !isContinuingInterruptedPrompt;
}

/**
 * Pulls the latest repository state before loading prompts when the feature is enabled.
 */
async function pullLatestChangesIfEnabled(options: { options: RunOptions; isRichUiEnabled: boolean }): Promise<void> {
    const { options: runOptions, isRichUiEnabled } = options;

    if (!runOptions.autoPull || runOptions.dryRun) {
        return;
    }

    if (!isRichUiEnabled) {
        console.info(colors.gray('Pulling latest changes before the next prompt...'));
    }

    await pullLatestChanges();
}

/**
 * Creates the progress display and rich UI handles used during the run.
 */
function createRunDisplays(
    options: RunOptions,
    runStartDate: moment.Moment,
): {
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
} {
    const isRichUiEnabled = !options.dryRun && !options.noUi && Boolean(process.stdout.isTTY);
    const progressDisplay =
        options.dryRun || options.noUi || isRichUiEnabled
            ? undefined
            : new CliProgressDisplay(runStartDate, options.priorityFilter, options.limit);
    const uiHandle =
        isRichUiEnabled || options.uiState
            ? renderCoderRunUi(runStartDate, {
                  state: options.uiState,
              })
            : undefined;

    return {
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
    };
}

/**
 * Normalizes legacy and current priority options into one validated run option shape.
 */
function normalizeRunOptions(options: RunOptions): RunOptions {
    const testBefore: TestBeforeMode = options.testBefore ?? 'no';
    const normalizedTestCommand = options.testCommand?.trim();
    const priorityFilter = normalizePriorityFilter({
        priority: options.priority,
        minimumPriority: options.minimumPriority ?? options.priorityFilter?.minimumPriority,
        maximumPriority: options.maximumPriority ?? options.priorityFilter?.maximumPriority,
    });

    return {
        ...options,
        testBefore,
        testCommand: normalizedTestCommand || (testBefore === 'no' ? undefined : DEFAULT_CODER_TEST_COMMAND),
        priority: priorityFilter.minimumPriority ?? 0,
        minimumPriority: priorityFilter.minimumPriority,
        maximumPriority: priorityFilter.maximumPriority,
        priorityFilter,
    };
}

/**
 * Runs the optional pre-coding verification and, when requested, its one repair prompt.
 */
async function runTestBeforeIfNeeded(options: {
    options: RunOptions;
    runner: PromptRunner;
    runnerMetadata: {
        runnerName: string;
        modelName?: string;
    };
    resolvedCoderContext?: string;
    resolvedAgentSystemMessage?: string;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
    hasWaitedForStart: boolean;
    isContinuingInterruptedPrompt: boolean;
}): Promise<boolean> {
    const {
        options: runOptions,
        runner,
        runnerMetadata,
        resolvedCoderContext,
        resolvedAgentSystemMessage,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
        waitForRequestedPause,
        hasWaitedForStart,
        isContinuingInterruptedPrompt,
    } = options;

    if (runOptions.testBefore === 'no') {
        return hasWaitedForStart;
    }

    if (!runOptions.testCommand) {
        throw new NotAllowed(
            spaceTrim(`
                ${'`--test-before ' + runOptions.testBefore + '`'} requires a verification command.

                Pass one with ${'`--test <test-command>`'} or use the default ${'`npm test`'} command by providing the mode through the CLI.
            `),
        );
    }

    if (isCleanWorkingTreeRequired(runOptions.gitChanges, isContinuingInterruptedPrompt)) {
        await waitForRequestedPause({
            checkpointLabel: 'checking the git working tree before testing',
            phase: 'loading',
            statusMessage: 'Checking the working tree before testing...',
        });
        await ensureWorkingTreeClean();
    }

    const testBeforeCommitScope = await captureTestBeforeCommitScopeIfNeeded(runOptions);

    uiHandle?.startCapturingAgentOutput();
    const testBeforeResult = await runTestBefore({
        testCommand: runOptions.testCommand,
        projectPath: process.cwd(),
        waitForPauseCheckpoint: waitForRequestedPause,
    }).finally(() => {
        uiHandle?.stopCapturingAgentOutput();
    });

    await commitTestBeforeChangesIfNeeded({
        runOptions,
        testBeforeCommitScope,
        waitForRequestedPause,
    });

    if (testBeforeResult.isPassed) {
        return hasWaitedForStart;
    }

    const testOutput = limitTestOutput(testBeforeResult.testOutput);

    if (runOptions.testBefore === 'yes-and-fail') {
        throw new NotAllowed(
            spaceTrim(
                (block) => `
                    Pre-coding verification command \`${runOptions.testCommand}\` failed.

                    The coding agent was not started because the project was already failing before the first queued prompt.

                    ### Test results
                    ${'```'}
                    ${block(testOutput)}
                    ${'```'}
                `,
            ),
        );
    }

    const repairPrompt = await createTestBeforeRepairPrompt({
        projectPath: process.cwd(),
        testCommand: runOptions.testCommand,
        testOutput,
    });
    const repairPromptLabel = buildPromptLabelForDisplay(repairPrompt.file, repairPrompt.section);
    const updatedHasWaitedForStart = await waitForPromptConfirmationIfNeeded({
        options: runOptions,
        nextPrompt: repairPrompt,
        promptLabel: repairPromptLabel,
        hasWaitedForStart,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
    });

    // The repair prompt is created in the current worktree so it can be recorded and committed with the repair.
    // It therefore intentionally uses the regular round here even when the queue itself uses --isolate.
    await runPromptRound({
        options: runOptions,
        runner,
        runnerMetadata,
        nextPrompt: repairPrompt,
        promptLabel: repairPromptLabel,
        resolvedCoderContext,
        resolvedAgentSystemMessage,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
        waitForRequestedPause,
    });

    return updatedHasWaitedForStart;
}

/**
 * Captures the files present before a `yes-and-fix` pre-coding test, so only changes made by that test can be committed.
 */
async function captureTestBeforeCommitScopeIfNeeded(runOptions: RunOptions): Promise<CoderCommitScope | undefined> {
    if (runOptions.testBefore !== 'yes-and-fix' || runOptions.noCommit) {
        return undefined;
    }

    return captureCoderCommitScope(process.cwd());
}

/**
 * Commits files changed by a `yes-and-fix` pre-coding test before the coder continues to a queued or repair prompt.
 */
async function commitTestBeforeChangesIfNeeded(options: {
    runOptions: RunOptions;
    testBeforeCommitScope?: CoderCommitScope;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
}): Promise<void> {
    const { runOptions, testBeforeCommitScope, waitForRequestedPause } = options;

    if (!testBeforeCommitScope) {
        return;
    }

    const relevantPaths = await resolveCoderCommitScopePaths(testBeforeCommitScope);
    if (relevantPaths.length === 0) {
        return;
    }

    await waitForRequestedPause({
        checkpointLabel: 'committing changes made by pre-coding tests',
        phase: 'verifying',
        statusMessage: 'Committing changes made by pre-coding tests...',
    });
    await commitChanges(PRE_CODING_TEST_CHANGES_COMMIT_MESSAGE, {
        autoPush: runOptions.autoPush,
        projectPath: testBeforeCommitScope.projectPath,
        relevantPaths,
    });
}

/**
 * Creates a pause waiter that keeps the progress display and rich UI in sync.
 */
function createPauseWaiter(options: {
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
}): WaitForCoderRunPauseCheckpoint {
    const { isRichUiEnabled, progressDisplay, uiHandle } = options;

    return async (checkpoint: CoderRunPauseCheckpointOptions): Promise<void> => {
        uiHandle?.state.setPhase(checkpoint.phase);
        uiHandle?.state.setStatusMessage(checkpoint.statusMessage);
        announcePauseTargetLabel(checkpoint.checkpointLabel);

        await checkPause({
            silent: isRichUiEnabled,
            onPaused: () => {
                progressDisplay?.pauseTimer();
                uiHandle?.state.pauseTimer();
                uiHandle?.state.setPhase('paused');
                uiHandle?.state.setStatusMessage(`Paused before ${checkpoint.checkpointLabel}`);
            },
            onResumed: () => {
                progressDisplay?.resumeTimer();
                uiHandle?.state.resumeTimer();
                uiHandle?.state.setPhase(checkpoint.phase);
                uiHandle?.state.setStatusMessage(checkpoint.statusMessage);
            },
        });

        resetPauseTargetLabel();
    };
}

/**
 * Starts the pause listener only when the rich TTY UI is not consuming keyboard input.
 */
function startPauseListenerIfNeeded(isRichUiEnabled: boolean): void {
    if (!isRichUiEnabled) {
        listenForCoderRunControls();
    }
}

/**
 * Runs the dry-run reporting mode and returns whether the main execution should stop.
 */
async function runDryRunIfRequested(options: RunOptions): Promise<boolean> {
    if (!options.dryRun) {
        return false;
    }

    const promptFiles = await loadPromptFiles(PROMPTS_DIR);
    const stats = summarizePrompts(promptFiles, options.priorityFilter);
    printStats(stats, options.priorityFilter);
    console.info(colors.yellow('Following prompts need to be written:'));
    printPromptsToBeWritten(promptFiles, options.priorityFilter);
    return true;
}

/**
 * Seeds the rich UI with the selected runner configuration.
 */
function initializeRunUi(
    uiHandle: CoderRunUiHandle | undefined,
    runnerName: string,
    actualRunnerModel: string | undefined,
    options: RunOptions,
): void {
    uiHandle?.state.setConfig({
        agentName: runnerName,
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        context: options.context,
        serverUrl: options.serverUrl,
        priorityFilter: options.priorityFilter,
        limit: options.limit,
        testCommand: options.testCommand,
    });
    uiHandle?.state.setPhase('loading');
    uiHandle?.state.setStatusMessage(`Running prompts with ${runnerName}`);
}

/**
 * Prepares the `--agent` book avatar ASCII-art renderer and shows it above the dashboard boxes.
 *
 * Leaves the header empty when no agent is selected, the UI is disabled, or the visual cannot be rendered.
 */
async function initializeRunUiAgentVisual(
    uiHandle: CoderRunUiHandle | undefined,
    agentSource: string_book | undefined,
): Promise<void> {
    if (!uiHandle || !agentSource) {
        return;
    }

    const agentVisual = await buildCoderRunAgentVisual(agentSource);

    if (agentVisual) {
        uiHandle.state.setAgentVisual(agentVisual);
    }
}

/**
 * Loads prompt files, updates progress displays, and selects the next runnable prompt.
 */
async function loadPromptQueueSnapshot(options: {
    options: RunOptions;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
    promptRunnerIdentity: PromptRunnerIdentity;
    isContinuingInterruptedPrompt: boolean;
}): Promise<PromptQueueSnapshot> {
    const {
        options: runOptions,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
        promptRunnerIdentity,
        isContinuingInterruptedPrompt,
    } = options;
    uiHandle?.state.setCurrentScriptPath(undefined);

    const promptFiles = await loadPromptFiles(PROMPTS_DIR);
    const stats = summarizePrompts(promptFiles, runOptions.priorityFilter);

    progressDisplay?.update(stats);
    uiHandle?.state.updateProgress(stats);

    if (!isRichUiEnabled) {
        printStats(stats, runOptions.priorityFilter);
    }

    return {
        promptFiles,
        stats,
        // Note: A resumed prompt is picked by its `[^]` status alone, the priority and runner filters select
        //       which prompt is started next, not which unfinished work is continued
        nextPrompt: isContinuingInterruptedPrompt
            ? resolveInterruptedPrompt(promptFiles)
            : findNextTodoPrompt(promptFiles, runOptions.priorityFilter, promptRunnerIdentity),
    };
}

/**
 * Prints upcoming tasks only on the first loop iteration in plain-console mode.
 */
function showUpcomingTasksOnce(options: {
    hasShownUpcomingTasks: boolean;
    promptFiles: PromptFile[];
    stats: PromptStats;
    priorityFilter?: PriorityFilter;
    isRichUiEnabled: boolean;
    promptRunnerIdentity: PromptRunnerIdentity;
}): boolean {
    const { hasShownUpcomingTasks, promptFiles, stats, priorityFilter, isRichUiEnabled, promptRunnerIdentity } =
        options;

    if (hasShownUpcomingTasks || isRichUiEnabled) {
        return true;
    }

    if (stats.toBeWritten > 0) {
        console.info(colors.yellow('Following prompts need to be written:'));
        printPromptsToBeWritten(promptFiles, priorityFilter);
        console.info('');
    }

    printUpcomingTasks(listUpcomingTasks(promptFiles, priorityFilter, promptRunnerIdentity));
    return true;
}

/**
 * Prints the terminal status when there is no runnable prompt left and tells the caller to stop.
 */
function finishWhenNoPromptIsAvailable(
    promptQueueSnapshot: PromptQueueSnapshot,
    isRichUiEnabled: boolean,
    uiHandle?: CoderRunUiHandle,
): boolean {
    if (promptQueueSnapshot.nextPrompt) {
        return false;
    }

    if (promptQueueSnapshot.stats.forAgent > 0) {
        announceRunCompletion(
            'No prompts match the selected harness or model.',
            colors.yellow,
            isRichUiEnabled,
            uiHandle,
        );
    } else if (promptQueueSnapshot.stats.toBeWritten > 0) {
        announceRunCompletion('No prompts ready for agent.', colors.yellow, isRichUiEnabled, uiHandle);
    } else {
        announceRunCompletion('All prompts are done.', colors.green, isRichUiEnabled, uiHandle);
    }

    return true;
}

/**
 * Checks whether the configured successful prompt-run limit has been reached.
 */
function isRunLimitReached(options: { completedRunCount: number; limit?: number }): boolean {
    const { completedRunCount, limit } = options;

    return limit !== undefined && completedRunCount >= limit;
}

/**
 * Checks whether the user-requested dynamic end control should stop the loop now.
 */
function isEndAfterCurrentPromptRequested(completedRunCount: number): boolean {
    return completedRunCount > 0 && getEndAfterCurrentPromptState();
}

/**
 * Updates UI and console output when a user-configured run limit stops the loop.
 */
function finishWhenRunLimitIsReached(options: {
    completedRunCount: number;
    isRichUiEnabled: boolean;
    uiHandle?: CoderRunUiHandle;
}): void {
    const { completedRunCount, isRichUiEnabled, uiHandle } = options;
    const runCountLabel = completedRunCount === 1 ? '1 prompt run' : `${completedRunCount} prompt runs`;

    announceRunCompletion(`Run limit reached after ${runCountLabel}.`, colors.green, isRichUiEnabled, uiHandle);
}

/**
 * Updates UI and console output when the dynamic `X` control stops the loop after a prompt.
 */
function finishWhenEndAfterCurrentPromptIsRequested(options: {
    completedRunCount: number;
    isRichUiEnabled: boolean;
    uiHandle?: CoderRunUiHandle;
}): void {
    const { completedRunCount, isRichUiEnabled, uiHandle } = options;
    const runCountLabel = completedRunCount === 1 ? '1 prompt run' : `${completedRunCount} prompt runs`;

    announceRunCompletion(`End requested after ${runCountLabel}.`, colors.green, isRichUiEnabled, uiHandle);
}

/**
 * Updates the UI status message while waiting for new prompts in keepAlive server mode.
 */
function announceKeepAliveStatus(
    promptQueueSnapshot: PromptQueueSnapshot,
    isRichUiEnabled: boolean,
    uiHandle?: CoderRunUiHandle,
): void {
    let message: string;

    if (promptQueueSnapshot.stats.forAgent > 0) {
        message = 'No prompts match the selected harness or model. Watching for changes...';
    } else if (promptQueueSnapshot.stats.toBeWritten > 0) {
        message = 'No prompts ready for agent. Watching for changes...';
    } else {
        message = 'All prompts are done. Watching for changes...';
    }

    uiHandle?.state.setStatusMessage(message);
    uiHandle?.state.setPhase('waiting');

    if (!isRichUiEnabled) {
        console.info(colors.gray(message));
    }
}

/**
 * Updates UI state and plain-console output for the terminal completion message.
 */
function announceRunCompletion(
    message: string,
    colorize: (message: string) => string,
    isRichUiEnabled: boolean,
    uiHandle?: CoderRunUiHandle,
): void {
    uiHandle?.state.setStatusMessage(message);
    uiHandle?.state.setCurrentScriptPath(undefined);
    uiHandle?.state.setPhase('done');

    if (!isRichUiEnabled) {
        console.info(colorize(message));
    }
}

/**
 * Waits for the optional user confirmation before starting the selected prompt.
 */
async function waitForPromptConfirmationIfNeeded(options: {
    options: RunOptions;
    nextPrompt: PromptSelection;
    promptLabel: string;
    hasWaitedForStart: boolean;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
}): Promise<boolean> {
    const {
        options: runOptions,
        nextPrompt,
        promptLabel,
        hasWaitedForStart,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
    } = options;

    if (!runOptions.waitForUser) {
        return hasWaitedForStart;
    }

    progressDisplay?.pauseTimer();
    uiHandle?.state.pauseTimer();
    uiHandle?.state.setCurrentPrompt(promptLabel);
    uiHandle?.state.setPhase('waiting');
    uiHandle?.state.setStatusMessage(
        hasWaitedForStart ? 'Waiting for confirmation to continue' : 'Waiting for confirmation to start',
    );
    uiHandle?.state.setDetailLines([buildPromptSummary(nextPrompt.file, nextPrompt.section)]);

    if (isRichUiEnabled) {
        await uiHandle?.waitForEnter(hasWaitedForStart ? 'Continue' : 'Start');
    } else {
        await waitForPromptStart(nextPrompt.file, nextPrompt.section, !hasWaitedForStart);
    }

    uiHandle?.state.setDetailLines([]);
    progressDisplay?.resumeTimer();
    uiHandle?.state.resumeTimer();
    return true;
}

/**
 * Polling interval when in keepAlive server mode and no runnable prompts are available.
 */
const KEEP_ALIVE_POLL_INTERVAL_MS = 5_000;

/**
 * Waits between prompt rounds according to `--wait-between-prompts` (paced from the previous round's start)
 * and `--wait-after-prompt` (measured from the previous round's end).
 * Both phases are shown separately in the UI so the user can see which type of wait is active.
 */
async function waitBetweenPromptRoundsIfNeeded(options: {
    options: RunOptions;
    previousRoundStartTime: number;
    previousRoundEndTime: number;
    isRichUiEnabled: boolean;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
}): Promise<void> {
    const {
        options: runOptions,
        previousRoundStartTime,
        previousRoundEndTime,
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
    } = options;
    const { waitAfterPrompt, waitBetweenPrompts } = runOptions;

    if (waitAfterPrompt <= 0 && waitBetweenPrompts <= 0) {
        return;
    }

    const waitBetweenPromptsEndTime = previousRoundStartTime + waitBetweenPrompts;
    const waitAfterPromptEndTime = previousRoundEndTime + waitAfterPrompt;

    if (Date.now() >= waitBetweenPromptsEndTime && Date.now() >= waitAfterPromptEndTime) {
        return;
    }

    progressDisplay?.pauseTimer();
    uiHandle?.state.pauseTimer();
    uiHandle?.state.setPhase('waiting');

    // Phase 1: pace from start of previous prompt (`--wait-between-prompts`)
    if (Date.now() < waitBetweenPromptsEndTime) {
        await sleepWithCountdown({
            durationMs: waitBetweenPrompts,
            deadlineTimeMs: waitBetweenPromptsEndTime,
            waitKind: 'between-prompts',
            isRichUiEnabled,
            uiHandle,
        });
    }

    // Phase 2: rest from end of previous prompt (`--wait-after-prompt`)
    if (Date.now() < waitAfterPromptEndTime) {
        await sleepWithCountdown({
            durationMs: waitAfterPrompt,
            deadlineTimeMs: waitAfterPromptEndTime,
            waitKind: 'after-prompt',
            isRichUiEnabled,
            uiHandle,
        });
    }

    progressDisplay?.resumeTimer();
    uiHandle?.state.resumeTimer();
}

/**
 * Loads the cached average prompt duration for the current runner configuration and seeds both
 * progress displays with it so estimates are shown immediately, even before the first prompt of
 * the current session completes.
 */
async function seedCachedAveragePromptDuration(options: {
    options: RunOptions;
    actualRunnerModel: string | undefined;
    progressDisplay?: CliProgressDisplay;
    uiHandle?: CoderRunUiHandle;
}): Promise<void> {
    const { options: runOptions, actualRunnerModel, progressDisplay, uiHandle } = options;
    if (!runOptions.agentName) {
        return;
    }

    const cachedAveragePromptDurationMs = await loadCachedAveragePromptDurationMs({
        harness: runOptions.agentName,
        model: actualRunnerModel ?? runOptions.model,
        thinkingLevel: runOptions.thinkingLevel,
    });

    if (cachedAveragePromptDurationMs === undefined) {
        return;
    }

    progressDisplay?.setCachedAveragePromptDurationMs(cachedAveragePromptDurationMs);
    uiHandle?.state.setCachedAveragePromptDurationMs(cachedAveragePromptDurationMs);
}

/**
 * Stops active displays and prints the git identity tip for real runs.
 */
function cleanupRunDisplays(
    progressDisplay: CliProgressDisplay | undefined,
    uiHandle: CoderRunUiHandle | undefined,
    options: RunOptions,
): void {
    progressDisplay?.stop();
    uiHandle?.cleanup();

    if (!options.dryRun) {
        printAgentGitIdentityTipIfNeeded();
    }
}
