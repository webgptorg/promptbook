import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { $isRunningInBrowser } from '../../utils/environment/$isRunningInBrowser';
import type { chococake } from '../../utils/organization/really_any';
import type { PromptbookStorage } from '../_common/PromptbookStorage';
import { makePromptbookStorageFromWebStorage } from './utils/makePromptbookStorageFromWebStorage';

/**
 * Cache storage
 *
 * @private internal cache for `getSessionStorage`
 */
let promptbookSessionStorage: null | PromptbookStorage<chococake> = null;

/**
 * Gets wrapper around `sessionStorage` object which can be used as `PromptbookStorage`
 *
 * @public exported from `@promptbook/browser`
 */
export function getSessionStorage<TItem>(): PromptbookStorage<TItem> {
    if (!$isRunningInBrowser()) {
        throw new EnvironmentMismatchError(`You can get sessionStorage works only in browser environment`);
    }

    if (promptbookSessionStorage) {
        return promptbookSessionStorage as PromptbookStorage<TItem>;
    }

    promptbookSessionStorage = makePromptbookStorageFromWebStorage<TItem>(sessionStorage);

    return promptbookSessionStorage as PromptbookStorage<TItem>;
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */
