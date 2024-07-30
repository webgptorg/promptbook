import { makePromptbookStorageFromWebStorage } from '../utils/makePromptbookStorageFromWebStorage';

/**
 * @@@
 */
export const LocalStorage = makePromptbookStorageFromWebStorage(localStorage);

/**
 * Export through `@promptbook/browser`
 */
