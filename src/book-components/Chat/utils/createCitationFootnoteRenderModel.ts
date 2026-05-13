import type { ChatMessage } from '../types/ChatMessage';
import { parseCitationMarker } from './parseCitationMarker';
import type { ParsedCitation } from './parseCitationsFromContent';
import { parseCitationsFromContent } from './parseCitationsFromContent';

/**
 * Regex that matches both OpenAI-style full citation markers and bracketed id tokens.
 *
 * @private utility of `<Chat/>`
 */
const MESSAGE_CITATION_TOKEN_REGEX = /【(.*?)】|\[(\d+:\d+)\]/g;

/**
 * Minimal message shape required to derive inline citation references and footnotes.
 *
 * @private utility of `<Chat/>`
 */
type CitationFootnoteMessage = Pick<ChatMessage, 'content' | 'citations'>;

/**
 * One rendered citation footnote entry shown below the message body.
 *
 * @private utility of `<Chat/>`
 */
export type CitationFootnoteEntry = {
    /**
     * Visible footnote number assigned by first appearance in the message body.
     */
    readonly number: number;

    /**
     * Citation metadata rendered for this footnote.
     */
    readonly citation: ParsedCitation;
};

/**
 * Render-ready message citation payload containing transformed content plus footnotes.
 *
 * @private utility of `<Chat/>`
 */
export type CitationFootnoteRenderModel = {
    /**
     * Markdown/HTML content with inline citation tokens replaced by numeric superscripts.
     */
    readonly content: ChatMessage['content'];

    /**
     * Deduplicated footnotes ordered by first appearance in the message body.
     */
    readonly footnotes: ReadonlyArray<CitationFootnoteEntry>;
};

/**
 * Creates one render model that replaces raw citation tokens with numeric footnotes.
 *
 * Supported input markers:
 * - OpenAI-style full markers that already include the document source name.
 * - Bracketed id-only tokens, for example `[0:0]` or `[8:13]`
 *
 * Footnotes are deduplicated by document source while preserving the first-seen order.
 *
 * @param message - Message content plus optional structured citation metadata.
 * @returns Render-ready content and matching footnote entries.
 *
 * @private utility of `<Chat/>`
 */
export function createCitationFootnoteRenderModel(message: CitationFootnoteMessage): CitationFootnoteRenderModel {
    const citationsById = createCitationLookup(message);
    const footnotes: Array<CitationFootnoteEntry> = [];
    const footnoteBySourceKey = new Map<string, CitationFootnoteEntry>();

    const content = message.content.replace(
        MESSAGE_CITATION_TOKEN_REGEX,
        (rawToken: string, _fullMarkerBody: string, bracketCitationId: string | undefined): string => {
            const resolvedCitation = resolveCitationForToken(rawToken, bracketCitationId, citationsById);

            if (!resolvedCitation) {
                return rawToken;
            }

            const sourceKey = normalizeCitationSourceKey(resolvedCitation.source || resolvedCitation.id);
            const existingFootnote = footnoteBySourceKey.get(sourceKey);

            if (existingFootnote) {
                const mergedCitation = mergeParsedCitations(existingFootnote.citation, resolvedCitation);

                if (mergedCitation !== existingFootnote.citation) {
                    const updatedFootnote = {
                        ...existingFootnote,
                        citation: mergedCitation,
                    } satisfies CitationFootnoteEntry;

                    footnoteBySourceKey.set(sourceKey, updatedFootnote);
                    footnotes[existingFootnote.number - 1] = updatedFootnote;
                }

                return buildCitationFootnoteReferenceMarkup(existingFootnote.number);
            }

            const nextFootnote = {
                number: footnotes.length + 1,
                citation: resolvedCitation,
            } satisfies CitationFootnoteEntry;

            footnoteBySourceKey.set(sourceKey, nextFootnote);
            footnotes.push(nextFootnote);

            return buildCitationFootnoteReferenceMarkup(nextFootnote.number);
        },
    );

    return {
        content: content as ChatMessage['content'],
        footnotes,
    };
}

/**
 * Builds a lookup keyed by citation id using structured metadata first and content parsing as fallback.
 *
 * @param message - Message content plus optional citation metadata.
 * @returns Citation lookup keyed by normalized citation id.
 *
 * @private utility of `<Chat/>`
 */
function createCitationLookup(message: CitationFootnoteMessage): Map<string, ParsedCitation> {
    const citationsById = new Map<string, ParsedCitation>();
    const citations = [...(message.citations || []), ...parseCitationsFromContent(message.content)];

    for (const citation of citations) {
        const normalizedCitation = normalizeParsedCitation(citation);
        const existingCitation = citationsById.get(normalizedCitation.id);

        citationsById.set(
            normalizedCitation.id,
            existingCitation ? mergeParsedCitations(existingCitation, normalizedCitation) : normalizedCitation,
        );
    }

    return citationsById;
}

/**
 * Resolves citation metadata for one matched inline token.
 *
 * @param rawToken - Exact token found in the message body.
 * @param bracketCitationId - Optional id captured from `[x:y]` notation.
 * @param citationsById - Structured citation lookup.
 * @returns Resolved citation metadata or `null` when the token is invalid.
 *
 * @private utility of `<Chat/>`
 */
function resolveCitationForToken(
    rawToken: string,
    bracketCitationId: string | undefined,
    citationsById: Map<string, ParsedCitation>,
): ParsedCitation | null {
    if (bracketCitationId) {
        return (
            citationsById.get(bracketCitationId) ||
            normalizeParsedCitation({ id: bracketCitationId, source: bracketCitationId })
        );
    }

    const parsedMarker = parseCitationMarker(rawToken);

    if (!parsedMarker) {
        return null;
    }

    const parsedCitation = normalizeParsedCitation({
        id: parsedMarker.id,
        source: parsedMarker.source,
    });
    const structuredCitation = citationsById.get(parsedCitation.id);

    return structuredCitation ? mergeParsedCitations(parsedCitation, structuredCitation) : parsedCitation;
}

/**
 * Normalizes one parsed citation into a trim-safe render payload.
 *
 * @param citation - Citation to normalize.
 * @returns Citation with trimmed string fields.
 *
 * @private utility of `<Chat/>`
 */
function normalizeParsedCitation(citation: ParsedCitation): ParsedCitation {
    return {
        id: citation.id.trim(),
        source: citation.source.trim(),
        url: citation.url?.trim() || undefined,
        excerpt: citation.excerpt?.trim() || undefined,
    };
}

/**
 * Merges two citations for the same logical reference while preferring richer metadata.
 *
 * @param currentCitation - Existing citation metadata.
 * @param incomingCitation - Newly discovered citation metadata.
 * @returns Reused citation when unchanged, otherwise the merged citation.
 *
 * @private utility of `<Chat/>`
 */
function mergeParsedCitations(currentCitation: ParsedCitation, incomingCitation: ParsedCitation): ParsedCitation {
    const mergedCitation = {
        id: currentCitation.id || incomingCitation.id,
        source: resolvePreferredCitationSource(currentCitation, incomingCitation),
        url: currentCitation.url || incomingCitation.url,
        excerpt: currentCitation.excerpt || incomingCitation.excerpt,
    } satisfies ParsedCitation;

    if (
        mergedCitation.id === currentCitation.id &&
        mergedCitation.source === currentCitation.source &&
        mergedCitation.url === currentCitation.url &&
        mergedCitation.excerpt === currentCitation.excerpt
    ) {
        return currentCitation;
    }

    return mergedCitation;
}

/**
 * Chooses the preferred document source label between two equivalent citations.
 *
 * @param currentCitation - Existing citation metadata.
 * @param incomingCitation - Newly discovered citation metadata.
 * @returns Preferred source label.
 *
 * @private utility of `<Chat/>`
 */
function resolvePreferredCitationSource(currentCitation: ParsedCitation, incomingCitation: ParsedCitation): string {
    const currentSource = currentCitation.source.trim();
    const incomingSource = incomingCitation.source.trim();

    if (!currentSource) {
        return incomingSource;
    }

    if (!incomingSource) {
        return currentSource;
    }

    if (currentSource === currentCitation.id && incomingSource !== incomingCitation.id) {
        return incomingSource;
    }

    return currentSource;
}

/**
 * Normalizes a citation source into a stable deduplication key.
 *
 * @param source - Human-readable citation source.
 * @returns Stable source key.
 *
 * @private utility of `<Chat/>`
 */
function normalizeCitationSourceKey(source: string): string {
    return source.trim().toLowerCase();
}

/**
 * Builds the inline superscript markup rendered inside markdown content.
 *
 * @param number - Visible footnote number.
 * @returns HTML snippet injected into the markdown renderer output.
 *
 * @private utility of `<Chat/>`
 */
function buildCitationFootnoteReferenceMarkup(number: number): string {
    return `<sup data-citation-footnote="${number}">${number}</sup>`;
}
