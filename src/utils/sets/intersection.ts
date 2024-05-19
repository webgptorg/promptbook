/**
 * Creates a new set with all elements that are present in all sets
 */
export function intersection<TItem>(...sets: Array<Set<TItem>>): Set<TItem> {
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
