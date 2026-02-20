/**
 * Shortens a string to the requested length and appends an ellipsis when needed.
 * @param value - Text that should be shortened.
 * @param maxLength - Maximum number of characters to keep (including the ellipsis).
 * @returns Text that fits within the requested length.
 * @private Internal helper for presenting text previews.
 */
export function shortenText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    const truncated = value.slice(0, Math.max(0, maxLength - 1)).trimEnd();
    return `${truncated}…`;
}
