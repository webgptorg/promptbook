import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
/**
 * Options for preparation of the pipeline
 */
export type PrepareOptions = {
    /**
     * LLM tools
     */
    readonly llmTools: LlmExecutionTools;
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
};
