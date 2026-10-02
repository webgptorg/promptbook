/**
 * Trims leading and trailing empty lines.
 */
export function trimEmptyEdges(lines: string[]): string[] {
    let start = 0;
    while (start < lines.length) {
        const startLine = lines[start];
        if (startLine !== undefined && startLine.trim() !== '') {
            break;
        }
        start += 1;
    }

    let end = lines.length - 1;
    while (end >= start) {
        const endLine = lines[end];
        if (endLine !== undefined && endLine.trim() !== '') {
            break;
        }
        end -= 1;
    }

    return lines.slice(start, end + 1);
}
