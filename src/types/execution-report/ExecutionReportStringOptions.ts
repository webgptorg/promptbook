import { number_percent } from "../typeAliases";

export type ExecutionReportStringOptions = {
  // Add properties

  taxRate: number_percent;
}

export const ExecutionReportStringOptionsDefaults = {
  // Add properties

  taxRate: 0.2,

} satisfies ExecutionReportStringOptions;


/**
 * 
 * !!! Annotate
 */