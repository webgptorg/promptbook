import moment from 'moment';
import { formatPromptAttemptMetadata } from './formatPromptAttemptMetadata';
import { formatRunnerSignature } from './formatRunnerSignature';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { writePromptStatusLine } from './writePromptStatusLine';

/**
 * Marks a prompt section as failed and records runner details.
 */
export function markPromptFailed(
    file: PromptFile,
    section: PromptSection,
    runnerName: string | undefined,
    modelName: string | undefined,
    promptExecutionStartedDate: moment.Moment,
    attemptCount = 1,
): void {
    const runnerSignature = formatRunnerSignature(runnerName, modelName);
    const attemptMetadata = formatPromptAttemptMetadata('failed', attemptCount);
    const duration = moment().diff(promptExecutionStartedDate);
    const durationString = moment.duration(duration).humanize();
    const failureDetails =
        attemptMetadata === ''
            ? `failed after ${durationString} by ${runnerSignature}`
            : `${attemptMetadata}${durationString} by ${runnerSignature}`;

    writePromptStatusLine(file, section, `[!] ${failureDetails}`);
}
