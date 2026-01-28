/**
 * Trims leading and trailing empty lines.
 */
export function trimEmptyEdges(lines: string[]): string[] {
    let start = 0;
    while (start < lines.length && lines[start].trim() === '') {
        start += 1;
    }
    let end = lines.length - 1;
    while (end >= start && lines[end].trim() === '') {
        end -= 1;
    }
    return lines.slice(start, end + 1);
}
