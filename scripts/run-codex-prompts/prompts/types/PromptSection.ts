import type { PromptStatus } from './PromptStatus';

/**
 * Parsed section metadata within a prompt markdown file.
 */
export type PromptSection = {
    index: number;
    startLine: number;
    endLine: number;
    status: PromptStatus;
    priority: number;

    /**
     * Index of the explicit status marker in this section.
     *
     * An unmarked prompt is implicitly ready to run, so this remains absent until the coder writes its first live
     * status line.
     */
    statusLineIndex?: number;
};
