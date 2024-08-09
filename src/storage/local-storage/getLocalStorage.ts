import { isRunningInBrowser } from 'openai/core';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import { makePromptbookStorageFromWebStorage } from '../utils/makePromptbookStorageFromWebStorage';

/**
 * Gets wrapper around `localStorage` object which can be used as `PromptbookStorage`
 * 
 * @public exported from `@promptbook/browser`
 */
export function getLocalStorage<TItem>(): PromptbookStorage<TItem> {
    if (!isRunningInBrowser()) {
        throw new EnvironmentMismatchError(`You can get localStorage works only in browser environment`);
    }

    return makePromptbookStorageFromWebStorage<TItem>(localStorage);
}

/**
 * Note: [🔵] This code should never be published outside of `@promptbook/browser`
 */
