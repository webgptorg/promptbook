import { string_markdown, string_markdown_text } from '../../types/typeAliases';
import { FromtoItems } from '../FromtoItems';
import { createMarkdownTable } from './createMarkdownTable';

/**
 * Function createMarkdownChart will draw a chart in markdown from ⬛+🟦 tiles
 *
 * @private within the library
 */

export function createMarkdownChart(items: FromtoItems, width: number): string_markdown {
    const from = Math.min(...items.map((item) => item.from));
    const to = Math.max(...items.map((item) => item.to));

    const scale = width / (to - from);

    const table: Array<Array<string_markdown_text>> = [];

    for (const item of items) {
        const before = Math.round((item.from - from) * scale);
        const the = Math.round((item.to - item.from) * scale);
        const after = width - before - the;

        table.push([item.title, '⬛'.repeat(before) + '🟦'.repeat(the) + '⬛'.repeat(after)]);
    }

    return createMarkdownTable(table);
}
