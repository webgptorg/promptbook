import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { DatabaseError } from '../../../src/errors/DatabaseError';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { just } from '../../../src/utils/organization/just';
import type { RunOptions } from '../cli/RunOptions';
import { parseRunOptions } from '../cli/parseRunOptions';
import type {
    CoderRunPauseCheckpointOptions,
    WaitForCoderRunPauseCheckpoint,
} from '../common/CoderRunPauseCheckpoint';
import { CliProgressDisplay } from '../common/cliProgressDisplay';
import { loadCachedAveragePromptDurationMs } from '../common/coderRunEstimateCache';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { sleepWithCountdown } from '../common/sleepWithCountdown';
import { resolveCoderContext } from '../common/resolveCoderContext';
import {
    announcePauseTargetLabel,
    checkPause,
    listenForPause,
    resetPauseTargetLabel,
} from '../common/waitForPause';
import { printAgentGitIdentityTipIfNeeded } from '../git/agentGitIdentity';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { findNextTodoPrompt } from '../prompts/findNextTodoPrompt';
import { listUpcomingTasks } from '../prompts/listUpcomingTasks';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { printPromptsToBeWritten } from '../prompts/printPromptsToBeWritten';
import { printStats } from '../prompts/printStats';
import { printUpcomingTasks } from '../prompts/printUpcomingTasks';
import { summarizePrompts } from '../prompts/summarizePrompts';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { PromptStats } from '../prompts/types/PromptStats';
import { waitForPromptStart } from '../prompts/waitForPromptStart';
import { buildCoderRunAgentVisual } from '../ui/buildCoderRunAgentVisual';
import { renderCoderRunUi, type CoderRunUiHandle } from '../ui/renderCoderRunUi';
import { resolvePromptRunner } from './resolvePromptRunner';
import { runPromptRound } from './runPromptRound';

/**
 * Constant for prompts dir.
 */
const PROMPTS_DIR = join(process.cwd(), 'prompts');

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
    const options = providedOptions ?? parseRunOptions(process.argv.slice(2));
    validateRunCodexPromptOptions(options);

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
        console.info(colors.green(`Running prompts with ${runner.name}`));

        initializeRunUi(uiHandle, runner.name, actualRunnerModel, options);
        await initializeRunUiAgentVisual(uiHandle, resolvedCoderAgent?.agentSource);
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
            });

            hasShownUpcomingTasks ||= showUpcomingTasksOnce({
                hasShownUpcomingTasks,
                promptFiles: promptQueueSnapshot.promptFiles,
                stats: promptQueueSnapshot.stats,
                minimumPriority: options.priority,
                isRichUiEnabled,
            });

            if (!promptQueueSnapshot.nextPrompt) {
                if (options.keepAlive) {
                    announceKeepAliveStatus(promptQueueSnapshot, isRichUiEnabled, uiHandle);
                    await new Promise<void>((resolve) => setTimeout(resolve, KEEP_ALIVE_POLL_INTERVAL_MS));
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

            hasWaitedForStart = await waitForPromptConfirmationIfNeeded({
                options,
                nextPrompt,
                promptLabel,
                hasWaitedForStart,
                isRichUiEnabled,
                progressDisplay,
                uiHandle,
            });

            if (!options.ignoreGitChanges) {
                await waitForRequestedPause({
                    checkpointLabel: 'checking the git working tree',
                    phase: 'loading',
                    statusMessage: 'Checking the working tree...',
                });
                await ensureWorkingTreeClean();
            }

            const currentRoundStartTime = Date.now();
            await runPromptRound({
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
        }
    } finally {
        cleanupRunDisplays(progressDisplay, uiHandle, options);
    }
}

/**
 * Validates cross-flag constraints before the run starts.
 */
function validateRunCodexPromptOptions(options: RunOptions): void {
    if (options.allowDestructiveAutoMigrate && !options.autoMigrate) {
        throw new DatabaseError(
            spaceTrim(`
                Flag \`--allow-destructive-auto-migrate\` requires \`--auto-migrate\`.
            `),
        );
    }

    if (options.noCommit && !options.waitForUser && !options.ignoreGitChanges) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--no-commit\` requires \`--ignore-git-changes\` when running in auto mode (the default; pass \`--no-auto\` for interactive confirmation).

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
 * Pulls the latest repository state before loading prompts when the feature is enabled.
 */
async function pullLatestChangesIfEnabled(options: {
    options: RunOptions;
    isRichUiEnabled: boolean;
}): Promise<void> {
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
            : new CliProgressDisplay(runStartDate, options.priority, options.limit);
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
        listenForPause();
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
    const stats = summarizePrompts(promptFiles, options.priority);
    printStats(stats, options.priority);
    console.info(colors.yellow('Following prompts need to be written:'));
    printPromptsToBeWritten(promptFiles, options.priority);
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
        priority: options.priority,
        limit: options.limit,
        testCommand: options.testCommand,
    });
    uiHandle?.state.setPhase('loading');
    uiHandle?.state.setStatusMessage(`Running prompts with ${runnerName}`);
}

/**
 * Prepares the `--agent` book avatar ASCII-art renderer and shows it instead of the default brand banner.
 *
 * Keeps the default banner when no agent is selected, the UI is disabled, or the visual cannot be rendered.
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
}): Promise<PromptQueueSnapshot> {
    const { options: runOptions, isRichUiEnabled, progressDisplay, uiHandle } = options;
    uiHandle?.state.setCurrentScriptPath(undefined);

    const promptFiles = await loadPromptFiles(PROMPTS_DIR);
    const stats = summarizePrompts(promptFiles, runOptions.priority);

    progressDisplay?.update(stats);
    uiHandle?.state.updateProgress(stats);

    if (!isRichUiEnabled) {
        printStats(stats, runOptions.priority);
    }

    return {
        promptFiles,
        stats,
        nextPrompt: findNextTodoPrompt(promptFiles, runOptions.priority),
    };
}

/**
 * Prints upcoming tasks only on the first loop iteration in plain-console mode.
 */
function showUpcomingTasksOnce(options: {
    hasShownUpcomingTasks: boolean;
    promptFiles: PromptFile[];
    stats: PromptStats;
    minimumPriority: number;
    isRichUiEnabled: boolean;
}): boolean {
    const { hasShownUpcomingTasks, promptFiles, stats, minimumPriority, isRichUiEnabled } = options;

    if (hasShownUpcomingTasks || isRichUiEnabled) {
        return true;
    }

    if (stats.toBeWritten > 0) {
        console.info(colors.yellow('Following prompts need to be written:'));
        printPromptsToBeWritten(promptFiles, minimumPriority);
        console.info('');
    }

    printUpcomingTasks(listUpcomingTasks(promptFiles, minimumPriority));
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

    if (promptQueueSnapshot.stats.toBeWritten > 0) {
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
 * Updates the UI status message while waiting for new prompts in keepAlive server mode.
 */
function announceKeepAliveStatus(
    promptQueueSnapshot: PromptQueueSnapshot,
    isRichUiEnabled: boolean,
    uiHandle?: CoderRunUiHandle,
): void {
    const message =
        promptQueueSnapshot.stats.toBeWritten > 0
            ? 'No prompts ready for agent. Watching for changes...'
            : 'All prompts are done. Watching for changes...';

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
    const { options: runOptions, nextPrompt, promptLabel, hasWaitedForStart, isRichUiEnabled, progressDisplay, uiHandle } =
        options;

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

    const now = Date.now();
    const waitBetweenPromptsEndTime = previousRoundStartTime + waitBetweenPrompts;
    const waitAfterPromptEndTime = previousRoundEndTime + waitAfterPrompt;

    // Phase 1: pace from start of previous prompt (`--wait-between-prompts`)
    const phase1Duration = Math.max(0, waitBetweenPromptsEndTime - now);

    // Phase 2: rest from end of previous prompt (`--wait-after-prompt`)
    const phase2StartTime = Math.max(now, waitBetweenPromptsEndTime);
    const phase2Duration = Math.max(0, waitAfterPromptEndTime - phase2StartTime);

    if (phase1Duration <= 0 && phase2Duration <= 0) {
        return;
    }

    progressDisplay?.pauseTimer();
    uiHandle?.state.pauseTimer();
    uiHandle?.state.setPhase('waiting');

    if (phase1Duration > 0) {
        await sleepWithCountdown({
            durationMs: phase1Duration,
            waitKind: 'between-prompts',
            isRichUiEnabled,
            uiHandle,
        });
    }

    if (phase2Duration > 0) {
        await sleepWithCountdown({
            durationMs: phase2Duration,
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
