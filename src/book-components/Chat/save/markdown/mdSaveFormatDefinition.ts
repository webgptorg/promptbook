import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { resolveCitationPreviewUrl } from '../../utils/citationHelpers';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';
import {
    buildChatExportParticipantMap,
    createChatExportCitationFootnoteRegistry,
    createChatExportCitationRenderModel,
    formatChatExportCitationFootnoteLabel,
    formatChatExportTimestamp,
    resolveChatExportParticipantVisuals,
    type ChatExportCitationFootnoteRegistry,
} from '../_common/chatExportRendering';
import { getPromptbookExportBranding } from '../_common/getPromptbookExportBranding';

/**
 * Pattern matching citation footnote markup prepared by the shared chat citation renderer.
 *
 * @private helper of `mdSaveFormatDefinition`
 */
const CITATION_FOOTNOTE_REFERENCE_MARKUP_REGEX = /<sup data-citation-footnote="(\d+)">\s*\d+\s*<\/sup>/g;

/**
 * Converts shared citation reference markup into plain Markdown source numbers.
 *
 * @private helper of `mdSaveFormatDefinition`
 */
function renderMarkdownCitationReferences(content: ChatMessage['content']): string {
    return content.replace(CITATION_FOOTNOTE_REFERENCE_MARKUP_REGEX, '[$1]');
}

/**
 * Builds an inconspicuous Promptbook branding comment for exported Markdown files.
 *
 * @private helper of `mdSaveFormatDefinition`
 */
function createPromptbookMarkdownComment(commentLines: ReadonlyArray<string>): string {
    return spaceTrim(
        (block) => `
            <!--
            ${block(commentLines.join('\n'))}
            -->
        `,
    );
}

/**
 * Renders one chat message as a readable Markdown section.
 *
 * @private helper of `mdSaveFormatDefinition`
 */
function renderMarkdownMessageBlock(
    message: ChatMessage,
    participants: ReadonlyMap<string, ChatParticipant>,
    citationFootnotes: ChatExportCitationFootnoteRegistry,
): string {
    const visuals = resolveChatExportParticipantVisuals(participants, String(message.sender || 'SYSTEM'));
    const timestamp = formatChatExportTimestamp(message.createdAt);
    const renderModel = createChatExportCitationRenderModel(citationFootnotes, message);
    const content = renderMarkdownCitationReferences(renderModel.content) || '_No text provided._';
    const messageSections = [`## ${visuals.displayName}`];

    if (timestamp) {
        messageSections.push(`_${timestamp}_`);
    }

    messageSections.push(content);

    return spaceTrim(messageSections.join('\n\n'));
}

/**
 * Renders document-wide source footnotes collected from inline citation markers.
 *
 * @private helper of `mdSaveFormatDefinition`
 */
function renderMarkdownSourcesBlock(
    citationFootnotes: ChatExportCitationFootnoteRegistry,
    participants: ReadonlyArray<ChatParticipant>,
): string {
    if (citationFootnotes.footnotes.length === 0) {
        return '';
    }

    const sources = citationFootnotes.footnotes
        .map((footnote) => {
            const href = resolveCitationPreviewUrl(footnote.citation, participants) || undefined;

            return formatChatExportCitationFootnoteLabel(footnote, href);
        })
        .join('\n');

    return spaceTrim(
        (block) => `
            ## Sources

            ${block(sources)}
        `,
    );
}

/**
 * Markdown export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const mdSaveFormatDefinition = {
    formatName: 'md',
    label: 'Markdown',
    getContent: ({ title, messages, participants }) => {
        const branding = getPromptbookExportBranding();
        const participantLookup = buildChatExportParticipantMap(participants);
        const citationFootnotes = createChatExportCitationFootnoteRegistry();
        const messageBlocks =
            messages.length > 0
                ? messages
                      .map((message) => renderMarkdownMessageBlock(message, participantLookup, citationFootnotes))
                      .join('\n\n---\n\n')
                : '_No messages were available in this chat export._';
        const sourcesBlock = renderMarkdownSourcesBlock(citationFootnotes, participants);
        const documentSections = [
            createPromptbookMarkdownComment(branding.commentLines),
            `# ${title || 'Chat'}`,
            messageBlocks,
            sourcesBlock,
            `_Exported with [${branding.productName}](https://ptbk.io)._`,
        ].filter(Boolean);

        return spaceTrim(documentSections.join('\n\n'));
    },
    mimeType: 'text/markdown',
    fileExtension: 'md',
} as const satisfies ChatSaveFormatDefinition;
