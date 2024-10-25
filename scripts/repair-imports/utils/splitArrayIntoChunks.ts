/**
 * Split an array into subarrays of the specified length
 *
 * @param array An array that will be splitted in chunks
 * @param length Of each chunk
 */
export function splitArrayIntoChunks<TItem>(
    array: ReadonlyArray<TItem>,
    length: number,
): ReadonlyArray<ReadonlyArray<TItem>> {
    const chunks = [];
    let i = 0;
    const n = array.length;
    while (i < n) {
        chunks.push(array.slice(i, (i += length)));
    }
    return chunks;
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
