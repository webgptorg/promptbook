import type { number_percent } from '../typeAliases';
/**
 * Options for `executionReportJsonToString`
 *
 * @public exported from `@promptbook/core`
 */
export type ExecutionReportStringOptions = {
    /**
     * The tax rate to be applied, expressed as a percentage from 0 to 1 (=100%) or even more
     */
    readonly taxRate: number_percent;
    /**
     * The width of the charts in the report
     */
    readonly chartsWidth: number;
};
/**
 * Default options for generating an execution report string
 *
 * @public exported from `@promptbook/core`
 */
export declare const ExecutionReportStringOptionsDefaults: {
    taxRate: number;
    chartsWidth: number;
};
