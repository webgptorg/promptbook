/**
 * Pick random item from the received array
 *
 * @private internal helper function
 */
export function $randomItem<TItem>(...items: Array<TItem>): TItem {
    if (items.length === 0) {
        throw new Error(`Not enough items`);
    }
    return items[Math.floor(Math.random(/* <- TODO: [🐉] Probably use seed random */) * items.length)]!;
}


/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */