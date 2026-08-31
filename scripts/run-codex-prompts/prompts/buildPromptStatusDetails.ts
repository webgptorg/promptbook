import { formatCodexLoginMethod, type CodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { CoderRunStep, CoderRunStepKind } from '../common/CoderRunStep';
import { formatCoderRunSteps } from './formatCoderRunSteps';
import { formatPromptAttemptMetadata } from './formatPromptAttemptMetadata';
import { formatRunnerSignature } from './formatRunnerSignature';
import { formatPromptRunnerAttribution, type PromptRunnerAttribution } from './promptRunnerAttribution';

/**
 * Everything one prompt status line says after its checklist marker.
 */
export type BuildPromptStatusDetailsOptions = {
    /**
     * Steps of the prompt round which have already finished, each with its own price and duration.
     */
    readonly steps: ReadonlyArray<CoderRunStep>;

    /**
     * Step which has already started but has not finished yet, reported as `Implementation in progress`.
     */
    readonly inProgressStepKind?: CoderRunStepKind;

    /**
     * Harness which runs the prompt.
     */
    readonly runnerName: string | undefined;

    /**
     * Model the harness runs the prompt with.
     */
    readonly modelName: string | undefined;

    /**
     * Chronological runner report read from a prompt left in the middle of its implementation.
     *
     * Present only for a prompt resumed through `--git-changes continue`, so each status rewrite preserves every
     * preceding harness and appends the harness which is currently continuing the work.
     */
    readonly previousRunnerSignatures?: PromptRunnerAttribution;

    /**
     * How many coding attempts the prompt has taken so far.
     */
    readonly attemptCount: number;

    /**
     * Authentication method the harness reported, when it is already known.
     */
    readonly loginMethod?: CodexLoginMethod;

    /**
     * Reasoning effort the harness runs the prompt with.
     */
    readonly thinkingLevel?: ThinkingLevel;
};

/**
 * Builds the shared body of a prompt status line, used by both the in-progress `[^]` and the done `[x]` status.
 *
 * Produces details such as
 * ``by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes``.
 */
export function buildPromptStatusDetails(options: BuildPromptStatusDetailsOptions): string {
    const {
        steps,
        inProgressStepKind,
        runnerName,
        modelName,
        previousRunnerSignatures,
        attemptCount,
        loginMethod,
        thinkingLevel,
    } = options;

    const runnerSignature = formatRunnerSignature(runnerName, modelName, thinkingLevel);
    const attemptMetadata = formatPromptAttemptMetadata('done', attemptCount);
    const loginMethodLabel = formatCodexLoginMethod(loginMethod);
    const loginMethodSuffix = loginMethodLabel ? ` (${loginMethodLabel})` : '';
    const attribution = formatPromptRunnerAttribution({
        currentRunnerSignature: `${runnerSignature}${loginMethodSuffix}`,
        previousRunnerSignatures,
    });
    // Note: An interrupted prompt has step measurements from an earlier process which cannot be reconstructed
    //       from its status line. Do not report just the continuing process as the whole prompt; keep only its
    //       current phase while it runs, and finish with the progressive harness report.
    const completedStepsToReport = previousRunnerSignatures === undefined ? steps : [];
    const stepsSummary = formatCoderRunSteps(completedStepsToReport, inProgressStepKind);
    const stepsSuffix = stepsSummary === '' ? '' : ` - ${stepsSummary}`;

    return `${attemptMetadata}${attribution}${stepsSuffix}`;
}
