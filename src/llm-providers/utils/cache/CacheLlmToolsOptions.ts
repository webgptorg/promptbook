import type { PromptbookStorage } from '../../../storage/_common/PrompbookStorage';
import type { CacheItem } from './CacheItem';

export type CacheLlmToolsOptions = {
    /**
     * Total cost of the execution
     *
     * @default MemoryStorage
     */
    storage: PromptbookStorage<CacheItem>;
};
