import type { ChatParticipant } from '../types/ChatParticipant';
import {
    createReadableCitationSourceDisplayLabel,
    isCitationSourceUrl,
    isPlainTextCitationSource,
    resolveCitationSourceDisplay,
} from './resolveCitationSourceDisplay';
import type { ParsedCitation } from './parseCitationsFromContent';
import { resolveCitationUrl } from './resolveCitationUrl';

/**
 * Returns whether the provided value is a valid HTTP(S) URL.
 *
 * @param value - Candidate string to inspect.
 * @returns True when the value parses as an HTTP or HTTPS URL.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function isCitationUrl(value: string): boolean {
    return isCitationSourceUrl(value);
}

/**
 * Determines whether a citation should be displayed as a text snippet instead of a file/URL.
 *
 * @param citation - Parsed citation metadata.
 * @returns True when the citation looks like inline text instead of a document or URL.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function isPlainTextCitation(citation: ParsedCitation): boolean {
    return isPlainTextCitationSource(citation);
}

/**
 * Builds a label that matches the desired chip/modal title for a citation.
 *
 * @param citation - Parsed citation metadata.
 * @returns The friendly label shown on chips and modal headers.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function getCitationLabel(citation: ParsedCitation): string {
    return resolveCitationSourceDisplay(citation).label;
}

/**
 * Resolves the preview URL used inside the citation modal iframe.
 *
 * @param citation - Parsed citation metadata.
 * @param participants - Known chat participants for agent knowledge lookup.
 * @returns URL string suitable for iframe preview or null when unavailable.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function resolveCitationPreviewUrl(
    citation: ParsedCitation,
    participants: ReadonlyArray<ChatParticipant>,
): string | null {
    const trimmed = citation.source.trim();
    const explicitUrl = citation.url?.trim() || null;
    const literalUrl = isCitationUrl(trimmed) ? trimmed : null;
    const knowledgeUrl = resolveCitationUrl(trimmed, participants);

    return explicitUrl || literalUrl || knowledgeUrl || null;
}

/**
 * Creates a readable fallback label from a citation source when no title metadata is available.
 *
 * @param source - Raw citation source value.
 * @returns Human-friendly source label.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function createReadableCitationSourceLabel(source: string): string {
    return createReadableCitationSourceDisplayLabel(source);
}

// TODO: [💞] Spread into multiple files
