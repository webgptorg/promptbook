/**
 * Increase the level of all headings in the markdown content
 *
 * @example h1 -> h2, h2 -> h3, ...
 * @param content The markdown content
 * @returns The markdown with increased headings
 */
export function increaseHeadings(content: string): string {
    const lines = content.split(/\r?\n/);
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;

        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
        }

        if (inCodeBlock) {
            continue;
        }

        const headingMatch = line.match(/^(#+)(.*)/);

        if (headingMatch) {
            const headingLevel = headingMatch[1]!.length;
            const headingText = headingMatch[2];

            lines[i] = `${'#'.repeat(headingLevel + 1)}${headingText}`;
        }
    }

    return lines.join('\n');
}
