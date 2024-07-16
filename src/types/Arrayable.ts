/**
 * Item or array of items
 *
 * 1) Any item except array and undefined represents array with that one item (also null)
 * 2) Undefined represents empty array
 * 3) Array represents itself
 *
 * @private Internal utility type
 */
export type Arrayable<TItem> = TItem | Array<TItem> | undefined;
