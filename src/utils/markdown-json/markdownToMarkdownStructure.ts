import { spaceTrim } from 'spacetrim';
import { LOOP_LIMIT } from '../../config';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { MarkdownStructure } from './MarkdownStructure';

/**
 * Parse a markdown string into a MarkdownStructure object.
 *
 * Note: This function does work with code blocks
 * Note: This function does not work with markdown comments
 *
 * @param markdown The markdown string to parse.
 * @returns The MarkdownStructure object.
 *
 * @private within the library
 */
export function markdownToMarkdownStructure(markdown: string): MarkdownStructure {
    const lines = markdown.split('\n');
    const root: ParsingMarkdownStructure = { level: 0, title: '', contentLines: [], sections: [], parent: null };
    let current: ParsingMarkdownStructure = root;
    let isInsideCodeBlock = false;

    for (const line of lines) {
        const headingMatch = line.match(/^(?<mark>#{1,6})\s(?<title>.*)/);
        if (isInsideCodeBlock || !headingMatch) {
            if (line.startsWith('```')) {
                isInsideCodeBlock = !isInsideCodeBlock;
            }

            current.contentLines.push(line);
        } else {
            const level = headingMatch.groups!.mark!.length;
            const title = headingMatch.groups!.title!.trim();
            let parent: ParsingMarkdownStructure;

            if (level > current.level) {
                // Note: Going deeper (next section is child of current)
                parent = current;
            } else {
                // Note: Going up or staying at the same level (next section is sibling or parent or grandparent,... of current)
                parent = current;

                let loopLimit = LOOP_LIMIT;
                while (parent.level !== level - 1) {
                    if (loopLimit-- < 0) {
                        throw new UnexpectedError(
                            'Loop limit reached during parsing of markdown structure in `markdownToMarkdownStructure`',
                        );
                    }

                    if (parent.parent === null /* <- Note: We are in root */) {
                        // [🌻]
                        throw new Error(
                            spaceTrim(`
                                The file has an invalid structure.
                                The markdown file must have exactly one top-level section.
                            `),
                        );
                    }
                    parent = parent.parent;
                }
            }

            const section = { level, title, contentLines: [], sections: [], parent };
            parent.sections.push(section);
            current = section;
        }
    }

    if (root.sections.length === 1) {
        const markdownStructure = parsingMarkdownStructureToMarkdownStructure(root.sections[0]!);
        return markdownStructure;
    }

    // [🌻]
    throw new Error('The markdown file must have exactly one top-level section.');
    // return root;
}

/**
 * @private
 */
type ParsingMarkdownStructure = Omit<MarkdownStructure, 'content'> & {
    contentLines: string[];
    sections: ParsingMarkdownStructure[];
    parent: ParsingMarkdownStructure | null;
};

/**
 * @private
 */
function parsingMarkdownStructureToMarkdownStructure(
    parsingMarkdownStructure: ParsingMarkdownStructure,
): MarkdownStructure {
    const { level, title, contentLines, sections } = parsingMarkdownStructure;

    return {
        level,
        title,
        content: spaceTrim(contentLines.join('\n')),
        sections: sections.map(parsingMarkdownStructureToMarkdownStructure),
    };
}
