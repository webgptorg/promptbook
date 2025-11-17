import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import type { really_any } from '../../utils/organization/really_any';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import { makePromptbookStorageFromWebStorage } from './utils/makePromptbookStorageFromWebStorage';

/**
 * Cache storage
 *
 * @private internal cache for `getLocalStorage`
 */
let promptbookLocalStorage: null | PromptbookStorage<really_any> = null;

/**
 * Gets wrapper around `localStorage` object which can be used as `PromptbookStorage`
 *
 * @public exported from `@promptbook/browser`
 */
export function getLocalStorage<TItem>(): PromptbookStorage<TItem> {
    if (!$isRunningInBrowser()) {
        throw new EnvironmentMismatchError(`You can get localStorage works only in browser environment`);
    }

    if (promptbookLocalStorage) {
        return promptbookLocalStorage;
    }

    promptbookLocalStorage = makePromptbookStorageFromWebStorage<TItem>(localStorage);

    return promptbookLocalStorage;
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */
