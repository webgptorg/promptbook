import { isRunningInBrowser } from 'openai/core';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { PromptbookStorage } from '../_common/PromptbookStorage';
import { makePromptbookStorageFromWebStorage } from '../utils/makePromptbookStorageFromWebStorage';

/**
 * Gets wrapper around `sessionStorage` object which can be used as `PromptbookStorage`
 */
export function getSessionStorage<TItem>(): PromptbookStorage<TItem> {
    if (!isRunningInBrowser()) {
        throw new EnvironmentMismatchError(`You can get sessionStorage works only in browser environment`);
    }

    return makePromptbookStorageFromWebStorage<PromptbookStorage<TItem>>(sessionStorage);
}

/**
 * Export through `@promptbook/browser`
 */
