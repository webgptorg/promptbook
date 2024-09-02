import type { PipelineJson } from '../_packages/types.index';
import { CreatePipelineExecutorSettings } from './CreatePipelineExecutorSettings';
import type { ExecutionTools } from './ExecutionTools';

/**
 * Options for `createPipelineExecutor`
 */
export interface CreatePipelineExecutorOptions {
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
