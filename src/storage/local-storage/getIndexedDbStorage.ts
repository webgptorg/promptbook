import { isRunningInBrowser } from 'openai/core';
import { really_any } from '../../_packages/types.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import { IndexedDbStorageOptions } from './utils/IndexedDbStorageOptions';
import { makePromptbookStorageFromIndexedDb } from './utils/makePromptbookStorageFromIndexedDb';

/**
 * Cache storage
 *
 * @private internal cache for `getIndexedDbStorage`
 */
const indexedDbStorageCache = new Map<string, PromptbookStorage<really_any>>();

/**
 * Gets wrapper around IndexedDB which can be used as PromptbookStorage
 *
 * @public exported from `@promptbook/browser`
 */
export function getIndexedDbStorage<TItem>(options: IndexedDbStorageOptions): PromptbookStorage<TItem> {
    if (!isRunningInBrowser()) {
        throw new EnvironmentMismatchError(`You can get IndexedDB storage only in browser environment`);
    }

    const { databaseName, storeName } = options;
    const cacheKey = `${databaseName}/${storeName}`;
    if (indexedDbStorageCache.has(cacheKey)) {
        return indexedDbStorageCache.get(cacheKey) as PromptbookStorage<TItem>;
    }

    const storage = makePromptbookStorageFromIndexedDb<TItem>({ databaseName, storeName });
    indexedDbStorageCache.set(cacheKey, storage as PromptbookStorage<TItem>);
    return storage;
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */
