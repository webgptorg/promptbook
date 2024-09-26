import { FilesystemTools } from '../execution/FilesystemTools';
import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import { string_folder_path } from '../types/typeAliases';

/**
 * Options for preparation of the pipeline
 */
export type PrepareAndScrapeOptions = {
    /**
     * LLM tools
     */
    readonly llmTools: LlmExecutionTools;

    /**
     * Tools for retrieving files
     *
     * Note: This is not used in cache *([🦧] But maybe change this and do all operations (including cache) through filesystemTools)
     */
    readonly filesystemTools: FilesystemTools | null;

    /**
     * Path to the cache folder
     *
     * Note: When the folder does not exist, it is created recursively
     *
     * @default SCRAPE_CACHE_DIRNAME
     */
    readonly cacheDirname?: string_folder_path;

    /**
     * If true, the cache is cleaned after the scraping
     *
     * @default false
     */
    readonly isCacheCleaned?: boolean;

    /**
     * Maximum number of tasks running in parallel
     *
     * @default MAX_PARALLEL_COUNT
     */
    readonly maxParallelCount?: number;

    /**
     * Path to the external programs executables
     */
    readonly externalProgramsPaths?: {
        /**
         * Path to the `pandoc` executable
         */
        readonly pandocPath?: string;

        /**
         * Path to the LibreOffice executable
         */
        readonly libreOfficePath?: string;
    };

    /**
     * If true, the preparation logs additional information
     *
     * @default false
     */
    readonly isVerbose?: boolean;
};

/**
 * TODO: [🧠] Maybe split `PrepareAndScrapeOptions` and `ScrapeOptions` (`ScrapeOptions` should be extended from `PrepareAndScrapeOptions`)
 */
