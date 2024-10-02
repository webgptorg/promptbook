import type { CsvSettings } from '../../formats/csv/CsvSettings';
import { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';

export type CreatePipelineExecutorSettings = Omit<
    PrepareAndScrapeOptions,
    'llmTools' /* <- !!!!!! Do not omit, just unite `CreatePipelineExecutorOptions` and `CreatePipelineExecutorSettings` */
> & {
    /**
     * When executor does not satisfy expectations it will be retried this amount of times
     *
     * @default MAX_EXECUTION_ATTEMPTS
     */
    readonly maxExecutionAttempts: number;

    /**
     * Settings for CSV format
     *
     * @default DEFAULT_CSV_SETTINGS
     */
    readonly csvSettings: CsvSettings;

    /**
     * If you pass fully prepared pipeline, this does not matter
     *
     * Otherwise:
     * If false or not set, warning is shown when pipeline is not prepared
     * If true, warning is suppressed
     *
     * @default false
     */
    readonly isNotPreparedWarningSupressed: boolean;
};

/**
 * TODO: [🤹‍♂️] More granular setting for limits of execution + better waiting for queue
 */
