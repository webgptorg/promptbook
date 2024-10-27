import { CsvSettings } from '../../_packages/types.index';
import { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { ExecutionTools } from '../ExecutionTools';

/**
 * Options for `createPipelineExecutor`
 */
export type CreatePipelineExecutorOptions = PrepareAndScrapeOptions & {
    /**
     * The pipeline to be executed
     */
    readonly pipeline: PipelineJson;

    /**
     * The execution tools to be used during the execution of the pipeline
     */
    readonly tools: ExecutionTools;

    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default MAX_EXECUTION_ATTEMPTS
     */
    readonly maxExecutionAttempts?: number;
    // <- TODO: [💿] Maybe move to `PrepareAndScrapeOptions` + also use in preparation

    /**
     * Settings for CSV format
     *
     * @default DEFAULT_CSV_SETTINGS
     */
    readonly csvSettings?: CsvSettings;
    // <- TODO: [💿] Maybe move to `PrepareAndScrapeOptions` + also use in preparation
    // <- TODO: [🧎] Move to better place or make more univeral

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
 * TODO: [🧎][🧠] Move `csvSettings` to some better place
 *       1) either to some dependency in `ExecutionTools`
 *       2) or make here container for multiple formats
 *       3) or make the setting more universal and which just sets things like `delimiter` and `quote` without specifying the format
 * TODO: [🤹‍♂️] More granular setting for limits of execution + better waiting for queue
 */
