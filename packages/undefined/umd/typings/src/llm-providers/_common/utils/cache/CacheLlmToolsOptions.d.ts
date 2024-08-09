import type { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import type { CacheItem } from './CacheItem';
export type CacheLlmToolsOptions = {
    /**
     * @@@
     *
     * @default MemoryStorage
     */
    storage: PromptbookStorage<CacheItem>;
    /**
     * @@@
     *
     * @default false
     */
    isReloaded?: boolean;
};
