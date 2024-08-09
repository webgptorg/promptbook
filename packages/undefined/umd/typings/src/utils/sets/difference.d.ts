/**
 * Create difference set of two sets.
 *
 * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 * @public exported from `@promptbook/utils`
 */
export declare function difference<TItem>(a: Set<TItem>, b: Set<TItem>, isEqual?: (a: TItem, b: TItem) => boolean): Set<TItem>;
/**
 * TODO: [🧠][💯] Maybe also implement symmetricDifference
 */
