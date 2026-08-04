import { buildPromptStatusDetails, type BuildPromptStatusDetailsOptions } from './buildPromptStatusDetails';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { writePromptStatusLine } from './writePromptStatusLine';

/**
 * Input for marking one prompt section as being implemented right now.
 */
export type MarkPromptInProgressOptions = BuildPromptStatusDetailsOptions & {
    /**
     * Prompt file the marked section belongs to.
     */
    readonly file: PromptFile;

    /**
     * Section which is being implemented right now.
     */
    readonly section: PromptSection;

    /**
     * Step which has just started, always present because a prompt is only in progress while a step runs.
     */
    readonly inProgressStepKind: NonNullable<BuildPromptStatusDetailsOptions['inProgressStepKind']>;
};

/**
 * Marks a prompt section as being implemented right now and records the steps finished so far.
 *
 * The `[^]` status is deliberately never reverted: when the coder is killed or crashes, the status stays
 * in the prompt file as the signal that this task was left in the middle of its implementation.
 */
export function markPromptInProgress(options: MarkPromptInProgressOptions): void {
    const { file, section, ...statusDetailsOptions } = options;

    writePromptStatusLine(file, section, `[^] ${buildPromptStatusDetails(statusDetailsOptions)}`);
}
