import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { ExecutionTools } from './ExecutionTools';
import type { PipelineExecutor } from './PipelineExecutor';
type CreatePipelineExecutorSettings = {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default MAX_EXECUTION_ATTEMPTS
     */
    readonly maxExecutionAttempts?: number;
    /**
     * Maximum number of tasks running in parallel
     *
     * @default MAX_PARALLEL_COUNT
     */
    readonly maxParallelCount?: number;
    /**
     * If true, the preparation logs additional information
     *
     * @default false
     */
    readonly isVerbose?: boolean;
    /**
     * If you pass fully prepared pipeline, this does not matter
     *
     * Otherwise:
     * If false or not set, warning is shown when pipeline is not prepared
     * If true, warning is suppressed
     *
     * @default false
     */
    readonly isNotPreparedWarningSupressed?: boolean;
};
/**
 * Options for `createPipelineExecutor`
 */
interface CreatePipelineExecutorOptions {
    /**
     * The pipeline to be executed
     */
    readonly pipeline: PipelineJson;
    /**
     * The execution tools to be used during the execution of the pipeline
     */
    readonly tools: ExecutionTools;
    /**
     * Optional settings for the pipeline executor
     */
    readonly settings?: Partial<CreatePipelineExecutorSettings>;
}
/**
 * Creates executor function from pipeline and execution tools.
 *
 * @returns The executor function
 * @throws {PipelineLogicError} on logical error in the pipeline
 * @public exported from `@promptbook/core`
 */
export declare function createPipelineExecutor(options: CreatePipelineExecutorOptions): PipelineExecutor;
export {};
/**
 * TODO: Use isVerbose here (not only pass to `preparePipeline`)
 * TODO: [🧠][🌳] Use here `countTotalUsage` and put preparation and prepared pipiline to report
 * TODO: [🪂] Use maxParallelCount here (not only pass to `preparePipeline`)
 * TODO: [♈] Probbably move expectations from templates to parameters
 * TODO: [🧠] When not meet expectations in PROMPT_DIALOG, make some way to tell the user
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 * Note: CreatePipelineExecutorOptions are just connected to PipelineExecutor so do not extract to types folder
 * TODO: [🧠][3] transparent = (report intermediate parameters) / opaque execution = (report only output parameters) progress reporting mode
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][💷] `assertsExecutionSuccessful` should be the method of `PipelineExecutor` result BUT maybe NOT to preserve pure JSON object
 */
