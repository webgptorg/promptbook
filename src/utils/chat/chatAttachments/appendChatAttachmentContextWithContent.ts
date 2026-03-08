import type { ChatAttachment, ResolveChatAttachmentOptions } from '../chatAttachments';
import { appendChatContextSections } from './appendChatContextSections';
import { formatChatAttachmentContentContext } from './formatChatAttachmentContentContext';
import { formatChatAttachmentContext } from './formatChatAttachmentContext';
import { resolveChatAttachmentContents } from './resolveChatAttachmentContents';

/**
 * Appends attachment metadata and inline attachment content to message content.
 *
 * The helper never throws because attachment downloads are best-effort and should
 * not block chat requests.
 *
 * @param {string} messageContent - The original message content.
 * @param {ReadonlyArray<ChatAttachment>} attachments - The attachments to append.
 * @param {ResolveChatAttachmentOptions} options - Options for resolution.
 * @returns {Promise<string>} The updated message content.
 * @public exported from `@promptbook/core`
 */
export async function appendChatAttachmentContextWithContent(
    messageContent: string,
    attachments: ReadonlyArray<ChatAttachment>,
    options: ResolveChatAttachmentOptions = {},
): Promise<string> {
    const attachmentMetadataContext = formatChatAttachmentContext(attachments);
    if (attachmentMetadataContext === '') {
        return messageContent;
    }

    try {
        const resolvedContents = await resolveChatAttachmentContents(attachments, options);
        const attachmentContentContext = formatChatAttachmentContentContext(resolvedContents);
        return appendChatContextSections(messageContent, [attachmentMetadataContext, attachmentContentContext]);
    } catch {
        return appendChatContextSections(messageContent, [attachmentMetadataContext]);
    }
}
