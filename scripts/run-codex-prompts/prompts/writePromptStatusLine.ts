import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';
import { findFirstNonEmptyLineIndex } from './findFirstNonEmptyLineIndex';
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
 * An unmarked prompt is implicitly a todo, so its first live status line is inserted immediately before its content.
 * Only a todo `[ ]` or an in-progress `[^]` status line is otherwise rewritten, so an already finalized `[x]`, `[!]`
 * or `[-]` status is never overwritten by accident.
 */
export function writePromptStatusLine(file: PromptFile, section: PromptSection, replacementStatusLine: string): void {
    if (section.statusLineIndex === undefined) {
        insertPromptStatusLine(file, section, replacementStatusLine);
        return;
    }

    const { statusLineIndex, line } = resolvePromptStatusLine(file, section);

    file.lines[statusLineIndex] = line.replace(
        REWRITABLE_PROMPT_STATUS_LINE_PATTERN,
        `$<indentation>${replacementStatusLine}`,
    );
}

/**
 * Inserts the first persisted status line for an unmarked prompt and keeps parsed section positions in sync.
 *
 * @private internal utility of `writePromptStatusLine`
 */
function insertPromptStatusLine(file: PromptFile, section: PromptSection, replacementStatusLine: string): void {
    const statusLineIndex = findFirstNonEmptyLineIndex(file.lines, section.startLine, section.endLine);

    if (statusLineIndex === undefined) {
        const promptReference = `Prompt ${section.index + 1} in \`${file.name}\``;

        throw new UnexpectedError(
            spaceTrim(`
                ${promptReference} does not have content where its status line can be added.
            `),
        );
    }

    file.lines.splice(statusLineIndex, 0, replacementStatusLine);
    updatePromptSectionPositionsAfterStatusInsertion(file, section, statusLineIndex);
}

/**
 * Updates the parsed indexes after adding a status line to an unmarked prompt.
 *
 * @private internal utility of `writePromptStatusLine`
 */
function updatePromptSectionPositionsAfterStatusInsertion(
    file: PromptFile,
    section: PromptSection,
    statusLineIndex: number,
): void {
    for (const promptSection of file.sections) {
        if (promptSection === section) {
            promptSection.statusLineIndex = statusLineIndex;
            promptSection.endLine += 1;
            continue;
        }

        if (promptSection.startLine >= statusLineIndex) {
            promptSection.startLine += 1;
            promptSection.endLine += 1;

            if (promptSection.statusLineIndex !== undefined) {
                promptSection.statusLineIndex += 1;
            }
        }
    }

    if (!file.sections.includes(section)) {
        section.statusLineIndex = statusLineIndex;
        section.endLine += 1;
    }
}
