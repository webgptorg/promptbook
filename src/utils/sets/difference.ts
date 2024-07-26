/**
 * Create difference set of two sets.
 *
 * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 */
export function difference<TItem>(
    a: Set<TItem>,
    b: Set<TItem>,
    isEqual: (a: TItem, b: TItem) => boolean = (a, b) => a === b,
): Set<TItem> {
    const diff = new Set<TItem>();

    for (const itemA of Array.from(a)) {
        if (!Array.from(b).some((itemB) => isEqual(itemA, itemB))) {
            diff.add(itemA);
        }
    }

    return diff;
}
