import { jsPDF } from 'jspdf';
import { spaceTrim } from 'spacetrim';
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
 * HTML source prepared for jsPDF rendering.
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
    });
    const branding = getPromptbookExportBranding();
    const html = buildChatHtml(title, messages, participants);

    applyPromptbookPdfMetadata(pdf, title, branding);
    await pdf.html(createChatPdfRenderSource(html), {
        autoPaging: 'text',
        html2canvas: {
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
        },
        margin: 0,
        width: pdf.internal.pageSize.getWidth(),
        windowWidth: PDF_HTML_RENDER_WINDOW_WIDTH_PX,
    });

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

    for (const style of Array.from(exportedDocument.head.querySelectorAll('style'))) {
        renderSource.appendChild(style.cloneNode(true));
    }

    for (const bodyChild of Array.from(exportedDocument.body.childNodes)) {
        renderSource.appendChild(bodyChild.cloneNode(true));
    }

    return renderSource;
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
