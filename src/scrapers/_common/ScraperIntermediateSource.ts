import type { IDestroyable } from 'destroyable';
import type { string_absolute_filename } from '../../types/typeAliases';

/**
 * Interface representing an intermediate storage location for scraper results.
 * Provides functionality for caching and managing temporary data during scraping operations.
 */
export type ScraperIntermediateSource = IDestroyable & {
    /**
     * The absolute path to the file where intermediate data is stored.
     * This file serves as a cache for scraped content to avoid redundant processing.
     */
    readonly filename: string_absolute_filename;
};

/**
 * Note: [🌏] Converters can be used only in node because they uses `ScraperIntermediateSource` which  uses file system
 */
