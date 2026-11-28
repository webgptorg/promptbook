import { buildPromptStatusDetails, type BuildPromptStatusDetailsOptions } from './buildPromptStatusDetails';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { writePromptStatusLine } from './writePromptStatusLine';

/**
 * Input for marking one prompt section as implemented, verified and committed.
 */
export type MarkPromptDoneOptions = BuildPromptStatusDetailsOptions & {
    /**
     * Prompt file the marked section belongs to.
     */
    readonly file: PromptFile;

    /**
     * Section which has just been finished.
     */
    readonly section: PromptSection;
};

/**
 * Marks a prompt section as done and records the per-step usage pricing and runner details.
 */
export function markPromptDone(options: MarkPromptDoneOptions): void {
    const { file, section, ...statusDetailsOptions } = options;

    writePromptStatusLine(file, section, `[x] ${buildPromptStatusDetails(statusDetailsOptions)}`);
}
