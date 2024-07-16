import type { Arrayable } from '../types/Arrayable';

/**
 * Takes an item or an array of items and returns an array of items
 *
 * @private Internal utility
 */
export function arrayableToArray<TItem>(input?: Arrayable<TItem>): Array<TItem> {
    if (input === undefined) {
        return [];
    }

    if (input instanceof Array) {
        return input;
    }

    return [input];
}
