import type { Arrayable } from '../../types/Arrayable';

/**
 * Takes an item or an array of items and returns an array of items
 *
 * 1) Any item except array and undefined returns array with that one item (also null)
 * 2) Undefined returns empty array
 * 3) Array returns itself
 *
 * @private internal utility
 */
export function arrayableToArray<TItem>(input?: Arrayable<TItem>): ReadonlyArray<TItem> {
    if (input === undefined) {
        return [];
    }

    if (input instanceof Array) {
        return input;
    }

    return [input];
}
