import { string_markdown, string_markdown_text } from '../../types/typeAliases';
import { FromtoItems } from '../FromtoItems';
import { formatNumber } from '../formatNumber';
import { removeEmojis } from '../removeEmojis';
import { createMarkdownTable } from './createMarkdownTable';

/**
 * Options for creating a markdown chart
 */
/**
 * Options for creating a markdown chart.
 */
type CreateMarkdownChartOptions = {
    /**
     * The header for the first column - the name of the item
     */
    nameHeader: string;

    /**
     * The header for the second column - the value of the item
     */
    valueHeader: string;

    /**
     * The items to be charted
     */
    items: FromtoItems;

    /**
     * The width of the chart in squares
     */
    width: number;

    /**
     * The name of the unit shown in the chart
     */
    unitName: string;
};

/**
 * Function createMarkdownChart will draw a chart in markdown from ⬛+🟦 tiles
 *
 * @private within the library
 */
export function createMarkdownChart(options: CreateMarkdownChartOptions): string_markdown {
    const { nameHeader, valueHeader, items, width, unitName } = options;
    const from = Math.min(...items.map((item) => item.from));
    const to = Math.max(...items.map((item) => item.to));

    const scale = width / (to - from);

    const table: Array<Array<string_markdown_text>> = [[nameHeader, valueHeader]];

    for (const item of items) {
        let before = Math.floor((item.from - from) * scale);
        let duringChar = '█';
        let during = Math.round((item.to - item.from) * scale);

        if (during === 0) {
            duringChar = '▓';
            during = 1;
        }

        const after = width - before - during;

        if (before < 0 || during < 0 || after < 0) {
            console.error(
                'Problem in createMarkdownChart',
                { before, during, after },
                { item, items, table, scale, options },
                // <- TODO: Error with extra info
            );
            throw new Error(
                //         <- TODO: [🥨] Make some NeverShouldHappenError
                'Problem in createMarkdownChart, see more in console',
            );
        }

        table.push([
            removeEmojis(item.title).trim(),
            '░'.repeat(before) + duringChar.repeat(during) + '░'.repeat(after),
        ]);
    }

    const legend = `_Note: Each █ represents ${formatNumber(
        1 / scale,
    )} ${unitName}, width of ${valueHeader.toLowerCase()} is ${formatNumber(
        to - from,
    )} ${unitName} = ${width} squares_`;

    return createMarkdownTable(table) + '\n\n' + legend;
}
