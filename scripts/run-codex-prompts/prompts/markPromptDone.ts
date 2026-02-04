import type { Usage } from '../../../src/execution/Usage';
import { formatUsagePrice } from '../common/formatUsagePrice';
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
): void {
    if (section.statusLineIndex === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} does not have a status line.`);
    }

    const line = file.lines[section.statusLineIndex];
    const priceString = formatUsagePrice(usage);
    const runnerSignature = formatRunnerSignature(runnerName, modelName);

    // Replace "[ ]" or "[ ] !!..." with "[x] $price by runner"
    file.lines[section.statusLineIndex] = line.replace(/\[\s*\]\s*!*\s*$/, `[x] ${priceString} by ${runnerSignature}`);
}

/**
 * Formats runner details for prompt status lines.
 */
function formatRunnerSignature(runnerName: string | undefined, modelName: string | undefined): string {
    const normalizedRunner = runnerName?.trim();
    const normalizedModel = modelName?.trim();

    if (!normalizedRunner && !normalizedModel) {
        return 'unknown';
    }

    const runnerLabel = normalizedRunner || 'unknown';

    if (!normalizedModel) {
        return runnerLabel;
    }

    return `${runnerLabel} \`${normalizedModel}\``;
}
