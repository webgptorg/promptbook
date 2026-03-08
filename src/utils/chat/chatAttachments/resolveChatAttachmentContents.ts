import type {
    ChatAttachment,
    ResolveChatAttachmentOptions,
    ResolvedChatAttachmentContent,
} from '../chatAttachments';
import { resolveChatAttachmentContent } from './resolveChatAttachmentContent';

/**
 * Maximum number of characters inlined per attachment.
 *
 * @private function of resolveChatAttachmentContents
 */
const CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_PER_ATTACHMENT = 12_000;

/**
 * Global cap for inlined attachment characters in one message.
 *
 * @private function of resolveChatAttachmentContents
 */
const CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_TOTAL = 24_000;

/**
 * Resolves inline content previews for each attachment while enforcing global prompt-size limits.
 *
 * @param {ReadonlyArray<ChatAttachment>} attachments - The attachments to resolve.
 * @param {ResolveChatAttachmentOptions} options - Options for resolution.
 * @returns {Promise<Array<ResolvedChatAttachmentContent>>} The resolved contents.
 * @public exported from `@promptbook/core`
 */
export async function resolveChatAttachmentContents(
    attachments: ReadonlyArray<ChatAttachment>,
    options: ResolveChatAttachmentOptions = {},
): Promise<Array<ResolvedChatAttachmentContent>> {
    const resolvedContents: Array<ResolvedChatAttachmentContent> = [];
    let remainingInlineCharacters = CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_TOTAL;

    for (const attachment of attachments) {
        const maxInlineCharacters = Math.min(
            CHAT_ATTACHMENT_MAX_INLINE_CHARACTERS_PER_ATTACHMENT,
            remainingInlineCharacters,
        );

        const resolvedContent = await resolveChatAttachmentContent(attachment, maxInlineCharacters, options);
        resolvedContents.push(resolvedContent);

        if (resolvedContent.content) {
            remainingInlineCharacters = Math.max(0, remainingInlineCharacters - resolvedContent.content.length);
        }
    }

    return resolvedContents;
}
