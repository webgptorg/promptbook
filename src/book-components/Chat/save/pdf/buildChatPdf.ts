import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../../../errors/UnexpectedError';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { getPromptbookExportBranding } from '../_common/getPromptbookExportBranding';
import { buildChatHtml, CHAT_HTML_EXPORT_RENDER_ROOT_CLASS_NAME } from '../html/htmlSaveFormatDefinition';

/**
 * Pixel width used while the standalone HTML document is laid out for PDF pages.
 *
 * @private Internal helper of `buildChatPdf`.
 */
const PDF_HTML_RENDER_WINDOW_WIDTH_PX = 900;

/**
 * Device-independent scale used for the browser-rendered PDF page image.
 *
 * @private Internal helper of `buildChatPdf`.
 */
const PDF_HTML_RENDER_PIXEL_RATIO = 2;

/**
 * Image format used for rendered chat page slices.
 *
 * @private Internal helper of `buildChatPdf`.
 */
const PDF_PAGE_IMAGE_FORMAT = 'PNG';

/**
 * HTML source prepared for browser rendering.
 *
 * @private Internal helper of `buildChatPdf`.
 */
type ChatPdfRenderSource = HTMLElement;

/**
 * Builds a PDF from the same standalone HTML document used by the HTML chat download.
 *
 * @param title - Title used in the PDF heading and metadata.
 * @param messages - Messages that should be included in the PDF export.
 * @param participants - Participant metadata used by the HTML chat export.
 * @returns Binary data for the generated PDF file.
 *
 * @private Internal helper used by `pdfSaveFormatDefinition`.
 */
export async function buildChatPdf(
    title: string,
    messages: ReadonlyArray<ChatMessage>,
    participants: ReadonlyArray<ChatParticipant>,
): Promise<Uint8Array> {
    const pdf = new jsPDF({
        unit: 'pt',
        format: 'letter',
        compress: true,
    });
    const branding = getPromptbookExportBranding();
    const html = buildChatHtml(title, messages, participants);

    applyPromptbookPdfMetadata(pdf, title, branding);
    await renderChatPdfPages(pdf, createChatPdfRenderSource(html));

    return new Uint8Array(pdf.output('arraybuffer'));
}

/**
 * Rehydrates the standalone HTML document as a styled element for jsPDF.
 *
 * Passing a raw HTML document string through jsPDF would sanitize away the stylesheet,
 * so this keeps the document `<style>` nodes beside the body markup.
 *
 * @param html - Standalone HTML chat document.
 * @returns Render root containing the HTML stylesheet and body content.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function createChatPdfRenderSource(html: string): ChatPdfRenderSource {
    const exportedDocument = new DOMParser().parseFromString(html, 'text/html');
    const renderSource = document.createElement('div');

    renderSource.className = CHAT_HTML_EXPORT_RENDER_ROOT_CLASS_NAME;
    renderSource.style.position = 'fixed';
    renderSource.style.left = `-${PDF_HTML_RENDER_WINDOW_WIDTH_PX * 2}px`;
    renderSource.style.top = '0';
    renderSource.style.width = `${PDF_HTML_RENDER_WINDOW_WIDTH_PX}px`;
    renderSource.style.background = '#ffffff';
    renderSource.style.pointerEvents = 'none';

    for (const style of Array.from(exportedDocument.head.querySelectorAll('style'))) {
        renderSource.appendChild(style.cloneNode(true));
    }

    for (const bodyChild of Array.from(exportedDocument.body.childNodes)) {
        renderSource.appendChild(bodyChild.cloneNode(true));
    }

    return renderSource;
}

/**
 * Renders the chat HTML with the browser text engine and places image slices into the PDF.
 *
 * `jsPDF.html()` maps browser text drawing into PDF text commands and currently
 * misplaces combining accents and some Czech diacritics. Rendering through the
 * browser first keeps text glyph positions exactly as the user sees them.
 *
 * @private Internal helper of `buildChatPdf`.
 */
async function renderChatPdfPages(pdf: jsPDF, renderSource: ChatPdfRenderSource): Promise<void> {
    document.body.appendChild(renderSource);

    try {
        await waitForChatPdfFonts();
        const canvas = await toCanvas(renderSource, {
            backgroundColor: '#ffffff',
            height: resolveChatPdfRenderHeight(renderSource),
            pixelRatio: PDF_HTML_RENDER_PIXEL_RATIO,
            width: PDF_HTML_RENDER_WINDOW_WIDTH_PX,
        });

        appendCanvasPagesToPdf(pdf, canvas);
    } finally {
        renderSource.remove();
    }
}

/**
 * Waits for browser fonts before capturing the chat PDF.
 *
 * @private Internal helper of `buildChatPdf`.
 */
async function waitForChatPdfFonts(): Promise<void> {
    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;

    await fontSet?.ready.catch(() => undefined);
}

/**
 * Resolves the full rendered chat height for image export.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function resolveChatPdfRenderHeight(renderSource: ChatPdfRenderSource): number {
    return Math.max(renderSource.scrollHeight, renderSource.offsetHeight, renderSource.clientHeight, 1);
}

/**
 * Splits one browser-rendered chat image into PDF pages.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function appendCanvasPagesToPdf(pdf: jsPDF, canvas: HTMLCanvasElement): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageScale = pageWidth / canvas.width;
    const pageCanvasHeight = Math.max(Math.floor(pageHeight / imageScale), 1);

    for (let sourceY = 0; sourceY < canvas.height; sourceY += pageCanvasHeight) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
        const pageCanvas = createCanvasPageSlice(canvas, sourceY, sliceHeight);

        if (sourceY > 0) {
            pdf.addPage();
        }

        pdf.addImage(pageCanvas, PDF_PAGE_IMAGE_FORMAT, 0, 0, pageWidth, sliceHeight * imageScale, undefined, 'FAST');
    }
}

/**
 * Copies a vertical slice of the rendered chat canvas into its own page canvas.
 *
 * @private Internal helper of `buildChatPdf`.
 */
function createCanvasPageSlice(canvas: HTMLCanvasElement, sourceY: number, sliceHeight: number): HTMLCanvasElement {
    const pageCanvas = document.createElement('canvas');
    const pageCanvasContext = pageCanvas.getContext('2d');

    if (!pageCanvasContext) {
        throw new UnexpectedError(
            spaceTrim(`
                Chat PDF generation could not create a canvas rendering context.

                This usually means that the browser does not support 2D canvas rendering.
            `),
        );
    }

    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    pageCanvasContext.fillStyle = '#ffffff';
    pageCanvasContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageCanvasContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    return pageCanvas;
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
