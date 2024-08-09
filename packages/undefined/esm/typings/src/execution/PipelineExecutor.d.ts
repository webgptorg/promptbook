import type { Promisable } from 'type-fest';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import type { TaskProgress } from '../types/TaskProgress';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import type { Parameters } from '../types/typeAliases';
import type { PromptResultUsage } from './PromptResultUsage';
/**
 * Executor is a simple async function that takes INPUT  PARAMETERs and returns result parameters _(along with all intermediate parameters and INPUT  PARAMETERs = it extends input object)_.
 * Executor is made by combining execution tools and pipeline collection.
 *
 * It can be created with `createPipelineExecutor` function.
 *
 * @@@ almost-JSON (what about errors)
 *
 * @see https://github.com/webgptorg/promptbook#executor
 */
export type PipelineExecutor = {
    (inputParameters: Parameters, onProgress?: (taskProgress: TaskProgress) => Promisable<void>): Promise<PipelineExecutorResult>;
};
/**
 * @@@
 *
 * @@@ almost-JSON (what about errors)
 */
export type PipelineExecutorResult = {
    /**
     * Result parameters of the execution
     *
     * Note: If the execution was not successful, there are only some of the result parameters
     */
    readonly outputParameters: Parameters;
    /**
     * Whether the execution was successful, details are aviable in `executionReport`
     */
    readonly isSuccessful: boolean;
    /**
     * Added usage of whole execution, detailed usage is aviable in `executionReport`
     */
    readonly usage: PromptResultUsage;
    /**
     * Errors that occured during the execution, details are aviable in `executionReport`
     */
    readonly errors: Array<PipelineExecutionError | Error>;
    /**
     * Warnings that occured during the execution, details are aviable in `executionReport`
     */
    readonly warnings: Array<PipelineExecutionError | Error>;
    /**
     * The report of the execution with all details
     */
    readonly executionReport: ExecutionReportJson;
    /**
     * The prepared pipeline that was used for the execution
     *
     * Note: If you called `createPipelineExecutor` with fully prepared pipeline, this is the same object as this pipeline
     *       If you passed not fully prepared pipeline, this is same pipeline but fully prepared
     */
    readonly preparedPipeline: PipelineJson;
};
/**
 * TODO: [🧠] Should this file be in /execution or /types folder?
 * TODO: [💷] `assertsExecutionSuccessful` should be the method of `PipelineExecutor` result - BUT maybe NOT?
 */
