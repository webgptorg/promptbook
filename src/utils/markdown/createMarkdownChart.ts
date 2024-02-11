import { string_markdown, string_markdown_text } from '../../types/typeAliases';
import { FromtoItems } from '../FromtoItems';
import { removeEmojis } from '../removeEmojis';
import { createMarkdownTable } from './createMarkdownTable';

type CreateMarkdownChartOptions = {
    nameHeader: string;
    valueHeader: string;
    items: FromtoItems;
    width: number;
    // TODO: !!!! Annotate all
};

/**
 * Function createMarkdownChart will draw a chart in markdown from ⬛+🟦 tiles
 *
 * @private within the library
 */
export function createMarkdownChart(options: CreateMarkdownChartOptions): string_markdown {
    const { nameHeader, valueHeader, items, width } = options;
    const from = Math.min(...items.map((item) => item.from));
    const to = Math.max(...items.map((item) => item.to));

    const scale = width / (to - from);

    const table: Array<Array<string_markdown_text>> = [[nameHeader, valueHeader]];

    for (const item of items) {
        const before = Math.round((item.from - from) * scale);
        const the = Math.round((item.to - item.from) * scale);
        const after = width - before - the;

        table.push([removeEmojis(item.title).trim(), '░'.repeat(before) + '█'.repeat(the) + '░'.repeat(after)]);
    }

    return createMarkdownTable(table);
}
