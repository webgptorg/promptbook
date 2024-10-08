import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { ExecutionTools } from '../ExecutionTools';
import type { CreatePipelineExecutorSettings } from './00-CreatePipelineExecutorSettings';

/**
 * Options for `createPipelineExecutor`
 */
export type CreatePipelineExecutorOptions = {
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
};


/**
 * TODO: !!!!!! Unite `CreatePipelineExecutorOptions` and `CreatePipelineExecutorSettings` OR describe the difference
 */