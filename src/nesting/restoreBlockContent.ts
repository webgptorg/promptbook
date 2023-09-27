import { spaceTrimSimple } from '../spaceTrimSimple';
import { NEWLINE, SPACE } from './block-constants';

/**
 * Unescapes block content to protect newline and space characters
 */
export function restoreBlockContent(content: string): string {
    let horizontalyTrimmedLines = spaceTrimSimple(content).split('\n');

    horizontalyTrimmedLines = horizontalyTrimmedLines.map((line) => {
        const sublines = line.split(NEWLINE);
        const firstSubine = sublines[0];
        const contentStart =
            firstSubine.length - firstSubine.trimStart().length;
        const indentation = ' '.repeat(contentStart);
        return sublines
            .map(
                (subline) =>
                    `${indentation}${subline
                        .trimStart()
                        .split(SPACE)
                        .join(' ')}`,
            )
            .join('\n');
    });

    return horizontalyTrimmedLines.join('\n');
}
