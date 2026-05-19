import type { Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { serializeError } from '../../errors/utils/serializeError';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { LlmCall } from '../../types/LlmCall';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { $OngoingTaskResult } from './$OngoingTaskResult';

/**
 * Appends the prompt execution report for prompt-task attempts.
 *
 * @private function of `executeAttempts`
 */
export function reportPromptExecution(options: {
    /**
     * Metadata describing the current loop iteration.
     */
    readonly attempt: {
        readonly isJokerAttempt: boolean;
    };

    /**
     * Task currently being executed.
     */
    readonly task: ReadonlyDeep<TaskJson>;

    /**
     * Mutable execution report object to append prompt execution data to.
     */
    readonly $executionReport: WritableDeep<ExecutionReportJson>;

    /**
     * Optional callback invoked with each LLM call.
     */
    logLlmCall?(llmCall: LlmCall): Promisable<void>;

    /**
     * Mutable per-task execution state.
     */
    readonly $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const { attempt, task, $executionReport, logLlmCall, $ongoingTaskResult } = options;

    if (attempt.isJokerAttempt || task.taskType !== 'PROMPT_TASK' || !$ongoingTaskResult.$prompt) {
        return;
    }

    // Note:  [2] When some expected parameter is not defined, error will occur in templateParameters
    //        In that case we don’t want to make a report about it because it’s not a llm execution error
    const executionPromptReport: chococake = {
        prompt: {
            ...$ongoingTaskResult.$prompt,
            // <- TODO: [🧠] How to pick everyhing except `pipelineUrl`
        } as chococake,
        result: $ongoingTaskResult.$result || undefined,
        error: $ongoingTaskResult.$expectError === null ? undefined : serializeError($ongoingTaskResult.$expectError),
    } as chococake;

    $executionReport.promptExecutions.push(executionPromptReport as TODO_any);

    if (logLlmCall) {
        logLlmCall({
            modelName: 'model' /* <- TODO: How to get model name from the report */,
            report: executionPromptReport,
        });
    }
}
