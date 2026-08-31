import moment from 'moment';
import { formatPromptAttemptMetadata } from './formatPromptAttemptMetadata';
import { formatRunnerSignature } from './formatRunnerSignature';
import { formatPromptRunnerAttribution, type PromptRunnerAttribution } from './promptRunnerAttribution';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { writePromptStatusLine } from './writePromptStatusLine';

/**
 * Input for marking one prompt section as failed.
 */
export type MarkPromptFailedOptions = {
    /**
     * Prompt file the marked section belongs to.
     */
    readonly file: PromptFile;

    /**
     * Section which could not be implemented.
     */
    readonly section: PromptSection;

    /**
     * Harness which ran the prompt.
     */
    readonly runnerName: string | undefined;

    /**
     * Model the harness ran the prompt with.
     */
    readonly modelName: string | undefined;

    /**
     * Chronological runner report read from a prompt left in the middle of its implementation.
     */
    readonly previousRunnerSignatures?: PromptRunnerAttribution;

    /**
     * Moment the failed prompt round started, used to report how long the attempt took.
     */
    readonly promptExecutionStartedDate: moment.Moment;

    /**
     * How many coding attempts the prompt has taken before it was given up on.
     */
    readonly attemptCount: number;
};

/**
 * Marks a prompt section as failed and records runner details.
 */
export function markPromptFailed(options: MarkPromptFailedOptions): void {
    const { file, section, runnerName, modelName, previousRunnerSignatures, promptExecutionStartedDate, attemptCount } =
        options;

    const attribution = formatPromptRunnerAttribution({
        currentRunnerSignature: formatRunnerSignature(runnerName, modelName),
        previousRunnerSignatures,
    });
    const attemptMetadata = formatPromptAttemptMetadata('failed', attemptCount);
    const duration = moment().diff(promptExecutionStartedDate);
    const durationString = moment.duration(duration).humanize();
    const failureDetails =
        attemptMetadata === ''
            ? `failed after ${durationString} ${attribution}`
            : `${attemptMetadata}${durationString} ${attribution}`;

    writePromptStatusLine(file, section, `[!] ${failureDetails}`);
}
