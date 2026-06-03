import colors from 'colors';
import moment from 'moment';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
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

        if (await runDryRunIfRequested(options)) {
            return;
        }

        const { runner, actualRunnerModel, runnerMetadata } = resolvePromptRunner(options);
        console.info(colors.green(`Running prompts with ${runner.name}`));

        initializeRunUi(uiHandle, runner.name, actualRunnerModel, options);

        let hasShownUpcomingTasks = false;
        let hasWaitedForStart = false;

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

            if (finishWhenNoPromptIsAvailable(promptQueueSnapshot, isRichUiEnabled, uiHandle)) {
                return;
            }

            const nextPrompt = promptQueueSnapshot.nextPrompt!;
            const promptLabel = buildPromptLabelForDisplay(nextPrompt.file, nextPrompt.section);

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

            await runPromptRound({
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
            });
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
                Flag \`--no-commit\` requires \`--ignore-git-changes\` when combined with \`--no-wait\`.

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
        options.dryRun || options.noUi || isRichUiEnabled ? undefined : new CliProgressDisplay(runStartDate, options.priority);
    const uiHandle = isRichUiEnabled ? renderCoderRunUi(runStartDate) : undefined;

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
        priority: options.priority,
        testCommand: options.testCommand,
    });
    uiHandle?.state.setPhase('loading');
    uiHandle?.state.setStatusMessage(`Running prompts with ${runnerName}`);
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
