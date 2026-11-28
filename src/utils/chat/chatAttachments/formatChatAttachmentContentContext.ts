import { spaceTrim } from 'spacetrim';
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
    const metadataLines = [decodingLine, warningsLine].filter((line): line is string => Boolean(line)).join('\n');
    const resolvedContent = contentResolution.content;

    if (!resolvedContent) {
        const reason = contentResolution.reason || 'content unavailable';
        return spaceTrim(
            (block) => `
                - ${attachmentLabel}: ${reason}. URL: ${contentResolution.attachment.url}
                ${block(metadataLines)}
            `,
        );
    }

    const truncatedLabel = contentResolution.isTruncated ? ' [truncated]' : '';
    return spaceTrim(
        (block) => `
            File: ${attachmentLabel}${truncatedLabel}
            URL: ${contentResolution.attachment.url}
            ${block(metadataLines)}
            \`\`\`text
            ${block(resolvedContent)}
            \`\`\`
        `,
    );
}

/**
 * Formats inline attachment-content context section for the model.
 *
 * @param {ReadonlyArray<ResolvedChatAttachmentContent>} resolvedContents - The resolved contents to format.
 * @returns {string} The formatted context.
 *
 * @public exported from `@promptbook/core`
 */
export function formatChatAttachmentContentContext(
    resolvedContents: ReadonlyArray<ResolvedChatAttachmentContent>,
): string {
    if (resolvedContents.length === 0) {
        return '';
    }

    return spaceTrim(
        (block) => `
            ${CHAT_ATTACHMENT_CONTENT_HEADING}
            ${CHAT_ATTACHMENT_CONTENT_INSTRUCTION}

            ${block(
                resolvedContents
                    .map((resolvedContent) => formatResolvedChatAttachmentContent(resolvedContent))
                    .join('\n\n'),
            )}
        `,
    );
}
