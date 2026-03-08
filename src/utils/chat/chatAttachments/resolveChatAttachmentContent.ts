import type { ChatAttachment, ResolveChatAttachmentOptions, ResolvedChatAttachmentContent } from '../chatAttachments';
import { isUrlOnPrivateNetwork } from '../../validators/url/isUrlOnPrivateNetwork';

/**
 * Timeout used when downloading one attachment for inline context.
 *
 * @private function of resolveChatAttachmentContent
 */
const CHAT_ATTACHMENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Maximum number of bytes downloaded for a single attachment.
 *
 * @private function of resolveChatAttachmentContent
 */
const CHAT_ATTACHMENT_MAX_DOWNLOAD_BYTES = 2_000_000;

/**
 * MIME types that are treated as inline text for prompt context.
 *
 * @private function of resolveChatAttachmentContent
 */
const TEXT_ATTACHMENT_MIME_TYPES = new Set<string>([
    'application/json',
    'application/ld+json',
    'application/javascript',
    'application/x-javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/x-www-form-urlencoded',
    'application/yaml',
    'application/x-yaml',
    'application/toml',
    'application/sql',
    'application/rtf',
]);

/**
 * File extensions that are treated as inline text when MIME type is ambiguous.
 *
 * @private function of resolveChatAttachmentContent
 */
const TEXT_ATTACHMENT_EXTENSIONS = new Set<string>([
    'txt',
    'md',
    'markdown',
    'book',
    'json',
    'jsonl',
    'csv',
    'tsv',
    'xml',
    'yaml',
    'yml',
    'toml',
    'ini',
    'log',
    'js',
    'mjs',
    'cjs',
    'ts',
    'tsx',
    'jsx',
    'css',
    'scss',
    'less',
    'html',
    'htm',
    'sql',
    'py',
    'java',
    'c',
    'cpp',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'sh',
    'bat',
    'ps1',
    'env',
    'conf',
    'cfg',
    'properties',
    'gitignore',
    'dockerfile',
    'makefile',
]);

/**
 * Returns one lowercase extension from a filename, or null when not available.
 *
 * @private function of resolveChatAttachmentContent
 */
function getAttachmentExtension(fileName: string): string | null {
    const normalizedFileName = fileName.trim().toLowerCase();
    const dotIndex = normalizedFileName.lastIndexOf('.');

    if (dotIndex <= 0 || dotIndex === normalizedFileName.length - 1) {
        return null;
    }

    return normalizedFileName.slice(dotIndex + 1);
}

/**
 * Returns one lowercase extension derived from attachment URL pathname.
 *
 * @private function of resolveChatAttachmentContent
 */
function deriveAttachmentExtensionFromUrl(url: string): string | null {
    try {
        const parsedUrl = new URL(url);
        const pathnameSegments = parsedUrl.pathname.split('/').filter(Boolean);
        const encodedFileName = pathnameSegments[pathnameSegments.length - 1];

        if (!encodedFileName) {
            return null;
        }

        const decodedFileName = decodeURIComponent(encodedFileName);
        return getAttachmentExtension(decodedFileName);
    } catch {
        return null;
    }
}

/**
 * Removes optional charset/parameters from MIME values.
 *
 * @private function of resolveChatAttachmentContent
 */
function normalizeMimeType(mimeType: string): string {
    const semicolonIndex = mimeType.indexOf(';');
    const rawMimeType = semicolonIndex === -1 ? mimeType : mimeType.slice(0, semicolonIndex);
    return rawMimeType.trim().toLowerCase();
}

/**
 * Returns true when the MIME type is considered textual.
 *
 * @private function of resolveChatAttachmentContent
 */
function isTextLikeMimeType(mimeType: string): boolean {
    const normalizedMimeType = normalizeMimeType(mimeType);
    return normalizedMimeType.startsWith('text/') || TEXT_ATTACHMENT_MIME_TYPES.has(normalizedMimeType);
}

/**
 * Returns true when attachment content should be downloaded and inlined as text.
 *
 * @private function of resolveChatAttachmentContent
 */
function isTextLikeAttachment(attachment: ChatAttachment, mimeTypeFromResponse: string | null): boolean {
    if (mimeTypeFromResponse && isTextLikeMimeType(mimeTypeFromResponse)) {
        return true;
    }

    if (isTextLikeMimeType(attachment.type)) {
        return true;
    }

    const extension = deriveAttachmentExtensionFromUrl(attachment.url) || getAttachmentExtension(attachment.name);
    return extension ? TEXT_ATTACHMENT_EXTENSIONS.has(extension) : false;
}

/**
 * Trims attachment payload and removes null bytes to keep prompt context readable.
 *
 * @private function of resolveChatAttachmentContent
 */
function sanitizeAttachmentInlineText(content: string): string {
    return content.replaceAll('\u0000', '').trim();
}

/**
 * Truncates text to the configured limit while preserving whole-string behavior for small inputs.
 *
 * @private function of resolveChatAttachmentContent
 */
function truncateAttachmentInlineText(
    content: string,
    maxCharacters: number,
): { content: string; isTruncated: boolean } {
    if (content.length <= maxCharacters) {
        return {
            content,
            isTruncated: false,
        };
    }

    return {
        content: `${content.slice(0, Math.max(0, maxCharacters))}\n\n[...truncated...]`,
        isTruncated: true,
    };
}

/**
 * Creates a standardized failed-content result for one attachment.
 *
 * @private function of resolveChatAttachmentContent
 */
function createAttachmentContentFailure(attachment: ChatAttachment, reason: string): ResolvedChatAttachmentContent {
    return {
        attachment,
        content: null,
        isTruncated: false,
        reason,
    };
}

/**
 * Downloads and resolves one attachment into inline text context when possible.
 *
 * @param {ChatAttachment} attachment - The attachment to resolve.
 * @param {number} maxInlineCharacters - Maximum number of characters to inline.
 * @param {ResolveChatAttachmentOptions} options - Options for resolution.
 * @returns {Promise<ResolvedChatAttachmentContent>} The resolved content.
 * @private function of resolveChatAttachmentContents
 */
export async function resolveChatAttachmentContent(
    attachment: ChatAttachment,
    maxInlineCharacters: number,
    options: ResolveChatAttachmentOptions = {},
): Promise<ResolvedChatAttachmentContent> {
    const { allowLocalhost = false } = options;

    if (maxInlineCharacters <= 0) {
        return createAttachmentContentFailure(attachment, 'inline content limit reached');
    }

    if (isUrlOnPrivateNetwork(attachment.url, { allowLocalhost })) {
        return createAttachmentContentFailure(attachment, 'private-network URL is not allowed');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_ATTACHMENT_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(attachment.url, {
            signal: controller.signal,
        });

        if (!response.ok) {
            return createAttachmentContentFailure(
                attachment,
                `download failed (${response.status} ${response.statusText})`,
            );
        }

        const mimeTypeFromResponse = response.headers.get('content-type');
        if (!isTextLikeAttachment(attachment, mimeTypeFromResponse)) {
            return createAttachmentContentFailure(attachment, 'unsupported content type for inline text');
        }

        const contentLengthHeader = response.headers.get('content-length');
        if (contentLengthHeader) {
            const contentLength = Number.parseInt(contentLengthHeader, 10);
            if (!Number.isNaN(contentLength) && contentLength > CHAT_ATTACHMENT_MAX_DOWNLOAD_BYTES) {
                return createAttachmentContentFailure(attachment, 'file is too large for inline context');
            }
        }

        const textContent = sanitizeAttachmentInlineText(await response.text());
        if (textContent === '') {
            return createAttachmentContentFailure(attachment, 'file is empty');
        }

        const truncatedContent = truncateAttachmentInlineText(textContent, maxInlineCharacters);
        return {
            attachment,
            content: truncatedContent.content,
            isTruncated: truncatedContent.isTruncated,
            reason: null,
        };
    } catch (error) {
        if (controller.signal.aborted) {
            return createAttachmentContentFailure(attachment, 'download timed out');
        }

        if (error instanceof Error) {
            return createAttachmentContentFailure(attachment, error.message);
        }

        return createAttachmentContentFailure(attachment, 'download failed');
    } finally {
        clearTimeout(timeoutId);
    }
}
