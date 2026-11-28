'use client';

import type { CitationLabelResolver, ChatMessage, ParsedCitation } from '@promptbook-local/types';
import { resolveAgentsServerCitationLabel } from './resolveAgentsServerCitationLabel';

/**
 * Pattern matching trailing punctuation a model may append after a cited URL.
 *
 * @private utility constant of Agents Server chat citations
 */
const TRAILING_URL_PUNCTUATION_REGEX = /[.,;:!?)\]]+$/;

/**
 * Creates a citation-label resolver that prefers original chat attachment filenames.
 *
 * Attached images and files are cited by their CDN URL, but that URL only carries
 * a normalized (kebab-cased) filename, so the shared resolver would otherwise fetch
 * the binary and show unreadable content. This resolver maps a citation whose URL
 * points to one of the chat attachments back to the attachment's original `name`
 * (for example `DSC_0139 (2).JPG`) and delegates every other citation to
 * `resolveAgentsServerCitationLabel`.
 *
 * @param messages - Chat messages whose attachments provide the original filenames.
 * @returns Resolver returning the attachment filename, or the shared server label.
 *
 * @private utility of Agents Server chat citations
 */
export function createAttachmentAwareCitationLabelResolver(
    messages: ReadonlyArray<ChatMessage>,
): CitationLabelResolver {
    const attachmentNamesByUrlKey = collectAttachmentNamesByUrlKey(messages);

    return async (citation) => {
        const attachmentName = resolveAttachmentNameForCitation(citation, attachmentNamesByUrlKey);
        if (attachmentName) {
            return attachmentName;
        }

        return resolveAgentsServerCitationLabel(citation);
    };
}

/**
 * Builds a lookup from normalized attachment URL to the original attachment filename.
 *
 * @param messages - Chat messages that may carry file attachments.
 * @returns Map keyed by normalized attachment URL with the original filename as value.
 *
 * @private utility of Agents Server chat citations
 */
function collectAttachmentNamesByUrlKey(messages: ReadonlyArray<ChatMessage>): Map<string, string> {
    const attachmentNamesByUrlKey = new Map<string, string>();

    for (const message of messages) {
        for (const attachment of message.attachments ?? []) {
            const attachmentUrlKey = normalizeAttachmentUrlKey(attachment.url);
            const attachmentName = attachment.name.trim();

            if (attachmentUrlKey && attachmentName && !attachmentNamesByUrlKey.has(attachmentUrlKey)) {
                attachmentNamesByUrlKey.set(attachmentUrlKey, attachmentName);
            }
        }
    }

    return attachmentNamesByUrlKey;
}

/**
 * Resolves the original filename for one citation when it points to a known attachment.
 *
 * @param citation - Citation whose `url`/`source` may reference an attachment.
 * @param attachmentNamesByUrlKey - Lookup produced by `collectAttachmentNamesByUrlKey`.
 * @returns Original attachment filename or `null` when the citation is not an attachment.
 *
 * @private utility of Agents Server chat citations
 */
function resolveAttachmentNameForCitation(
    citation: ParsedCitation,
    attachmentNamesByUrlKey: Map<string, string>,
): string | null {
    if (attachmentNamesByUrlKey.size === 0) {
        return null;
    }

    for (const citationTarget of [citation.url, citation.source]) {
        if (!citationTarget) {
            continue;
        }

        const citationUrlKey = normalizeAttachmentUrlKey(citationTarget);
        if (!citationUrlKey) {
            continue;
        }

        const attachmentName = attachmentNamesByUrlKey.get(citationUrlKey);
        if (attachmentName) {
            return attachmentName;
        }
    }

    return null;
}

/**
 * Normalizes an attachment/citation URL into a stable comparison key.
 *
 * Only the origin and decoded pathname are compared so that citations reproduced
 * by the model still match regardless of query strings or trailing punctuation.
 *
 * @param rawUrl - Raw URL value from an attachment or citation.
 * @returns Comparison key, or `null` when the value is not an HTTP(S) URL.
 *
 * @private utility of Agents Server chat citations
 */
function normalizeAttachmentUrlKey(rawUrl: string): string | null {
    const trimmedUrl = rawUrl.trim().replace(TRAILING_URL_PUNCTUATION_REGEX, '');
    if (!trimmedUrl) {
        return null;
    }

    try {
        const url = new URL(trimmedUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }

        return `${url.origin}${decodeUrlPathnameSafely(url.pathname)}`;
    } catch {
        return null;
    }
}

/**
 * Safely decodes a URL pathname, falling back to the raw value on malformed input.
 *
 * @param pathname - Raw URL pathname.
 * @returns Decoded pathname or the original value when decoding fails.
 *
 * @private utility of Agents Server chat citations
 */
function decodeUrlPathnameSafely(pathname: string): string {
    try {
        return decodeURIComponent(pathname);
    } catch {
        return pathname;
    }
}
