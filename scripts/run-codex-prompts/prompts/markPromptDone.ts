import moment from 'moment';
import type { Usage } from '../../../src/execution/Usage';
import { formatUsagePrice } from '../common/formatUsagePrice';
import { formatRunnerSignature } from './formatRunnerSignature';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Marks a prompt section as done and records usage pricing and runner details.
 */
export function markPromptDone(
    file: PromptFile,
    section: PromptSection,
    usage: Usage,
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
    const priceString = formatUsagePrice(usage);
    const runnerSignature = formatRunnerSignature(runnerName, modelName);

    const duration = moment().diff(promptExecutionStartedDate);
    const durationString = moment.duration(duration).humanize();

    // Replace "[ ]" or "[ ] !!..." with "[x] $price duration by runner"
    file.lines[section.statusLineIndex] = line.replace(
        /\[\s*\]\s*!*\s*$/,
        `[x] ${priceString} ${durationString} by ${runnerSignature}`,
    );
}
