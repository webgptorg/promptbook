import { FilesystemTools } from '../execution/FilesystemTools';
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
     * Tools for retrieving files
     */
    readonly filesystemTools: FilesystemTools | null;

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
