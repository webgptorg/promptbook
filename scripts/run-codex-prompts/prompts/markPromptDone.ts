import type { Usage } from '../../../src/execution/Usage';
import { formatUsagePrice } from '../common/formatUsagePrice';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Marks a prompt section as done and records usage pricing.
 */
export function markPromptDone(file: PromptFile, section: PromptSection, usage: Usage): void {
    if (section.statusLineIndex === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} does not have a status line.`);
    }

    const line = file.lines[section.statusLineIndex];
    const priceString = formatUsagePrice(usage);

    // Replace "[ ]" or "[ ] !!..." with "[x] $price"
    file.lines[section.statusLineIndex] = line.replace(/\[\s*\]\s*!*\s*$/, `[x] ${priceString}`);
}
