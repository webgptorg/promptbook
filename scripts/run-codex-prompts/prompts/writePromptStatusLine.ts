import { resolvePromptStatusLine } from './resolvePromptStatusLine';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Matches a complete todo `[ ]` or in-progress `[^]` status line, capturing its indentation.
 *
 * The complete line is replaced because a todo status can contain a required model/harness token
 * in addition to its priority markers, and an in-progress status already carries the metadata of
 * the steps recorded so far.
 */
const REWRITABLE_PROMPT_STATUS_LINE_PATTERN = /^(?<indentation>\s*)\[(?:\s*|\^)\].*$/u;

/**
 * Rewrites the status line of one prompt section while preserving its indentation.
 *
 * Only a todo `[ ]` or an in-progress `[^]` status line is rewritten, so an already finalized
 * `[x]`, `[!]` or `[-]` status is never overwritten by accident.
 */
export function writePromptStatusLine(file: PromptFile, section: PromptSection, replacementStatusLine: string): void {
    const { statusLineIndex, line } = resolvePromptStatusLine(file, section);

    file.lines[statusLineIndex] = line.replace(
        REWRITABLE_PROMPT_STATUS_LINE_PATTERN,
        `$<indentation>${replacementStatusLine}`,
    );
}
