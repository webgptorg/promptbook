/**
 * Creates a new set with all elements that are present in either set
 *
 * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 * @public exported from `@promptbook/utils`
 */
export function union<TItem>(...sets: ReadonlyArray<Set<TItem>>): Set<TItem> {
    const union = new Set<TItem>();

    for (const set of sets) {
        for (const item of Array.from(set)) {
            union.add(item);
        }
    }

    return union;
}
