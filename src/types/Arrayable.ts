/**
 * Item or array of items
 *
 * 1) Any item except array and undefined represents array with that one item (also null)
 * 2) Undefined represents empty array
 * 3) Array represents itself
 *
 * @deprecated Use `Arrayable` from `type-fest` instead
 * @private internal type
 */
export type Arrayable<TItem> = TItem | ReadonlyArray<TItem> | undefined;
