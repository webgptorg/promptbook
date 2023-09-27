import { verticalTrim } from './verticalTrim';

/**
 * Trimming string from all 4 sides
 */
export function spaceTrimSimple(content: string): string {
    // ✂️ Trimming from top and bottom
    content = verticalTrim(content);

    // ✂️ Trimming from left and right

    const lines = content.split('\n');

    const lineStats = lines
        .filter((line) => line.trim() !== '')
        .map((line) => {
            const contentStart = line.length - line.trimStart().length;
            const contentEnd = contentStart + line.trim().length;

            return { contentStart, contentEnd };
        });

    if (lineStats.length === 0) {
        return '';
    }

    const { minContentStart, maxContentEnd } = lineStats.reduce(
        // tslint:disable-next-line: no-shadowed-variable
        ({ minContentStart, maxContentEnd }, { contentStart, contentEnd }) => ({
            minContentStart: Math.min(minContentStart, contentStart),
            maxContentEnd: Math.max(maxContentEnd, contentEnd),
        }),
        {
            minContentStart: lineStats[0].contentStart,
            maxContentEnd: lineStats[0].contentEnd,
        },
    );

    const horizontalyTrimmedLines = lines.map((line) =>
        line.substring(minContentStart, maxContentEnd),
    );

    return horizontalyTrimmedLines.join('\n');
}
