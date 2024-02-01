import type { ExecutionReportJson } from './ExecutionReportJson';
import type { ExecutionReportString } from './ExecutionReportString';

/**
 * Converts execution report from JSON to string format
 */
export function executionReportJsonToString(executionReportJson: ExecutionReportJson): ExecutionReportString {
    let executionReportString = '!!!!!!!!!!!!!';

    executionReportString += executionReportJson.promptExecutions.length;

    return executionReportString as ExecutionReportString;
}
