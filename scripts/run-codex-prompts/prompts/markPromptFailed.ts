import moment from 'moment';
import { formatRunnerSignature } from './formatRunnerSignature';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Marks a prompt section as failed and records runner details.
 */
export function markPromptFailed(
    file: PromptFile,
    section: PromptSection,
    runnerName: string | undefined,
    modelName: string | undefined,
    promptExecutionStartedDate: moment.Moment,
): void {
    if (section.statusLineIndex === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} does not have a status line.`);
    }

    const line = file.lines[section.statusLineIndex];
    if (line === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} points to a missing status line.`);
    }
    const runnerSignature = formatRunnerSignature(runnerName, modelName);
    const duration = moment().diff(promptExecutionStartedDate);
    const durationString = moment.duration(duration).humanize();

    file.lines[section.statusLineIndex] = line.replace(
        /\[\s*\]\s*!*\s*$/,
        `[!] failed after ${durationString} by ${runnerSignature}`,
    );
}
