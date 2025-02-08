import { ReadonlyDeep } from 'type-fest';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { Parameters } from '../types/typeAliases';
import type { AbstractTaskResult } from './AbstractTaskResult';
import type { ExecutionReportJson } from './execution-report/ExecutionReportJson';
import type { PromptResultUsage } from './PromptResultUsage';

/**
 * @@@
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type PipelineExecutorResult = AbstractTaskResult & {
    /**
     * Result parameters of the execution
     *
     * Note: If the execution was not successful, there are only some of the result parameters
     */
    readonly outputParameters: Readonly<Parameters>;

    /**
     * Added usage of whole execution, detailed usage is aviable in `executionReport`
     */
    readonly usage: ReadonlyDeep<PromptResultUsage>;

    /**
     * The report of the execution with all details
     */
    readonly executionReport: ReadonlyDeep<ExecutionReportJson>;

    /**
     * The prepared pipeline that was used for the execution
     *
     * Note: If you called `createPipelineExecutor` with fully prepared pipeline, this is the same object as this pipeline
     *       If you passed not fully prepared pipeline, this is same pipeline but fully prepared
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;
};

/**
 * TODO: [🧠] Should this file be in /execution or /types folder?
 */
