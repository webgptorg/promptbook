import { ChatParticipant } from '../types/ChatParticipant';
import type { ParsedCitation } from './parseCitationsFromContent';
import { resolveCitationUrl } from './resolveCitationUrl';
import { simplifyKnowledgeLabel } from '../../../utils/knowledge/simplifyKnowledgeLabel';

/**
 * Maximum length of plain-text citation labels before truncation.
 */
const TEXT_LABEL_LENGTH = 30;
/**
 * Ellipsis appended to truncated citation labels.
 */
const LABEL_ELLIPSIS = '…';
/**
 * Pattern matching file extensions at the end of a citation source.
 */
const FILE_EXTENSION_REGEX = /\.([a-z0-9]{1,10})$/i;
/**
 * Pattern matching punctuation that should be trimmed from citation tails.
 */
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)+\]]+$/;

/**
 * Collapses consecutive whitespace into single spaces.
 */
function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ');
}

/**
 * Trims a value before further citation normalization.
 */
function trimToNormalized(value: string): string {
    return value.trim();
}

/**
 * Checks whether a citation source ends with a file extension.
 */
function hasFileExtension(value: string): boolean {
    const trimmed = trimToNormalized(value);
    if (!trimmed) {
        return false;
    }
    const withoutFragments = trimmed.split(/[\\?\x23]/)[0] ?? '';
    const segments = withoutFragments.split(/[\\/]/).filter(Boolean);
    const lastSegment = (segments.pop() || withoutFragments).replace(TRAILING_PUNCTUATION_REGEX, '').trim();

    return FILE_EXTENSION_REGEX.test(lastSegment);
}

/**
 * Returns whether the provided value is a valid HTTP(S) URL.
 *
 * @param value - Candidate string to inspect.
 * @returns True when the value parses as an HTTP or HTTPS URL.
 *
 * @private utility of `<Chat/>` citation rendering
 */
export function isCitationUrl(value: string): boolean {
    const trimmed = trimToNormalized(value);
    if (!trimmed) {
        return false;
    }

    try {
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
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
    const trimmed = trimToNormalized(citation.source);
    if (!trimmed) {
        return false;
    }

    if (isCitationUrl(trimmed) || hasFileExtension(trimmed)) {
        return false;
    }

    if (/\s/.test(trimmed)) {
        return true;
    }

    return trimmed.length > TEXT_LABEL_LENGTH;
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
    const trimmed = trimToNormalized(citation.source);
    if (!trimmed) {
        return citation.source;
    }

    if (isPlainTextCitation(citation)) {
        const collapsed = collapseWhitespace(trimmed);
        if (collapsed.length <= TEXT_LABEL_LENGTH) {
            return collapsed;
        }

        return collapsed.slice(0, TEXT_LABEL_LENGTH) + LABEL_ELLIPSIS;
    }

    return simplifyKnowledgeLabel(trimmed);
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
    const trimmed = trimToNormalized(citation.source);
    const explicitUrl = citation.url?.trim() || null;
    const literalUrl = isCitationUrl(trimmed) ? trimmed : null;
    const knowledgeUrl = resolveCitationUrl(trimmed, participants);

    return explicitUrl || literalUrl || knowledgeUrl || null;
}

// TODO: [💞] Spread into multiple files
