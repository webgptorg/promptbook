import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { string_dirname } from '../types/typeAliases';

/**
 * Options for preparation of the pipeline
 */
export type PrepareAndScrapeOptions = {
    /**
     * LLM tools
     */
    readonly llmTools?: LlmExecutionTools;

    /**
     * Path to the root folder of the pipeline
     *
     * Note: When the pipeline is not created from files, it is `null`
     * Note: This folder must exist
     */
    readonly rootDirname: string_dirname | null;

    /**
     * Path to the cache folder
     *
     * Note: When the folder does not exist, it is created recursively
     *
     * @default SCRAPE_CACHE_DIRNAME
     */
    readonly cacheDirname?: string_dirname;

    /**
     * If true, the cache is cleaned after the scraping
     *
     *
     * @default false // <- TODO: !!!!!! Change to `cacheStrategy`/`intermediateFiles`, Put to global config, change to `true` and explicitly set to `false` in all playgrounds
     */
    readonly isCacheCleaned?: boolean; // <-  `cacheStrategy`/`intermediateFiles`: 'HIDE_AND_CLEAN' | 'HIDE_AND_KEEP' | 'VISIBLE' (default)

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
         *
         * @example 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe'
         */
        readonly pandocPath?: string;

        /**
         * Path to the LibreOffice executable
         *
         * @example 'C:/Program Files/LibreOffice/program/swriter.exe'
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
