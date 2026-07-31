/**
 * Converts a heading label into a stable markdown anchor id.
 *
 * Anchors are generated from language-neutral identifiers, so deep links into
 * the manual keep working in every translation.
 *
 * @param value - Raw heading/identifier text.
 * @returns Stable lowercase anchor id.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export function toStableAnchorId(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
