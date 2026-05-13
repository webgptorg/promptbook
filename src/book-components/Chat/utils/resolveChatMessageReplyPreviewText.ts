import { removeMarkdownFormatting } from '../../../utils/markdown/removeMarkdownFormatting';
import { removeMarkdownLinks } from '../../../utils/markdown/removeMarkdownLinks';
import type { ChatMessage, ChatMessageReplyingTo } from '../types/ChatMessage';

/**
 * Lightweight message-like shape accepted by reply-preview text helpers.
 *
 * @private helper contract for chat reply previews
 */
type ChatMessageReplyPreviewSource = Pick<ChatMessage, 'content' | 'attachments'> & {
    readonly attachmentNames?: ChatMessageReplyingTo['attachmentNames'];
};

/**
 * Optional settings for reply-preview text generation.
 *
 * @private helper contract for chat reply previews
 */
type ResolveChatMessageReplyPreviewTextOptions = {
    readonly maxLength?: number;
    readonly emptyLabel?: string;
};

/**
 * Matches HTML tags that should not appear in compact UI previews.
 *
 * @private helper constant for chat reply previews
 */
const HTML_TAG_PATTERN = /<\/?[^>]+>/g;

/**
 * Matches footnote markers and citation wrappers often present in agent output.
 *
 * @private helper constant for chat reply previews
 */
const FOOTNOTE_PATTERN = /\[\^\d+\]/g;

/**
 * Matches bare URLs that add noise to compact reply previews.
 *
 * @private helper constant for chat reply previews
 */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+\b/gi;

/**
 * Resolves one compact plain-text preview for reply UI surfaces and prompt context.
 *
 * @private helper for chat reply previews
 */
export function resolveChatMessageReplyPreviewText(
    source: ChatMessageReplyPreviewSource,
    options: ResolveChatMessageReplyPreviewTextOptions = {},
): string {
    const contentPreview = normalizeReplyPreviewText(source.content);
    const maxLength = options.maxLength;

    if (contentPreview.length > 0) {
        return typeof maxLength === 'number' ? shortenReplyPreviewText(contentPreview, maxLength) : contentPreview;
    }

    const attachmentNames = resolveAttachmentNames(source);
    if (attachmentNames.length > 0) {
        const attachmentPreview = attachmentNames.join(', ');
        return typeof maxLength === 'number'
            ? shortenReplyPreviewText(attachmentPreview, maxLength)
            : attachmentPreview;
    }

    return options.emptyLabel || 'Message';
}

/**
 * Normalizes markdown-rich message content into compact readable plain text.
 *
 * @private helper for chat reply previews
 */
function normalizeReplyPreviewText(value: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return '';
    }

    let normalizedValue = value.replace(/\r\n/g, '\n');
    normalizedValue = removeMarkdownLinks(normalizedValue);
    normalizedValue = removeMarkdownFormatting(normalizedValue);
    normalizedValue = normalizedValue.replace(HTML_TAG_PATTERN, ' ');
    normalizedValue = normalizedValue.replace(FOOTNOTE_PATTERN, ' ');
    normalizedValue = normalizedValue.replace(URL_PATTERN, ' ');
    normalizedValue = normalizedValue.replace(/\s+/g, ' ');

    return normalizedValue.trim();
}

/**
 * Resolves attachment-name previews from either a live message or a stored reply snapshot.
 *
 * @private helper for chat reply previews
 */
function resolveAttachmentNames(source: ChatMessageReplyPreviewSource): Array<string> {
    if (Array.isArray(source.attachmentNames) && source.attachmentNames.length > 0) {
        return source.attachmentNames.map((attachmentName) => attachmentName.trim()).filter(Boolean);
    }

    if (!Array.isArray(source.attachments) || source.attachments.length === 0) {
        return [];
    }

    const attachmentNames = source.attachments
        .map((attachment) => (typeof attachment?.name === 'string' ? attachment.name.trim() : ''))
        .filter(Boolean);

    if (attachmentNames.length > 0) {
        return attachmentNames;
    }

    return source.attachments.length === 1 ? ['Attachment'] : [`${source.attachments.length} attachments`];
}

/**
 * Shortens one reply-preview string without dropping the final ellipsis.
 *
 * @private helper for chat reply previews
 */
function shortenReplyPreviewText(value: string, maxLength: number): string {
    if (!Number.isFinite(maxLength) || maxLength <= 0 || value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
