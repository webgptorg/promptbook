import type { string_markdown, string_markdown_text } from '../../types/typeAliases';

/**
 * Create a markdown table from a 2D array of strings
 *
 * @private within the repository
 */
export function createMarkdownTable(table: Array<Array<string_markdown_text>>): string_markdown {
    const columnWidths: number[] = table.reduce((widths: number[], row: string_markdown_text[]) => {
        row.forEach((cell: string_markdown_text, columnIndex: number) => {
            const cellLength: number = cell.length;
            if (!widths[columnIndex] || cellLength > widths[columnIndex]!) {
                widths[columnIndex] = cellLength;
            }
        });
        return widths;
    }, []);

    const header: string = `| ${table[0]!
        .map((cell: string_markdown_text, columnIndex: number) => cell.padEnd(columnWidths[columnIndex]!))
        .join(' | ')} |`;

    const separator: string = `|${columnWidths.map((width: number) => '-'.repeat(width + 2)).join('|')}|`;

    const rows: string[] = table.slice(1).map((row: string_markdown_text[]) => {
        const paddedRow: string[] = row.map((cell: string_markdown_text, columnIndex: number) =>
            cell.padEnd(columnWidths[columnIndex]!),
        );
        return `| ${paddedRow.join(' | ')} |`;
    });

    return [header, separator, ...rows].join('\n');
}
