import type { string_markdown, string_markdown_text } from '../../types/typeAliases';
import type { FromtoItems } from '../misc/FromtoItems';
import { removeEmojis } from '../normalization/removeEmojis';
import { numberToString } from '../parameters/numberToString';
import { createMarkdownTable } from './createMarkdownTable';

/**
 * Options for `CreateMarkdownChartOptions`
 */
type CreateMarkdownChartOptions = {
    /**
     * The header for the first column - the name of the item
     */
    readonly nameHeader: string;

    /**
     * The header for the second column - the value of the item
     */
    readonly valueHeader: string;

    /**
     * The items to be charted
     */
    readonly items: FromtoItems;

    /**
     * The width of the chart in squares
     */
    readonly width: number;

    /**
     * The name of the unit shown in the chart
     */
    readonly unitName: string;
};

/**
 * Function createMarkdownChart will draw a chart in markdown from ⬛+🟦 tiles
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function createMarkdownChart(options: CreateMarkdownChartOptions): string_markdown {
    const { nameHeader, valueHeader, items, width, unitName } = options;
    const from = Math.min(...items.map((item) => item.from));
    const to = Math.max(...items.map((item) => item.to));

    const scale = width / (to - from);

    const table: Array<Array<string_markdown_text>> = [[nameHeader, valueHeader]];

    for (const item of items) {
        const before = Math.round((item.from - from) * scale);
        const during = Math.round((item.to - item.from) * scale);
        const after = width - before - during;

        table.push([removeEmojis(item.title).trim(), '░'.repeat(before) + '█'.repeat(during) + '░'.repeat(after)]);
    }

    const legend = `_Note: Each █ represents ${numberToString(
        1 / scale,
    )} ${unitName}, width of ${valueHeader.toLowerCase()} is ${numberToString(
        to - from,
    )} ${unitName} = ${width} squares_`;

    return createMarkdownTable(table) + '\n\n' + legend;
}

/**
 * TODO: Maybe use Mermain Gant Diagrams
 *       @see https://jojozhuang.github.io/tutorial/mermaid-cheat-sheet/
 */
