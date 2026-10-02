import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../../src/errors/UnexpectedError';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Status line of one prompt section together with the index it lives on.
 */
export type ResolvedPromptStatusLine = {
    /**
     * Index of the status line within `file.lines`.
     */
    readonly statusLineIndex: number;

    /**
     * Current content of the status line, including its indentation and checklist marker.
     */
    readonly line: string;
};

/**
 * Resolves the status line of one prompt section so it can be rewritten.
 */
export function resolvePromptStatusLine(file: PromptFile, section: PromptSection): ResolvedPromptStatusLine {
    if (section.statusLineIndex === undefined) {
        throw new UnexpectedError(
            spaceTrim(`
                Prompt ${section.index + 1} in \`${file.name}\` does not have a status line.
            `),
        );
    }

    const line = file.lines[section.statusLineIndex];

    if (line === undefined) {
        throw new UnexpectedError(
            spaceTrim(`
                Prompt ${section.index + 1} in \`${file.name}\` points to a missing status line.
            `),
        );
    }

    return { statusLineIndex: section.statusLineIndex, line };
}
