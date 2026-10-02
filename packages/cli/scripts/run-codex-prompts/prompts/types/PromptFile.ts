import type { PromptSection } from './PromptSection';

/**
 * Parsed prompt file with section metadata and original content lines.
 */
export type PromptFile = {
    /** Exact bytes observed by shared queue loading, before status formatting changes. */
    originalContent?: string;
    /** Supervised jobs compare against their own last source revision before each status write. */
    expectedContent?: string;
    /** Enables confined atomic status writes without changing finite runner defaults. */
    workspaceProjectPath?: string;
    path: string;
    name: string;
    lines: string[];
    eol: string;
    hasFinalEol: boolean;
    sections: PromptSection[];
};
