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

        let lines = book.trim(/* <- Note: Not using `spaceTrim` because its not needed */).split('\n');

        if (lines[0]) {
            lines[0] = `**<ins>${lines[0]}</ins>**`;
        }

        for (let i = 1; i < lines.length; i++) {
            let line = lines[i]!;

            line = line?.split('PERSONA').join('**PERSONA**');
            line = line?.split('RULE').join('**RULE**');
            line = line?.split('META').join('**META**');
            line = line?.split('KNOWLEDGE').join('**KNOWLEDGE**');
            line = line?.split('ACTION').join('**ACTION**');
            // <- TODO: !!! Unhardcode these commitments

            lines[i] = line;
        }

        // lines = lines.map((line) => `> ${line}`);
        lines = lines.map((line) => `${line}<br/>`);

        return lines.join('\n');
    },
} as const satisfies BookTranspiler;
