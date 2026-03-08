import type { ChatAttachment } from '../chatAttachments';

/**
 * Fallback name used when attachment metadata does not provide any usable filename.
 *
 * @private function of normalizeChatAttachments
 */
const DEFAULT_ATTACHMENT_NAME = 'attachment';

/**
 * Default MIME type used when attachment metadata does not provide one.
 *
 * @private function of normalizeChatAttachments
 */
const DEFAULT_ATTACHMENT_TYPE = 'application/octet-stream';

/**
 * Normalizes attachment text fields to safe single-line values.
 *
 * @private function of normalizeChatAttachments
 */
function normalizeAttachmentText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized === '' ? null : normalized;
}

/**
 * Checks whether the attachment URL is an absolute HTTP(S) link.
 *
 * @private function of normalizeChatAttachments
 */
function isSupportedAttachmentUrl(value: string): boolean {
    try {
        const parsedUrl = new URL(value);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Tries to infer a readable attachment name from its URL pathname.
 *
 * @private function of normalizeChatAttachments
 */
function deriveAttachmentNameFromUrl(url: string): string {
    try {
        const parsedUrl = new URL(url);
        const pathnameSegments = parsedUrl.pathname.split('/').filter(Boolean);
        const encodedFileName = pathnameSegments[pathnameSegments.length - 1];
        if (!encodedFileName) {
            return DEFAULT_ATTACHMENT_NAME;
        }

        const decodedFileName = decodeURIComponent(encodedFileName).trim();
        return decodedFileName === '' ? DEFAULT_ATTACHMENT_NAME : decodedFileName;
    } catch {
        return DEFAULT_ATTACHMENT_NAME;
    }
}

/**
 * Converts unknown attachment payload into the normalized chat attachment shape.
 *
 * @private function of normalizeChatAttachments
 */
function normalizeChatAttachment(rawAttachment: unknown): ChatAttachment | null {
    if (!rawAttachment || typeof rawAttachment !== 'object' || Array.isArray(rawAttachment)) {
        return null;
    }

    const rawUrl = normalizeAttachmentText((rawAttachment as { url?: unknown }).url);
    if (!rawUrl || !isSupportedAttachmentUrl(rawUrl)) {
        return null;
    }

    const rawName = normalizeAttachmentText((rawAttachment as { name?: unknown }).name);
    const rawType = normalizeAttachmentText((rawAttachment as { type?: unknown }).type);

    return {
        name: rawName || deriveAttachmentNameFromUrl(rawUrl),
        type: rawType || DEFAULT_ATTACHMENT_TYPE,
        url: rawUrl,
    };
}

/**
 * Normalizes a potentially invalid attachments payload from the client request.
 *
 * Invalid items are skipped and duplicate URLs are de-duplicated.
 *
 * @param {unknown} rawAttachments - The raw attachments to normalize.
 * @returns {Array<ChatAttachment>} The normalized attachments.
 * @public exported from `@promptbook/core`
 */
export function normalizeChatAttachments(rawAttachments: unknown): Array<ChatAttachment> {
    if (!Array.isArray(rawAttachments)) {
        return [];
    }

    const normalizedAttachments: Array<ChatAttachment> = [];
    const seenUrls = new Set<string>();

    for (const rawAttachment of rawAttachments) {
        const normalizedAttachment = normalizeChatAttachment(rawAttachment);
        if (!normalizedAttachment || seenUrls.has(normalizedAttachment.url)) {
            continue;
        }

        normalizedAttachments.push(normalizedAttachment);
        seenUrls.add(normalizedAttachment.url);
    }

    return normalizedAttachments;
}
