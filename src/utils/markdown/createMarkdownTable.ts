import { string_markdown, string_markdown_text } from '../../types/typeAliases';
import { countCharacters } from '../expectation-counters/countCharacters';

/**
 * Create a markdown table from a 2D array of strings
 *
 * @private within the library
 */

export function createMarkdownTable(table: Array<Array<string_markdown_text>>): string_markdown {
    const columnWidths: number[] = table.reduce((widths: number[], row: string_markdown_text[]) => {
        row.forEach((cell: string_markdown_text, columnIndex: number) => {
            const cellLength: number = countCharacters(cell);
            if (!widths[columnIndex] || cellLength > widths[columnIndex]!) {
                widths[columnIndex] = cellLength;
            }
        });
        return widths;
    }, []);

    const rows: string[] = table.map((row: string_markdown_text[]) => {
        const paddedRow: string[] = row.map((cell: string_markdown_text, columnIndex: number) =>
            cell.padEnd(columnWidths[columnIndex]!),
        );
        return `| ${paddedRow.join(' | ')} |`;
    });

    return rows.join('\n');
}
