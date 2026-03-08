import type { ChatAttachment } from '../chatAttachments';
import { appendChatContextSections } from './appendChatContextSections';
import { formatChatAttachmentContext } from './formatChatAttachmentContext';

/**
 * Appends attachment metadata context to message content so chat models can see uploaded file URLs.
 *
 * @param {string} messageContent - The original message content.
 * @param {ReadonlyArray<ChatAttachment>} attachments - The attachments to append.
 * @returns {string} The updated message content.
 * @public exported from `@promptbook/core`
 */
export function appendChatAttachmentContext(
    messageContent: string,
    attachments: ReadonlyArray<ChatAttachment>,
): string {
    const attachmentContext = formatChatAttachmentContext(attachments);
    return appendChatContextSections(messageContent, [attachmentContext]);
}
