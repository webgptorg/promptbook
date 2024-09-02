export type CreatePipelineExecutorSettings = {
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
