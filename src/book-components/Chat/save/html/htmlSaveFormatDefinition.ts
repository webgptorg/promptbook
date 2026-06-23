import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { resolveCitationPreviewUrl } from '../../utils/citationHelpers';
import { parseMessageButtons } from '../../utils/parseMessageButtons';
import { renderMarkdown } from '../../utils/renderMarkdown';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';
import {
    buildChatExportParticipantMap,
    createChatExportCitationFootnoteRegistry,
    createChatExportCitationRenderModel,
    formatChatExportCitationFootnoteLabel,
    formatChatExportTimestamp,
    resolveChatExportParticipantVisuals,
    type ChatExportCitationFootnoteRegistry,
    type ChatExportCitationRenderModel,
} from '../_common/chatExportRendering';
import { getPromptbookExportBranding } from '../_common/getPromptbookExportBranding';

/**
 * Pattern matching rendered citation reference markup in exported message HTML.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
const CITATION_FOOTNOTE_REFERENCE_HTML_REGEX = /<sup data-citation-footnote="(\d+)">\s*\d+\s*<\/sup>/g;

/**
 * Class name that gives the PDF renderer the same root styles as the standalone HTML document body.
 *
 * @private Internal helper shared by HTML and PDF chat exports.
 */
export const CHAT_HTML_EXPORT_RENDER_ROOT_CLASS_NAME = 'chat-html-export-render-root';

/**
 * Roles whose messages are aligned to the right side of the exported transcript.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
const RIGHT_ALIGNED_SENDER_ROLES = new Set(['USER']);

/**
 * Escapes HTML-sensitive text before embedding it into the export document.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function escapeHtml(value: string | number): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Returns the first uppercase character of a display name, used for the fallback avatar glyph.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function getAvatarInitial(displayName: string): string {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
        return '?';
    }

    return Array.from(trimmedName)[0]!.toUpperCase();
}

/**
 * Renders the avatar bubble shown next to one exported message.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function buildAvatarMarkup(participant: ChatParticipant | undefined, displayName: string, accentColor: string): string {
    const avatarStyle = `background-color:${escapeHtml(accentColor)};`;

    if (participant?.avatarSrc) {
        return spaceTrim(`
            <div class="message-avatar" aria-hidden="true" style="${avatarStyle}">
                <img src="${escapeHtml(participant.avatarSrc)}" alt="" loading="lazy" />
            </div>
        `);
    }

    return spaceTrim(`
        <div class="message-avatar message-avatar--initial" aria-hidden="true" style="${avatarStyle}">
            <span>${escapeHtml(getAvatarInitial(displayName))}</span>
        </div>
    `);
}

/**
 * Renders attachments for one exported message as a compact supporting section.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function buildAttachmentsMarkup(message: ChatMessage): string {
    if (!message.attachments?.length) {
        return '';
    }

    return spaceTrim(`
        <section class="message-supporting-list">
            <div class="message-supporting-title">Attachments</div>
            <ul>
                ${message.attachments
                    .map((attachment) => {
                        const attachmentName = escapeHtml(attachment.name || 'Attachment');
                        const attachmentType = escapeHtml(attachment.type || 'file');
                        const attachmentLink = attachment.url
                            ? ` <a href="${escapeHtml(
                                  attachment.url,
                              )}" target="_blank" rel="noopener">${attachmentName}</a>`
                            : ` ${attachmentName}`;

                        return `<li><span class="message-supporting-meta">${attachmentType}</span>${attachmentLink}</li>`;
                    })
                    .join('')}
            </ul>
        </section>
    `);
}

/**
 * Renders citations for one exported message as a compact supporting section.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function buildCitationsMarkup(message: ChatMessage): string {
    if (!message.citations?.length) {
        return '';
    }

    return spaceTrim(`
        <section class="message-supporting-list">
            <div class="message-supporting-title">Sources</div>
            <ul>
                ${message.citations
                    .map((citation) => {
                        const citationLink = citation.url
                            ? ` <a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener">Open source</a>`
                            : '';
                        const citationExcerpt = citation.excerpt
                            ? `<div class="message-supporting-excerpt">${escapeHtml(citation.excerpt)}</div>`
                            : '';

                        return spaceTrim(`
                            <li>
                                <strong>${escapeHtml(citation.id)}</strong> ${escapeHtml(citation.source)}
                                ${citationLink}
                                ${citationExcerpt}
                            </li>
                        `);
                    })
                    .join('')}
            </ul>
        </section>
    `);
}

/**
 * Removes quick action and quick message buttons from the markdown body before rendering.
 *
 * Quick buttons are interactive UI affordances and have no meaning inside a static export.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function stripQuickButtonsFromContent(content: ChatMessage['content']): ChatMessage['content'] {
    return parseMessageButtons(content).contentWithoutButtons as ChatMessage['content'];
}

/**
 * Converts one markdown message body to HTML with document-wide source references.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function renderFootnotedMarkdown(
    message: Pick<ChatMessage, 'content' | 'citations'>,
    citationFootnotes: ChatExportCitationFootnoteRegistry,
): { readonly html: string; readonly renderModel: ChatExportCitationRenderModel } {
    const renderModel = createChatExportCitationRenderModel(citationFootnotes, {
        ...message,
        content: stripQuickButtonsFromContent(message.content),
    });
    const html = linkCitationFootnoteReferences(renderMarkdown(renderModel.content));

    return {
        html,
        renderModel,
    };
}

/**
 * Links inline citation superscripts to the document-wide Sources section.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function linkCitationFootnoteReferences(html: string): string {
    return html.replace(CITATION_FOOTNOTE_REFERENCE_HTML_REGEX, (_rawMarkup: string, footnoteNumber: string) => {
        const safeFootnoteNumber = escapeHtml(footnoteNumber);

        return `<sup data-citation-footnote="${safeFootnoteNumber}"><a href="#source-${safeFootnoteNumber}">[${safeFootnoteNumber}]</a></sup>`;
    });
}

/**
 * Renders reply context for one message while preserving markdown formatting.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function buildReplyingToMarkup(message: ChatMessage, citationFootnotes: ChatExportCitationFootnoteRegistry): string {
    if (!message.replyingTo) {
        return '';
    }

    const { html } = renderFootnotedMarkdown(
        {
            content: message.replyingTo.content,
        },
        citationFootnotes,
    );

    return spaceTrim(`
        <aside class="reply-context">
            <div class="reply-context-title">Replying to ${escapeHtml(message.replyingTo.sender)}</div>
            <div class="markdown-content">${html}</div>
        </aside>
    `);
}

/**
 * Determines whether a message bubble should sit on the right side of the transcript.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function isRightAlignedMessage(participant: ChatParticipant | undefined, sender: string): boolean {
    if (participant?.isMe === true) {
        return true;
    }

    return RIGHT_ALIGNED_SENDER_ROLES.has(sender.toUpperCase());
}

/**
 * Detects whether a message would render with no body, attachments, or supporting metadata after sanitization.
 *
 * Such messages exist only to carry quick buttons in the live chat UI and add no value to a printed transcript.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function isMessageEmptyForExport(message: ChatMessage): boolean {
    const trimmedContent = stripQuickButtonsFromContent(message.content).trim();

    if (trimmedContent.length > 0) {
        return false;
    }

    if (message.attachments && message.attachments.length > 0) {
        return false;
    }

    if (message.citations && message.citations.length > 0) {
        return false;
    }

    if (message.replyingTo) {
        return false;
    }

    return true;
}

/**
 * Renders one message bubble for the standalone HTML export.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function renderMessageBlock(
    message: ChatMessage,
    participants: ReadonlyMap<string, ChatParticipant>,
    citationFootnotes: ChatExportCitationFootnoteRegistry,
): string {
    const sender = String(message.sender || 'SYSTEM');
    const participant = participants.get(sender) ?? participants.get(sender.toUpperCase());
    const visuals = resolveChatExportParticipantVisuals(participants, sender);
    const timestamp = formatChatExportTimestamp(message.createdAt);
    const durationLabel =
        typeof message.generationDurationMs === 'number' ? `${(message.generationDurationMs / 1000).toFixed(1)}s` : '';
    const replyingToMarkup = buildReplyingToMarkup(message, citationFootnotes);
    const { html: messageBody, renderModel } = renderFootnotedMarkdown(message, citationFootnotes);
    const isRightAligned = isRightAlignedMessage(participant, sender);
    const avatarMarkup = buildAvatarMarkup(participant, visuals.displayName, visuals.accentColor);
    const alignmentClass = isRightAligned ? 'message--mine' : 'message--theirs';

    return spaceTrim(`
        <article class="message ${alignmentClass}" style="--message-accent:${escapeHtml(visuals.accentColor)};">
            ${avatarMarkup}
            <div class="message-body">
                <header class="message-meta">
                    <span class="message-sender">${escapeHtml(visuals.displayName)}</span>
                    ${timestamp ? `<time class="message-time">${escapeHtml(timestamp)}</time>` : ''}
                </header>
                <div class="message-bubble">
                    ${replyingToMarkup}
                    <div class="message-content markdown-content">
                        ${messageBody || '<p class="message-empty">No text provided.</p>'}
                    </div>
                </div>
                ${durationLabel ? `<p class="message-footnote">Responded in ${escapeHtml(durationLabel)}</p>` : ''}
                ${buildAttachmentsMarkup(message)}
                ${renderModel.footnotes.length === 0 ? buildCitationsMarkup(message) : ''}
            </div>
        </article>
    `);
}

/**
 * Renders document-wide source footnotes collected from inline citation markers.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function buildDocumentSourcesMarkup(
    citationFootnotes: ChatExportCitationFootnoteRegistry,
    participants: ReadonlyArray<ChatParticipant>,
): string {
    if (citationFootnotes.footnotes.length === 0) {
        return '';
    }

    return spaceTrim(`
        <section class="document-sources" aria-label="Sources">
            <h2 class="document-sources-title">Sources</h2>
            <ol class="document-sources-list">
                ${citationFootnotes.footnotes
                    .map((footnote) => {
                        const href = resolveCitationPreviewUrl(footnote.citation, participants) || undefined;
                        const label = formatChatExportCitationFootnoteLabel(footnote, href);

                        return spaceTrim(`
                            <li id="source-${escapeHtml(footnote.number)}">
                                ${
                                    href
                                        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(
                                              label,
                                          )}</a>`
                                        : escapeHtml(label)
                                }
                            </li>
                        `);
                    })
                    .join('')}
            </ol>
        </section>
    `);
}

/**
 * Renders Promptbook branding meta tags for the standalone HTML document.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function createPromptbookMetaTags(): string {
    const branding = getPromptbookExportBranding();
    const brandingLines = branding.commentLines.join(' | ');
    const detailLines = branding.detailLines.join(' | ');

    return spaceTrim(`
        <meta name="application-name" content="${escapeHtml(branding.productName)}" />
        <meta name="author" content="${escapeHtml(branding.productName)}" />
        <meta name="generator" content="${escapeHtml(branding.creatorTool)}" />
        <meta name="description" content="${escapeHtml(branding.metadataSummary)}" />
        <meta name="keywords" content="${escapeHtml(branding.keywords.join(', '))}" />
        <meta name="promptbook:branding" content="${escapeHtml(brandingLines)}" />
        ${detailLines ? `<meta name="promptbook:details" content="${escapeHtml(detailLines)}" />` : ''}
    `);
}

/**
 * Builds the standalone HTML chat export document shared by HTML downloads and PDF rendering.
 *
 * @private Internal helper shared by HTML and PDF chat exports.
 */
export function buildChatHtml(
    title: string,
    messages: ReadonlyArray<ChatMessage>,
    participants: ReadonlyArray<ChatParticipant>,
): string {
    const branding = getPromptbookExportBranding();
    const safeTitle = escapeHtml(title || 'Chat');
    const participantLookup = buildChatExportParticipantMap(participants);
    const citationFootnotes = createChatExportCitationFootnoteRegistry();
    const exportedLabel = formatChatExportTimestamp(new Date());
    const messagesForExport = messages.filter((message) => !isMessageEmptyForExport(message));
    const messageMarkup =
        messagesForExport.length > 0
            ? messagesForExport
                  .map((message) => renderMessageBlock(message, participantLookup, citationFootnotes))
                  .join('')
            : '<div class="empty-state">No messages were available in this chat export.</div>';
    const documentSourcesMarkup = buildDocumentSourcesMarkup(citationFootnotes, participants);

    return spaceTrim(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${createPromptbookMetaTags()}
            <title>${safeTitle} · ${escapeHtml(branding.productName)}</title>
            <style>
                :root {
                    color-scheme: light;
                    --chat-export-background: #f4f6fb;
                    --chat-export-surface: #ffffff;
                    --chat-export-text: #0f172a;
                    --chat-export-muted: #64748b;
                    --chat-export-soft-border: #e2e8f0;
                    --chat-export-bubble-theirs-bg: #ffffff;
                    --chat-export-bubble-theirs-text: #0f172a;
                    --chat-export-bubble-theirs-border: #e2e8f0;
                    --chat-export-bubble-mine-bg: #115EB6;
                    --chat-export-bubble-mine-text: #ffffff;
                    --chat-export-link: #0f6cbd;
                }

                * {
                    box-sizing: border-box;
                }

                body,
                .${CHAT_HTML_EXPORT_RENDER_ROOT_CLASS_NAME} {
                    margin: 0;
                    background: var(--chat-export-background);
                    color: var(--chat-export-text);
                    font-family: Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
                    font-size: 15px;
                    line-height: 1.55;
                }

                a {
                    color: var(--chat-export-link);
                }

                .document {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: 40px 24px 56px;
                }

                .document-header {
                    margin-bottom: 28px;
                    padding-bottom: 18px;
                    border-bottom: 1px solid var(--chat-export-soft-border);
                }

                .document-eyebrow {
                    margin: 0 0 8px;
                    font-size: 11px;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--chat-export-muted);
                }

                .document-title {
                    margin: 0;
                    font-size: 30px;
                    line-height: 1.2;
                }

                .document-meta {
                    margin: 10px 0 0;
                    color: var(--chat-export-muted);
                    font-size: 13px;
                }

                .message-list {
                    display: flex;
                    flex-direction: column;
                    gap: 22px;
                }

                .message {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }

                .message--mine {
                    flex-direction: row-reverse;
                }

                .message-avatar {
                    flex-shrink: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    background-color: var(--message-accent, #64748b);
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .message-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .message-avatar--initial span {
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1;
                }

                .message-body {
                    flex: 1 1 auto;
                    min-width: 0;
                    max-width: 78%;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .message--mine .message-body {
                    align-items: flex-end;
                }

                .message-meta {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 8px;
                    padding: 0 4px;
                }

                .message--mine .message-meta {
                    justify-content: flex-end;
                }

                .message-sender {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--message-accent, var(--chat-export-text));
                }

                .message--mine .message-sender {
                    color: var(--chat-export-text);
                }

                .message-time {
                    font-size: 11px;
                    color: var(--chat-export-muted);
                }

                .message-bubble {
                    padding: 14px 16px;
                    border-radius: 16px;
                    background: var(--chat-export-bubble-theirs-bg);
                    color: var(--chat-export-bubble-theirs-text);
                    border: 1px solid var(--chat-export-bubble-theirs-border);
                    border-top-left-radius: 4px;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                    max-width: 100%;
                    overflow-wrap: anywhere;
                }

                .message--mine .message-bubble {
                    background: var(--chat-export-bubble-mine-bg);
                    color: var(--chat-export-bubble-mine-text);
                    border-color: transparent;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 4px;
                }

                .message--mine .message-bubble a {
                    color: #d4e8ff;
                }

                .message--mine .message-bubble code {
                    background: rgba(255, 255, 255, 0.18);
                    color: inherit;
                }

                .message--mine .message-bubble pre {
                    background: rgba(15, 23, 42, 0.35);
                    color: #f8fafc;
                }

                .message--mine .message-bubble blockquote {
                    color: rgba(255, 255, 255, 0.85);
                    border-color: rgba(255, 255, 255, 0.5);
                }

                .message-footnote {
                    margin: 2px 4px 0;
                    font-size: 11px;
                    color: var(--chat-export-muted);
                }

                .message-empty {
                    color: var(--chat-export-muted);
                    font-style: italic;
                    margin: 0;
                }

                .reply-context {
                    margin: 0 0 10px;
                    padding: 8px 12px;
                    border-radius: 10px;
                    border-left: 3px solid var(--message-accent, #cbd5e1);
                    background: rgba(15, 23, 42, 0.04);
                }

                .message--mine .reply-context {
                    background: rgba(255, 255, 255, 0.18);
                    border-left-color: rgba(255, 255, 255, 0.7);
                }

                .reply-context-title,
                .message-supporting-title {
                    margin-bottom: 6px;
                    font-size: 11px;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--chat-export-muted);
                }

                .message--mine .reply-context-title {
                    color: rgba(255, 255, 255, 0.8);
                }

                .message-supporting-list {
                    margin-top: 10px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    background: rgba(15, 23, 42, 0.03);
                }

                .message-supporting-list ul {
                    margin: 0;
                    padding-left: 18px;
                }

                .message-supporting-meta {
                    margin-right: 6px;
                    color: var(--chat-export-muted);
                    font-size: 12px;
                }

                .message-supporting-excerpt {
                    margin-top: 4px;
                    color: #475569;
                    font-size: 13px;
                }

                .markdown-content > *:first-child {
                    margin-top: 0;
                }

                .markdown-content > *:last-child {
                    margin-bottom: 0;
                }

                .markdown-content h1,
                .markdown-content h2,
                .markdown-content h3,
                .markdown-content h4,
                .markdown-content h5,
                .markdown-content h6 {
                    margin: 0 0 10px;
                    line-height: 1.25;
                }

                .markdown-content p,
                .markdown-content ul,
                .markdown-content ol,
                .markdown-content blockquote,
                .markdown-content pre,
                .markdown-content table,
                .markdown-content details {
                    margin: 0 0 12px;
                }

                .markdown-content ul,
                .markdown-content ol {
                    padding-left: 22px;
                }

                .markdown-content code {
                    font-family: ui-monospace, "SFMono-Regular", monospace;
                    background: rgba(15, 23, 42, 0.06);
                    border-radius: 4px;
                    padding: 1px 5px;
                    font-size: 0.94em;
                }

                .markdown-content pre {
                    overflow-x: auto;
                    padding: 14px 16px;
                    border-radius: 10px;
                    background: #0f172a;
                    color: #e2e8f0;
                    white-space: pre-wrap;
                }

                .markdown-content pre code {
                    background: transparent;
                    color: inherit;
                    padding: 0;
                }

                .markdown-content blockquote {
                    margin-left: 0;
                    padding-left: 14px;
                    border-left: 4px solid #cbd5e1;
                    color: #334155;
                }

                .markdown-content table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .markdown-content th,
                .markdown-content td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 10px;
                    text-align: left;
                    vertical-align: top;
                }

                .markdown-content th {
                    background: #f8fafc;
                }

                .markdown-content img {
                    max-width: 100%;
                    border-radius: 8px;
                }

                .markdown-content details {
                    padding: 12px 14px;
                    border: 1px solid var(--chat-export-soft-border);
                    border-radius: 10px;
                    background: #f8fafc;
                }

                .markdown-content summary {
                    cursor: default;
                    font-weight: 600;
                }

                .markdown-content sup[class*="citationRef"] {
                    color: #2563eb;
                    font-weight: 600;
                }

                .markdown-content sup[data-citation-footnote] {
                    margin-left: 2px;
                    font-size: 0.78em;
                    line-height: 0;
                }

                .markdown-content sup[data-citation-footnote] a {
                    color: inherit;
                    text-decoration: none;
                }

                .markdown-content sup[data-citation-footnote] a:hover {
                    text-decoration: underline;
                }

                .empty-state {
                    padding: 28px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 14px;
                    text-align: center;
                    color: var(--chat-export-muted);
                    background: var(--chat-export-surface);
                }

                .document-sources {
                    margin-top: 32px;
                    padding-top: 18px;
                    border-top: 1px solid var(--chat-export-soft-border);
                }

                .document-sources-title {
                    margin: 0 0 10px;
                    font-size: 16px;
                    line-height: 1.25;
                }

                .document-sources-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                .document-sources-list li {
                    color: #475569;
                    font-size: 13px;
                    line-height: 1.45;
                    overflow-wrap: anywhere;
                }

                .document-footer {
                    margin-top: 28px;
                    padding-top: 16px;
                    border-top: 1px solid var(--chat-export-soft-border);
                    color: var(--chat-export-muted);
                    font-size: 12px;
                    text-align: center;
                }

                .document-footer strong {
                    color: #475569;
                }

                @page {
                    size: Letter;
                    margin: 0.5in;
                }

                @media print {
                    body,
                    .${CHAT_HTML_EXPORT_RENDER_ROOT_CLASS_NAME} {
                        background: #ffffff;
                        font-size: 12pt;
                    }

                    .document {
                        max-width: none;
                        padding: 0;
                    }

                    .message {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    .message-bubble {
                        box-shadow: none;
                    }

                    .markdown-content pre,
                    .message-supporting-list,
                    .reply-context {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <main class="document">
                <header class="document-header">
                    <p class="document-eyebrow">Conversation export</p>
                    <h1 class="document-title">${safeTitle}</h1>
                    ${exportedLabel ? `<p class="document-meta">Exported ${escapeHtml(exportedLabel)}</p>` : ''}
                </header>
                <section class="message-list">
                    ${messageMarkup}
                </section>
                ${documentSourcesMarkup}
                <footer class="document-footer">
                    <strong>${escapeHtml(branding.productName)}</strong>
                    ${branding.detailLines.length > 0 ? ` - ${escapeHtml(branding.detailLines.join(' • '))}` : ''}
                </footer>
            </main>
        </body>
        </html>
    `);
}

/**
 * HTML export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const htmlSaveFormatDefinition = {
    formatName: 'html',
    label: 'HTML',
    getContent: ({ title, messages, participants }) => buildChatHtml(title, messages, participants),
    mimeType: 'text/html',
    fileExtension: 'html',
} as const satisfies ChatSaveFormatDefinition;
