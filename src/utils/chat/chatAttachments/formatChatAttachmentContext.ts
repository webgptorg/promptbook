import type { ChatAttachment } from '../chatAttachments';

/**
 * Heading used when appending attachments to user message content.
 *
 * @private function of formatChatAttachmentContext
 */
const CHAT_ATTACHMENTS_HEADING = 'Attached files:';

/**
 * Guidance appended after attachment links so the model can use them.
 *
 * @private function of formatChatAttachmentContext
 */
const CHAT_ATTACHMENTS_INSTRUCTION = 'Use these URLs when you need to inspect the attached files before answering.';

/**
 * Formats a normalized attachment as a single markdown bullet line.
 *
 * @private function of formatChatAttachmentContext
 */
function formatChatAttachmentLine(attachment: ChatAttachment): string {
    return `- ${attachment.name} (${attachment.type}): ${attachment.url}`;
}

/**
 * Builds a markdown section that lists attachment URLs for the model.
 *
 * @param {ReadonlyArray<ChatAttachment>} attachments - The attachments to format.
 * @returns {string} The formatted context.
 * @public exported from `@promptbook/core`
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
