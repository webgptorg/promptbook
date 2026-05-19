import { jsPDF } from 'jspdf';
import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { renderMarkdown } from '../../utils/renderMarkdown';
import {
    buildChatExportParticipantMap,
    formatChatExportTimestamp,
    resolveChatExportParticipantVisuals,
} from '../_common/chatExportRendering';
import { getPromptbookExportBranding } from '../_common/getPromptbookExportBranding';

/**
 * Constant for PDF page margin pt.
 */
const PDF_PAGE_MARGIN_PT = 44;

/**
 * Constant for PDF footer margin pt.
 */
const PDF_FOOTER_MARGIN_PT = 28;

/**
 * Constant for PDF body font size pt.
 */
const PDF_BODY_FONT_SIZE_PT = 10.5;

/**
 * Constant for PDF small font size pt.
 */
const PDF_SMALL_FONT_SIZE_PT = 8;

/**
 * Constant for PDF body line height pt.
 */
const PDF_BODY_LINE_HEIGHT_PT = 14.5;

/**
 * Constant for PDF code line height pt.
 */
const PDF_CODE_LINE_HEIGHT_PT = 13;

/**
 * Line height used for the PDF document title.
 */
const PDF_TITLE_LINE_HEIGHT_PT = 25;

/**
 * Width used for subtle divider lines.
 */
const PDF_SUBTLE_LINE_WIDTH_PT = 0.6;

/**
 * Standard indent used by nested PDF content.
 */
const PDF_NESTED_INDENT_PT = 12;

/**
 * Minimum vertical room reserved before starting a message.
 */
const PDF_MESSAGE_MIN_SPACE_PT = 44;

/**
 * Horizontal room reserved for the timestamp in message headers.
 */
const PDF_HEADER_TIMESTAMP_GAP_PT = 12;

/**
 * Horizontal room reserved for the role label in message headers.
 */
const PDF_HEADER_ROLE_RESERVED_WIDTH_PT = 48;

/**
 * Font size used for level-three PDF headings.
 */
const PDF_HEADING_LEVEL_THREE_FONT_SIZE_PT = 12.5;

/**
 * Font size used for smaller PDF headings.
 */
const PDF_HEADING_SMALL_FONT_SIZE_PT = 11.5;

/**
 * Line height multiplier used for PDF headings.
 */
const PDF_HEADING_LINE_HEIGHT_MULTIPLIER = 1.25;

/**
 * Minimum width left for nested list content.
 */
const PDF_LIST_MIN_WIDTH_PT = 80;

/**
 * Width reserved for ordered list markers.
 */
const PDF_ORDERED_LIST_MARKER_WIDTH_PT = 20;

/**
 * Width reserved for unordered list markers.
 */
const PDF_UNORDERED_LIST_MARKER_WIDTH_PT = 12;

/**
 * Extra vertical room reserved around code block lines.
 */
const PDF_CODE_LINE_EXTRA_SPACE_PT = 4;

/**
 * Baseline offset for code block backgrounds.
 */
const PDF_CODE_BACKGROUND_BASELINE_OFFSET_PT = 9.5;

/**
 * Border width used for table cells.
 */
const PDF_TABLE_BORDER_WIDTH_PT = 0.4;

/**
 * Line height used inside table cells.
 */
const PDF_TABLE_CELL_LINE_HEIGHT_PT = 11;

/**
 * Default line height multiplier for inline text.
 */
const PDF_INLINE_LINE_HEIGHT_MULTIPLIER = 1.35;

/**
 * Padding around inline code backgrounds.
 */
const PDF_INLINE_CODE_BACKGROUND_PADDING_PT = 1.5;

/**
 * Width of underlines drawn under PDF links.
 */
const PDF_LINK_UNDERLINE_WIDTH_PT = 0.3;

/**
 * Baseline offset for link underlines.
 */
const PDF_LINK_UNDERLINE_OFFSET_PT = 1.2;

/**
 * Maximum font size for inline code.
 */
const PDF_INLINE_CODE_MAX_FONT_SIZE_PT = 9.2;

/**
 * Font size multiplier for superscript text.
 */
const PDF_SUPERSCRIPT_FONT_SIZE_MULTIPLIER = 0.75;

/**
 * Gap between footer text and page numbers.
 */
const PDF_FOOTER_PAGE_LABEL_GAP_PT = 16;

/**
 * Distance between the page bottom and footer baseline.
 */
const PDF_FOOTER_BASELINE_OFFSET_PT = 18;

/**
 * Default text color used in PDF exports.
 */
const PDF_TEXT_COLOR = '#0f172a';

/**
 * Muted text color used in PDF exports.
 */
const PDF_MUTED_TEXT_COLOR = '#64748b';

/**
 * Light border color used in PDF exports.
 */
const PDF_BORDER_COLOR = '#dbe4f0';

/**
 * Light surface color used in PDF exports.
 */
const PDF_SURFACE_COLOR = '#f8fafc';

/**
 * Code background color used in PDF exports.
 */
const PDF_CODE_BACKGROUND_COLOR = '#f1f5f9';

/**
 * Link text color used in PDF exports.
 */
const PDF_LINK_COLOR = '#0f6cbd';

/**
 * Node type value for element nodes.
 */
const ELEMENT_NODE = 1;

/**
 * Node type value for text nodes.
 */
const TEXT_NODE = 3;

/**
 * Markdown block elements that should be rendered as standalone PDF blocks.
 */
const BLOCK_TAG_NAMES = new Set([
    'address',
    'article',
    'aside',
    'blockquote',
    'details',
    'div',
    'dl',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'ul',
]);

/**
 * Font families used by the PDF renderer.
 */
type PdfFontFamily = 'helvetica' | 'courier';

/**
 * Font styles supported by built-in jsPDF fonts.
 */
type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

/**
 * Text styling used while laying out inline markdown content.
 */
type PdfTextStyle = {
    fontFamily: PdfFontFamily;
    fontSize: number;
    fontStyle: PdfFontStyle;
    textColor: string;
    backgroundColor?: string;
    href?: string;
};

/**
 * Inline token emitted from rendered markdown HTML.
 */
type PdfInlineToken =
    | {
          readonly kind: 'text';
          readonly text: string;
          readonly style: Partial<PdfTextStyle>;
      }
    | {
          readonly kind: 'break';
      };

/**
 * Mutable layout state for one PDF document.
 */
type PdfRenderContext = {
    readonly pdf: jsPDF;
    readonly pageWidth: number;
    readonly pageHeight: number;
    readonly contentWidth: number;
    pageNumber: number;
    cursorY: number;
};

/**
 * Options for rendering one markdown block group.
 */
type PdfBlockRenderOptions = {
    readonly x: number;
    readonly width: number;
    readonly textStyle?: Partial<PdfTextStyle>;
    readonly listDepth?: number;
};

/**
 * Options for rendering wrapped inline content.
 */
type WriteInlineTokensOptions = {
    readonly x: number;
    readonly width: number;
    readonly textStyle?: Partial<PdfTextStyle>;
    readonly lineHeight?: number;
    readonly marginBottom?: number;
    readonly shouldPreserveWhitespace?: boolean;
};

/**
 * Builds a polished PDF representation of the provided chat.
 *
 * @param title - Title used in the PDF heading and metadata.
 * @param messages - Messages that should be included in the PDF export.
 * @param participants - Optional participant metadata to resolve sender names.
 * @returns Binary data for the generated PDF file.
 *
 * @private Internal helper used by `pdfSaveFormatDefinition`.
 */
export function buildChatPdf(
    title: string,
    messages: ReadonlyArray<ChatMessage>,
    participants?: ReadonlyArray<ChatParticipant>,
): Uint8Array {
    const pdf = new jsPDF({
        unit: 'pt',
        format: 'letter',
    });
    const context: PdfRenderContext = {
        pdf,
        pageWidth: pdf.internal.pageSize.getWidth(),
        pageHeight: pdf.internal.pageSize.getHeight(),
        contentWidth: pdf.internal.pageSize.getWidth() - PDF_PAGE_MARGIN_PT * 2,
        pageNumber: 1,
        cursorY: PDF_PAGE_MARGIN_PT,
    };
    const branding = getPromptbookExportBranding();

    applyPromptbookPdfMetadata(pdf, title, branding);
    renderDocumentHeader(context, title || 'Chat');

    const participantLookup = buildChatExportParticipantMap(participants || []);

    if (messages.length === 0) {
        writeInlineTokens(context, [{ kind: 'text', text: 'No messages were available in this chat export.', style: {} }], {
            x: PDF_PAGE_MARGIN_PT,
            width: context.contentWidth,
            textStyle: { textColor: PDF_MUTED_TEXT_COLOR, fontStyle: 'italic' },
        });
    } else {
        messages.forEach((message, index) => {
            renderMessageBlock(context, message, participantLookup, index > 0);
        });
    }

    drawPageFooters(context, branding);

    return new Uint8Array(pdf.output('arraybuffer'));
}

/**
 * Adds Promptbook and version metadata into the PDF document information and XMP metadata.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function applyPromptbookPdfMetadata(
    pdf: jsPDF,
    title: string,
    branding: ReturnType<typeof getPromptbookExportBranding>,
): void {
    const metadataTitle = title || 'Chat';
    const metadataDescription = [branding.metadataSummary, ...branding.detailLines].join(' ');

    pdf.setProperties({
        title: metadataTitle,
        subject: metadataDescription,
        author: branding.productName,
        creator: branding.creatorTool,
        keywords: branding.keywords.join(', '),
    });

    pdf.addMetadata(
        spaceTrim(`
            <x:xmpmeta xmlns:x="adobe:ns:meta/">
                <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
                    <rdf:Description
                        rdf:about=""
                        xmlns:dc="http://purl.org/dc/elements/1.1/"
                        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
                        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
                        xmlns:promptbook="https://promptbook.studio/ns/export/1.0/"
                    >
                        <dc:title>
                            <rdf:Alt>
                                <rdf:li xml:lang="x-default">${escapeXml(metadataTitle)}</rdf:li>
                            </rdf:Alt>
                        </dc:title>
                        <dc:creator>
                            <rdf:Seq>
                                <rdf:li>${escapeXml(branding.productName)}</rdf:li>
                            </rdf:Seq>
                        </dc:creator>
                        <dc:description>
                            <rdf:Alt>
                                <rdf:li xml:lang="x-default">${escapeXml(metadataDescription)}</rdf:li>
                            </rdf:Alt>
                        </dc:description>
                        <xmp:CreatorTool>${escapeXml(branding.creatorTool)}</xmp:CreatorTool>
                        <pdf:Keywords>${escapeXml(branding.keywords.join(', '))}</pdf:Keywords>
                        <promptbook:Branding>${escapeXml(branding.commentLines.join(' | '))}</promptbook:Branding>
                    </rdf:Description>
                </rdf:RDF>
            </x:xmpmeta>
        `),
        true,
    );
}

/**
 * Renders the document title and export timestamp.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderDocumentHeader(context: PdfRenderContext, title: string): void {
    const exportedLabel = formatChatExportTimestamp(new Date());

    setPdfTextStyle(context.pdf, {
        fontFamily: 'helvetica',
        fontSize: PDF_SMALL_FONT_SIZE_PT,
        fontStyle: 'bold',
        textColor: PDF_MUTED_TEXT_COLOR,
    });
    context.pdf.text('CONVERSATION EXPORT', PDF_PAGE_MARGIN_PT, context.cursorY);
    context.cursorY += 18;

    setPdfTextStyle(context.pdf, {
        fontFamily: 'helvetica',
        fontSize: 22,
        fontStyle: 'bold',
        textColor: PDF_TEXT_COLOR,
    });
    const titleLines = context.pdf.splitTextToSize(title, context.contentWidth) as string[];
    for (const line of titleLines) {
        ensureSpace(context, PDF_TITLE_LINE_HEIGHT_PT);
        context.pdf.text(line, PDF_PAGE_MARGIN_PT, context.cursorY);
        context.cursorY += PDF_TITLE_LINE_HEIGHT_PT;
    }

    if (exportedLabel) {
        setPdfTextStyle(context.pdf, {
            fontFamily: 'helvetica',
            fontSize: 9.5,
            fontStyle: 'normal',
            textColor: PDF_MUTED_TEXT_COLOR,
        });
        context.pdf.text(`Exported ${exportedLabel}`, PDF_PAGE_MARGIN_PT, context.cursorY);
        context.cursorY += 16;
    }

    setPdfStrokeColor(context.pdf, PDF_BORDER_COLOR);
    context.pdf.setLineWidth(PDF_SUBTLE_LINE_WIDTH_PT);
    context.pdf.line(PDF_PAGE_MARGIN_PT, context.cursorY, context.pageWidth - PDF_PAGE_MARGIN_PT, context.cursorY);
    context.cursorY += 20;
}

/**
 * Renders one chat message with sender metadata and markdown content.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderMessageBlock(
    context: PdfRenderContext,
    message: ChatMessage,
    participants: ReadonlyMap<string, ChatParticipant>,
    hasPreviousMessage: boolean,
): void {
    if (hasPreviousMessage) {
        addVerticalSpace(context, PDF_NESTED_INDENT_PT);
    }

    ensureSpace(context, PDF_MESSAGE_MIN_SPACE_PT);

    const sender = String(message.sender || 'SYSTEM');
    const upperSender = sender.toUpperCase();
    const visuals = resolveChatExportParticipantVisuals(participants, sender);
    const accentColor = normalizePdfColor(visuals.accentColor, PDF_MUTED_TEXT_COLOR);
    const timestamp = formatChatExportTimestamp(message.createdAt);
    const startPage = context.pageNumber;
    const startY = context.cursorY;
    const contentX = PDF_PAGE_MARGIN_PT + PDF_NESTED_INDENT_PT;
    const contentWidth = context.contentWidth - PDF_NESTED_INDENT_PT;

    renderMessageHeader(context, {
        senderLabel: visuals.displayName,
        roleLabel: upperSender,
        timestamp,
        accentColor,
        x: contentX,
        width: contentWidth,
    });

    if (message.replyingTo) {
        renderReplyContext(context, message.replyingTo, contentX, contentWidth);
    }

    if (message.content.trim()) {
        renderMarkdownContent(context, message.content, {
            x: contentX,
            width: contentWidth,
        });
    } else {
        writeInlineTokens(context, [{ kind: 'text', text: 'No text provided.', style: {} }], {
            x: contentX,
            width: contentWidth,
            textStyle: { textColor: PDF_MUTED_TEXT_COLOR, fontStyle: 'italic' },
            marginBottom: 4,
        });
    }

    if (typeof message.generationDurationMs === 'number') {
        writeInlineTokens(
            context,
            [
                {
                    kind: 'text',
                    text: `Responded in ${(message.generationDurationMs / 1000).toFixed(1)}s`,
                    style: {},
                },
            ],
            {
                x: contentX,
                width: contentWidth,
                textStyle: { fontSize: PDF_SMALL_FONT_SIZE_PT, textColor: PDF_MUTED_TEXT_COLOR },
                marginBottom: 4,
            },
        );
    }

    renderAttachments(context, message, contentX, contentWidth);
    renderCitations(context, message, contentX, contentWidth);

    if (startPage === context.pageNumber) {
        setPdfStrokeColor(context.pdf, accentColor);
        context.pdf.setLineWidth(3);
        context.pdf.line(PDF_PAGE_MARGIN_PT, startY - 2, PDF_PAGE_MARGIN_PT, Math.max(startY + 20, context.cursorY - 2));
    }
}

/**
 * Renders the header of one message block.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderMessageHeader(
    context: PdfRenderContext,
    options: {
        readonly senderLabel: string;
        readonly roleLabel: string;
        readonly timestamp: string;
        readonly accentColor: string;
        readonly x: number;
        readonly width: number;
    },
): void {
    const timestampWidth = options.timestamp
        ? context.pdf.getTextWidth(options.timestamp) + PDF_HEADER_TIMESTAMP_GAP_PT
        : 0;
    const headerWidth = Math.max(100, options.width - timestampWidth);

    setPdfTextStyle(context.pdf, {
        fontFamily: 'helvetica',
        fontSize: 12,
        fontStyle: 'bold',
        textColor: options.accentColor,
    });
    const senderLines = context.pdf.splitTextToSize(options.senderLabel, headerWidth) as string[];

    for (const line of senderLines) {
        ensureSpace(context, 16);
        context.pdf.text(line, options.x, context.cursorY);

        if (line === senderLines[0]) {
            const roleX = Math.min(
                options.x + context.pdf.getTextWidth(line) + PDF_CODE_LINE_EXTRA_SPACE_PT * 2,
                options.x + headerWidth - PDF_HEADER_ROLE_RESERVED_WIDTH_PT,
            );
            setPdfTextStyle(context.pdf, {
                fontFamily: 'helvetica',
                fontSize: PDF_SMALL_FONT_SIZE_PT,
                fontStyle: 'normal',
                textColor: PDF_MUTED_TEXT_COLOR,
            });
            context.pdf.text(options.roleLabel, roleX, context.cursorY);

            if (options.timestamp) {
                const timestampX = options.x + options.width - context.pdf.getTextWidth(options.timestamp);
                context.pdf.text(options.timestamp, timestampX, context.cursorY);
            }

            setPdfTextStyle(context.pdf, {
                fontFamily: 'helvetica',
                fontSize: 12,
                fontStyle: 'bold',
                textColor: options.accentColor,
            });
        }

        context.cursorY += 16;
    }

    context.cursorY += 2;
}

/**
 * Renders quoted reply context for one message.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderReplyContext(
    context: PdfRenderContext,
    replyingTo: NonNullable<ChatMessage['replyingTo']>,
    x: number,
    width: number,
): void {
    writeInlineTokens(
        context,
        [
            {
                kind: 'text',
                text: `Replying to ${replyingTo.sender}`,
                style: { fontStyle: 'bold' },
            },
        ],
        {
            x,
            width,
            textStyle: { fontSize: PDF_SMALL_FONT_SIZE_PT, textColor: PDF_MUTED_TEXT_COLOR },
            lineHeight: 11,
            marginBottom: 3,
        },
    );
    renderMarkdownContent(context, replyingTo.content, {
        x: x + 10,
        width: width - 10,
        textStyle: { fontSize: 9.2, textColor: '#334155' },
    });
    addVerticalSpace(context, 4);
}

/**
 * Renders attachment metadata after a message.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderAttachments(context: PdfRenderContext, message: ChatMessage, x: number, width: number): void {
    if (!message.attachments?.length) {
        return;
    }

    renderSupportingList(
        context,
        'Attachments',
        message.attachments.map((attachment) => ({
            label: `${attachment.type || 'file'}: ${attachment.name || 'Attachment'}`,
            href: attachment.url,
        })),
        x,
        width,
    );
}

/**
 * Renders citation metadata after a message.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderCitations(context: PdfRenderContext, message: ChatMessage, x: number, width: number): void {
    if (!message.citations?.length) {
        return;
    }

    renderSupportingList(
        context,
        'Sources',
        message.citations.map((citation) => ({
            label: `${citation.id} ${citation.source}${citation.excerpt ? ` - ${citation.excerpt}` : ''}`,
            href: citation.url,
        })),
        x,
        width,
    );
}

/**
 * Renders a compact supporting list such as attachments or citations.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderSupportingList(
    context: PdfRenderContext,
    title: string,
    items: ReadonlyArray<{ readonly label: string; readonly href?: string }>,
    x: number,
    width: number,
): void {
    addVerticalSpace(context, 4);
    writeInlineTokens(context, [{ kind: 'text', text: title, style: { fontStyle: 'bold' } }], {
        x,
        width,
        textStyle: { fontSize: PDF_SMALL_FONT_SIZE_PT, textColor: PDF_MUTED_TEXT_COLOR },
        lineHeight: 11,
        marginBottom: 2,
    });

    for (const item of items) {
        writeInlineTokens(
            context,
            [
                { kind: 'text', text: '- ', style: {} },
                {
                    kind: 'text',
                    text: item.label,
                    style: item.href ? { href: item.href, textColor: PDF_LINK_COLOR } : {},
                },
            ],
            {
                x: x + 8,
                width: width - 8,
                textStyle: { fontSize: 9, textColor: PDF_MUTED_TEXT_COLOR },
                lineHeight: 12,
                marginBottom: 1,
            },
        );
    }
}

/**
 * Converts chat markdown to HTML using the shared renderer and lays it out into the PDF.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderMarkdownContent(context: PdfRenderContext, markdown: string, options: PdfBlockRenderOptions): void {
    const html = renderMarkdown(markdown);
    const fragment = createHtmlFragment(html);

    if (!fragment) {
        writeInlineTokens(context, [{ kind: 'text', text: markdown, style: {} }], options);
        return;
    }

    renderBlockChildren(context, fragment, options);
}

/**
 * Creates a detached DOM fragment from rendered markdown HTML when DOM APIs are available.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function createHtmlFragment(html: string): DocumentFragment | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
}

/**
 * Renders all child nodes of a markdown block container.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderBlockChildren(context: PdfRenderContext, parent: ParentNode, options: PdfBlockRenderOptions): void {
    for (const child of Array.from(parent.childNodes)) {
        renderBlockNode(context, child, options);
    }
}

/**
 * Renders one markdown HTML node into the PDF.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderBlockNode(context: PdfRenderContext, node: ChildNode, options: PdfBlockRenderOptions): void {
    if (node.nodeType === TEXT_NODE) {
        const text = normalizeInlineText(node.textContent || '').trim();
        if (!text) {
            return;
        }

        writeInlineTokens(context, [{ kind: 'text', text, style: {} }], options);
        return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
        return;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (tagName.match(/^h[1-6]$/)) {
        renderHeading(context, element, Number(tagName.slice(1)), options);
        return;
    }

    switch (tagName) {
        case 'p':
            writeInlineTokens(context, collectInlineChildTokens(element, options.textStyle), {
                x: options.x,
                width: options.width,
                textStyle: options.textStyle,
                marginBottom: 6,
            });
            return;

        case 'ul':
        case 'ol':
            renderList(context, element, tagName === 'ol', options);
            return;

        case 'blockquote':
            renderBlockquote(context, element, options);
            return;

        case 'pre':
            renderCodeBlock(context, element.textContent || '', options);
            return;

        case 'table':
            renderTable(context, element, options);
            return;

        case 'details':
            renderDetails(context, element, options);
            return;

        case 'hr':
            renderHorizontalRule(context, options);
            return;

        default:
            if (hasBlockChild(element)) {
                renderBlockChildren(context, element, options);
                return;
            }

            writeInlineTokens(context, collectInlineChildTokens(element, options.textStyle), {
                x: options.x,
                width: options.width,
                textStyle: options.textStyle,
                marginBottom: 6,
            });
    }
}

/**
 * Renders a markdown heading.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderHeading(
    context: PdfRenderContext,
    element: Element,
    level: number,
    options: PdfBlockRenderOptions,
): void {
    const fontSize =
        level === 1
            ? 16
            : level === 2
              ? 14
              : level === 3
                ? PDF_HEADING_LEVEL_THREE_FONT_SIZE_PT
                : PDF_HEADING_SMALL_FONT_SIZE_PT;
    addVerticalSpace(context, level <= 2 ? 4 : 2);
    writeInlineTokens(context, collectInlineChildTokens(element, options.textStyle), {
        x: options.x,
        width: options.width,
        textStyle: {
            ...options.textStyle,
            fontSize,
            fontStyle: 'bold',
            textColor: PDF_TEXT_COLOR,
        },
        lineHeight: fontSize * PDF_HEADING_LINE_HEIGHT_MULTIPLIER,
        marginBottom: 5,
    });
}

/**
 * Renders a markdown list.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderList(
    context: PdfRenderContext,
    listElement: Element,
    isOrdered: boolean,
    options: PdfBlockRenderOptions,
): void {
    const depth = options.listDepth || 0;
    const listX = options.x + depth * PDF_NESTED_INDENT_PT;
    const markerWidth = isOrdered ? PDF_ORDERED_LIST_MARKER_WIDTH_PT : PDF_UNORDERED_LIST_MARKER_WIDTH_PT;
    const listWidth = Math.max(PDF_LIST_MIN_WIDTH_PT, options.width - depth * PDF_NESTED_INDENT_PT);
    const items = Array.from(listElement.children).filter((child) => child.tagName.toLowerCase() === 'li');

    items.forEach((item, index) => {
        ensureSpace(context, PDF_BODY_LINE_HEIGHT_PT);
        setPdfTextStyle(context.pdf, createTextStyle(options.textStyle));
        context.pdf.text(isOrdered ? `${index + 1}.` : '-', listX, context.cursorY);

        const inlineTokens = collectInlineChildTokens(item, options.textStyle, true);
        if (inlineTokens.some((token) => token.kind === 'text' && token.text.trim())) {
            writeInlineTokens(context, inlineTokens, {
                x: listX + markerWidth,
                width: listWidth - markerWidth,
                textStyle: options.textStyle,
                marginBottom: 2,
            });
        } else {
            context.cursorY += PDF_BODY_LINE_HEIGHT_PT;
        }

        for (const child of Array.from(item.children)) {
            const childTagName = child.tagName.toLowerCase();
            if (childTagName === 'ul' || childTagName === 'ol') {
                renderList(context, child, childTagName === 'ol', {
                    ...options,
                    x: listX + markerWidth,
                    width: listWidth - markerWidth,
                    listDepth: depth + 1,
                });
            }
        }
    });

    addVerticalSpace(context, 3);
}

/**
 * Renders a markdown blockquote.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderBlockquote(context: PdfRenderContext, element: Element, options: PdfBlockRenderOptions): void {
    const startPage = context.pageNumber;
    const startY = context.cursorY;
    const quoteX = options.x + PDF_NESTED_INDENT_PT;
    const quoteWidth = options.width - PDF_NESTED_INDENT_PT;

    renderBlockChildren(context, element, {
        ...options,
        x: quoteX,
        width: quoteWidth,
        textStyle: {
            ...options.textStyle,
            textColor: '#334155',
        },
    });

    if (startPage === context.pageNumber) {
        setPdfStrokeColor(context.pdf, '#cbd5e1');
        context.pdf.setLineWidth(2);
        context.pdf.line(
            options.x + 3,
            startY,
            options.x + 3,
            Math.max(startY + PDF_NESTED_INDENT_PT, context.cursorY - PDF_CODE_LINE_EXTRA_SPACE_PT),
        );
    }

    addVerticalSpace(context, 3);
}

/**
 * Renders a fenced code block with a subtle printable background.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderCodeBlock(context: PdfRenderContext, code: string, options: PdfBlockRenderOptions): void {
    addVerticalSpace(context, 3);

    const codeX = options.x + 8;
    const codeWidth = options.width - 16;
    const lines = code.replace(/\s+$/u, '').split(/\r?\n/);
    const renderLines = lines.length > 0 ? lines : [''];

    for (const line of renderLines) {
        setPdfTextStyle(context.pdf, {
            fontFamily: 'courier',
            fontSize: 8.8,
            fontStyle: 'normal',
            textColor: PDF_TEXT_COLOR,
        });
        const wrappedLines = context.pdf.splitTextToSize(line || ' ', codeWidth) as string[];

        for (const wrappedLine of wrappedLines) {
            ensureSpace(context, PDF_CODE_LINE_HEIGHT_PT + PDF_CODE_LINE_EXTRA_SPACE_PT);
            setPdfFillColor(context.pdf, PDF_CODE_BACKGROUND_COLOR);
            context.pdf.rect(
                options.x,
                context.cursorY - PDF_CODE_BACKGROUND_BASELINE_OFFSET_PT,
                options.width,
                PDF_CODE_LINE_HEIGHT_PT + 2,
                'F',
            );
            setPdfTextStyle(context.pdf, {
                fontFamily: 'courier',
                fontSize: 8.8,
                fontStyle: 'normal',
                textColor: PDF_TEXT_COLOR,
            });
            context.pdf.text(wrappedLine, codeX, context.cursorY);
            context.cursorY += PDF_CODE_LINE_HEIGHT_PT;
        }
    }

    addVerticalSpace(context, 6);
}

/**
 * Renders a simple markdown table with fixed column widths.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderTable(context: PdfRenderContext, table: Element, options: PdfBlockRenderOptions): void {
    const rows = Array.from(table.querySelectorAll('tr'));
    const columnCount = Math.max(
        1,
        ...rows.map((row) => Array.from(row.children).filter((cell) => isTableCell(cell)).length),
    );
    const columnWidth = options.width / columnCount;

    for (const row of rows) {
        const cells = Array.from(row.children).filter((cell) => isTableCell(cell));
        const cellLines = cells.map((cell) => {
            setPdfTextStyle(context.pdf, {
                fontFamily: 'helvetica',
                fontSize: 8.8,
                fontStyle: cell.tagName.toLowerCase() === 'th' ? 'bold' : 'normal',
                textColor: PDF_TEXT_COLOR,
            });
            return context.pdf.splitTextToSize(
                normalizeInlineText(cell.textContent || '').trim(),
                columnWidth - PDF_CODE_LINE_EXTRA_SPACE_PT * 2,
            ) as string[];
        });
        const rowHeight = Math.max(
            PDF_CODE_LINE_HEIGHT_PT + PDF_CODE_LINE_EXTRA_SPACE_PT + 2,
            ...cellLines.map((lines) => lines.length * PDF_TABLE_CELL_LINE_HEIGHT_PT + PDF_CODE_LINE_EXTRA_SPACE_PT + 2),
        );

        ensureSpace(context, rowHeight);

        cells.forEach((cell, index) => {
            const cellX = options.x + index * columnWidth;
            const isHeader = cell.tagName.toLowerCase() === 'th';

            if (isHeader) {
                setPdfFillColor(context.pdf, PDF_SURFACE_COLOR);
                context.pdf.rect(cellX, context.cursorY - 10, columnWidth, rowHeight, 'F');
            }

            setPdfStrokeColor(context.pdf, '#cbd5e1');
            context.pdf.setLineWidth(PDF_TABLE_BORDER_WIDTH_PT);
            context.pdf.rect(cellX, context.cursorY - 10, columnWidth, rowHeight, 'S');

            setPdfTextStyle(context.pdf, {
                fontFamily: 'helvetica',
                fontSize: 8.8,
                fontStyle: isHeader ? 'bold' : 'normal',
                textColor: PDF_TEXT_COLOR,
            });
            context.pdf.text(cellLines[index] || [''], cellX + 4, context.cursorY);
        });

        context.cursorY += rowHeight;
    }

    addVerticalSpace(context, 6);
}

/**
 * Renders a markdown details block.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderDetails(context: PdfRenderContext, element: Element, options: PdfBlockRenderOptions): void {
    const summary = Array.from(element.children).find((child) => child.tagName.toLowerCase() === 'summary');
    if (summary) {
        writeInlineTokens(context, collectInlineChildTokens(summary, options.textStyle), {
            x: options.x,
            width: options.width,
            textStyle: { ...options.textStyle, fontStyle: 'bold' },
            marginBottom: 4,
        });
    }

    for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'summary') {
            continue;
        }

        renderBlockNode(context, child, {
            ...options,
            x: options.x + 10,
            width: options.width - 10,
        });
    }
}

/**
 * Renders a markdown horizontal rule.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function renderHorizontalRule(context: PdfRenderContext, options: PdfBlockRenderOptions): void {
    addVerticalSpace(context, 4);
    ensureSpace(context, 8);
    setPdfStrokeColor(context.pdf, PDF_BORDER_COLOR);
    context.pdf.setLineWidth(PDF_SUBTLE_LINE_WIDTH_PT);
    context.pdf.line(options.x, context.cursorY, options.x + options.width, context.cursorY);
    context.cursorY += 10;
}

/**
 * Writes inline markdown tokens with simple word wrapping.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function writeInlineTokens(
    context: PdfRenderContext,
    tokens: ReadonlyArray<PdfInlineToken>,
    options: WriteInlineTokensOptions,
): void {
    const baseStyle = createTextStyle(options.textStyle);
    const lineHeight =
        options.lineHeight || Math.max(PDF_BODY_LINE_HEIGHT_PT, baseStyle.fontSize * PDF_INLINE_LINE_HEIGHT_MULTIPLIER);
    const marginBottom = options.marginBottom ?? 4;
    const maxX = options.x + options.width;
    let currentX = options.x;
    let isLineEmpty = true;

    ensureSpace(context, lineHeight);

    const moveToNextLine = () => {
        context.cursorY += lineHeight;
        currentX = options.x;
        isLineEmpty = true;
        ensureSpace(context, lineHeight);
    };

    for (const token of tokens) {
        if (token.kind === 'break') {
            moveToNextLine();
            continue;
        }

        const tokenStyle = createTextStyle({ ...baseStyle, ...token.style });
        const segments = splitInlineText(token.text, options.shouldPreserveWhitespace);

        for (const segment of segments) {
            if (!segment) {
                continue;
            }

            if (segment === '\n') {
                moveToNextLine();
                continue;
            }

            const isWhitespace = segment.trim() === '';
            if (isWhitespace && isLineEmpty) {
                continue;
            }

            let remainingSegment = isWhitespace ? ' ' : segment;
            while (remainingSegment.length > 0) {
                const availableWidth = maxX - currentX;
                const remainingWidth = getTextWidth(context.pdf, remainingSegment, tokenStyle);

                if (remainingWidth <= availableWidth || isLineEmpty) {
                    const textToDraw =
                        remainingWidth <= availableWidth
                            ? remainingSegment
                            : takeFittingText(context.pdf, remainingSegment, tokenStyle, options.width);

                    drawInlineText(context, textToDraw, currentX, context.cursorY, tokenStyle, lineHeight);
                    currentX += getTextWidth(context.pdf, textToDraw, tokenStyle);
                    isLineEmpty = false;
                    remainingSegment = remainingSegment.slice(textToDraw.length);

                    if (remainingSegment.length > 0) {
                        moveToNextLine();
                    }
                    continue;
                }

                moveToNextLine();
            }
        }
    }

    context.cursorY += isLineEmpty ? 0 : lineHeight;
    context.cursorY += marginBottom;
}

/**
 * Draws one inline text segment.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function drawInlineText(
    context: PdfRenderContext,
    text: string,
    x: number,
    y: number,
    style: PdfTextStyle,
    lineHeight: number,
): void {
    if (!text) {
        return;
    }

    const textWidth = getTextWidth(context.pdf, text, style);

    if (style.backgroundColor && text.trim()) {
        setPdfFillColor(context.pdf, style.backgroundColor);
        context.pdf.roundedRect(
            x - PDF_INLINE_CODE_BACKGROUND_PADDING_PT,
            y - style.fontSize + PDF_INLINE_CODE_BACKGROUND_PADDING_PT,
            textWidth + PDF_INLINE_CODE_BACKGROUND_PADDING_PT * 2,
            style.fontSize + PDF_INLINE_CODE_BACKGROUND_PADDING_PT * 2,
            2,
            2,
            'F',
        );
    }

    setPdfTextStyle(context.pdf, style);
    context.pdf.text(text, x, y);

    if (style.href && text.trim()) {
        setPdfStrokeColor(context.pdf, style.textColor);
        context.pdf.setLineWidth(PDF_LINK_UNDERLINE_WIDTH_PT);
        context.pdf.line(x, y + PDF_LINK_UNDERLINE_OFFSET_PT, x + textWidth, y + PDF_LINK_UNDERLINE_OFFSET_PT);
        context.pdf.link(x, y - lineHeight + 2, textWidth, lineHeight, { url: style.href });
    }
}

/**
 * Collects inline rendering tokens from the direct children of an element.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function collectInlineChildTokens(
    element: Element,
    inheritedStyle?: Partial<PdfTextStyle>,
    shouldSkipNestedBlocks = false,
): ReadonlyArray<PdfInlineToken> {
    const tokens: PdfInlineToken[] = [];

    for (const child of Array.from(element.childNodes)) {
        if (
            shouldSkipNestedBlocks &&
            child.nodeType === ELEMENT_NODE &&
            BLOCK_TAG_NAMES.has((child as Element).tagName.toLowerCase())
        ) {
            continue;
        }

        tokens.push(...collectInlineTokens(child, inheritedStyle));
    }

    return tokens;
}

/**
 * Collects inline rendering tokens from one rendered markdown HTML node.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function collectInlineTokens(node: ChildNode, inheritedStyle?: Partial<PdfTextStyle>): ReadonlyArray<PdfInlineToken> {
    if (node.nodeType === TEXT_NODE) {
        return [
            {
                kind: 'text',
                text: node.textContent || '',
                style: inheritedStyle || {},
            },
        ];
    }

    if (node.nodeType !== ELEMENT_NODE) {
        return [];
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'br') {
        return [{ kind: 'break' }];
    }

    if (tagName === 'img') {
        return [
            {
                kind: 'text',
                text: element.getAttribute('alt') || element.getAttribute('src') || 'Image',
                style: { ...inheritedStyle, fontStyle: 'italic', textColor: PDF_MUTED_TEXT_COLOR },
            },
        ];
    }

    const nextStyle = resolveInlineElementStyle(element, inheritedStyle);
    const tokens: PdfInlineToken[] = [];

    for (const child of Array.from(element.childNodes)) {
        tokens.push(...collectInlineTokens(child, nextStyle));
    }

    return tokens;
}

/**
 * Resolves inline style inherited through an HTML element.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function resolveInlineElementStyle(element: Element, inheritedStyle?: Partial<PdfTextStyle>): Partial<PdfTextStyle> {
    const tagName = element.tagName.toLowerCase();
    const nextStyle: Partial<PdfTextStyle> = { ...(inheritedStyle || {}) };

    if (tagName === 'strong' || tagName === 'b') {
        nextStyle.fontStyle = nextStyle.fontStyle === 'italic' ? 'bolditalic' : 'bold';
    }

    if (tagName === 'em' || tagName === 'i') {
        nextStyle.fontStyle = nextStyle.fontStyle === 'bold' ? 'bolditalic' : 'italic';
    }

    if (tagName === 'code') {
        nextStyle.fontFamily = 'courier';
        nextStyle.fontSize = Math.min(nextStyle.fontSize || PDF_BODY_FONT_SIZE_PT, PDF_INLINE_CODE_MAX_FONT_SIZE_PT);
        nextStyle.fontStyle = 'normal';
        nextStyle.backgroundColor = PDF_CODE_BACKGROUND_COLOR;
    }

    if (tagName === 'a') {
        const href = element.getAttribute('href');
        if (href) {
            nextStyle.href = href;
            nextStyle.textColor = PDF_LINK_COLOR;
        }
    }

    if (tagName === 'sup') {
        nextStyle.fontSize = (nextStyle.fontSize || PDF_BODY_FONT_SIZE_PT) * PDF_SUPERSCRIPT_FONT_SIZE_MULTIPLIER;
    }

    return nextStyle;
}

/**
 * Splits one inline text run into wrap-friendly segments.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function splitInlineText(text: string, shouldPreserveWhitespace?: boolean): ReadonlyArray<string> {
    if (shouldPreserveWhitespace) {
        return text.split(/(\n)/u);
    }

    return normalizeInlineText(text)
        .split(/(\s+)/u)
        .filter((segment) => segment.length > 0);
}

/**
 * Normalizes inline whitespace emitted by the HTML parser.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function normalizeInlineText(text: string): string {
    return text.replace(/\s+/gu, ' ');
}

/**
 * Takes the longest prefix that fits into the available width.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function takeFittingText(pdf: jsPDF, text: string, style: PdfTextStyle, maxWidth: number): string {
    if (getTextWidth(pdf, text.charAt(0), style) > maxWidth) {
        return text.charAt(0);
    }

    let low = 1;
    let high = text.length;
    let best = text.charAt(0);

    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidate = text.slice(0, middle);
        const width = getTextWidth(pdf, candidate, style);

        if (width <= maxWidth) {
            best = candidate;
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }

    return best;
}

/**
 * Returns the width of text for a specific PDF style.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function getTextWidth(pdf: jsPDF, text: string, style: PdfTextStyle): number {
    setPdfTextStyle(pdf, style);
    return pdf.getTextWidth(text);
}

/**
 * Creates a complete text style from optional overrides.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function createTextStyle(style?: Partial<PdfTextStyle>): PdfTextStyle {
    return {
        fontFamily: style?.fontFamily || 'helvetica',
        fontSize: style?.fontSize || PDF_BODY_FONT_SIZE_PT,
        fontStyle: style?.fontStyle || 'normal',
        textColor: style?.textColor || PDF_TEXT_COLOR,
        backgroundColor: style?.backgroundColor,
        href: style?.href,
    };
}

/**
 * Applies text style to the jsPDF instance.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function setPdfTextStyle(pdf: jsPDF, style: PdfTextStyle): void {
    pdf.setFont(style.fontFamily, style.fontStyle);
    pdf.setFontSize(style.fontSize);
    pdf.setTextColor(normalizePdfColor(style.textColor, PDF_TEXT_COLOR));
}

/**
 * Applies stroke color to the jsPDF instance.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function setPdfStrokeColor(pdf: jsPDF, color: string): void {
    pdf.setDrawColor(normalizePdfColor(color, PDF_BORDER_COLOR));
}

/**
 * Applies fill color to the jsPDF instance.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function setPdfFillColor(pdf: jsPDF, color: string): void {
    pdf.setFillColor(normalizePdfColor(color, PDF_SURFACE_COLOR));
}

/**
 * Normalizes colors to six-digit hex strings accepted by jsPDF.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function normalizePdfColor(color: string | undefined, fallback: string): string {
    const value = color?.trim();
    if (!value) {
        return fallback;
    }

    const shortHexMatch = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/iu);
    if (shortHexMatch) {
        return `#${shortHexMatch[1]}${shortHexMatch[1]}${shortHexMatch[2]}${shortHexMatch[2]}${shortHexMatch[3]}${shortHexMatch[3]}`;
    }

    if (value.match(/^#[0-9a-f]{6}$/iu)) {
        return value;
    }

    return fallback;
}

/**
 * Ensures there is enough vertical room on the current page.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function ensureSpace(context: PdfRenderContext, height: number): void {
    if (context.cursorY + height <= context.pageHeight - PDF_PAGE_MARGIN_PT - PDF_FOOTER_MARGIN_PT) {
        return;
    }

    context.pdf.addPage();
    context.pageNumber += 1;
    context.cursorY = PDF_PAGE_MARGIN_PT;
}

/**
 * Adds vertical space while respecting page boundaries.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function addVerticalSpace(context: PdfRenderContext, height: number): void {
    ensureSpace(context, height);
    context.cursorY += height;
}

/**
 * Renders simple page footers after all content is known.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function drawPageFooters(context: PdfRenderContext, branding: ReturnType<typeof getPromptbookExportBranding>): void {
    const pageCount = context.pdf.getNumberOfPages();
    const footerText = [branding.productName, ...branding.detailLines].join(' - ');

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        context.pdf.setPage(pageNumber);
        setPdfTextStyle(context.pdf, {
            fontFamily: 'helvetica',
            fontSize: 7.5,
            fontStyle: 'normal',
            textColor: PDF_MUTED_TEXT_COLOR,
        });

        const pageLabel = `Page ${pageNumber} of ${pageCount}`;
        const footerLines = context.pdf.splitTextToSize(
            footerText,
            context.contentWidth - context.pdf.getTextWidth(pageLabel) - PDF_FOOTER_PAGE_LABEL_GAP_PT,
        ) as string[];
        context.pdf.text(
            footerLines[0] || branding.productName,
            PDF_PAGE_MARGIN_PT,
            context.pageHeight - PDF_FOOTER_BASELINE_OFFSET_PT,
        );
        context.pdf.text(
            pageLabel,
            context.pageWidth - PDF_PAGE_MARGIN_PT - context.pdf.getTextWidth(pageLabel),
            context.pageHeight - PDF_FOOTER_BASELINE_OFFSET_PT,
        );
    }
}

/**
 * Checks whether an element is a markdown table cell.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function isTableCell(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'td' || tagName === 'th';
}

/**
 * Checks whether an element has block-level children.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function hasBlockChild(element: Element): boolean {
    return Array.from(element.children).some((child) => BLOCK_TAG_NAMES.has(child.tagName.toLowerCase()));
}

/**
 * Escapes text embedded into raw XMP metadata.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function escapeXml(value: string): string {
    return value
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;')
        .replace(/'/gu, '&apos;');
}
