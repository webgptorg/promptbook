/**
 * Default citation identifier used for simplified citation markers without an explicit position.
 *
 * @private utility of `<Chat/>`
 */
export const DEFAULT_SIMPLIFIED_CITATION_ID = '0:0';

/**
 * Parsed citation marker normalized to the full OpenAI-style notation.
 *
 * @private utility of `<Chat/>`
 */
export type CitationMarker = {
    /**
     * Citation identifier (for example `7:15`).
     */
    id: string;
    /**
     * Citation source filename or label.
     */
    source: string;
    /**
     * Original marker exactly as found in the content.
     */
    raw: string;
    /**
     * Full normalized marker (`【id†source】`).
     */
    normalized: string;
};

/**
 * Creates a global regular expression that matches citation markers wrapped in `【...】`.
 *
 * @private utility of `<Chat/>`
 */
export function createCitationMarkerRegex(): RegExp {
    return /【(.*?)】/g;
}

/**
 * Builds a full citation marker in the canonical OpenAI-style notation.
 *
 * @param id - Citation identifier.
 * @param source - Citation source.
 * @private utility of `<Chat/>`
 */
function buildFullCitationMarker(id: string, source: string): string {
    return `【${id}†${source}】`;
}

/**
 * Parses marker body into citation identifier and source.
 *
 * Accepts both:
 * - full notation: `id†source`
 * - simplified notation: `source`
 *
 * @param markerBody - Marker body without outer brackets.
 * @private utility of `<Chat/>`
 */
function parseCitationMarkerBody(markerBody: string): Pick<CitationMarker, 'id' | 'source'> | null {
    const trimmedBody = markerBody.trim();
    if (!trimmedBody) {
        return null;
    }

    const separatorIndex = trimmedBody.indexOf('†');

    if (separatorIndex === -1) {
        return {
            id: DEFAULT_SIMPLIFIED_CITATION_ID,
            source: trimmedBody,
        };
    }

    const rawId = trimmedBody.slice(0, separatorIndex).trim();
    const source = trimmedBody.slice(separatorIndex + 1).trim();
    if (!source) {
        return null;
    }

    return {
        id: rawId || DEFAULT_SIMPLIFIED_CITATION_ID,
        source,
    };
}

/**
 * Parses one citation marker and normalizes it to full notation.
 *
 * @param rawMarker - Marker including outer brackets.
 * @returns Parsed marker or `null` when the marker is invalid.
 *
 * @private utility of `<Chat/>`
 */
export function parseCitationMarker(rawMarker: string): CitationMarker | null {
    const match = rawMarker.match(/^【(.*?)】$/);
    if (!match) {
        return null;
    }

    const parsedBody = parseCitationMarkerBody(match[1] || '');
    if (!parsedBody) {
        return null;
    }

    const { id, source } = parsedBody;

    return {
        id,
        source,
        raw: rawMarker,
        normalized: buildFullCitationMarker(id, source),
    };
}

/**
 * Parses all citation markers from content and normalizes each to full notation.
 *
 * @param content - Content that may contain citation markers.
 * @returns Parsed citation markers in their original order.
 *
 * @private utility of `<Chat/>`
 */
export function parseCitationMarkersFromContent(content: string): CitationMarker[] {
    const markers: CitationMarker[] = [];
    const citationMarkerRegex = createCitationMarkerRegex();
    let match: RegExpExecArray | null;

    while ((match = citationMarkerRegex.exec(content)) !== null) {
        const rawMarker = match[0] || '';
        const parsedMarker = parseCitationMarker(rawMarker);

        if (parsedMarker) {
            markers.push(parsedMarker);
        }
    }

    return markers;
}

/**
 * Replaces all citation markers in content using normalized marker metadata.
 *
 * @param content - Content that may contain citation markers.
 * @param replacer - Replacement callback for each valid marker.
 * @returns Content with citation markers replaced.
 *
 * @private utility of `<Chat/>`
 */
export function replaceCitationMarkers(content: string, replacer: (marker: CitationMarker) => string): string {
    const citationMarkerRegex = createCitationMarkerRegex();

    return content.replace(citationMarkerRegex, (rawMarker: string) => {
        const parsedMarker = parseCitationMarker(rawMarker);
        if (!parsedMarker) {
            return rawMarker;
        }

        return replacer(parsedMarker);
    });
}

/**
 * Normalizes simplified citation markers to full notation.
 *
 * Example:
 * - `【document.pdf】` -> `【0:0†document.pdf】`
 *
 * @param content - Content that may contain simplified markers.
 * @returns Content where every citation marker is in full notation.
 *
 * @private utility of `<Chat/>`
 */
export function normalizeCitationMarkersToFullNotation(content: string): string {
    return replaceCitationMarkers(content, (marker) => marker.normalized);
}
