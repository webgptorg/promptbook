import type { PromptbookStorage } from '../_common/PromptbookStorage';
/**
 * Gets wrapper around `sessionStorage` object which can be used as `PromptbookStorage`
 *
 * @public exported from `@promptbook/browser`
 */
export declare function getSessionStorage<TItem>(): PromptbookStorage<TItem>;
/**
 * Note: [🔵] This code should never be published outside of `@promptbook/browser`
 */
