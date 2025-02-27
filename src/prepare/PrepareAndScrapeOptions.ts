import type { IntermediateFilesStrategy } from "../types/IntermediateFilesStrategy";
import type { string_dirname } from "../types/typeAliases";

/**
 * Options for preparation of the pipeline
 */
export type PrepareAndScrapeOptions = {
	/**
	 * Path to the root folder of the pipeline
	 *
	 * Note: When the pipeline is not created from files, it is `null`
	 * Note: This folder must exist (=it is not created recursively)
	 *
	 * @default null or `process.cwd()` when created via `$provide...` function in node
	 */
	readonly rootDirname?: string_dirname | null;

	/**
	 * Path to the cache folder
	 *
	 * Note: When the folder does not exist, it is created recursively
	 *
	 * @default DEFAULT_SCRAPE_CACHE_DIRNAME
	 */
	readonly cacheDirname?: string_dirname;

	/**
	 * Strategy for caching the intermediate results for knowledge source
	 *
	 * @default DEFAULT_INTERMEDIATE_FILES_STRATEGY
	 */
	readonly intermediateFilesStrategy?: IntermediateFilesStrategy;

	/**
	 * Maximum number of tasks running in parallel
	 *
	 * @default DEFAULT_MAX_PARALLEL_COUNT
	 */
	readonly maxParallelCount?: number;

	/**
	 * If true, the missing software is automatically installed
	 *
	 * @default DEFAULT_IS_AUTO_INSTALLED
	 */
	readonly isAutoInstalled?: boolean;

	/**
	 * If true, the preparation logs additional information
	 *
	 * @default DEFAULT_IS_VERBOSE
	 */
	readonly isVerbose?: boolean;
};

/**
 * TODO: [🧠] Maybe split `PrepareAndScrapeOptions` and `ScrapeOptions` (`ScrapeOptions` should be extended from `PrepareAndScrapeOptions`)
 */
