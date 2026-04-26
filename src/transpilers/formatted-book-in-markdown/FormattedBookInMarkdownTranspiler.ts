import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_markdown } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { BookTranspiler } from '../_common/BookTranspiler';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';
import { createTranspiledTeamMarkdownSection } from '../_common/TranspiledTeamMember';

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
        keepUnused(tools);
        const teamHierarchy = options?.teamHierarchy || [];

        let lines = book.trim(/* <- Note: Not using `spaceTrim` because its not needed */).split(/\r?\n/);

        if (lines[0]) {
            lines[0] = `**<ins>${lines[0]}</ins>**`;
        }

        for (let i = 1; i < lines.length; i++) {
            let line = lines[i]!;

            line = line?.split('PERSONA').join('**PERSONA**');
            line = line?.split('RULE').join('**RULE**');
            line = line?.split('META').join('**META**');
            line = line?.split('KNOWLEDGE').join('**KNOWLEDGE**');
            line = line?.split('TEAM').join('**TEAM**');
            line = line?.split('ACTION').join('**ACTION**');
            // <- TODO: !!! Unhardcode these commitments

            lines[i] = line;
        }

        // lines = lines.map((line) => `> ${line}`);
        lines = lines.map((line) => `${line}<br/>`);

        const renderedBook = lines.join('\n');
        if (teamHierarchy.length === 0) {
            return renderedBook;
        }

        return `${renderedBook}\n\n${createTranspiledTeamMarkdownSection(teamHierarchy)}`;
    },
} as const satisfies BookTranspiler;
