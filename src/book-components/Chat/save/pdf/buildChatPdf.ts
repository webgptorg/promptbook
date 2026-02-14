import { jsPDF } from 'jspdf';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { messagesToText } from '../../utils/messagesToText';

const PDF_PAGE_MARGIN_PT = 40;
const PDF_FONT_SIZE_PT = 10;
const PDF_LINE_HEIGHT_PT = PDF_FONT_SIZE_PT * 1.3;

/**
 * Builds the share URL used inside exported files.
 *
 * @returns The current page URL or a fallback to Promptbook home when unavailable.
 * @private Internal helper used by chat save format implementations.
 */
function resolveShareUrl(): string {
    if (typeof window === 'undefined') {
        return 'https://promptbook.studio';
    }

    return window.location.href;
}

/**
 * Creates a minimal PDF representation of the provided chat.
 *
 * @param messages - Messages that should be included in the PDF export.
 * @param participants - Optional participant metadata to resolve sender names.
 * @returns Binary data for the generated PDF file.
 * @private Internal helper used by `pdfSaveFormatDefinition`.
 */
export function buildChatPdf(messages: ReadonlyArray<ChatMessage>, participants?: ReadonlyArray<ChatParticipant>): Uint8Array {
    const shareUrl = resolveShareUrl();
    const textContent = messagesToText([...messages], shareUrl, undefined, participants);

    const pdf = new jsPDF({
        unit: 'pt',
        format: 'letter',
    });
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(PDF_FONT_SIZE_PT);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = pageWidth - PDF_PAGE_MARGIN_PT * 2;
    const availableHeight = pageHeight - PDF_PAGE_MARGIN_PT;

    let cursorY = PDF_PAGE_MARGIN_PT;

    const ensureSpace = (height: number) => {
        if (cursorY + height > availableHeight) {
            pdf.addPage();
            cursorY = PDF_PAGE_MARGIN_PT;
        }
    };

    const paragraphs = textContent.split('\n');
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            cursorY += PDF_LINE_HEIGHT_PT;
            continue;
        }

        const wrappedLines = pdf.splitTextToSize(paragraph, availableWidth);
        const paragraphHeight = wrappedLines.length * PDF_LINE_HEIGHT_PT;
        ensureSpace(paragraphHeight);
        pdf.text(wrappedLines, PDF_PAGE_MARGIN_PT, cursorY);
        cursorY += paragraphHeight + PDF_LINE_HEIGHT_PT * 0.25;
    }

    return new Uint8Array(pdf.output('arraybuffer'));
}
