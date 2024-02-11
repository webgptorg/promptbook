import { number_percent } from '../typeAliases';

export type ExecutionReportStringOptions = {
    // Add properties

    taxRate: number_percent;

    chartsWidth: number;
};

export const ExecutionReportStringOptionsDefaults = {
    // Add properties

    taxRate: 0,

    chartsWidth: 36,
} satisfies ExecutionReportStringOptions;

/**
 *
 * !!! Annotate
 */
