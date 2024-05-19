/**
 * Creates a new set with all elements that are present in either set
 */
export function union<TItem>(...sets: Array<Set<TItem>>): Set<TItem> {
    const union = new Set<TItem>();

    for (const set of sets) {
        for (const item of Array.from(set)) {
            union.add(item);
        }
    }

    return union;
}
