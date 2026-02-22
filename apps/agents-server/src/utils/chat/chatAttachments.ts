import { isUrlOnPrivateNetwork } from '../../../../../src/utils/validators/url/isUrlOnPrivateNetwork';

/**
 * Attachment payload expected by chat routes and prompt formatting helpers.
 */
export type ChatAttachment = {
    readonly name: string;
    readonly type: string;
    readonly url: string;
};

/**
 * Heading used when appending attachments to user message content.
 *
 * @private
 */
const CHAT_ATTACHMENTS_HEADING = 'Attached files:';

/**
 * Guidance appended after attachment links so the model can use them.
 *
 * @private
 */
const CHAT_ATTACHMENTS_INSTRUCTION =
    'Use these URLs when you need to inspect the attached files before answering.';

/**
 * Heading used for the inline attachment-content section.
 *
 * @private
 */
const CHAT_ATTACHMENT_CONTENT_HEADING = 'Attached file contents:';

/**
 * Guidance appended before inline attachment snippets.
 *
 * @private
 */
const CHAT_ATTACHMENT_CONTENT_INSTRUCTION =
    'Use these snippets as source material. If a snippet is truncated, use its URL for full context.';

/**
 * Fallback name used when attachment metadata does not provide any usable filename.
 *
 * @private
 */
const DEFAULT_ATTACHMENT_NAME = 'attachment';

/**
 * Default MIME type used when attachment metadata does not provide one.
 *
 * @private
 */
const DEFAULT_ATTACHMENT_TYPE = 'application/octet-stream';

/**
 * Timeout used when downloading one attachment for inline context.
 *
 * @private
 */
const CHAT_ATTACHMENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Maximum number of bytes downloaded for a single attachment.
 *
 * @private
 */
const CHAT_ATTACHMENT_MAX_DOWNLOAD_BYTES = 2_000_000;

/**
 * Maximum number of characters inlined per attachment.
 *
 * @private
 */
const CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_PER_ATTACHMENT = 12_000;

/**
 * Global cap for inlined attachment characters in one message.
 *
 * @private
 */
const CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_TOTAL = 24_000;

/**
 * MIME types that are treated as inline text for prompt context.
 *
 * @private
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
 * @private
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
 * Resolved inline content of one chat attachment.
 */
export type ResolvedChatAttachmentContent = {
    readonly attachment: ChatAttachment;
    readonly content: string | null;
    readonly isTruncated: boolean;
    readonly reason: string | null;
};

/**
 * Normalizes attachment text fields to safe single-line values.
 *
 * @private
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
 * @private
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
 * @private
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
 * Returns one lowercase extension from a filename, or null when not available.
 *
 * @private
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
 * @private
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
 * @private
 */
function normalizeMimeType(mimeType: string): string {
    const semicolonIndex = mimeType.indexOf(';');
    const rawMimeType = semicolonIndex === -1 ? mimeType : mimeType.slice(0, semicolonIndex);
    return rawMimeType.trim().toLowerCase();
}

/**
 * Returns true when the MIME type is considered textual.
 *
 * @private
 */
function isTextLikeMimeType(mimeType: string): boolean {
    const normalizedMimeType = normalizeMimeType(mimeType);
    return normalizedMimeType.startsWith('text/') || TEXT_ATTACHMENT_MIME_TYPES.has(normalizedMimeType);
}

/**
 * Returns true when attachment content should be downloaded and inlined as text.
 *
 * @private
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
 * @private
 */
function sanitizeAttachmentInlineText(content: string): string {
    return content.replaceAll('\u0000', '').trim();
}

/**
 * Truncates text to the configured limit while preserving whole-string behavior for small inputs.
 *
 * @private
 */
function truncateAttachmentInlineText(content: string, maxCharacters: number): { content: string; isTruncated: boolean } {
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
 * @private
 */
function createAttachmentContentFailure(
    attachment: ChatAttachment,
    reason: string,
): ResolvedChatAttachmentContent {
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
 * @private
 */
async function resolveChatAttachmentContent(
    attachment: ChatAttachment,
    maxInlineCharacters: number,
): Promise<ResolvedChatAttachmentContent> {
    if (maxInlineCharacters <= 0) {
        return createAttachmentContentFailure(attachment, 'inline content limit reached');
    }

    if (isUrlOnPrivateNetwork(attachment.url)) {
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

/**
 * Converts unknown attachment payload into the normalized chat attachment shape.
 *
 * @private
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

/**
 * Formats a normalized attachment as a single markdown bullet line.
 *
 * @private
 */
function formatChatAttachmentLine(attachment: ChatAttachment): string {
    return `- ${attachment.name} (${attachment.type}): ${attachment.url}`;
}

/**
 * Appends one or more context sections to message content.
 *
 * @private
 */
function appendChatContextSections(messageContent: string, contextSections: ReadonlyArray<string>): string {
    const normalizedContextSections = contextSections.map((section) => section.trim()).filter((section) => section !== '');
    if (normalizedContextSections.length === 0) {
        return messageContent;
    }

    const normalizedMessageContent = messageContent.trimEnd();
    const separator = normalizedMessageContent === '' ? '' : '\n\n';
    return `${normalizedMessageContent}${separator}${normalizedContextSections.join('\n\n')}`;
}

/**
 * Builds a markdown section that lists attachment URLs for the model.
 */
export function formatChatAttachmentContext(attachments: ReadonlyArray<ChatAttachment>): string {
    if (attachments.length === 0) {
        return '';
    }

    return [
        CHAT_ATTACHMENTS_HEADING,
        ...attachments.map((attachment) => formatChatAttachmentLine(attachment)),
        CHAT_ATTACHMENTS_INSTRUCTION,
    ].join('\n');
}

/**
 * Resolves inline content previews for each attachment while enforcing global prompt-size limits.
 */
export async function resolveChatAttachmentContents(
    attachments: ReadonlyArray<ChatAttachment>,
): Promise<Array<ResolvedChatAttachmentContent>> {
    const resolvedContents: Array<ResolvedChatAttachmentContent> = [];
    let remainingInlineCharacters = CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_TOTAL;

    for (const attachment of attachments) {
        const maxInlineCharacters = Math.min(
            CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_PER_ATTACHMENT,
            remainingInlineCharacters,
        );

        const resolvedContent = await resolveChatAttachmentContent(attachment, maxInlineCharacters);
        resolvedContents.push(resolvedContent);

        if (resolvedContent.content) {
            remainingInlineCharacters = Math.max(0, remainingInlineCharacters - resolvedContent.content.length);
        }
    }

    return resolvedContents;
}

/**
 * Formats one resolved attachment content block.
 *
 * @private
 */
function formatResolvedChatAttachmentContent(contentResolution: ResolvedChatAttachmentContent): string {
    const attachmentLabel = `${contentResolution.attachment.name} (${contentResolution.attachment.type})`;

    if (!contentResolution.content) {
        const reason = contentResolution.reason || 'content unavailable';
        return `- ${attachmentLabel}: ${reason}. URL: ${contentResolution.attachment.url}`;
    }

    const truncatedLabel = contentResolution.isTruncated ? ' [truncated]' : '';
    return [
        `File: ${attachmentLabel}${truncatedLabel}`,
        `URL: ${contentResolution.attachment.url}`,
        '```text',
        contentResolution.content,
        '```',
    ].join('\n');
}

/**
 * Formats inline attachment-content context section for the model.
 */
export function formatChatAttachmentContentContext(
    resolvedContents: ReadonlyArray<ResolvedChatAttachmentContent>,
): string {
    if (resolvedContents.length === 0) {
        return '';
    }

    return [
        CHAT_ATTACHMENT_CONTENT_HEADING,
        CHAT_ATTACHMENT_CONTENT_INSTRUCTION,
        ...resolvedContents.map((resolvedContent) => formatResolvedChatAttachmentContent(resolvedContent)),
    ].join('\n\n');
}

/**
 * Appends attachment metadata context to message content so chat models can see uploaded file URLs.
 */
export function appendChatAttachmentContext(messageContent: string, attachments: ReadonlyArray<ChatAttachment>): string {
    const attachmentContext = formatChatAttachmentContext(attachments);
    return appendChatContextSections(messageContent, [attachmentContext]);
}

/**
 * Appends attachment metadata and inline attachment content to message content.
 *
 * The helper never throws because attachment downloads are best-effort and should
 * not block chat requests.
 */
export async function appendChatAttachmentContextWithContent(
    messageContent: string,
    attachments: ReadonlyArray<ChatAttachment>,
): Promise<string> {
    const attachmentMetadataContext = formatChatAttachmentContext(attachments);
    if (attachmentMetadataContext === '') {
        return messageContent;
    }

    try {
        const resolvedContents = await resolveChatAttachmentContents(attachments);
        const attachmentContentContext = formatChatAttachmentContentContext(resolvedContents);
        return appendChatContextSections(messageContent, [attachmentMetadataContext, attachmentContentContext]);
    } catch {
        return appendChatContextSections(messageContent, [attachmentMetadataContext]);
    }
}
