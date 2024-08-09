import type { ExecutionReportJson } from './ExecutionReportJson';
import type { ExecutionReportString } from './ExecutionReportString';
import type { ExecutionReportStringOptions } from './ExecutionReportStringOptions';
/**
 * Converts execution report from JSON to string format
 *
 * @public exported from `@promptbook/core`
 */
export declare function executionReportJsonToString(executionReportJson: ExecutionReportJson, options?: Partial<ExecutionReportStringOptions>): ExecutionReportString;
/**
 * TODO: Add mermaid chart for every report
 * TODO: [🧠] Allow to filter out some parts of the report by options
 */
