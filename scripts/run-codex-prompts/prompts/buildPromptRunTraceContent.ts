import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import { getSafeCodeBlock } from '../../../src/book-2.0/book-language-documentation/getSafeCodeBlock';
import { formatCodexLoginMethod, type CodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { CoderRunStep } from '../common/CoderRunStep';
import { formatUnknownErrorDetails } from '../common/formatUnknownErrorDetails';
import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import { formatCoderRunSteps } from './formatCoderRunSteps';
import { formatRunnerSignature } from './formatRunnerSignature';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * How one prompt round the trace describes has ended.
 *
 * A successful round reports the steps it is made of, a failed round reports the error which ended it.
 */
export type PromptRunTraceOutcome =
    | {
          readonly kind: 'succeeded';

          /**
           * Ordered steps of the round, each with its own price and duration.
           */
          readonly steps: ReadonlyArray<CoderRunStep>;

          /**
           * Authentication method the harness reported, when it could be determined.
           */
          readonly loginMethod?: CodexLoginMethod;
      }
    | {
          readonly kind: 'failed';

          /**
           * Error which ended the round after its last retry.
           */
          readonly error: unknown;
      };

/**
 * Everything one run trace says about the prompt round it describes.
 */
export type BuildPromptRunTraceContentOptions = {
    readonly file: PromptFile;
    readonly section: PromptSection;

    /**
     * Harness which ran the prompt.
     */
    readonly runnerName?: string;

    /**
     * Model the harness ran the prompt with.
     */
    readonly modelName?: string;

    /**
     * Reasoning effort the harness ran the prompt with.
     */
    readonly thinkingLevel?: ThinkingLevel;

    /**
     * Verification command the round ran after each coding attempt, when one is configured.
     */
    readonly testCommand?: string;

    /**
     * How many coding attempts the round has taken.
     */
    readonly attemptCount: number;

    /**
     * Moment the round started at.
     */
    readonly startedDate: moment.Moment;

    /**
     * Moment the round was recorded as finished or failed at.
     */
    readonly finishedDate: moment.Moment;

    readonly outcome: PromptRunTraceOutcome;

    /**
     * Raw runtime log of the round, holding the generated shell scripts and everything the harness and the
     * verification command have written. Empty when the round produced no readable runtime log.
     */
    readonly runtimeLog: string;
};

/**
 * Renders the markdown run trace of one finished or failed prompt round.
 *
 * The trace pairs the metadata of the round - which harness, model and thinking level ran it, how long each of
 * its steps took and what it cost - with the untouched runtime log, so a finished round can still be analyzed
 * after its temporary artifacts are cleaned up.
 */
export function buildPromptRunTraceContent(options: BuildPromptRunTraceContentOptions): string {
    const sections = [
        buildPromptRunTraceSummarySection(options),
        buildPromptRunTraceFailureSection(options.outcome),
        buildPromptRunTraceRuntimeLogSection(options.runtimeLog),
    ].filter((section): section is string => section !== undefined);

    return `${sections.join('\n\n')}\n`;
}

/**
 * Renders the heading and the metadata bullet list of one run trace.
 */
function buildPromptRunTraceSummarySection(options: BuildPromptRunTraceContentOptions): string {
    const { file, section, outcome } = options;
    const runnerSignature = formatRunnerSignature(options.runnerName, options.modelName, options.thinkingLevel);
    const loginMethodLabel = outcome.kind === 'succeeded' ? formatCodexLoginMethod(outcome.loginMethod) : undefined;
    const loginMethodSuffix = loginMethodLabel ? ` (${loginMethodLabel})` : '';
    const detailLines = [
        `-   **Prompt:** ${buildPromptSummary(file, section)}`,
        ...buildPromptRunTraceSectionLines(file, section),
        `-   **Outcome:** ${formatPromptRunTraceOutcomeLabel(outcome)}`,
        `-   **Runner:** ${runnerSignature}${loginMethodSuffix}`,
        `-   **Attempts:** ${options.attemptCount}`,
        ...buildPromptRunTraceStepsLines(outcome),
        ...buildPromptRunTraceTestCommandLines(options.testCommand),
        `-   **Started:** ${options.startedDate.toISOString()}`,
        `-   **Finished:** ${options.finishedDate.toISOString()}`,
        `-   **Duration:** ${moment.duration(options.finishedDate.diff(options.startedDate)).humanize()}`,
    ];

    return spaceTrim(
        (block) => `
            # Run trace of \`${buildPromptLabelForDisplay(file, section)}\`

            ${block(detailLines.join('\n'))}
        `,
    );
}

/**
 * Renders which section of its prompt file the round implemented.
 *
 * A prompt file holding exactly one section says nothing by naming it, exactly like the section suffix of its
 * generated artifact names, so only a file with more than one section reports the section it traced.
 */
function buildPromptRunTraceSectionLines(file: PromptFile, section: PromptSection): ReadonlyArray<string> {
    if (file.sections.length <= 1) {
        return [];
    }

    return [`-   **Prompt section:** ${section.index + 1} of ${file.sections.length}`];
}

/**
 * Renders the per-step usage breakdown of a successful round, omitted for a round which never finished one.
 */
function buildPromptRunTraceStepsLines(outcome: PromptRunTraceOutcome): ReadonlyArray<string> {
    if (outcome.kind !== 'succeeded') {
        return [];
    }

    const stepsSummary = formatCoderRunSteps(outcome.steps);

    if (stepsSummary === '') {
        return [];
    }

    return [`-   **Steps:** ${stepsSummary}`];
}

/**
 * Renders the verification command of the round, omitted when the round ran without one.
 */
function buildPromptRunTraceTestCommandLines(testCommand: string | undefined): ReadonlyArray<string> {
    if (!testCommand) {
        return [];
    }

    return [`-   **Verification command:** \`${testCommand}\``];
}

/**
 * Renders the failure details of a failed round, omitted for a successful one.
 */
function buildPromptRunTraceFailureSection(outcome: PromptRunTraceOutcome): string | undefined {
    if (outcome.kind !== 'failed') {
        return undefined;
    }

    return `## Failure\n\n${getSafeCodeBlock(formatUnknownErrorDetails(outcome.error), 'text')}`;
}

/**
 * Renders the untouched runtime log of the round, or says that the round produced none.
 */
function buildPromptRunTraceRuntimeLogSection(runtimeLog: string): string {
    if (runtimeLog.trim() === '') {
        return '## Runtime log\n\n_This round has produced no readable runtime log._';
    }

    return `## Runtime log\n\n${getSafeCodeBlock(runtimeLog.replace(/\r\n/gu, '\n').trimEnd(), 'text')}`;
}

/**
 * Formats the outcome of the round as the human-readable label of its trace.
 */
function formatPromptRunTraceOutcomeLabel(outcome: PromptRunTraceOutcome): string {
    return outcome.kind === 'succeeded' ? 'Succeeded' : 'Failed';
}
