import type { string_markdown } from '../../types/typeAliases';
import type { FromtoItems } from '../FromtoItems';
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
export declare function createMarkdownChart(options: CreateMarkdownChartOptions): string_markdown;
export {};
/**
 * TODO: Maybe use Mermain Gant Diagrams
 *       @see https://jojozhuang.github.io/tutorial/mermaid-cheat-sheet/
 */
