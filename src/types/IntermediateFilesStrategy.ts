/**
 * Defines strategies for handling intermediate files during pipeline execution.
 * Controls how temporary or intermediate files are managed throughout processing.
 */
export type IntermediateFilesStrategy = 'HIDE_AND_CLEAN' | 'HIDE_AND_KEEP' /* | 'VISIBLE' <- TODO: [😡] Add */;

/**
 * TODO: [🎅] Maube add options for all kinds of cache, unite with `isCacheReloaded` and make `cacheStrategy` (which is not specific only for intermediate files)
 */
