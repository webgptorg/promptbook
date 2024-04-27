import type { number_percent } from '../typeAliases';

/**
 * Options for generating an execution report string
 */
export type ExecutionReportStringOptions = {
    /**
     * The tax rate to be applied, expressed as a percentage from 0 to 1 (=100%) or even more
     */
    taxRate: number_percent;
    /**
     * The width of the charts in the report
     */
    chartsWidth: number;
};

/**
 * Default options for generating an execution report string
 */
export const ExecutionReportStringOptionsDefaults = {
    taxRate: 0,
    chartsWidth: 36,
} satisfies ExecutionReportStringOptions;
