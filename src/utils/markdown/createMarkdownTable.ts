import type { string_markdown, string_markdown_text } from '../../types/typeAliases';

/**
 * Create a markdown table from a 2D array of strings
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function createMarkdownTable(table: Array<Array<string_markdown_text>>): string_markdown {
    const columnWidths: Array<number> = table.reduce((widths: Array<number>, row: Array<string_markdown_text>) => {
        row.forEach((subformat: string_markdown_text, columnIndex: number) => {
            const cellLength: number = subformat.length;
            if (!widths[columnIndex] || cellLength > widths[columnIndex]!) {
                widths[columnIndex] = cellLength;
            }
        });
        return widths;
    }, []);

    const header: string = `| ${table[0]!
        .map((subformat: string_markdown_text, columnIndex: number) => subformat.padEnd(columnWidths[columnIndex]!))
        .join(' | ')} |`;

    const separator: string = `|${columnWidths.map((width: number) => '-'.repeat(width + 2)).join('|')}|`;

    const rows: Array<string> = table.slice(1).map((row: Array<string_markdown_text>) => {
        const paddedRow: Array<string> = row.map((subformat: string_markdown_text, columnIndex: number) =>
            subformat.padEnd(columnWidths[columnIndex]!),
        );
        return `| ${paddedRow.join(' | ')} |`;
    });

    return [header, separator, ...rows].join('\n');
}

/**
 * TODO: [🏛] This can be part of markdown builder
 */
