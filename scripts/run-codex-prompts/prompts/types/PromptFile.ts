import type { PromptSection } from './PromptSection';

/**
 * Parsed prompt file with section metadata and original content lines.
 */
export type PromptFile = {
    path: string;
    name: string;
    lines: string[];
    eol: string;
    hasFinalEol: boolean;
    sections: PromptSection[];
};
