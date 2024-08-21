import type { ExecutionReportJson, Parameters, PipelineJson } from '../_packages/types.index'; // <- TODO: !!!!!! Will be this automatically repared to type import
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import type { PromptResultUsage } from './PromptResultUsage';

/**
 * @@@
 *
 * Note: [🚉] This is fully serializable as JSON
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
    readonly errors: Array<PipelineExecutionError | Error>; // <- !!!!!!

    /**
     * Warnings that occured during the execution, details are aviable in `executionReport`
     */
    readonly warnings: Array<PipelineExecutionError | Error>; // <- !!!!!!

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
 */
