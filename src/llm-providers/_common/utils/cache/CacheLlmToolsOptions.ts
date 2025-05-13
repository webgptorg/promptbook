import type { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import type { CacheItem } from './CacheItem';

/**
 * Options for configuring caching behavior for LlmExecutionTools.
 */
export type CacheLlmToolsOptions = {
    /**
     * The cache provider instance to use for storing and retrieving cached data.
     *
     * @default MemoryStorage
     */
    storage: PromptbookStorage<CacheItem>;

    /**
     * When set to `true`, the cache will be reloaded regardless of whether the data is already present in the cache.
     * This can be useful for debugging or when you want to ensure that the latest data is always fetched.
     * Data will ne still saved to the cache.
     *
     * @default false
     */
    isCacheReloaded?: boolean;
    // <- TODO: [🎅] Maybe unite with `intermediateFilesStrategy` and change to `cacheStrategy`

    /**
     * If true, the preparation logs additional information
     *
     * @default DEFAULT_IS_VERBOSE
     */
    readonly isVerbose?: boolean;
};
