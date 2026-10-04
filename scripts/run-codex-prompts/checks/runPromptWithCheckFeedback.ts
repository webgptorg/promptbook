import colors from 'colors';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { appendCoderContext } from '../common/appendCoderContext';
import type { CoderRunStep } from '../common/CoderRunStep';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import {
    createCoderRunStepTracker,
    type CoderRunStepTracker,
    type OnCoderRunStepStarted,
} from '../common/createCoderRunStepTracker';
import { formatUnknownErrorDetails } from '../common/formatUnknownErrorDetails';
import type { PromptRunOptions } from '../runners/types/PromptRunOptions';
import type { PromptRunResult } from '../runners/types/PromptRunResult';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { limitCheckOutput } from './limitCheckOutput';
import { runPromptCheckCommand } from './runPromptCheckCommand';
import { CHECK_REPAIR_INSTRUCTIONS } from './checkRepairInstructions';
import { assertProjectCheckIsConfigured, CoderCheckSetupError } from './projectCheck';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';

/**
 * Maximum number of coding attempts allowed for the same prompt when check keeps failing.
 */
const MAX_PROMPT_CHECK_ATTEMPTS = 3;

/**
 * File extension used by generated shell scripts.
 */
const SHELL_SCRIPT_EXTENSION = '.sh';

/**
 * Options for running one prompt with optional check feedback retries.
 */
type RunPromptWithCheckFeedbackOptions = PromptRunOptions & {
    runner: PromptRunner;
    promptLabel: string;
    checkCommand?: string;
    onAttemptStarted?: (attemptCount: number) => void;

    /**
     * Notified right before each implementation, checking and fixing step starts, so the caller can
     * record the in-progress state of the prompt.
     */
    onStepStarted?: OnCoderRunStepStarted;
    runPromptCheckCommandExecutor?: typeof runPromptCheckCommand;
};

/**
 * Successful prompt execution result enriched with the number of attempts it took and its per-step usage breakdown.
 */
export type RunPromptWithCheckFeedbackResult = PromptRunResult & {
    attemptCount: number;

    /**
     * Ordered steps performed while producing this result (implementation, checking and fixing), each carrying
     * its own price and duration so the finished prompt can report usage step by step.
     */
    steps: ReadonlyArray<CoderRunStep>;
};

/**
 * Failure of one check step, returned instead of thrown so the checking step is always recorded.
 */
type FailedCheckOutcome = {
    /**
     * The error thrown by the check command.
     */
    readonly error: unknown;
};

/**
 * Runs one coding prompt and, when configured, verifies it with a shell command that can feed failures back.
 */
export async function runPromptWithCheckFeedback(
    options: RunPromptWithCheckFeedbackOptions,
): Promise<RunPromptWithCheckFeedbackResult> {
    options.signal?.throwIfAborted();
    const normalizedCheckCommand = options.checkCommand?.trim();
    // Injected executors own their setup validation, just as they own command execution. The shared real executor
    // validates again after each agent attempt in case it changed the project's validation configuration.
    if (!options.runPromptCheckCommandExecutor) {
        await assertProjectCheckIsConfigured(normalizedCheckCommand, options.projectPath);
    }
    const stepTracker = createCoderRunStepTracker(options.onStepStarted);

    if (!normalizedCheckCommand) {
        options.onAttemptStarted?.(1);
        await waitForPromptAttemptPauseCheckpoint(options.waitForPauseCheckpoint, options.runner.name, 1);

        const result = await runRunnerPromptStep({
            runOptions: options,
            prompt: options.prompt,
            kind: 'implementation',
            stepTracker,
        });

        return { ...result, attemptCount: 1, steps: stepTracker.steps };
    }

    const runPromptCheckCommandExecutor = options.runPromptCheckCommandExecutor ?? runPromptCheckCommand;
    let promptForCurrentAttempt = options.prompt;

    for (let attemptCount = 1; attemptCount <= MAX_PROMPT_CHECK_ATTEMPTS; attemptCount++) {
        options.onAttemptStarted?.(attemptCount);
        await waitForPromptAttemptPauseCheckpoint(options.waitForPauseCheckpoint, options.runner.name, attemptCount);

        const result = await runRunnerPromptStep({
            runOptions: options,
            prompt: promptForCurrentAttempt,
            kind: attemptCount === 1 ? 'implementation' : 'fixing',
            stepTracker,
        });

        await waitForCheckPauseCheckpoint(options.waitForPauseCheckpoint, normalizedCheckCommand, attemptCount);
        console.info(colors.gray(`Running check command after attempt #${attemptCount}: ${normalizedCheckCommand}`));

        const failedCheck = await runCheckStep({
            runPromptCheckCommandExecutor,
            checkCommand: normalizedCheckCommand,
            runOptions: options,
            stepTracker,
        });

        if (failedCheck === undefined) {
            return { ...result, attemptCount, steps: stepTracker.steps };
        }

        const fullCheckOutput = formatUnknownErrorDetails(failedCheck.error);
        const feedbackCheckOutput = limitCheckOutput(fullCheckOutput);

        if (attemptCount >= MAX_PROMPT_CHECK_ATTEMPTS) {
            console.error(colors.red(`Check failed for ${options.promptLabel} after ${attemptCount} attempts.`));

            throw new NotAllowed(
                buildFinalCheckFailureMessage({
                    promptLabel: options.promptLabel,
                    checkCommand: normalizedCheckCommand,
                    attemptCount,
                    checkOutput: fullCheckOutput,
                }),
            );
        }

        console.warn(
            colors.yellow(
                `Check failed for ${options.promptLabel} on attempt #${attemptCount}. Sending feedback to ${options.runner.name} and retrying...`,
            ),
        );

        promptForCurrentAttempt = appendCoderContext(
            options.prompt,
            buildCheckFeedback({
                checkCommand: normalizedCheckCommand,
                failedAttemptCount: attemptCount,
                checkOutput: feedbackCheckOutput,
            }),
        );
    }

    throw new UnexpectedError('Unexpected prompt check state.');
}

/**
 * Runs one coding attempt through the runner, timing it and recording it as an implementation or fixing step.
 */
async function runRunnerPromptStep(options: {
    runOptions: RunPromptWithCheckFeedbackOptions;
    prompt: string;
    kind: 'implementation' | 'fixing';
    stepTracker: CoderRunStepTracker;
}): Promise<PromptRunResult> {
    const { runOptions, prompt, kind, stepTracker } = options;

    runOptions.signal?.throwIfAborted();
    await stepTracker.startStep(kind);
    const stepStartedTimeMs = Date.now();

    const result = await runOptions.runner.runPrompt({
        prompt,
        scriptPath: runOptions.scriptPath,
        projectPath: runOptions.projectPath,
        logPath: runOptions.logPath,
        preserveArtifactsOnSuccess: runOptions.preserveArtifactsOnSuccess,
        waitForPauseCheckpoint: runOptions.waitForPauseCheckpoint,
        ...(runOptions.signal ? { signal: runOptions.signal } : {}),
    });
    runOptions.signal?.throwIfAborted();

    stepTracker.finishStep(
        { kind, usage: result.usage, durationMs: Date.now() - stepStartedTimeMs },
        result.loginMethod,
    );

    return result;
}

/**
 * Runs the check command, timing it and recording it as a checking step regardless of the outcome, and
 * returns the failure (or `undefined` when the check passed).
 */
async function runCheckStep(options: {
    runPromptCheckCommandExecutor: typeof runPromptCheckCommand;
    checkCommand: string;
    runOptions: RunPromptWithCheckFeedbackOptions;
    stepTracker: CoderRunStepTracker;
}): Promise<FailedCheckOutcome | undefined> {
    const { runPromptCheckCommandExecutor, checkCommand, runOptions, stepTracker } = options;

    runOptions.signal?.throwIfAborted();
    await stepTracker.startStep('checking');
    const stepStartedTimeMs = Date.now();

    try {
        await runPromptCheckCommandExecutor({
            command: checkCommand,
            projectPath: runOptions.projectPath,
            scriptPath: buildPromptCheckScriptPath(runOptions.scriptPath),
            logPath: runOptions.logPath,
            preserveArtifactsOnSuccess: runOptions.preserveArtifactsOnSuccess,
            ...(runOptions.signal ? { signal: runOptions.signal } : {}),
        });
        runOptions.signal?.throwIfAborted();

        return undefined;
    } catch (error) {
        if (error instanceof CoderCheckSetupError || runOptions.signal?.aborted) throw error;
        return { error };
    } finally {
        stepTracker.finishStep({ kind: 'checking', usage: null, durationMs: Date.now() - stepStartedTimeMs });
    }
}

/**
 * Waits for a pause checkpoint immediately before one model attempt begins.
 */
async function waitForPromptAttemptPauseCheckpoint(
    waitForPauseCheckpoint: WaitForCoderRunPauseCheckpoint | undefined,
    runnerName: string,
    attemptCount: number,
): Promise<void> {
    await waitForPauseCheckpoint?.({
        checkpointLabel: buildPromptAttemptPauseLabel(runnerName, attemptCount),
        phase: 'running',
        statusMessage: buildPromptAttemptStatusMessage(runnerName, attemptCount),
    });
}

/**
 * Waits for a pause checkpoint immediately before one check command begins.
 */
async function waitForCheckPauseCheckpoint(
    waitForPauseCheckpoint: WaitForCoderRunPauseCheckpoint | undefined,
    checkCommand: string,
    attemptCount: number,
): Promise<void> {
    await waitForPauseCheckpoint?.({
        checkpointLabel: buildCheckPauseLabel(attemptCount),
        phase: 'checking',
        statusMessage: `Running check after attempt #${attemptCount}: ${checkCommand}`,
    });
}

/**
 * Builds the human-readable pause label used before one runner attempt begins.
 */
function buildPromptAttemptPauseLabel(runnerName: string, attemptCount: number): string {
    return `calling ${runnerName} (attempt ${attemptCount})`;
}

/**
 * Builds the status line shown while one runner attempt is about to start.
 */
function buildPromptAttemptStatusMessage(runnerName: string, attemptCount: number): string {
    return `Calling ${runnerName} (attempt ${attemptCount})`;
}

/**
 * Builds the human-readable pause label used before one check command begins.
 */
function buildCheckPauseLabel(attemptCount: number): string {
    return `running check after attempt #${attemptCount}`;
}

/**
 * Builds one feedback block appended to the next coding attempt after checks fail.
 */
function buildCheckFeedback({
    checkCommand,
    failedAttemptCount,
    checkOutput,
}: {
    checkCommand: string;
    failedAttemptCount: number;
    checkOutput: string;
}): string {
    const nextAttemptCount = failedAttemptCount + 1;

    return spaceTrim(
        (block) => `
            The previous implementation did not pass the required check command.

            ## Automated check feedback
            - Retry attempt: ${nextAttemptCount} of ${MAX_PROMPT_CHECK_ATTEMPTS}
            - Check command: \`${checkCommand}\`
            - Update the current implementation so the check command passes without breaking the original task requirements.

            ${block(CHECK_REPAIR_INSTRUCTIONS)}

            ### Check output
            \`\`\`
            ${block(checkOutput)}
            \`\`\`
        `,
    );
}

/**
 * Builds the final error message written when check still fails after all retries.
 */
function buildFinalCheckFailureMessage({
    promptLabel,
    checkCommand,
    attemptCount,
    checkOutput,
}: {
    promptLabel: string;
    checkCommand: string;
    attemptCount: number;
    checkOutput: string;
}): string {
    return spaceTrim(
        (block) => `
            Check command \`${checkCommand}\` failed for \`${promptLabel}\` after ${attemptCount} attempts.

            ### Check output
            \`\`\`
            ${block(checkOutput)}
            \`\`\`
        `,
    );
}

/**
 * Derives a dedicated temp-script path for check commands.
 */
function buildPromptCheckScriptPath(scriptPath: string): string {
    if (scriptPath.toLowerCase().endsWith(SHELL_SCRIPT_EXTENSION)) {
        return `${scriptPath.slice(0, -SHELL_SCRIPT_EXTENSION.length)}.check.sh`;
    }

    return `${scriptPath}.check.sh`;
}
