import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable, ReadonlyDeep, WritableDeep } from 'type-fest';
import { ExpectError } from '../../errors/ExpectError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { getSingleLlmExecutionTools } from '../../llm-providers/_multiple/getSingleLlmExecutionTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { LlmCall } from '../../types/LlmCall';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Parameters } from '../../types/Parameters';
import type { string_parameter_name } from '../../types/string_name';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { TODO_string } from '../../utils/organization/TODO_string';
import type { ExecutionReportJson } from '../execution-report/ExecutionReportJson';
import type { LlmExecutionTools } from '../LlmExecutionTools';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import type { $OngoingTaskResult } from './$OngoingTaskResult';
import type { CreatePipelineExecutorOptions } from './00-CreatePipelineExecutorOptions';
import { executeSingleAttempt } from './executeSingleAttempt';
import { handleAttemptFailure } from './handleAttemptFailure';
import { reportPromptExecution } from './reportPromptExecution';

keepTypeImported<ModelRequirements>();

/**
 * Options for executing attempts of a pipeline task, including configuration for jokers, priority,
 * maximum attempts, prepared content, parameters, the task itself, the prepared pipeline, execution report,
 * and pipeline identification. Used internally by the pipeline executor.
 *
 * @private internal type of `executeAttempts`
 */
export type ExecuteAttemptsOptions = Required<Omit<CreatePipelineExecutorOptions, 'pipeline'>> & {
    /**
     * Names of parameters that act as jokers, which can be used to bypass normal execution if their value meets requirements.
     */
    readonly jokerParameterNames: Readonly<ReadonlyArray<string_parameter_name>>;

    /**
     * Priority of the current execution attempt, used to influence UI or execution order.
     */
    readonly priority: number;

    /**
     * Maximum number of attempts allowed for this task, including retries and joker attempts.
     * Note: [💂] There are two distinct variables
     * 1) `maxExecutionAttempts` - attempts for LLM model
     * 2) `maxAttempts` - attempts for any task (LLM, SCRIPT, DIALOG, etc.)
     */
    readonly maxAttempts: number;

    /**
     * The content prepared for execution, with parameters already substituted.
     */
    readonly preparedContent: TODO_string;

    /**
     * The parameters provided for this execution attempt.
     */
    readonly parameters: Readonly<Parameters>;

    /**
     * The task being executed, as a deeply immutable TaskJson object.
     * Note: Naming should be unified between `task` and `currentTask`.
     */
    readonly task: ReadonlyDeep<TaskJson>;
    //       <- TODO: [🕉] `task` vs `currentTask` - unite naming

    /**
     * The pipeline structure prepared for execution, as a deeply immutable PipelineJson object.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * Callback invoked with partial results as the execution progresses.
     */
    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;

    /**
     * Optional callback invoked with each LLM call.
     */
    logLlmCall?(llmCall: LlmCall): Promisable<void>;

    /**
     * The execution report object, which is updated during execution.
     */
    readonly $executionReport: WritableDeep<ExecutionReportJson>;

    /**
     * String identifier for the pipeline, used for logging and error reporting.
     */
    readonly pipelineIdentification: string;
};

/**
 * Describes one execution-loop iteration, including whether it is a joker shortcut or a regular retry.
 */
type AttemptDescriptor = {
    /**
     * Zero-based retry index, with negative values reserved for joker attempts.
     */
    readonly attemptIndex: number;

    /**
     * Indicates whether the current iteration should short-circuit through a joker parameter.
     */
    readonly isJokerAttempt: boolean;

    /**
     * Joker parameter used by the current iteration, when applicable.
     */
    readonly jokerParameterName?: string_parameter_name;
};

/**
 * Executes a pipeline task with multiple attempts, including joker and retry logic. Handles different task types
 * (prompt, script, dialog, etc.), applies postprocessing, checks expectations, and updates the execution report.
 * Throws errors if execution fails after all attempts.
 *
 * @param options - The options for execution, including task, parameters, pipeline, and configuration.
 * @returns The result string of the executed task.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function executeAttempts(options: ExecuteAttemptsOptions): Promise<TODO_string> {
    const $ongoingTaskResult = createOngoingTaskResult();
    const llmTools: LlmExecutionTools = getSingleLlmExecutionTools(options.tools.llm);

    attempts: for (
        let attemptIndex: number = -options.jokerParameterNames.length;
        attemptIndex < options.maxAttempts;
        attemptIndex++
    ) {
        const attempt = createAttemptDescriptor({
            attemptIndex,
            jokerParameterNames: options.jokerParameterNames,
            pipelineIdentification: options.pipelineIdentification,
        });

        resetAttemptExecutionState($ongoingTaskResult);

        try {
            await executeSingleAttempt({
                attempt,
                options,
                llmTools,
                $ongoingTaskResult,
            });
            break attempts;
        } catch (error) {
            if (!(error instanceof ExpectError)) {
                throw error;
            }

            handleAttemptFailure({
                error,
                attemptIndex,
                maxAttempts: options.maxAttempts,
                maxExecutionAttempts: options.maxExecutionAttempts,
                onProgress: options.onProgress,
                pipelineIdentification: options.pipelineIdentification,
                $ongoingTaskResult,
            });
        } finally {
            reportPromptExecution({
                attempt,
                task: options.task,
                $executionReport: options.$executionReport,
                logLlmCall: options.logLlmCall,
                $ongoingTaskResult,
            });
        }
    }

    return getSuccessfulResultString({
        pipelineIdentification: options.pipelineIdentification,
        $ongoingTaskResult,
    });
}

/**
 * Creates mutable attempt state for one task execution lifecycle.
 */
function createOngoingTaskResult(): $OngoingTaskResult {
    return {
        $result: null,
        $resultString: null,
        $expectError: null,
        $scriptPipelineExecutionErrors: [],
        $failedResults: [],
    };
}

/**
 * Resolves the bookkeeping for one loop iteration, including joker lookup.
 */
function createAttemptDescriptor(options: {
    attemptIndex: number;
    jokerParameterNames: ReadonlyArray<string_parameter_name>;
    pipelineIdentification: string;
}): AttemptDescriptor {
    const { attemptIndex, jokerParameterNames, pipelineIdentification } = options;
    const isJokerAttempt = attemptIndex < 0;
    const jokerParameterName = isJokerAttempt
        ? jokerParameterNames[jokerParameterNames.length + attemptIndex]
        : undefined;

    if (isJokerAttempt && !jokerParameterName) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Joker not found in attempt ${attemptIndex}

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    return {
        attemptIndex,
        isJokerAttempt,
        jokerParameterName,
    };
}

/**
 * Clears the per-attempt result slots while preserving cumulative failure history.
 */
function resetAttemptExecutionState($ongoingTaskResult: $OngoingTaskResult): void {
    $ongoingTaskResult.$result = null;
    $ongoingTaskResult.$resultString = null;
    $ongoingTaskResult.$expectError = null;
}

/**
 * Returns the successful result string or raises an unexpected internal-state error.
 */
function getSuccessfulResultString(options: {
    pipelineIdentification: string;
    $ongoingTaskResult: $OngoingTaskResult;
}): TODO_string {
    const { pipelineIdentification, $ongoingTaskResult } = options;

    if ($ongoingTaskResult.$resultString === null) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Something went wrong and prompt result is null

                    ${block(pipelineIdentification)}
                `,
            ),
        );
    }

    return $ongoingTaskResult.$resultString;
}
