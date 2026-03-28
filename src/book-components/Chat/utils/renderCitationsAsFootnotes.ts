import type { ParsedCitation } from './parseCitationsFromContent';
import { parseCitationMarker } from './parseCitationMarker';

/**
 * Matches either full citation markers (`【id†source】`) or inline reference tokens (`[id]`).
 *
 * @private utility of `<ChatMessageItem/>`
 */
const CITATION_TOKEN_REGEX = /【(.*?)】|\[(\d+:\d+)\]/g;

/**
 * One rendered footnote entry associated with one normalized citation document.
 *
 * @private utility of `<ChatMessageItem/>`
 */
export type RenderedCitationFootnote = {
    /**
     * 1-based number assigned by first appearance in the message.
     */
    readonly number: number;

    /**
     * Citation payload used for preview/modals and source labels.
     */
    readonly citation: ParsedCitation;
};

/**
 * Render-ready citation transformation result for one chat message body.
 *
 * @private utility of `<ChatMessageItem/>`
 */
export type RenderCitationsAsFootnotesResult = {
    /**
     * Message content with technical citation markers replaced by numbered references.
     */
    readonly content: string;

    /**
     * Ordered footnotes that correspond to numbers used in `content`.
     */
    readonly footnotes: ReadonlyArray<RenderedCitationFootnote>;
};

/**
 * Input options for citation-to-footnote transformation.
 *
 * @private utility of `<ChatMessageItem/>`
 */
export type RenderCitationsAsFootnotesOptions = {
    /**
     * Original message content, possibly containing citation markers.
     */
    readonly content: string;

    /**
     * Optional citation metadata already available on the message payload.
     */
    readonly citations?: ReadonlyArray<ParsedCitation>;
};

/**
 * Builds one id-indexed citation lookup for mapping `[x:y]` tokens to document identifiers.
 *
 * @param citations - Optional citation metadata.
 * @returns Lookup keyed by citation id.
 * @private utility of `<ChatMessageItem/>`
 */
function createCitationLookupById(citations: ReadonlyArray<ParsedCitation>): Map<string, ParsedCitation> {
    const citationLookupById = new Map<string, ParsedCitation>();

    for (const citation of citations) {
        if (!citation.id || citationLookupById.has(citation.id)) {
            continue;
        }

        citationLookupById.set(citation.id, citation);
    }

    return citationLookupById;
}

/**
 * Normalizes source keys so deduplication by document remains case-insensitive.
 *
 * @param source - Raw citation source.
 * @returns Normalized source key.
 * @private utility of `<ChatMessageItem/>`
 */
function normalizeCitationSourceKey(source: string): string {
    return source.trim().toLowerCase();
}

/**
 * Merges optional citation metadata while preserving the first-seen id/source identity.
 *
 * @param currentCitation - Citation already assigned to one footnote number.
 * @param nextCitation - Newer citation metadata for the same source.
 * @returns Merged citation record.
 * @private utility of `<ChatMessageItem/>`
 */
function mergeCitationMetadata(currentCitation: ParsedCitation, nextCitation: ParsedCitation): ParsedCitation {
    return {
        id: currentCitation.id,
        source: currentCitation.source,
        url: currentCitation.url || nextCitation.url,
        excerpt: currentCitation.excerpt || nextCitation.excerpt,
    };
}

/**
 * Resolves one citation token to a concrete citation payload.
 *
 * Supports:
 * - full markers `【id†source】`
 * - id references `[id]` (resolved via `citations` lookup when possible)
 *
 * @param rawToken - Raw token as found in the content.
 * @param inlineReferenceId - Parsed id from `[id]` notation, when present.
 * @param citationLookupById - Optional id-to-citation lookup.
 * @returns Resolved citation payload or `null` when token is invalid.
 * @private utility of `<ChatMessageItem/>`
 */
function resolveCitationToken(
    rawToken: string,
    inlineReferenceId: string | undefined,
    citationLookupById: ReadonlyMap<string, ParsedCitation>,
): ParsedCitation | null {
    const fullMarker = parseCitationMarker(rawToken);
    if (fullMarker) {
        const mappedCitation = citationLookupById.get(fullMarker.id);
        return {
            id: fullMarker.id,
            source: fullMarker.source,
            url: mappedCitation?.url,
            excerpt: mappedCitation?.excerpt,
        };
    }

    if (!inlineReferenceId) {
        return null;
    }

    const mappedCitation = citationLookupById.get(inlineReferenceId);
    if (mappedCitation) {
        return mappedCitation;
    }

    return {
        id: inlineReferenceId,
        source: inlineReferenceId,
    };
}

/**
 * Converts technical citation tokens inside one message into clean numbered references.
 *
 * Numbering rules:
 * - Supports both `【id†source】` and `[id]` notation.
 * - Numbers are assigned by first appearance in the message.
 * - Repeated citations from the same source reuse the same number.
 *
 * @param options - Content and optional citation metadata.
 * @returns Render-ready message content and ordered footnote entries.
 *
 * @private utility of `<ChatMessageItem/>`
 */
export function renderCitationsAsFootnotes(
    options: RenderCitationsAsFootnotesOptions,
): RenderCitationsAsFootnotesResult {
    const { content, citations = [] } = options;
    const citationLookupById = createCitationLookupById(citations);
    const footnotes: RenderedCitationFootnote[] = [];
    const footnoteIndexBySourceKey = new Map<string, number>();
    let renderedContent = '';
    let cursor = 0;

    let match: RegExpExecArray | null;
    while ((match = CITATION_TOKEN_REGEX.exec(content)) !== null) {
        const rawToken = match[0] || '';
        const inlineReferenceId = match[2] || undefined;
        const resolvedCitation = resolveCitationToken(rawToken, inlineReferenceId, citationLookupById);

        renderedContent += content.slice(cursor, match.index);

        if (!resolvedCitation) {
            renderedContent += rawToken;
            cursor = match.index + rawToken.length;
            continue;
        }

        const sourceKey = normalizeCitationSourceKey(resolvedCitation.source);
        let footnoteIndex = footnoteIndexBySourceKey.get(sourceKey);

        if (footnoteIndex === undefined) {
            footnoteIndex = footnotes.length;
            footnoteIndexBySourceKey.set(sourceKey, footnoteIndex);
            footnotes.push({
                number: footnoteIndex + 1,
                citation: resolvedCitation,
            });
        } else {
            const existingFootnote = footnotes[footnoteIndex];
            if (existingFootnote) {
                footnotes[footnoteIndex] = {
                    number: existingFootnote.number,
                    citation: mergeCitationMetadata(existingFootnote.citation, resolvedCitation),
                };
            }
        }

        renderedContent += `[${footnoteIndex + 1}]`;
        cursor = match.index + rawToken.length;
    }

    renderedContent += content.slice(cursor);

    return {
        content: renderedContent,
        footnotes,
    };
}
