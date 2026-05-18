import { jsPDF } from 'jspdf';
import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { renderMarkdown } from '../../utils/renderMarkdown';
import { getPromptbookExportBranding } from '../_common/getPromptbookExportBranding';

/**
 * Page format used for chat PDF exports.
 */
const PDF_PAGE_FORMAT = 'a4';

/**
 * Horizontal page margin used by jsPDF HTML rendering.
 */
const PDF_MARGIN_X_PT = 40;

/**
 * Top page margin used by jsPDF HTML rendering.
 */
const PDF_MARGIN_TOP_PT = 42;

/**
 * Bottom page margin used by jsPDF HTML rendering.
 */
const PDF_MARGIN_BOTTOM_PT = 54;

/**
 * Width used for the off-screen HTML layout before rendering it into PDF.
 */
const PDF_RENDER_WIDTH_PX = 760;

/**
 * Footer font size for generated PDF pages.
 */
const PDF_FOOTER_FONT_SIZE_PT = 9;

/**
 * Footer text color for generated PDF pages.
 */
const PDF_FOOTER_TEXT_COLOR_RED = 100;
const PDF_FOOTER_TEXT_COLOR_GREEN = 116;
const PDF_FOOTER_TEXT_COLOR_BLUE = 139;

/**
 * Footer text color for generated PDF pages.
 */
const PDF_FOOTER_TEXT_COLOR_RGB = [
    PDF_FOOTER_TEXT_COLOR_RED,
    PDF_FOOTER_TEXT_COLOR_GREEN,
    PDF_FOOTER_TEXT_COLOR_BLUE,
] as const;

/**
 * Escapes HTML-sensitive text before embedding it into export markup.
 *
 * @private helper of chat PDF export
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
 * Escapes XML-sensitive text before embedding it into XMP metadata.
 *
 * @private helper of chat PDF export
 */
function escapeXml(value: string): string {
    return escapeHtml(value);
}

/**
 * Formats a timestamp into a compact human-readable label.
 *
 * @private helper of chat PDF export
 */
function formatTimestamp(value?: string | Date): string {
    if (!value) {
        return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

/**
 * Resolves the display label for one message sender.
 *
 * @private helper of chat PDF export
 */
function resolveSenderLabel(sender: unknown, participants: ReadonlyMap<string, ChatParticipant>): string {
    const normalizedSender = String(sender || 'SYSTEM');
    const participant = participants.get(normalizedSender) ?? participants.get(normalizedSender.toUpperCase());
    return participant?.fullname?.trim() || normalizedSender;
}

/**
 * Builds a participant lookup by both raw and upper-cased participant names.
 *
 * @private helper of chat PDF export
 */
function createParticipantLookup(participants: ReadonlyArray<ChatParticipant>): ReadonlyMap<string, ChatParticipant> {
    const lookup = new Map<string, ChatParticipant>();

    for (const participant of participants) {
        const participantName = String(participant.name);
        lookup.set(participantName, participant);
        lookup.set(participantName.toUpperCase(), participant);
    }

    return lookup;
}

/**
 * Renders simple attachment chips for one exported message.
 *
 * @private helper of chat PDF export
 */
function renderAttachmentsMarkup(message: ChatMessage): string {
    if (!message.attachments?.length) {
        return '';
    }

    return spaceTrim(`
        <div class="message-supporting-list">
            <div class="supporting-title">Attachments</div>
            <ul>
                ${message.attachments
                    .map((attachment) => {
                        const name = escapeHtml(attachment.name || 'Attachment');
                        const type = escapeHtml(attachment.type || 'file');
                        const url = attachment.url
                            ? ` <a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener">${name}</a>`
                            : ` ${name}`;

                        return `<li><span class="supporting-meta">${type}</span>${url}</li>`;
                    })
                    .join('')}
            </ul>
        </div>
    `);
}

/**
 * Renders citations for one exported message.
 *
 * @private helper of chat PDF export
 */
function renderCitationsMarkup(message: ChatMessage): string {
    if (!message.citations?.length) {
        return '';
    }

    return spaceTrim(`
        <div class="message-supporting-list">
            <div class="supporting-title">Sources</div>
            <ul>
                ${message.citations
                    .map((citation) => {
                        const excerpt = citation.excerpt
                            ? `<div class="supporting-excerpt">${escapeHtml(citation.excerpt)}</div>`
                            : '';
                        const link = citation.url
                            ? ` <a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener">Open source</a>`
                            : '';

                        return `
                            <li>
                                <strong>${escapeHtml(citation.id)}</strong> ${escapeHtml(citation.source)}
                                ${link}
                                ${excerpt}
                            </li>
                        `;
                    })
                    .join('')}
            </ul>
        </div>
    `);
}

/**
 * Renders reply context for one exported message.
 *
 * @private helper of chat PDF export
 */
function renderReplyingToMarkup(message: ChatMessage): string {
    if (!message.replyingTo) {
        return '';
    }

    return spaceTrim(`
        <aside class="reply-context">
            <div class="reply-context-title">Replying to ${escapeHtml(message.replyingTo.sender)}</div>
            <div class="reply-context-content">${renderMarkdown(message.replyingTo.content)}</div>
        </aside>
    `);
}

/**
 * Renders one chat message block as export-friendly HTML.
 *
 * @private helper of chat PDF export
 */
function renderMessageMarkup(message: ChatMessage, participants: ReadonlyMap<string, ChatParticipant>): string {
    const sender = String(message.sender || 'SYSTEM').toUpperCase();
    const roleClass = sender === 'USER' ? 'user' : sender === 'ASSISTANT' ? 'assistant' : 'system';
    const senderLabel = escapeHtml(resolveSenderLabel(message.sender, participants));
    const timestamp = formatTimestamp(message.createdAt);
    const roleLabel = escapeHtml(sender);
    const durationLabel =
        typeof message.generationDurationMs === 'number' ? `${(message.generationDurationMs / 1000).toFixed(1)}s` : '';
    const messageContent = renderMarkdown(message.content);
    const messageBody = messageContent || '<p class="message-empty">No text provided.</p>';

    return spaceTrim(`
        <article class="message-card message-card-${roleClass}">
            <header class="message-header">
                <div>
                    <div class="message-sender">${senderLabel}</div>
                    <div class="message-role">${roleLabel}</div>
                </div>
                <div class="message-meta">
                    ${timestamp ? `<div>${escapeHtml(timestamp)}</div>` : ''}
                    ${durationLabel ? `<div>${escapeHtml(durationLabel)}</div>` : ''}
                </div>
            </header>
            ${renderReplyingToMarkup(message)}
            <section class="message-body">${messageBody}</section>
            ${renderAttachmentsMarkup(message)}
            ${renderCitationsMarkup(message)}
        </article>
    `);
}

/**
 * Creates the off-screen HTML document used for PDF rendering.
 *
 * @private helper of chat PDF export
 */
function createPdfExportMarkup(
    title: string,
    messages: ReadonlyArray<ChatMessage>,
    participants: ReadonlyArray<ChatParticipant>,
): string {
    const branding = getPromptbookExportBranding();
    const safeTitle = escapeHtml(title || 'Chat');
    const participantLookup = createParticipantLookup(participants);
    const exportedAtLabel = formatTimestamp(new Date());
    const participantCount = new Set(participants.map((participant) => String(participant.name))).size;
    const messageMarkup =
        messages.length > 0
            ? messages.map((message) => renderMessageMarkup(message, participantLookup)).join('')
            : '<div class="empty-state">No messages were available in this chat export.</div>';

    return spaceTrim(`
        <div class="pdf-export-root">
            <style>
                .pdf-export-root {
                    width: ${PDF_RENDER_WIDTH_PX}px;
                    background: #ffffff;
                    color: #0f172a;
                    font-family: Inter, "Segoe UI", Arial, sans-serif;
                    line-height: 1.55;
                }

                .pdf-export-root * {
                    box-sizing: border-box;
                }

                .pdf-export-root a {
                    color: #0f6cbd;
                    text-decoration: none;
                }

                .pdf-export-root h1,
                .pdf-export-root h2,
                .pdf-export-root h3,
                .pdf-export-root h4,
                .pdf-export-root h5,
                .pdf-export-root h6 {
                    margin: 0 0 10px;
                    line-height: 1.25;
                }

                .pdf-export-root p,
                .pdf-export-root ul,
                .pdf-export-root ol,
                .pdf-export-root blockquote,
                .pdf-export-root pre,
                .pdf-export-root table {
                    margin: 0 0 14px;
                }

                .pdf-export-root code {
                    font-family: ui-monospace, "SFMono-Regular", monospace;
                    background: #f1f5f9;
                    padding: 1px 5px;
                    border-radius: 4px;
                    font-size: 0.94em;
                }

                .pdf-export-root pre {
                    background: #0f172a;
                    color: #e2e8f0;
                    border-radius: 10px;
                    padding: 14px 16px;
                    overflow: hidden;
                    white-space: pre-wrap;
                }

                .pdf-export-root pre code {
                    background: transparent;
                    color: inherit;
                    padding: 0;
                }

                .pdf-export-root blockquote {
                    border-left: 4px solid #cbd5e1;
                    padding: 2px 0 2px 14px;
                    color: #334155;
                }

                .pdf-export-root table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }

                .pdf-export-root th,
                .pdf-export-root td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 10px;
                    text-align: left;
                    vertical-align: top;
                }

                .pdf-export-root th {
                    background: #f8fafc;
                    font-weight: 600;
                }

                .pdf-export-root img {
                    max-width: 100%;
                    border-radius: 8px;
                }

                .document {
                    padding: 20px 20px 10px;
                }

                .document-header {
                    padding: 0 0 18px;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 20px;
                }

                .document-eyebrow {
                    margin: 0 0 6px;
                    font-size: 11px;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: #64748b;
                }

                .document-title {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                }

                .document-subtitle {
                    margin: 8px 0 0;
                    font-size: 14px;
                    color: #475569;
                }

                .document-stats {
                    margin-top: 16px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .document-stat {
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 999px;
                    font-size: 12px;
                    color: #334155;
                    background: #f8fafc;
                }

                .message-list {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .message-card {
                    border: 1px solid #dbe4f0;
                    border-left-width: 5px;
                    border-radius: 14px;
                    padding: 16px 18px;
                    background: #ffffff;
                    break-inside: avoid;
                }

                .message-card-user {
                    border-left-color: #0ea5e9;
                }

                .message-card-assistant {
                    border-left-color: #2563eb;
                }

                .message-card-system {
                    border-left-color: #64748b;
                }

                .message-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 12px;
                }

                .message-sender {
                    font-size: 16px;
                    font-weight: 600;
                }

                .message-role {
                    margin-top: 2px;
                    font-size: 11px;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: #64748b;
                }

                .message-meta {
                    font-size: 12px;
                    color: #64748b;
                    text-align: right;
                }

                .message-body {
                    font-size: 15px;
                }

                .message-empty {
                    color: #64748b;
                    font-style: italic;
                }

                .reply-context {
                    margin-bottom: 14px;
                    padding: 12px 14px;
                    border-radius: 10px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                }

                .reply-context-title,
                .supporting-title {
                    font-size: 11px;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: #64748b;
                    margin-bottom: 8px;
                }

                .reply-context-content > *:last-child,
                .message-supporting-list ul {
                    margin-bottom: 0;
                }

                .message-supporting-list {
                    margin-top: 14px;
                    padding-top: 12px;
                    border-top: 1px solid #e2e8f0;
                }

                .message-supporting-list ul {
                    padding-left: 18px;
                }

                .supporting-meta {
                    color: #64748b;
                    font-size: 12px;
                    margin-right: 6px;
                }

                .supporting-excerpt {
                    margin-top: 6px;
                    color: #475569;
                }

                .empty-state {
                    padding: 28px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 14px;
                    text-align: center;
                    color: #64748b;
                    background: #f8fafc;
                }

                .document-footer {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #e2e8f0;
                    font-size: 12px;
                    color: #64748b;
                }

                .document-footer strong {
                    color: #0f172a;
                    font-weight: 600;
                }
            </style>

            <div class="document">
                <header class="document-header">
                    <p class="document-eyebrow">Chat export</p>
                    <h1 class="document-title">${safeTitle}</h1>
                    <p class="document-subtitle">A clean PDF snapshot of your Promptbook conversation.</p>
                    <div class="document-stats">
                        <span class="document-stat">${escapeHtml(`${messages.length} messages`)}</span>
                        <span class="document-stat">${escapeHtml(`${participantCount} participants`)}</span>
                        <span class="document-stat">${escapeHtml(`Exported ${exportedAtLabel}`)}</span>
                    </div>
                </header>

                <section class="message-list">
                    ${messageMarkup}
                </section>

                <footer class="document-footer">
                    <strong>${escapeHtml(branding.productName)}</strong>
                    <span> ${escapeHtml(branding.detailLines.join(' • '))}</span>
                </footer>
            </div>
        </div>
    `);
}

/**
 * Creates XMP metadata for one exported chat PDF.
 *
 * @private helper of chat PDF export
 */
function createPromptbookPdfMetadataXml(title: string, brandingSummary: string, creatorTool: string): string {
    return spaceTrim(`
        <x:xmpmeta xmlns:x="adobe:ns:meta/">
            <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
                <rdf:Description
                    rdf:about=""
                    xmlns:dc="http://purl.org/dc/elements/1.1/"
                    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
                    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
                >
                    <dc:title>
                        <rdf:Alt>
                            <rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li>
                        </rdf:Alt>
                    </dc:title>
                    <dc:description>
                        <rdf:Alt>
                            <rdf:li xml:lang="x-default">${escapeXml(brandingSummary)}</rdf:li>
                        </rdf:Alt>
                    </dc:description>
                    <dc:creator>
                        <rdf:Seq>
                            <rdf:li>${escapeXml('Promptbook')}</rdf:li>
                        </rdf:Seq>
                    </dc:creator>
                    <pdf:Keywords>${escapeXml(brandingSummary)}</pdf:Keywords>
                    <xmp:CreatorTool>${escapeXml(creatorTool)}</xmp:CreatorTool>
                </rdf:Description>
            </rdf:RDF>
        </x:xmpmeta>
    `);
}

/**
 * Waits for the browser to flush layout before jsPDF reads the HTML tree.
 *
 * @private helper of chat PDF export
 */
function waitForNextAnimationFrame(): Promise<void> {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}

/**
 * Builds a branded, markdown-aware PDF representation of the provided chat.
 *
 * @param title - Title of the exported chat.
 * @param messages - Messages that should be included in the PDF export.
 * @param participants - Optional participant metadata to resolve sender names.
 * @returns Binary data for the generated PDF file.
 *
 * @private Internal helper used by `pdfSaveFormatDefinition`.
 */
export async function buildChatPdf(
    title: string,
    messages: ReadonlyArray<ChatMessage>,
    participants: ReadonlyArray<ChatParticipant> = [],
): Promise<Uint8Array> {
    const branding = getPromptbookExportBranding();
    const documentTitle = `${title || 'Chat'} · ${branding.productName}`;
    const exportMarkup = createPdfExportMarkup(title, messages, participants);
    const exportContainer = window.document.createElement('div');

    exportContainer.innerHTML = exportMarkup;
    exportContainer.style.position = 'fixed';
    exportContainer.style.left = '-10000px';
    exportContainer.style.top = '0';
    exportContainer.style.width = `${PDF_RENDER_WIDTH_PX}px`;
    exportContainer.style.pointerEvents = 'none';
    exportContainer.style.zIndex = '-1';
    exportContainer.setAttribute('aria-hidden', 'true');
    window.document.body.appendChild(exportContainer);

    try {
        await waitForNextAnimationFrame();

        const pdf = new jsPDF({
            unit: 'pt',
            format: PDF_PAGE_FORMAT,
        });

        pdf.setCreationDate(new Date());
        pdf.setDocumentProperties({
            title: documentTitle,
            subject: branding.metadataSummary,
            author: branding.productName,
            creator: branding.creatorTool,
            keywords: branding.keywords.join(', '),
        });
        pdf.addMetadata(
            createPromptbookPdfMetadataXml(documentTitle, branding.metadataSummary, branding.creatorTool),
            true,
        );

        await pdf.html(exportContainer, {
            margin: [PDF_MARGIN_TOP_PT, PDF_MARGIN_X_PT, PDF_MARGIN_BOTTOM_PT, PDF_MARGIN_X_PT],
            autoPaging: 'text',
            width: pdf.internal.pageSize.getWidth() - PDF_MARGIN_X_PT * 2,
            windowWidth: PDF_RENDER_WIDTH_PX,
            html2canvas: {
                backgroundColor: '#ffffff',
                scale: 1,
                useCORS: true,
            },
        });

        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageCount = pdf.getNumberOfPages();

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
            pdf.setPage(pageNumber);
            pdf.setFont('Helvetica', 'normal');
            pdf.setFontSize(PDF_FOOTER_FONT_SIZE_PT);
            pdf.setTextColor(...PDF_FOOTER_TEXT_COLOR_RGB);
            pdf.text(branding.productName, PDF_MARGIN_X_PT, pageHeight - 20);
            pdf.text(`${pageNumber} / ${pageCount}`, pageWidth - PDF_MARGIN_X_PT, pageHeight - 20, {
                align: 'right',
            });
        }

        return new Uint8Array(pdf.output('arraybuffer'));
    } finally {
        exportContainer.remove();
    }
}
