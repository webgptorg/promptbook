/**
 * Inserts Book-language sections before the final learning-mode marker.
 *
 * `OPEN` and `CLOSED` apply to the whole agent and should remain the final
 * commitment. Keeping this operation shared prevents the section chips and
 * the knowledge-source integration from creating different source layouts.
 *
 * @param source - Current Book source.
 * @param sections - Book-language sections to insert.
 * @returns Source with the sections inserted before `OPEN` or `CLOSED`.
 */
export function insertBookContentBeforeLearningMarker(source: string, sections: readonly string[]): string {
    const normalizedSections = sections.map((section) => section.trim()).filter((section) => section !== '');

    if (normalizedSections.length === 0) {
        return source;
    }

    const normalizedSource = source.replace(/\r\n/g, '\n').trimEnd();
    const lines = normalizedSource.split('\n');
    const markerIndex = findLearningMarkerIndex(lines);
    const sectionSource = normalizedSections.join('\n\n');

    if (markerIndex === -1) {
        return [normalizedSource, sectionSource].filter((content) => content !== '').join('\n\n');
    }

    const sourceBeforeMarker = lines.slice(0, markerIndex).join('\n').trimEnd();
    const sourceFromMarker = lines.slice(markerIndex).join('\n').trim();

    return [sourceBeforeMarker, sectionSource, sourceFromMarker]
        .filter((content) => content !== '')
        .join('\n\n');
}

/**
 * Finds the last standalone `OPEN` or `CLOSED` line in a Book source.
 *
 * @param lines - Normalized Book source lines.
 * @returns Index of the learning-mode marker, or `-1` when absent.
 *
 * @private internal utility of manGo Book source editing
 */
function findLearningMarkerIndex(lines: readonly string[]): number {
    for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
        const line = lines[lineIndex];

        if (line && (line.trim().toUpperCase() === 'OPEN' || line.trim().toUpperCase() === 'CLOSED')) {
            return lineIndex;
        }
    }

    return -1;
}
