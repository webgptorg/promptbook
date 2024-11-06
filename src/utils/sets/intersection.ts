/**
 * Creates a new set with all elements that are present in all sets
 *
 * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 * @public exported from `@promptbook/utils`
 */
export function intersection<TItem>(...sets: ReadonlyArray<Set<TItem>>): Set<TItem> {
    const intersection = new Set<TItem>();

    if (sets[0]) {
        for (const item of Array.from(sets[0])) {
            let isPresentInAllSets = true;
            for (let i = 1; i < sets.length; i++) {
                if (sets[i] !== undefined && !sets[i]!.has(item)) {
                    isPresentInAllSets = false;
                    break;
                }
            }
            if (isPresentInAllSets) {
                intersection.add(item);
            }
        }
    }

    return intersection;
}
