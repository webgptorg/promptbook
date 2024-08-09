import type { PromptbookStorage } from '../_common/PromptbookStorage';
/**
 * Gets wrapper around `localStorage` object which can be used as `PromptbookStorage`
 *
 * @public exported from `@promptbook/browser`
 */
export declare function getLocalStorage<TItem>(): PromptbookStorage<TItem>;
/**
 * Note: [🔵] This code should never be published outside of `@promptbook/browser`
 */
