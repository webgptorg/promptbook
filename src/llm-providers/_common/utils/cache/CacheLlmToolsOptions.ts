import type { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import type { CacheItem } from './CacheItem';
import type { CacheValidationResult } from './CacheValidationResult';
import type { Prompt } from '../../../../types/Prompt';
import type { PromptResult } from '../../../../execution/PromptResult';

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

    /**
     * Optional validation function to determine if a result should be cached.
     * This function is called after the LLM execution but before caching the result.
     * It can be used to suppress caching when results don't meet expectations.
     *
     * @param prompt - The original prompt that was executed
     * @param result - The result returned by the LLM
     * @returns CacheValidationResult indicating whether to cache and any validation errors
     */
    validateForCaching?: (prompt: Prompt, result: PromptResult) => Promise<CacheValidationResult> | CacheValidationResult;
};
