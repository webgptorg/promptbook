import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { resolveCitationPreviewUrl } from '../../utils/citationHelpers';
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
 * Converts one markdown message body to HTML with document-wide source references.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function renderFootnotedMarkdown(
    message: Pick<ChatMessage, 'content' | 'citations'>,
    citationFootnotes: ChatExportCitationFootnoteRegistry,
): { readonly html: string; readonly renderModel: ChatExportCitationRenderModel } {
    const renderModel = createChatExportCitationRenderModel(citationFootnotes, message);
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
 * Renders one message card for the standalone HTML export.
 *
 * @private Internal helper of `htmlSaveFormatDefinition`.
 */
function renderMessageBlock(
    message: ChatMessage,
    participants: ReadonlyMap<string, ChatParticipant>,
    citationFootnotes: ChatExportCitationFootnoteRegistry,
): string {
    const sender = String(message.sender || 'SYSTEM');
    const upperSender = sender.toUpperCase();
    const visuals = resolveChatExportParticipantVisuals(participants, sender);
    const timestamp = formatChatExportTimestamp(message.createdAt);
    const durationLabel =
        typeof message.generationDurationMs === 'number' ? `${(message.generationDurationMs / 1000).toFixed(1)}s` : '';
    const replyingToMarkup = buildReplyingToMarkup(message, citationFootnotes);
    const { html: messageBody, renderModel } = renderFootnotedMarkdown(message, citationFootnotes);

    return spaceTrim(`
        <article class="message-card" style="--message-accent:${escapeHtml(visuals.accentColor)};">
            <header class="message-header">
                <div class="message-header-main">
                    <span class="message-sender">${escapeHtml(visuals.displayName)}</span>
                    <span class="message-role">${escapeHtml(upperSender)}</span>
                </div>
                ${timestamp ? `<time class="message-time">${escapeHtml(timestamp)}</time>` : ''}
            </header>
            ${replyingToMarkup}
            <section class="message-content markdown-content">
                ${messageBody || '<p class="message-empty">No text provided.</p>'}
            </section>
            ${durationLabel ? `<p class="message-duration">Responded in ${escapeHtml(durationLabel)}</p>` : ''}
            ${buildAttachmentsMarkup(message)}
            ${renderModel.footnotes.length === 0 ? buildCitationsMarkup(message) : ''}
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
 * HTML export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const htmlSaveFormatDefinition = {
    formatName: 'html',
    label: 'HTML',
    getContent: ({ title, messages, participants }) => {
        const branding = getPromptbookExportBranding();
        const safeTitle = escapeHtml(title || 'Chat');
        const participantLookup = buildChatExportParticipantMap(participants);
        const citationFootnotes = createChatExportCitationFootnoteRegistry();
        const exportedLabel = formatChatExportTimestamp(new Date());
        const messageMarkup =
            messages.length > 0
                ? messages.map((message) => renderMessageBlock(message, participantLookup, citationFootnotes)).join('')
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
                    }

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        background: #f8fafc;
                        color: #0f172a;
                        font-family: Inter, "Segoe UI", Arial, sans-serif;
                    }

                    a {
                        color: #0f6cbd;
                    }

                    .document {
                        max-width: 860px;
                        margin: 0 auto;
                        padding: 32px 20px 48px;
                    }

                    .document-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid #e2e8f0;
                    }

                    .document-eyebrow {
                        margin: 0 0 8px;
                        font-size: 11px;
                        letter-spacing: 0.14em;
                        text-transform: uppercase;
                        color: #64748b;
                    }

                    .document-title {
                        margin: 0;
                        font-size: 30px;
                        line-height: 1.2;
                    }

                    .document-meta {
                        margin: 10px 0 0;
                        color: #475569;
                        font-size: 14px;
                    }

                    .message-list {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }

                    .message-card {
                        background: #ffffff;
                        border: 1px solid #dbe4f0;
                        border-left-width: 4px;
                        border-left-color: var(--message-accent, #64748b);
                        border-radius: 14px;
                        padding: 16px 18px;
                    }

                    .message-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 12px;
                    }

                    .message-header-main {
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        gap: 8px;
                    }

                    .message-sender {
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--message-accent, #0f172a);
                    }

                    .message-role {
                        font-size: 11px;
                        letter-spacing: 0.12em;
                        text-transform: uppercase;
                        color: #64748b;
                    }

                    .message-time,
                    .message-duration {
                        font-size: 12px;
                        color: #64748b;
                    }

                    .message-duration {
                        margin: 12px 0 0;
                    }

                    .message-empty {
                        color: #64748b;
                        font-style: italic;
                    }

                    .reply-context {
                        margin-bottom: 14px;
                        padding: 12px 14px;
                        border-radius: 10px;
                        border: 1px solid #e2e8f0;
                        background: #f8fafc;
                    }

                    .reply-context-title,
                    .message-supporting-title {
                        margin-bottom: 8px;
                        font-size: 11px;
                        letter-spacing: 0.12em;
                        text-transform: uppercase;
                        color: #64748b;
                    }

                    .message-supporting-list {
                        margin-top: 14px;
                        padding-top: 12px;
                        border-top: 1px solid #e2e8f0;
                    }

                    .message-supporting-list ul {
                        margin: 0;
                        padding-left: 18px;
                    }

                    .message-supporting-meta {
                        margin-right: 6px;
                        color: #64748b;
                        font-size: 12px;
                    }

                    .message-supporting-excerpt {
                        margin-top: 6px;
                        color: #475569;
                    }

                    .markdown-content {
                        font-size: 15px;
                        line-height: 1.65;
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
                        margin: 0 0 14px;
                    }

                    .markdown-content ul,
                    .markdown-content ol {
                        padding-left: 22px;
                    }

                    .markdown-content code {
                        font-family: ui-monospace, "SFMono-Regular", monospace;
                        background: #f1f5f9;
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
                        border: 1px solid #e2e8f0;
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
                        color: #0f6cbd;
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
                        color: #64748b;
                        background: #ffffff;
                    }

                    .document-sources {
                        margin-top: 24px;
                        padding-top: 16px;
                        border-top: 1px solid #e2e8f0;
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
                        margin-top: 24px;
                        padding-top: 16px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 12px;
                    }

                    .document-footer strong {
                        color: #475569;
                    }

                    @media print {
                        body {
                            background: #ffffff;
                        }

                        .document {
                            max-width: none;
                            padding: 0;
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
    },
    mimeType: 'text/html',
    fileExtension: 'html',
} as const satisfies ChatSaveFormatDefinition;
