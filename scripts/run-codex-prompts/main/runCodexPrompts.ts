import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import type { GitChangesMode } from '../../../src/cli/cli-commands/coder/GitChangesMode';
import { DEFAULT_CODER_AGENT_ROLE } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import { resolveProjectDirectory } from '../../../src/cli/cli-commands/common/projectCliOptions';
import { validateCoderRunOptions } from '../../../src/cli/cli-commands/common/validateCoderRunOptions';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { just } from '../../../src/utils/organization/just';
import type { RunOptions } from '../cli/RunOptions';
import { parseRunOptions } from '../cli/parseRunOptions';
import type { CoderRunPauseCheckpointOptions, WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { CliProgressDisplay } from '../common/cliProgressDisplay';
import { loadCachedAveragePromptDurationMs } from '../common/coderRunEstimateCache';
import { createFreeDiskSpaceGuard, type FreeDiskSpaceGuard } from '../common/createFreeDiskSpaceGuard';
import type { PromptRunnerMetadata } from '../common/PromptRunnerMetadata';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { sleepWithCountdown } from '../common/sleepWithCountdown';
import { resolveCoderProjectContext } from '../common/resolveCoderProjectContext';
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
import { commitInitializedAgentBooks } from '../git/commitInitializedAgentBooks';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { runIsolatedPromptRound } from '../isolation/runIsolatedPromptRound';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import { isPromptCompatibleWithRunner, type PromptRunnerIdentity } from '../prompts/isPromptCompatibleWithRunner';
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
import {
    startCoderRunUiSubscriptionUsageRefresh,
    type CoderRunUiSubscriptionUsageRefreshHandle,
} from '../ui/startCoderRunUiSubscriptionUsageRefresh';
import { createCheckBeforeRepairPrompt } from '../checks/createCheckBeforeRepairPrompt';
import { resolveCoderCheckCommand, type CheckBeforeMode } from '../checks/CheckBeforeMode';
import { limitCheckOutput } from '../checks/limitCheckOutput';
import { runCheckBefore } from '../checks/runCheckBefore';
import { assertProjectCheckIsConfigured } from '../checks/projectCheck';
import { resolvePromptRunner, resolveRunnerModel } from './resolvePromptRunner';
import { runPromptRound } from './runPromptRound';
import { createCoderTeamPromptRunner } from '../team/createCoderTeamPromptRunner';

/**
 * Commit message for files changed by a successful or failed pre-coding check in repair mode.
 */
const PRE_CODING_CHECK_CHANGES_COMMIT_MESSAGE = 'chore: Apply changes made by pre-coding checks';

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
    const normalizedOptions = normalizeRunOptions(providedOptions ?? parseRunOptions(process.argv.slice(2)));
    validateCoderRunOptions(normalizedOptions);
    const projectPath =
        normalizedOptions.workspace?.projectPath ?? (await resolveProjectDirectory(normalizedOptions.projectPath!));
    const options = { ...normalizedOptions, projectPath };
    resetCoderRunControls();

    const runStartDate = moment();
    const { isRichUiEnabled, progressDisplay, uiHandle } = createRunDisplays(options, runStartDate);
    const waitForRequestedPause = createPauseWaiter({
        isRichUiEnabled,
        progressDisplay,
        uiHandle,
        // Note: Every pause checkpoint of the whole run goes through this one waiter, so watching the free disk
        //       space here covers each round, each verification and each runner without repeating the check
        guardFreeDiskSpace: createFreeDiskSpaceGuard({
            inspectedPath: projectPath,
            isAskingQuestionsEnabled: options.isAskingQuestionsEnabled ?? true,
        }),
    });

    startPauseListenerIfNeeded(isRichUiEnabled);

    let subscriptionUsageRefresh: CoderRunUiSubscriptionUsageRefreshHandle | undefined;

    try {
        const projectContext =
            options.projectContext ??
            (await resolveCoderProjectContext({
                ...options,
                projectPath,
            }));
        if (await runDryRunIfRequested(options, projectContext.agentBook?.agentReferences)) {
            return;
        }
        await assertProjectCheckIsConfigured(options.checkCommand, projectPath);
        const resolvedCoderContext = projectContext.context;
        const resolvedCoderAgent = await resolveCoderAgent(options.agent, projectPath, {
            defaultRole: DEFAULT_CODER_AGENT_ROLE,
            isInitializationAllowed: !options.dryRun,
        });
        const resolvedAgentSystemMessage = resolvedCoderAgent?.systemMessage;

        if (!options.noCommit && resolvedCoderAgent) {
            await commitInitializedAgentBooks(projectPath, resolvedCoderAgent.createdAgentBookPaths, options.workspace);
        }

        const {
            runner: harnessRunner,
            actualRunnerModel,
            runnerMetadata: harnessRunnerMetadata,
        } = resolvePromptRunner(options);
        const runner = createCoderTeamPromptRunner(
            harnessRunner,
            options.agent,
            projectPath,
            options.workspace?.repositoryRoot,
        );
        // Note: The harness only knows itself, so the Book agent it runs as is joined here - this is the single
        //       place where the whole run report of prompt status lines and run traces is put together
        const runnerMetadata: PromptRunnerMetadata = {
            ...harnessRunnerMetadata,
            agentName: resolvedCoderAgent?.agentName,
        };
        const promptRunnerIdentity: PromptRunnerIdentity = {
            harnessName: options.agentName,
            modelName: actualRunnerModel,
            agentReferences: resolvedCoderAgent?.agentReferences,
        };
        console.info(colors.green(`Running prompts with ${runner.name}`));

        initializeRunUi(uiHandle, runner.name, actualRunnerModel, options);
        await initializeRunUiAgentVisual(uiHandle, resolvedCoderAgent?.agentSource);
        // Note: The usage keeps refreshing on its own clock from here on, so a long prompt no longer freezes it
        subscriptionUsageRefresh = startCoderRunUiSubscriptionUsageRefresh({
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
        let hasRunCheckBefore = false;
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

            if (!hasRunCheckBefore && options.checkBefore !== 'no') {
                await waitForRequestedPause({
                    checkpointLabel: 'loading prompts before running initial checks',
                    phase: 'loading',
                    statusMessage: 'Loading prompts before running initial checks...',
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

            if (!hasRunCheckBefore) {
                hasWaitedForStart = await runCheckBeforeIfNeeded({
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
                hasRunCheckBefore = true;
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
                projectPath,
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
            const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section, projectPath);

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
                await ensureWorkingTreeClean(options.workspace?.repositoryRoot ?? projectPath);
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
        subscriptionUsageRefresh?.stop();
        cleanupRunDisplays(progressDisplay, uiHandle, options);
        resetCoderRunControls();
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

    await pullLatestChanges(runOptions.workspace?.repositoryRoot ?? runOptions.projectPath);
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
    const checkBefore: CheckBeforeMode = options.checkBefore ?? 'no';
    const priorityFilter = normalizePriorityFilter({
        priority: options.priority,
        minimumPriority: options.minimumPriority ?? options.priorityFilter?.minimumPriority,
        maximumPriority: options.maximumPriority ?? options.priorityFilter?.maximumPriority,
    });

    return {
        ...options,
        projectPath: options.workspace?.projectPath ?? options.projectPath ?? process.cwd(),
        checkBefore,
        checkCommand: resolveCoderCheckCommand(options.checkCommand?.trim(), checkBefore),
        priority: priorityFilter.minimumPriority ?? 0,
        minimumPriority: priorityFilter.minimumPriority,
        maximumPriority: priorityFilter.maximumPriority,
        priorityFilter,
    };
}

/**
 * Runs the optional pre-coding verification and, when requested, its one repair prompt.
 */
async function runCheckBeforeIfNeeded(options: {
    options: RunOptions;
    runner: PromptRunner;
    runnerMetadata: PromptRunnerMetadata;
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

    if (runOptions.checkBefore === 'no') {
        return hasWaitedForStart;
    }

    if (!runOptions.checkCommand) {
        throw new NotAllowed(
            spaceTrim(`
                ${'`--check-before ' + runOptions.checkBefore + '`'} requires a verification command.

                Pass one with ${'`--check <check-command>`'} or use the default ${'`npm run check`'} command.
            `),
        );
    }

    if (isCleanWorkingTreeRequired(runOptions.gitChanges, isContinuingInterruptedPrompt)) {
        await waitForRequestedPause({
            checkpointLabel: 'checking the git working tree before checking',
            phase: 'loading',
            statusMessage: 'Checking the working tree before checking...',
        });
        await ensureWorkingTreeClean(runOptions.workspace?.repositoryRoot ?? runOptions.projectPath);
    }

    const checkBeforeCommitScope = await captureCheckBeforeCommitScopeIfNeeded(runOptions);

    uiHandle?.startCapturingAgentOutput();
    const checkBeforeResult = await runCheckBefore({
        checkCommand: runOptions.checkCommand,
        projectPath: runOptions.projectPath!,
        waitForPauseCheckpoint: waitForRequestedPause,
    }).finally(() => {
        uiHandle?.stopCapturingAgentOutput();
    });

    await commitCheckBeforeChangesIfNeeded({
        runOptions,
        checkBeforeCommitScope,
        waitForRequestedPause,
    });

    if (checkBeforeResult.isPassed) {
        return hasWaitedForStart;
    }

    const checkOutput = limitCheckOutput(checkBeforeResult.checkOutput);

    if (runOptions.checkBefore === 'yes-and-fail') {
        throw new NotAllowed(
            spaceTrim(
                (block) => `
                    Pre-coding check command \`${runOptions.checkCommand}\` failed.

                    The coding agent was not started because the project was already failing before the first queued prompt.

                    ### Check results
                    ${'```'}
                    ${block(checkOutput)}
                    ${'```'}
                `,
            ),
        );
    }

    const repairPrompt = await createCheckBeforeRepairPrompt({
        projectPath: runOptions.projectPath!,
        checkCommand: runOptions.checkCommand,
        checkOutput,
    });
    const repairPromptLabel = buildPromptLabelForDisplay(
        repairPrompt.file,
        repairPrompt.section,
        runOptions.projectPath,
    );
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
 * Captures the files present before a `yes-and-fix` pre-coding check, so only changes made by that check can be committed.
 */
async function captureCheckBeforeCommitScopeIfNeeded(runOptions: RunOptions): Promise<CoderCommitScope | undefined> {
    if (runOptions.checkBefore !== 'yes-and-fix' || runOptions.noCommit) {
        return undefined;
    }

    return captureCoderCommitScope(runOptions.workspace ?? runOptions.projectPath!);
}

/**
 * Commits files changed by a `yes-and-fix` pre-coding check before the coder continues to a queued or repair prompt.
 */
async function commitCheckBeforeChangesIfNeeded(options: {
    runOptions: RunOptions;
    checkBeforeCommitScope?: CoderCommitScope;
    waitForRequestedPause: WaitForCoderRunPauseCheckpoint;
}): Promise<void> {
    const { runOptions, checkBeforeCommitScope, waitForRequestedPause } = options;

    if (!checkBeforeCommitScope) {
        return;
    }

    const relevantPaths = await resolveCoderCommitScopePaths(checkBeforeCommitScope);
    if (relevantPaths.length === 0) {
        return;
    }

    await waitForRequestedPause({
        checkpointLabel: 'committing changes made by pre-coding checks',
        phase: 'verifying',
        statusMessage: 'Committing changes made by pre-coding checks...',
    });
    await commitChanges(PRE_CODING_CHECK_CHANGES_COMMIT_MESSAGE, {
        autoPush: runOptions.autoPush,
        projectPath: checkBeforeCommitScope.repositoryRoot ?? checkBeforeCommitScope.projectPath,
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
    guardFreeDiskSpace: FreeDiskSpaceGuard;
}): WaitForCoderRunPauseCheckpoint {
    const { isRichUiEnabled, progressDisplay, uiHandle, guardFreeDiskSpace } = options;

    return async (checkpoint: CoderRunPauseCheckpointOptions): Promise<void> => {
        uiHandle?.state.setPhase(checkpoint.phase);
        uiHandle?.state.setStatusMessage(checkpoint.statusMessage);
        announcePauseTargetLabel(checkpoint.checkpointLabel);

        // Note: Runs after the checkpoint label is announced, so a pause requested because of a full disk
        //       replaces that label and says why the run is standing still
        await guardFreeDiskSpace();

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
async function runDryRunIfRequested(
    options: RunOptions,
    agentReferences: ReadonlyArray<string> | undefined,
): Promise<boolean> {
    if (!options.dryRun) {
        return false;
    }

    const promptRunnerIdentity: PromptRunnerIdentity = {
        harnessName: options.agentName,
        modelName: options.agentName ? resolveRunnerModel(options.agentName, options.model) : options.model,
        agentReferences,
    };
    const promptFiles = (
        await loadPromptFiles(join(options.projectPath!, 'prompts'), {
            isMissingDirectoryAllowed: true,
        })
    ).map((file) => ({
        ...file,
        sections: file.sections.filter((section) => isPromptCompatibleWithRunner(file, section, promptRunnerIdentity)),
    }));
    const stats = summarizePrompts(promptFiles, options.priorityFilter);
    printStats(stats, options.priorityFilter);
    console.info(colors.yellow('Following prompts need to be written:'));
    printPromptsToBeWritten(promptFiles, options.priorityFilter, options.projectPath);
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
        checkCommand: options.checkCommand,
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

    const promptFiles = await loadPromptFiles(join(runOptions.projectPath!, 'prompts'));
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
    projectPath: string;
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
        printPromptsToBeWritten(promptFiles, priorityFilter, options.projectPath);
        console.info('');
    }

    printUpcomingTasks(listUpcomingTasks(promptFiles, priorityFilter, promptRunnerIdentity, options.projectPath));
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
            'No prompts match the selected harness, model or agent.',
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
        message = 'No prompts match the selected harness, model or agent. Watching for changes...';
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
