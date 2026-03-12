import type { ResolvedChatAttachmentContent } from '../chatAttachments';

/**
 * Heading used for the inline attachment-content section.
 *
 * @private function of formatChatAttachmentContentContext
 */
const CHAT_ATTACHMENT_CONTENT_HEADING = 'Attached file contents:';

/**
 * Guidance appended before inline attachment snippets.
 *
 * @private function of formatChatAttachmentContentContext
 */
const CHAT_ATTACHMENT_CONTENT_INSTRUCTION =
    'Use these snippets as source material. If a snippet is truncated, use its URL for full context.';

/**
 * Formats one resolved attachment content block.
 *
 * @private function of formatChatAttachmentContentContext
 */
function formatResolvedChatAttachmentContent(contentResolution: ResolvedChatAttachmentContent): string {
    const attachmentLabel = `${contentResolution.attachment.name} (${contentResolution.attachment.type})`;
    const decodingLine =
        contentResolution.encodingUsed !== null
            ? `Decoding: ${contentResolution.encodingUsed}${
                  contentResolution.encodingConfidence !== null
                      ? ` (confidence ${contentResolution.encodingConfidence.toFixed(2)})`
                      : ''
              }`
            : null;
    const warningsLine =
        contentResolution.warnings.length > 0 ? `Warnings: ${contentResolution.warnings.join(' | ')}` : null;

    if (!contentResolution.content) {
        const reason = contentResolution.reason || 'content unavailable';
        return [
            `- ${attachmentLabel}: ${reason}. URL: ${contentResolution.attachment.url}`,
            decodingLine,
            warningsLine,
        ]
            .filter(Boolean)
            .join('\n');
    }

    const truncatedLabel = contentResolution.isTruncated ? ' [truncated]' : '';
    return [
        `File: ${attachmentLabel}${truncatedLabel}`,
        `URL: ${contentResolution.attachment.url}`,
        decodingLine,
        warningsLine,
        '```text',
        contentResolution.content,
        '```',
    ]
        .filter(Boolean)
        .join('\n');
}

/**
 * Formats inline attachment-content context section for the model.
 *
 * @param {ReadonlyArray<ResolvedChatAttachmentContent>} resolvedContents - The resolved contents to format.
 * @returns {string} The formatted context.
 * @public exported from `@promptbook/core`
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
