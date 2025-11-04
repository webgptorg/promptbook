import type { LlmCall } from '../../types/LlmCall';
import type { ExecutionPromptReportJson } from '../execution-report/ExecutionPromptReportJson';

/**
 * Logs an LLM call with the given report.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export function logLlmCall(
    logLlmCall: (llmCall: LlmCall) => void,
    report: ExecutionPromptReportJson,
): void {
    logLlmCall({
        modelName: 'model' /* <- TODO: How to get model name from the report */,
        report,
    });
}
