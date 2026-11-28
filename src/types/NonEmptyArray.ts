/**
 * Represents an array that is guaranteed to have at least one element
 */
export type NonEmptyArray<TItem> = [TItem, ...TItem[]];

/**
 * Represents an array that is guaranteed to have at least one element and is readonly
 */
export type NonEmptyReadonlyArray<TItem> = ReadonlyArray<TItem> & NonEmptyArray<TItem>;
