import colors from 'colors';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { appendCoderContext } from '../common/appendCoderContext';
import type { CoderRunStep } from '../common/CoderRunStep';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { formatUnknownErrorDetails } from '../common/formatUnknownErrorDetails';
import type { PromptRunOptions } from '../runners/types/PromptRunOptions';
import type { PromptRunResult } from '../runners/types/PromptRunResult';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { runPromptTestCommand } from './runPromptTestCommand';

/**
 * Maximum number of coding attempts allowed for the same prompt when verification keeps failing.
 */
const MAX_PROMPT_TEST_ATTEMPTS = 3;

/**
 * Maximum amount of verification output sent back to the coding agent as retry feedback.
 */
const MAX_TEST_FEEDBACK_OUTPUT_CHARS = 12_000;

/**
 * File extension used by generated shell scripts.
 */
const SHELL_SCRIPT_EXTENSION = '.sh';

/**
 * Options for running one prompt with optional verification feedback retries.
 */
type RunPromptWithTestFeedbackOptions = PromptRunOptions & {
    runner: PromptRunner;
    promptLabel: string;
    testCommand?: string;
    onAttemptStarted?: (attemptCount: number) => void;
    runPromptTestCommandExecutor?: typeof runPromptTestCommand;
};

/**
 * Successful prompt execution result enriched with the number of attempts it took and its per-step usage breakdown.
 */
export type RunPromptWithTestFeedbackResult = PromptRunResult & {
    attemptCount: number;

    /**
     * Ordered steps performed while producing this result (implementation, testing and fixing), each carrying
     * its own price and duration so the finished prompt can report usage step by step.
     */
    steps: ReadonlyArray<CoderRunStep>;
};

/**
 * Failure of one verification step, returned instead of thrown so the testing step is always recorded.
 */
type FailedVerificationOutcome = {
    /**
     * The error thrown by the verification command.
     */
    readonly error: unknown;
};

/**
 * Runs one coding prompt and, when configured, verifies it with a shell command that can feed failures back.
 */
export async function runPromptWithTestFeedback(
    options: RunPromptWithTestFeedbackOptions,
): Promise<RunPromptWithTestFeedbackResult> {
    const normalizedTestCommand = options.testCommand?.trim();
    const steps: Array<CoderRunStep> = [];

    if (!normalizedTestCommand) {
        options.onAttemptStarted?.(1);
        await waitForPromptAttemptPauseCheckpoint(options.waitForPauseCheckpoint, options.runner.name, 1);

        const result = await runRunnerPromptStep({
            runOptions: options,
            prompt: options.prompt,
            kind: 'implementation',
            steps,
        });

        return { ...result, attemptCount: 1, steps };
    }

    const runPromptTestCommandExecutor = options.runPromptTestCommandExecutor ?? runPromptTestCommand;
    let promptForCurrentAttempt = options.prompt;

    for (let attemptCount = 1; attemptCount <= MAX_PROMPT_TEST_ATTEMPTS; attemptCount++) {
        options.onAttemptStarted?.(attemptCount);
        await waitForPromptAttemptPauseCheckpoint(options.waitForPauseCheckpoint, options.runner.name, attemptCount);

        const result = await runRunnerPromptStep({
            runOptions: options,
            prompt: promptForCurrentAttempt,
            kind: attemptCount === 1 ? 'implementation' : 'fixing',
            steps,
        });

        await waitForVerificationPauseCheckpoint(options.waitForPauseCheckpoint, normalizedTestCommand, attemptCount);
        console.info(colors.gray(`Running verification command after attempt #${attemptCount}: ${normalizedTestCommand}`));

        const failedVerification = await runVerificationStep({
            runPromptTestCommandExecutor,
            testCommand: normalizedTestCommand,
            runOptions: options,
            steps,
        });

        if (failedVerification === undefined) {
            return { ...result, attemptCount, steps };
        }

        const fullVerificationOutput = formatUnknownErrorDetails(failedVerification.error);
        const feedbackVerificationOutput = limitVerificationOutputForFeedback(fullVerificationOutput);

        if (attemptCount >= MAX_PROMPT_TEST_ATTEMPTS) {
            console.error(
                colors.red(`Verification failed for ${options.promptLabel} after ${attemptCount} attempts.`),
            );

            throw new Error(
                buildFinalVerificationFailureMessage({
                    promptLabel: options.promptLabel,
                    testCommand: normalizedTestCommand,
                    attemptCount,
                    verificationOutput: fullVerificationOutput,
                }),
            );
        }

        console.warn(
            colors.yellow(
                `Verification failed for ${options.promptLabel} on attempt #${attemptCount}. Sending feedback to ${options.runner.name} and retrying...`,
            ),
        );

        promptForCurrentAttempt = appendCoderContext(
            options.prompt,
            buildVerificationFeedback({
                testCommand: normalizedTestCommand,
                failedAttemptCount: attemptCount,
                verificationOutput: feedbackVerificationOutput,
            }),
        );
    }

    throw new Error('Unexpected prompt verification state.');
}

/**
 * Runs one coding attempt through the runner, timing it and recording it as an implementation or fixing step.
 */
async function runRunnerPromptStep(options: {
    runOptions: RunPromptWithTestFeedbackOptions;
    prompt: string;
    kind: 'implementation' | 'fixing';
    steps: Array<CoderRunStep>;
}): Promise<PromptRunResult> {
    const { runOptions, prompt, kind, steps } = options;
    const stepStartedTimeMs = Date.now();

    const result = await runOptions.runner.runPrompt({
        prompt,
        scriptPath: runOptions.scriptPath,
        projectPath: runOptions.projectPath,
        logPath: runOptions.logPath,
        preserveArtifactsOnSuccess: runOptions.preserveArtifactsOnSuccess,
        waitForPauseCheckpoint: runOptions.waitForPauseCheckpoint,
    });

    steps.push({ kind, usage: result.usage, durationMs: Date.now() - stepStartedTimeMs });

    return result;
}

/**
 * Runs the verification command, timing it and recording it as a testing step regardless of the outcome, and
 * returns the failure (or `undefined` when the verification passed).
 */
async function runVerificationStep(options: {
    runPromptTestCommandExecutor: typeof runPromptTestCommand;
    testCommand: string;
    runOptions: RunPromptWithTestFeedbackOptions;
    steps: Array<CoderRunStep>;
}): Promise<FailedVerificationOutcome | undefined> {
    const { runPromptTestCommandExecutor, testCommand, runOptions, steps } = options;
    const stepStartedTimeMs = Date.now();

    try {
        await runPromptTestCommandExecutor({
            command: testCommand,
            projectPath: runOptions.projectPath,
            scriptPath: buildPromptTestScriptPath(runOptions.scriptPath),
            logPath: runOptions.logPath,
            preserveArtifactsOnSuccess: runOptions.preserveArtifactsOnSuccess,
        });

        return undefined;
    } catch (error) {
        return { error };
    } finally {
        steps.push({ kind: 'testing', usage: null, durationMs: Date.now() - stepStartedTimeMs });
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
 * Waits for a pause checkpoint immediately before one verification command begins.
 */
async function waitForVerificationPauseCheckpoint(
    waitForPauseCheckpoint: WaitForCoderRunPauseCheckpoint | undefined,
    testCommand: string,
    attemptCount: number,
): Promise<void> {
    await waitForPauseCheckpoint?.({
        checkpointLabel: buildVerificationPauseLabel(attemptCount),
        phase: 'verifying',
        statusMessage: `Running verification after attempt #${attemptCount}: ${testCommand}`,
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
 * Builds the human-readable pause label used before one verification command begins.
 */
function buildVerificationPauseLabel(attemptCount: number): string {
    return `running verification after attempt #${attemptCount}`;
}

/**
 * Builds one feedback block appended to the next coding attempt after tests fail.
 */
function buildVerificationFeedback({
    testCommand,
    failedAttemptCount,
    verificationOutput,
}: {
    testCommand: string;
    failedAttemptCount: number;
    verificationOutput: string;
}): string {
    const nextAttemptCount = failedAttemptCount + 1;

    return spaceTrim(
        (block) => `
            The previous implementation did not pass the required verification command.

            ## Automated verification feedback
            - Retry attempt: ${nextAttemptCount} of ${MAX_PROMPT_TEST_ATTEMPTS}
            - Verification command: \`${testCommand}\`
            - Update the current implementation so the verification command passes without breaking the original task requirements.

            ### Verification output
            \`\`\`
            ${block(verificationOutput)}
            \`\`\`
        `,
    );
}

/**
 * Builds the final error message written when verification still fails after all retries.
 */
function buildFinalVerificationFailureMessage({
    promptLabel,
    testCommand,
    attemptCount,
    verificationOutput,
}: {
    promptLabel: string;
    testCommand: string;
    attemptCount: number;
    verificationOutput: string;
}): string {
    return spaceTrim(
        (block) => `
            Verification command \`${testCommand}\` failed for \`${promptLabel}\` after ${attemptCount} attempts.

            ### Verification output
            \`\`\`
            ${block(verificationOutput)}
            \`\`\`
        `,
    );
}

/**
 * Limits verification output before it is embedded back into the next coding prompt.
 */
function limitVerificationOutputForFeedback(verificationOutput: string): string {
    const normalizedVerificationOutput = verificationOutput.trim();

    if (normalizedVerificationOutput.length <= MAX_TEST_FEEDBACK_OUTPUT_CHARS) {
        return normalizedVerificationOutput;
    }

    return spaceTrim(`
        [...verification output truncated to the last ${MAX_TEST_FEEDBACK_OUTPUT_CHARS} characters...]
        ${normalizedVerificationOutput.slice(-MAX_TEST_FEEDBACK_OUTPUT_CHARS)}
    `);
}

/**
 * Derives a dedicated temp-script path for verification commands.
 */
function buildPromptTestScriptPath(scriptPath: string): string {
    if (scriptPath.toLowerCase().endsWith(SHELL_SCRIPT_EXTENSION)) {
        return `${scriptPath.slice(0, -SHELL_SCRIPT_EXTENSION.length)}.test.sh`;
    }

    return `${scriptPath}.test.sh`;
}
