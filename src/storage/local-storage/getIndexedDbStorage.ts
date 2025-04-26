import { isRunningInBrowser } from 'openai/core';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import { makePromptbookStorageFromIndexedDb } from './utils/makePromptbookStorageFromIndexedDb';

/**
 * Gets wrapper around IndexedDB which can be used as PromptbookStorage
 *
 * @public exported from `@promptbook/browser`
 */
export function getIndexedDbStorage<TItem>(): PromptbookStorage<TItem> {
    if (!isRunningInBrowser()) {
        throw new EnvironmentMismatchError(`You can get IndexedDB storage only in browser environment`);
    }
    return makePromptbookStorageFromIndexedDb<TItem>();
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */
