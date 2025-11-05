import spaceTrim from 'spacetrim';
import {
    BookTranspiler,
    BookTranspilerOptions,
    ExecutionTools,
    string_book,
    string_markdown,
} from '../../_packages/types.index';
import { keepUnused } from '../../utils/organization/keepUnused';

/**
 * Converts a book into a 1:1 formatted markdown
 *
 * @public exported from `@promptbook/core`
 */
export const FormattedBookInMarkdownTranspiler = {
    name: 'formatted-book-in-markdown',
    title: 'Formatted Book in Markdown',
    packageName: '@promptbook/core',
    className: 'FormattedBookInMarkdownTranspiler',
    transpileBook(book: string_book, tools: ExecutionTools, options?: BookTranspilerOptions): string_markdown {
        keepUnused(tools, options);

        let lines = spaceTrim(book).split('\n');

        if (lines[0]) {
            lines[0] = `**${lines[0]}**`;
        }

        lines = lines.map((line) => `> ${line}`);

        return lines.join('\n');
    },
} as const satisfies BookTranspiler;
