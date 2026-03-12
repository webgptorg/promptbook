import type { ChatAttachment, ResolveChatAttachmentOptions, ResolvedChatAttachmentContent } from '../chatAttachments';
import { decodeAttachmentAsText, DEFAULT_ATTACHMENT_TEXT_DECODE_BYTES } from '../../files/decodeAttachmentAsText';
import { isUrlOnPrivateNetwork } from '../../validators/url/isUrlOnPrivateNetwork';

/**
 * Timeout used when downloading one attachment for inline context.
 *
 * @private function of resolveChatAttachmentContent
 */
const CHAT_ATTACHMENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Maximum number of bytes inspected per attachment before the payload is truncated.
 *
 * @private function of resolveChatAttachmentContent
 */
const CHAT_ATTACHMENT_MAX_DECODE_BYTES = DEFAULT_ATTACHMENT_TEXT_DECODE_BYTES;

/**
 * Reads only a bounded prefix of a response body so large files do not blow up prompt construction.
 *
 * @private function of resolveChatAttachmentContent
 */
async function readResponseBytes(
    response: Response,
    maxBytes: number,
): Promise<{
    readonly bytes: Uint8Array;
}> {
    if (!response.body) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
            bytes: bytes.byteLength > maxBytes ? bytes.subarray(0, maxBytes + 1) : bytes,
        };
    }

    const reader = response.body.getReader();
    const chunks: Array<Uint8Array> = [];
    let totalLength = 0;
    const maxCaptureBytes = maxBytes + 1;

    try {
        while (totalLength < maxCaptureBytes) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            if (!value || value.byteLength === 0) {
                continue;
            }

            const remainingBytes = maxCaptureBytes - totalLength;
            const chunk = value.byteLength > remainingBytes ? value.subarray(0, remainingBytes) : value;
            chunks.push(chunk);
            totalLength += chunk.byteLength;
        }
    } finally {
        await reader.cancel().catch(() => {});
    }

    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return { bytes };
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
function createAttachmentContentFailure(
    attachment: ChatAttachment,
    reason: string,
    options: Partial<ResolvedChatAttachmentContent> = {},
): ResolvedChatAttachmentContent {
    return {
        attachment,
        content: null,
        isTruncated: false,
        reason,
        encodingUsed: options.encodingUsed ?? null,
        encodingConfidence: options.encodingConfidence ?? null,
        warnings: options.warnings ?? [],
        wasBinary: options.wasBinary ?? false,
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
    const { allowLocalhost = false, forceText = false } = options;

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

        const { bytes } = await readResponseBytes(response, CHAT_ATTACHMENT_MAX_DECODE_BYTES);
        if (bytes.byteLength === 0) {
            return createAttachmentContentFailure(attachment, 'file is empty');
        }

        const decoded = decodeAttachmentAsText(
            {
                bytes,
                filename: attachment.name,
                mimeType: response.headers.get('content-type') || attachment.type,
            },
            {
                maxBytes: CHAT_ATTACHMENT_MAX_DECODE_BYTES,
                forceText,
            },
        );

        if (decoded.wasBinary) {
            return createAttachmentContentFailure(attachment, 'file appears to be binary and was not inlined as text', {
                encodingUsed: decoded.encodingUsed,
                encodingConfidence: decoded.confidence ?? null,
                warnings: decoded.warnings,
                wasBinary: true,
            });
        }

        if (decoded.text === '') {
            return createAttachmentContentFailure(attachment, 'file is empty', {
                encodingUsed: decoded.encodingUsed,
                encodingConfidence: decoded.confidence ?? null,
                warnings: decoded.warnings,
            });
        }

        const truncatedContent = truncateAttachmentInlineText(decoded.text, maxInlineCharacters);
        return {
            attachment,
            content: truncatedContent.content,
            isTruncated: decoded.isTruncated || truncatedContent.isTruncated,
            reason: null,
            encodingUsed: decoded.encodingUsed,
            encodingConfidence: decoded.confidence ?? null,
            warnings: decoded.warnings,
            wasBinary: false,
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
