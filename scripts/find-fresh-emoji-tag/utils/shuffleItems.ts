/**
 * Shuffle items from the recieved array
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Note: This function does not mutate the original array
 * Warning: This function is not cryptographically secure (it uses Math.random internally)
 */
export function $shuffleItems<TItem>(...items: Array<TItem>): Array<TItem> {
    const newItems = [...items];
    newItems.sort(() => Math.random() - 0.5);
    return newItems;
}

/**
 * TODO: [🧠][👵] Figure out something between rotateItems and shuffleItems which is more generic and recieves a ruleset how to reordeto the array in some general way
 */
