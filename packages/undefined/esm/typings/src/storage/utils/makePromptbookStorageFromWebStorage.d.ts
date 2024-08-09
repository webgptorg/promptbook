import type { PromptbookStorage } from '../_common/PromptbookStorage';
/**
 * @@@
 *
 * @private for `getLocalStorage` and `getSessionStorage`
 */
export declare function makePromptbookStorageFromWebStorage<TValue>(webStorage: Storage): PromptbookStorage<TValue>;
/**
 * TODO: [🧠] Should this be named `makePromptbookStorageFromWebStorage` vs `createPromptbookStorageFromWebStorage`
 * TODO: [🌗] Maybe some checkers, not all valid JSONs are desired and valid values
 */
