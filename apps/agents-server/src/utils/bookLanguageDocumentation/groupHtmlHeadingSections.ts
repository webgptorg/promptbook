/**
 * Matches one heading element of the rendered manual.
 *
 * Headings always start a block in the rendered markdown, and code blocks keep
 * their content HTML-escaped, so a raw heading tag can never appear inside one.
 *
 * @private internal constant of `groupHtmlHeadingSections`
 */
const HTML_HEADING_REGEX = /<h([1-6])\b[^>]*>[\s\S]*?<\/h\1>/g;

/**
 * Class names applied to grouped sections, indexed by heading level.
 *
 * Grouping the flat markdown output into nested sections is what makes page
 * breaking controllable - CSS can then keep a heading together with the content
 * that belongs to it instead of breaking wherever a page happens to end.
 */
export const HTML_HEADING_SECTION_CLASS_NAMES: Readonly<Record<number, string>> = {
    1: 'manual-part',
    2: 'manual-chapter',
    3: 'manual-section',
    4: 'manual-subsection',
    5: 'manual-subsection',
    6: 'manual-subsection',
};

/**
 * Wraps every heading and the content below it into one nested `<section>`.
 *
 * @param html - Flat HTML produced from the manual markdown.
 * @returns HTML where each heading owns a section element.
 */
export function groupHtmlHeadingSections(html: string): string {
    HTML_HEADING_REGEX.lastIndex = 0;

    const openSectionLevels: Array<number> = [];
    let groupedHtml = '';
    let contentStartIndex = 0;
    let headingMatch: RegExpExecArray | null;

    while ((headingMatch = HTML_HEADING_REGEX.exec(html)) !== null) {
        const headingLevel = Number(headingMatch[1]);

        groupedHtml += html.slice(contentStartIndex, headingMatch.index);
        groupedHtml += closeSectionsFromLevel(openSectionLevels, headingLevel);
        groupedHtml += `<section class="${HTML_HEADING_SECTION_CLASS_NAMES[headingLevel]}">`;
        groupedHtml += headingMatch[0];

        openSectionLevels.push(headingLevel);
        contentStartIndex = headingMatch.index + headingMatch[0].length;
    }

    groupedHtml += html.slice(contentStartIndex);
    groupedHtml += closeSectionsFromLevel(openSectionLevels, 1);

    return groupedHtml;
}

/**
 * Closes every open section that cannot contain the upcoming heading.
 *
 * @param openSectionLevels - Heading levels of the currently open sections, mutated in place.
 * @param headingLevel - Heading level that is about to be opened.
 * @returns Closing tags for the sections that had to end.
 *
 * @private internal utility of `groupHtmlHeadingSections`
 */
function closeSectionsFromLevel(openSectionLevels: Array<number>, headingLevel: number): string {
    let closingTags = '';

    while (openSectionLevels.length > 0 && openSectionLevels[openSectionLevels.length - 1]! >= headingLevel) {
        openSectionLevels.pop();
        closingTags += '</section>';
    }

    return closingTags;
}
