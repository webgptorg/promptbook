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
    statusLineIndex?: number;
};
