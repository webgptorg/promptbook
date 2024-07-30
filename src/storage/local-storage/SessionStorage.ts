import { makePromptbookStorageFromWebStorage } from '../utils/makePromptbookStorageFromWebStorage';

/**
 * @@@
 */
export const SessionStorage = makePromptbookStorageFromWebStorage(sessionStorage);

/**
 * Export through `@promptbook/browser`
 */
