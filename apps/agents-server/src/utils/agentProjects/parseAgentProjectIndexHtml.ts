/**
 * `rel` values of one `<link/>` tag recognized as the icon of a page, ordered by priority.
 *
 * The values are compared against the `rel` attribute normalized to lowercase single-spaced tokens.
 */
const FAVICON_LINK_RELATIONS = [
    'icon',
    'shortcut icon',
    'icon shortcut',
    'apple-touch-icon',
    'apple-touch-icon-precomposed',
    'mask-icon',
] as const;

/**
 * Matches the content of the `<title/>` element of one HTML document.
 */
const HTML_TITLE_ELEMENT_REGEX = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i;

/**
 * Matches every `<link/>` tag of one HTML document.
 */
const HTML_LINK_TAG_REGEX = /<link\b[^>]*>/gi;

/**
 * Matches one named or numeric HTML entity.
 */
const HTML_ENTITY_REGEX = /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi;

/**
 * Replacements of the named HTML entities which can appear in a title or in an icon path.
 */
const HTML_ENTITY_REPLACEMENTS: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
};

/**
 * Highest code point which can be decoded from a numeric HTML entity.
 */
const MAXIMUM_UNICODE_CODE_POINT = 0x10ffff;

/**
 * Presentation of one project resolved from its `index.html`.
 */
export type AgentProjectIndexHtmlProfile = {
    /**
     * Content of the `<title/>` element, or `null` when the document has no usable title.
     */
    readonly title: string | null;

    /**
     * Icon `href` exactly as written in the document, or `null` when no icon is linked.
     */
    readonly faviconHref: string | null;
};

/**
 * Parses the presentation of one project out of its `index.html`.
 *
 * Only the title and the linked icon are read, so the document is scanned with plain regular
 * expressions instead of pulling a full HTML parser into the Agents Server.
 *
 * @param indexHtmlContent - Content of the project `index.html`.
 * @returns Title and icon href found in the document.
 */
export function parseAgentProjectIndexHtml(indexHtmlContent: string): AgentProjectIndexHtmlProfile {
    return {
        title: parseIndexHtmlTitle(indexHtmlContent),
        faviconHref: parseIndexHtmlFaviconHref(indexHtmlContent),
    };
}

/**
 * Parses the `<title/>` of one HTML document.
 *
 * @param indexHtmlContent - Content of the project `index.html`.
 * @returns Single-line title, or `null` when the document has no non-empty title.
 */
function parseIndexHtmlTitle(indexHtmlContent: string): string | null {
    const titleMatch = HTML_TITLE_ELEMENT_REGEX.exec(indexHtmlContent);
    if (!titleMatch || titleMatch[1] === undefined) {
        return null;
    }

    const title = decodeHtmlEntities(titleMatch[1]).replace(/\s+/gu, ' ').trim();
    return title || null;
}

/**
 * Parses the icon `href` linked by one HTML document.
 *
 * @param indexHtmlContent - Content of the project `index.html`.
 * @returns Icon href of the best matching `<link/>` tag, or `null` when no icon is linked.
 */
function parseIndexHtmlFaviconHref(indexHtmlContent: string): string | null {
    let bestFaviconHref: string | null = null;
    let bestFaviconRelationIndex: number = FAVICON_LINK_RELATIONS.length;

    for (const linkTag of indexHtmlContent.match(HTML_LINK_TAG_REGEX) || []) {
        const linkRelation = parseHtmlTagAttribute(linkTag, 'rel');
        const linkHref = parseHtmlTagAttribute(linkTag, 'href');
        if (linkRelation === null || !linkHref) {
            continue;
        }

        const relationIndex = FAVICON_LINK_RELATIONS.indexOf(
            linkRelation.toLowerCase().replace(/\s+/gu, ' ').trim() as (typeof FAVICON_LINK_RELATIONS)[number],
        );
        if (relationIndex === -1 || relationIndex >= bestFaviconRelationIndex) {
            continue;
        }

        bestFaviconHref = linkHref;
        bestFaviconRelationIndex = relationIndex;
    }

    return bestFaviconHref;
}

/**
 * Parses one attribute out of a single HTML tag.
 *
 * @param htmlTag - One complete HTML tag including its angle brackets.
 * @param attributeName - Lowercase attribute name.
 * @returns Decoded attribute value, or `null` when the tag does not have the attribute.
 */
function parseHtmlTagAttribute(htmlTag: string, attributeName: string): string | null {
    const attributeMatch = new RegExp(`\\b${attributeName}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'>]+)`, 'i').exec(htmlTag);
    if (!attributeMatch || attributeMatch[1] === undefined) {
        return null;
    }

    const rawAttributeValue = attributeMatch[1];
    const isQuotedAttributeValue =
        (rawAttributeValue.startsWith('"') && rawAttributeValue.endsWith('"')) ||
        (rawAttributeValue.startsWith("'") && rawAttributeValue.endsWith("'"));

    return decodeHtmlEntities(isQuotedAttributeValue ? rawAttributeValue.slice(1, -1) : rawAttributeValue).trim();
}

/**
 * Decodes the HTML entities which can appear in a title or in an icon path.
 *
 * @param htmlText - Raw text taken from an HTML document.
 * @returns Plain text.
 */
function decodeHtmlEntities(htmlText: string): string {
    return htmlText.replace(HTML_ENTITY_REGEX, (entity, entityName: string) => {
        if (entityName.startsWith('#')) {
            const characterCode = entityName.startsWith('#x')
                ? Number.parseInt(entityName.slice(2), 16)
                : Number.parseInt(entityName.slice(1), 10);

            const isDecodableCharacterCode =
                Number.isInteger(characterCode) && characterCode >= 0 && characterCode <= MAXIMUM_UNICODE_CODE_POINT;

            return isDecodableCharacterCode ? String.fromCodePoint(characterCode) : entity;
        }

        return HTML_ENTITY_REPLACEMENTS[entityName.toLowerCase()] ?? entity;
    });
}
